"""One-shot REAL Earth Engine smoke test for the M3 water_mapping workflow.

Exercises the actual production path — ``tools.dispatch`` →
``earthengine_workflows`` executor — against the real Earth Engine API using
the configured service-account credential:

    Sentinel-2 scene selection → NDWI (B3/B8) → water mask → polygons

Bounded by design: small demo AOI, one scene, 10 m scale, ≤8 polygons, plus at
most a handful of catalog *metadata* queries to pick a promising date. No
imagery downloads, no exports, no mosaics, no unbounded computations.

Usage (from anywhere):
    .venv\\Scripts\\python.exe -u backend\\scripts\\smoke_ee_water_mapping.py

Safety: never prints credential contents, keys, or tokens — only the safe
summary fields and sanitized trace details. ``EE_ENABLED`` / ``TOOLS_ENGINE``
are overridden in-process only; ``.env`` is never modified.
"""
from __future__ import annotations

import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app import ee_client, tools  # noqa: E402
from backend.app.config import get_settings  # noqa: E402
from backend.app.tools import base as tools_base  # noqa: E402
from backend.app.tools import earthengine_workflows as ee_workflows  # noqa: E402

# How far back to look for a scene (days before today), bounded and small.
_CANDIDATE_OFFSETS_DAYS = (0, 7, 14, 21, 28, 45)


def _window(center_iso_date: str) -> tuple[str, str]:
    """Bounded window from Settings (end exclusive, anchor day inclusive)."""
    settings = get_settings()
    moment = datetime.fromisoformat(center_iso_date)
    start = (
        moment - timedelta(days=settings.ee_scene_lookback_days)
    ).date().isoformat()
    end = (
        moment + timedelta(days=settings.ee_scene_forward_days)
    ).date().isoformat()
    return start, end


def _find_scene_date(ee_module: Any) -> tuple[str, list[str]]:
    """Pick the most recent candidate date with a cloud-filtered scene.

    Uses catalog *metadata* only (``size()``); this is date selection, not
    computation. Falls back to today when no candidate has a scene so the
    executor's own selection path still runs and reports its reason.
    """
    bbox = ee_workflows._clamp_bbox(ee_workflows._DEMO_AOI_BBOX)
    aoi = ee_module.Geometry.Rectangle(list(bbox))
    today = datetime.now(timezone.utc).date()
    notes: list[str] = []
    for offset in _CANDIDATE_OFFSETS_DAYS:
        center = (today - timedelta(days=offset)).isoformat()
        start, end = _window(center)
        count = (
            ee_module.ImageCollection(ee_workflows._SCENE_COLLECTION)
            .filterBounds(aoi)
            .filterDate(start, end)
            .filterMetadata(
                "CLOUDY_PIXEL_PERCENTAGE",
                "less_than",
                get_settings().ee_max_cloud_percent,
            )
            .size()
            .getInfo()
        )
        notes.append(f"{center}: {count} candidate scene(s)")
        if count:
            return center, notes
    return today.isoformat(), notes

def _print_traces(result: tools_base.ToolResult) -> None:
    print("=== traces (safe fields only) ===")
    for trace in result.traces:
        status = "ok  " if trace.ok else "fail"
        error = f"; error={trace.error}" if trace.error else ""
        print(f"[{status}] {trace.op}: {trace.detail or ''}{error}")


def main() -> int:
    settings = get_settings()
    # In-process only (never written to .env): exercise the real engine.
    settings.ee_enabled = True
    settings.tools_engine = "earthengine"

    print("=== configuration (in-process override; .env untouched) ===")
    print(f"ee_enabled:        {settings.ee_enabled}")
    print(f"tools_engine:      {settings.tools_engine}")
    print("credentials:       path from EE_CREDENTIALS_PATH (value not shown)")

    started = time.monotonic()
    try:
        ee_module = ee_client.get_ee()
    except ee_client.EeClientError as exc:
        print(f"EE initialization: FAILED -> {exc}")
        return 1
    print(
        "EE initialization: SUCCESS "
        f"(earthengine-api {getattr(ee_module, '__version__', 'unknown')})"
    )

    try:
        chosen_date, notes = _find_scene_date(ee_module)
    except Exception as exc:  # sanitized: type only
        print(f"scene-date probe:  FAILED -> {type(exc).__name__}")
        return 1
    print("scene-date probe (catalog metadata only):")
    for note in notes:
        print(f"  {note}")
    print(f"probe selected date: {chosen_date} (demo AOI; region absent → fallback)")

    acquisition = f"{chosen_date}T05:22:00Z"
    context = tools_base.ToolContext(
        session_id="ses_smoke",
        mode="single",
        category="water",
        question="Where is the water?",
        upload_ids=("upl_smoke",),
        upload_kinds=("optical",),
        region=None,  # demo AOI fallback (explicitly traced by the executor)
        acquisition_times=(acquisition,),
    )

    result: Optional[tools_base.ToolResult] = None
    try:
        result = tools.dispatch("water_mapping", context)
    except Exception as exc:  # transport-level surprise: sanitized
        print(f"dispatch:          FAILED -> {type(exc).__name__}")
        return 1
    elapsed = round(time.monotonic() - started, 3)

    print()
    _print_traces(result)

    print("\n=== summary ===")
    engine = result.metrics.get("engine")
    features = [feature for layer in result.layers for feature in layer["features"]]
    print(f"engine:            {engine}")
    print(f"scene found:       {'yes' if engine == 'earthengine' else 'no'}")
    print(f"selected scene:    {result.metrics.get('scene_id') or 'none'}")
    print(f"feature count:     {len(features)}")
    if engine == "earthengine":
        print(
            "total water area:  "
            f"{result.metrics.get('water_area_m2', 0) / 1e6:.3f} km²"
        )
        print(f"water fraction:    {result.metrics.get('water_fraction')}")
        print(f"confidence:        {result.metrics.get('confidence')}")
    else:
        print("total water area:  n/a (deterministic fallback)")
        failure = next((trace for trace in result.traces if not trace.ok), None)
        if failure is not None:
            print(f"failure reason:    {failure.op}: {failure.detail or failure.error}")
    print(f"elapsed:           {elapsed} s")

    if engine == "earthengine":
        print("\nREAL EE WATER MAPPING: PASS")
        return 0
    print("\nREAL EE WATER MAPPING: FAILED (fell back to the deterministic template)")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
