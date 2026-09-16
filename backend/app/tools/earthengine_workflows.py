"""Earth Engine tool executors (M3): water_mapping only.

Opt-in via ``Settings.tools_engine == "earthengine"`` (default ``template``).
``tools.registry.dispatch`` imports this module lazily, so the deterministic
path — and the whole test suite by default — never imports or initializes it.

Input strategy (M3 inspection decision):

- AOI: Nominatim boundary bbox for ``context.region`` (city/state), clamped to
  a small bounded box; when the region is absent (or geocoding fails) a
  bounded demo AOI is used and the trace explicitly records the demo fallback.
- Scene: ``COPERNICUS/S2_SR_HARMONIZED`` — ``filterBounds(AOI)`` +
  ``filterDate(anchor - lookback .. anchor + forward)`` +
  ``CLOUDY_PIXEL_PERCENTAGE < ceiling``, ranked ascending by cloud cover
  (``.sort()`` + ``.first()``). Window + ceiling come from Settings
  (``ee_scene_lookback_days`` / ``ee_scene_forward_days`` /
  ``ee_max_cloud_percent``); the selected scene's REAL acquisition date and
  cloud percentage are recorded in the trace/metrics (no composites; bounded).
- NDWI: ``normalizedDifference(["B3", "B8"]) > threshold`` → water mask →
  vectorized polygons converted to contract-shaped closed ``[lng, lat]``
  rings with pixelArea-derived totals and spherical per-feature areas.

Failure discipline: ``try_execute`` NEVER raises and NEVER fabricates results —
any failure returns ``(None, traces)`` with sanitized reasons and the registry
falls back to the deterministic template executor. No EE assets are created;
no user files are uploaded anywhere; no GCS/Cloud Storage is used.
"""
from __future__ import annotations

import json
import math
import re
import threading
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from .. import ee_client
from ..config import get_settings
from .base import ToolContext, ToolResult, ToolTrace

WORKFLOW_ID = "water_mapping"
TOOL_ID = "earthengine:water_mapping"

_SCENE_COLLECTION = "COPERNICUS/S2_SR_HARMONIZED"
_NDWI_THRESHOLD = 0.1  # computation unchanged; selection window/ceiling live in Settings
_PIXEL_SCALE = 10.0
_MAX_AOI_HALF_DEG = 0.125          # bounded AOI: ≈ ±14 km around the center
_MAX_FEATURES = 8
_MAX_VERTICES = 256                # per ring (API payload size guard)
_SIMPLIFY_MAX_ERROR_M = 50.0
_NOMINATIM_TIMEOUT_S = 10.0
_EARTH_RADIUS_M = 6378137.0
_DEMO_AOI_BBOX = (72.90, 19.00, 73.05, 19.15)  # (west, south, east, north)

_GEOCODE_CACHE: dict[str, Optional[tuple[float, float, float, float]]] = {}
_GEOCODE_LOCK = threading.Lock()
_GEOCODE_CACHE_MAX = 64


def _elapsed(started: float) -> float:
    return round(time.monotonic() - started, 6)


def _safe_scene_id(scene_id: str) -> str:
    """Scene ids are safe strings, but never trust provider output in labels."""
    return re.sub(r"[^A-Za-z0-9._/-]", "", scene_id)[:64] or "unknown"


def _as_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _fmt_cloud(value: Any) -> str:
    number = _as_float(value)
    return f"{number:.2f}" if number is not None else "unknown"


def _iso_date_from_epoch_ms(value: Any) -> Optional[str]:
    """Scene ``system:time_start`` (epoch ms) → ``YYYY-MM-DD`` (UTC), or None."""
    number = _as_float(value)
    if number is None:
        return None
    try:
        moment = datetime.fromtimestamp(number / 1000.0, tz=timezone.utc)
    except (OverflowError, OSError, ValueError):
        return None
    return moment.date().isoformat()


def _nominatim_bbox(
    city: Optional[str], state: Optional[str]
) -> Optional[tuple[float, float, float, float]]:
    """Resolve ``(west, south, east, north)`` from Nominatim, or None.

    Cached per query (bounded); every failure is fail-closed to None so the
    executor can record a demo-AOI fallback. Never raises.
    """
    parts = [part for part in (city, state) if part]
    if not parts:
        return None
    query = ", ".join([*parts, "India"])
    with _GEOCODE_LOCK:
        if query in _GEOCODE_CACHE:
            return _GEOCODE_CACHE[query]
    settings = get_settings()
    url = (
        f"{settings.nominatim_base_url.rstrip('/')}/search"
        "?format=jsonv2&limit=1&q=" + urllib.parse.quote(query)
    )
    headers = {
        "User-Agent": settings.nominatim_user_agent
        or "PrithviQ/1.0 (SatQuery demo)"
    }
    bbox: Optional[tuple[float, float, float, float]] = None
    try:
        request = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(request, timeout=_NOMINATIM_TIMEOUT_S) as response:
            payload = json.loads(response.read().decode("utf-8"))
        if isinstance(payload, list) and payload:
            box = payload[0].get("boundingbox")  # [south, north, west, east]
            if isinstance(box, list) and len(box) == 4:
                south, north, west, east = (float(value) for value in box)
                if south < north and west < east:
                    bbox = (west, south, east, north)
    except Exception:  # noqa: BLE001 - geo failures are fail-closed by design
        bbox = None
    with _GEOCODE_LOCK:
        if len(_GEOCODE_CACHE) >= _GEOCODE_CACHE_MAX:
            _GEOCODE_CACHE.clear()
        _GEOCODE_CACHE[query] = bbox
    return bbox

def _clamp_bbox(
    bbox: tuple[float, float, float, float]
) -> tuple[float, float, float, float]:
    """Clamp an AOI to a small bounded box around its center (latency guard)."""
    west, south, east, north = bbox
    center_lng, center_lat = (west + east) / 2.0, (south + north) / 2.0
    half_lng = min((east - west) / 2.0, _MAX_AOI_HALF_DEG)
    half_lat = min((north - south) / 2.0, _MAX_AOI_HALF_DEG)
    return (
        center_lng - half_lng,
        center_lat - half_lat,
        center_lng + half_lng,
        center_lat + half_lat,
    )


def _resolve_aoi(ee: Any, context: ToolContext, traces: list[ToolTrace]) -> Any:
    """Resolve the AOI geometry and record its source (never raises)."""
    started = time.monotonic()
    region = context.region or {}
    bbox = _nominatim_bbox(region.get("city"), region.get("state"))
    if bbox is not None:
        source = "nominatim"
    elif region.get("city") or region.get("state"):
        source = "demo-fallback (geocode unavailable/failed)"
        bbox = None
    else:
        source = "demo-fallback (no session region)"
        bbox = None
    if bbox is None:
        bbox = _DEMO_AOI_BBOX
    west, south, east, north = _clamp_bbox(bbox)
    aoi = ee.Geometry.Rectangle([west, south, east, north])
    traces.append(
        ToolTrace(
            TOOL_ID,
            "resolve_aoi",
            True,
            _elapsed(started),
            detail=(
                f"source={source}; "
                f"bbox=({west:.4f}, {south:.4f}, {east:.4f}, {north:.4f})"
            ),
        )
    )
    return aoi


def _acquisition_window(
    context: ToolContext, settings: Any
) -> Optional[tuple[str, str, str]]:
    """Bounded search window around the DECLARED acquisition anchor.

    Returns ``(start, end, anchor_date)``. The anchor is the upload-derived
    acquisition instant — never "today" — and the window is
    ``[anchor - lookback_days, anchor + forward_days)`` with an exclusive end
    (so the default forward of 4 days includes the three days after the anchor).
    """
    for value in context.acquisition_times:
        if not value:
            continue
        try:
            moment = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            continue
        start = (
            moment - timedelta(days=settings.ee_scene_lookback_days)
        ).date().isoformat()
        end = (
            moment + timedelta(days=settings.ee_scene_forward_days)
        ).date().isoformat()
        return start, end, moment.date().isoformat()
    return None

def _trace_no_scene(
    traces: list[ToolTrace], started: float, start: str, end: str, ceiling: float
) -> None:
    """Record the sanitized 'no cloud-filtered scene' fallback reason."""
    traces.append(
        ToolTrace(
            TOOL_ID,
            "select_scene",
            False,
            _elapsed(started),
            detail=(
                f"no cloud-filtered scene in {start}..{end} "
                f"(CLOUDY_PIXEL_PERCENTAGE < {_fmt_cloud(ceiling)})"
            ),
        )
    )


def _select_scene(
    ee: Any,
    aoi: Any,
    window: tuple[str, str, str],
    settings: Any,
    traces: list[ToolTrace],
) -> Optional[tuple[Any, dict[str, Any]]]:
    """Pick the least-cloudy qualifying Sentinel-2 scene; None if none exists.

    Ranks by ``CLOUDY_PIXEL_PERCENTAGE`` ascending within the bounded window and
    records the scene's REAL id, acquisition date and cloud percentage together
    with the declared anchor and the search window. The declared date is never
    substituted, and no scene is ever fabricated.
    """
    started = time.monotonic()
    start, end, anchor_date = window
    collection = (
        ee.ImageCollection(_SCENE_COLLECTION)
        .filterBounds(aoi)
        .filterDate(start, end)
        .filterMetadata(
            "CLOUDY_PIXEL_PERCENTAGE", "less_than", settings.ee_max_cloud_percent
        )
        .sort("CLOUDY_PIXEL_PERCENTAGE")  # rank ascending; first = least cloudy
    )
    # Empty collections raise EEException on `.first()` property reads in the
    # real SDK, so detect emptiness first and report the sanitized no-scene
    # reason instead of a generic EEException.
    if int(collection.size().getInfo() or 0) <= 0:
        _trace_no_scene(traces, started, start, end, settings.ee_max_cloud_percent)
        return None
    scene = collection.first()
    info = (
        ee.Dictionary(
            {
                "id": scene.get("system:id"),
                "time_start": scene.get("system:time_start"),
                "cloud": scene.get("CLOUDY_PIXEL_PERCENTAGE"),
            }
        ).getInfo()
        or {}
    )
    scene_id = str(info.get("id") or "")
    if not scene_id:
        _trace_no_scene(traces, started, start, end, settings.ee_max_cloud_percent)
        return None
    scene_meta: dict[str, Any] = {
        "scene_id": scene_id,
        "scene_date": _iso_date_from_epoch_ms(info.get("time_start")),
        "cloud_pct": _as_float(info.get("cloud")),
        "anchor_date": anchor_date,
        "window_start": start,
        "window_end": end,
    }
    traces.append(
        ToolTrace(
            TOOL_ID,
            "select_scene",
            True,
            _elapsed(started),
            detail=(
                f"scene={_safe_scene_id(scene_id)}; "
                f"scene_date={scene_meta['scene_date'] or 'unknown'}; "
                f"cloud_pct={_fmt_cloud(scene_meta['cloud_pct'])}; "
                f"anchor_date={anchor_date}; window={start}..{end}; "
                f"ceiling<{_fmt_cloud(settings.ee_max_cloud_percent)}"
            ),
        )
    )
    return scene, scene_meta


def _compute_water_layer(
    ee: Any,
    scene: Any,
    aoi: Any,
    scene_meta: dict[str, Any],
    traces: list[ToolTrace],
) -> Optional[tuple[dict[str, Any], dict[str, Any]]]:
    """Genuine NDWI computation → contract layer, or None (fallback traced)."""
    started = time.monotonic()
    water = (
        scene.normalizedDifference(["B3", "B8"])
        .rename("ndwi")
        .gt(_NDWI_THRESHOLD)
        .selfMask()
        .clip(aoi)
    )
    water_area_m2 = float(
        ee.Image.pixelArea()
        .updateMask(water)
        .reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=aoi,
            scale=_PIXEL_SCALE,
            maxPixels=1e9,
        )
        .getInfo()
        .get("area", 0.0)
    )
    if water_area_m2 <= 0.0:
        # Honest empty result would clash with the deterministic answer text
        # until M4 composes answers — fall back instead of fabricating.
        traces.append(
            ToolTrace(
                TOOL_ID,
                "compute_ndwi",
                False,
                _elapsed(started),
                detail="no water pixels above the NDWI threshold",
            )
        )
        return None
    aoi_area_m2 = float(aoi.area(maxError=1.0).getInfo())
    fraction = water_area_m2 / aoi_area_m2 if aoi_area_m2 > 0.0 else 0.0
    confidence = round(min(0.95, max(0.05, fraction)), 2)
    vectors = (
        water.reduceToVectors(
            geometry=aoi,
            scale=_PIXEL_SCALE,
            geometryType="polygon",
            eightConnected=True,
            labelProperty="water",
            maxPixels=1e8,
            bestEffort=True,
        )
        .limit(_MAX_FEATURES)
        .map(lambda feature: feature.simplify(_SIMPLIFY_MAX_ERROR_M))
    )
    features = _build_contract_features(vectors.getInfo(), confidence)
    if not features:
        traces.append(
            ToolTrace(
                TOOL_ID,
                "compute_ndwi",
                False,
                _elapsed(started),
                detail="vectorization produced no usable polygons",
            )
        )
        return None
    traces.append(
        ToolTrace(
            TOOL_ID,
            "compute_ndwi",
            True,
            _elapsed(started),
            detail=(
                f"scene={_safe_scene_id(scene_meta['scene_id'])}; "
                f"scene_date={scene_meta.get('scene_date') or 'unknown'}; "
                f"cloud_pct={_fmt_cloud(scene_meta.get('cloud_pct'))}; "
                f"ndwi≥{_NDWI_THRESHOLD}; water_km2={water_area_m2 / 1e6:.2f}; "
                f"water_fraction={fraction:.3f}; features={len(features)}"
            ),
        )
    )
    layer = {
        "id": "single",
        "label": f"NDWI water bodies · {_safe_scene_id(scene_meta['scene_id'])}",
        "opacity": 1.0,
        "features": features,
    }
    metrics = {
        "engine": "earthengine",
        "collection": _SCENE_COLLECTION,
        "scene_id": scene_meta["scene_id"],
        "scene_date": scene_meta.get("scene_date"),
        "cloud_pct": scene_meta.get("cloud_pct"),
        "anchor_date": scene_meta.get("anchor_date"),
        "window_start": scene_meta.get("window_start"),
        "window_end": scene_meta.get("window_end"),
        "ndwi_threshold": _NDWI_THRESHOLD,
        "water_area_m2": round(water_area_m2),
        "aoi_area_m2": round(aoi_area_m2),
        "water_fraction": round(fraction, 4),
        "confidence": confidence,
    }
    return layer, metrics

def _close_ring(ring: list[list[float]]) -> list[list[float]]:
    points = [list(point) for point in ring]
    if len(points) >= 2 and points[0] != points[-1]:
        points.append(list(points[0]))
    return points


def _subsample(ring: list[list[float]], max_vertices: int) -> list[list[float]]:
    if len(ring) <= max_vertices:
        return ring
    step = len(ring) / float(max_vertices)
    return [ring[int(index * step)] for index in range(max_vertices - 1)] + [ring[-1]]


def _ring_area_m2(ring: list[list[float]]) -> float:
    """Spherical-excess approximation — per-feature metadata only.

    The authoritative water total comes from EE pixelArea; this approximates
    each feature's own extent for the contract's ``area_m2`` field.
    """
    if len(ring) < 3:
        return 0.0
    total = 0.0
    for (lng1, lat1), (lng2, lat2) in zip(ring, ring[1:]):
        total += math.radians(lng2 - lng1) * (
            2.0 + math.sin(math.radians(lat1)) + math.sin(math.radians(lat2))
        )
    return abs(total) * _EARTH_RADIUS_M * _EARTH_RADIUS_M / 2.0


def _build_contract_features(
    geojson: dict[str, Any], confidence: float
) -> list[dict[str, Any]]:
    """EE FeatureCollection → contract-shaped water features (largest first)."""
    outer_rings: list[list[list[float]]] = []
    for raw in geojson.get("features") or []:
        geometry = raw.get("geometry") or {}
        coordinates = geometry.get("coordinates") or []
        if geometry.get("type") == "Polygon" and coordinates:
            outer_rings.append(coordinates[0])
        elif geometry.get("type") == "MultiPolygon":
            outer_rings.extend(polygon[0] for polygon in coordinates if polygon)
    outer_rings.sort(key=lambda ring: -abs(_ring_area_m2(ring)))
    features: list[dict[str, Any]] = []
    for index, ring in enumerate(outer_rings[:_MAX_FEATURES]):
        shaped = _subsample(_close_ring(ring), _MAX_VERTICES)
        if len(shaped) < 4:
            continue
        features.append(
            {
                "id": f"ndwi{index + 1}",
                "type": "water",
                "label": f"Water body (NDWI ≥ {_NDWI_THRESHOLD})",
                "confidence": confidence,
                "area_m2": int(max(0.0, round(_ring_area_m2(shaped)))),
                "geometry": {"type": "Polygon", "coordinates": [shaped]},
            }
        )
    return features


def try_execute(
    workflow_id: str, context: ToolContext
) -> tuple[Optional[ToolResult], tuple[ToolTrace, ...]]:
    """Run the EE executor for ``workflow_id``; never raises, never fabricates.

    Returns ``(result, traces)`` — ``result is None`` means "fall back to the
    deterministic template", and ``traces`` always records why (scene id, AOI
    source, dates, sanitized errors).
    """
    if workflow_id != WORKFLOW_ID:
        return None, (
            ToolTrace(
                f"earthengine:{workflow_id}",
                "dispatch",
                False,
                0.0,
                detail="no earthengine executor registered for this workflow",
            ),
        )
    traces: list[ToolTrace] = []
    started = time.monotonic()
    settings = get_settings()
    try:
        ee = ee_client.get_ee()
        traces.append(
            ToolTrace(
                TOOL_ID,
                "get_ee",
                True,
                _elapsed(started),
                detail=f"earthengine-api {getattr(ee, '__version__', 'unknown')}",
            )
        )
        aoi = _resolve_aoi(ee, context, traces)
        window = _acquisition_window(context, settings)
        if window is None:
            traces.append(
                ToolTrace(
                    TOOL_ID,
                    "select_scene",
                    False,
                    _elapsed(started),
                    detail="no parseable acquisition date on the uploads",
                )
            )
            return None, tuple(traces)
        selected = _select_scene(ee, aoi, window, settings, traces)
        if selected is None:
            return None, tuple(traces)
        scene, scene_meta = selected
        built = _compute_water_layer(ee, scene, aoi, scene_meta, traces)
        if built is None:
            return None, tuple(traces)
        layer, metrics = built
        return (
            ToolResult(layers=(layer,), metrics=metrics, traces=tuple(traces)),
            tuple(traces),
        )
    except Exception as exc:  # noqa: BLE001 - fail closed, sanitized like ai.py
        traces.append(
            ToolTrace(
                TOOL_ID,
                "execute",
                False,
                _elapsed(started),
                error=type(exc).__name__,
            )
        )
        return None, tuple(traces)