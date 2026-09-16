"""M3 water_mapping (Earth Engine executor) tests — fully hermetic.

The ``ee`` SDK is replaced by a recording fake graph bound to
``ee_client.get_ee``; Nominatim is faked at ``urllib.request.urlopen`` (or
skipped entirely for the demo-AOI path). No real Earth Engine computation,
no network, and no access to the real service-account credential ever occurs.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from backend.app import ee_client, tools, worker
from backend.app.config import get_settings
from backend.app.tools import base as tools_base
from backend.app.tools import earthengine_workflows as ee_workflows
from backend.app.tools import registry
from backend.tests.helpers import (
    API,
    age_job,
    create_session,
    make_ready_upload,
    submit_analysis,
)


def _epoch_ms(year: int, month: int, day: int, hour: int, minute: int, second: int) -> int:
    """Epoch milliseconds for a UTC instant (mirrors ``system:time_start``)."""
    return int(
        datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc).timestamp()
        * 1000
    )


class _Graph:
    """Shared fake-EE graph: configured outcomes + recorded calls."""

    def __init__(self) -> None:
        self.scene_id = "COPERNICUS/S2_SR_HARMONIZED/20260824T052201"
        self.water_area_m2 = 5_000_000.0
        self.aoi_area_m2 = 25_000_000.0
        self.vectors_geojson: dict[str, Any] = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"water": 1},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [
                                [72.95, 19.05],
                                [73.0, 19.05],
                                [73.0, 19.1],
                                [72.95, 19.1],
                                [72.95, 19.05],
                            ]
                        ],
                    },
                },
                {
                    "type": "Feature",
                    "properties": {"water": 1},
                    "geometry": {
                        "type": "MultiPolygon",
                        "coordinates": [
                            [
                                [
                                    [72.9, 19.0],
                                    [72.92, 19.0],
                                    [72.92, 19.02],
                                    [72.9, 19.02],
                                    [72.9, 19.0],
                                ]
                            ]
                        ],
                    },
                },
            ],
        }
        self.collection_ids: list[str] = []
        self.dates: list[tuple[str, str]] = []
        self.cloud_filter: tuple[str, str, int] | None = None
        self.nd_bands: tuple[str, ...] | None = None
        self.threshold: float | None = None
        self.feature_limit: int | None = None
        self.mapped = False
        self.scene_count = 1  # cloud-filtered scenes the fake collection reports
        self.scene_cloud = 41.97
        self.scene_time_ms: int | None = _epoch_ms(2026, 9, 5, 5, 42, 51)
        self.sorts: list[str] = []
        self.reduce_region_kwargs: dict[str, Any] | None = None
        self.calls: list[str] = []


class _EmptyImagePropertyError(RuntimeError):
    """Stands in for the real SDK's EEException on empty-image property reads."""

class _FakeString:
    def __init__(self, graph: _Graph) -> None:
        self._graph = graph

    def getInfo(self) -> str:
        self._graph.calls.append("scene_id.getInfo")
        return self._graph.scene_id


class _FakeProperty:
    """Stands in for ``image.get(prop)``; resolves from the graph's properties."""

    def __init__(self, graph: _Graph, prop: str) -> None:
        self._graph = graph
        self.prop = prop

    def getInfo(self) -> Any:
        return {
            "system:id": self._graph.scene_id,
            "system:time_start": self._graph.scene_time_ms,
            "CLOUDY_PIXEL_PERCENTAGE": self._graph.scene_cloud,
        }.get(self.prop)


class _FakeDictionary:
    """Evaluates a ``{key: <expression>}`` mapping like ``ee.Dictionary``."""

    def __init__(self, mapping: dict[str, Any]) -> None:
        self._mapping = mapping

    def getInfo(self) -> dict[str, Any]:
        return {
            key: (value.getInfo() if hasattr(value, "getInfo") else value)
            for key, value in self._mapping.items()
        }


class _FakeNumber:
    def __init__(self, graph: _Graph, value: float) -> None:
        self._graph = graph
        self._value = value

    def getInfo(self) -> float:
        self._graph.calls.append("number.getInfo")
        return self._value


class _FakeReduction:
    def __init__(self, graph: _Graph) -> None:
        self._graph = graph

    def getInfo(self) -> dict[str, float]:
        self._graph.calls.append("reduction.getInfo")
        return {"area": self._graph.water_area_m2}


class _FakeGeometry:
    def __init__(self, graph: _Graph, coords: list[float]) -> None:
        self._graph = graph
        self.coords = coords

    def area(self, maxError: float | None = None) -> _FakeNumber:
        self._graph.calls.append("aoi.area")
        return _FakeNumber(self._graph, self._graph.aoi_area_m2)


class _FakeImage:
    def __init__(self, graph: _Graph) -> None:
        self._graph = graph

    def rename(self, name: str) -> "_FakeImage":
        return self

    def gt(self, threshold: float) -> "_FakeImage":
        self._graph.threshold = threshold
        return self

    def selfMask(self) -> "_FakeImage":
        return self

    def clip(self, geometry: Any) -> "_FakeImage":
        return self

    def updateMask(self, mask: Any) -> "_FakeImage":
        return self

    def reduceRegion(self, **kwargs: Any) -> _FakeReduction:
        self._graph.calls.append("reduceRegion")
        self._graph.reduce_region_kwargs = kwargs
        return _FakeReduction(self._graph)

    def reduceToVectors(self, **kwargs: Any) -> "_FakeVectors":
        self._graph.reduce_to_vectors_kwargs = kwargs
        return _FakeVectors(self._graph)


class _FakeScene:
    def __init__(self, graph: _Graph) -> None:
        self._graph = graph

    def get(self, prop: str) -> _FakeProperty:
        if self._graph.scene_count <= 0:
            # Mirrors the real SDK: property reads on an empty image raise.
            raise _EmptyImagePropertyError(prop)
        return _FakeProperty(self._graph, prop)

    def normalizedDifference(self, bands: list[str]) -> _FakeImage:
        self._graph.nd_bands = tuple(bands)
        return _FakeImage(self._graph)


class _FakeVectors:
    def __init__(self, graph: _Graph) -> None:
        self._graph = graph

    def limit(self, count: int) -> "_FakeVectors":
        self._graph.feature_limit = count
        return self

    def map(self, mapper: Any) -> "_FakeVectors":
        self._graph.mapped = True
        return self

    def getInfo(self) -> dict[str, Any]:
        self._graph.calls.append("vectors.getInfo")
        return self._graph.vectors_geojson


class _FakeCollection:
    def __init__(self, graph: _Graph) -> None:
        self._graph = graph

    def filterBounds(self, aoi: Any) -> "_FakeCollection":
        return self

    def filterDate(self, start: str, end: str) -> "_FakeCollection":
        self._graph.dates.append((start, end))
        return self

    def filterMetadata(self, prop: str, operator: str, value: int) -> "_FakeCollection":
        self._graph.cloud_filter = (prop, operator, value)
        return self

    def sort(self, prop: str) -> "_FakeCollection":
        self._graph.sorts.append(prop)  # ranking: ascending by this property
        return self

    def size(self) -> _FakeNumber:
        self._graph.calls.append("size.getInfo")
        return _FakeNumber(self._graph, self._graph.scene_count)

    def first(self) -> _FakeScene:
        return _FakeScene(self._graph)


def _make_fake_ee(graph: _Graph) -> SimpleNamespace:
    fake = SimpleNamespace(__version__="fake-ee")
    fake.ImageCollection = lambda collection_id: (
        graph.collection_ids.append(collection_id),
        _FakeCollection(graph),
    )[1]
    fake.Geometry = SimpleNamespace(
        Rectangle=lambda coords, **kwargs: _FakeGeometry(graph, coords)
    )
    fake.Image = SimpleNamespace(pixelArea=lambda: _FakeImage(graph))
    fake.Reducer = SimpleNamespace(sum=lambda: SimpleNamespace(name="sum"))
    fake.String = lambda value: _FakeString(graph)
    fake.Dictionary = lambda mapping: _FakeDictionary(mapping)
    return fake

# --- fixtures / helpers ---------------------------------------------------------


@pytest.fixture()
def ee_env(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> _Graph:
    """EE engine enabled end-to-end with the fake SDK; never real, never network."""
    ee_client._reset_for_tests()
    settings = get_settings()
    monkeypatch.setattr(settings, "ee_enabled", True)
    monkeypatch.setattr(settings, "ee_credentials_path", str(tmp_path / "fake.json"))
    monkeypatch.setattr(settings, "tools_engine", "earthengine")
    graph = _Graph()
    monkeypatch.setattr(ee_client, "get_ee", lambda: _make_fake_ee(graph))
    yield graph
    ee_client._reset_for_tests()


@pytest.fixture(autouse=True)
def _clear_geocode_cache():
    ee_workflows._GEOCODE_CACHE.clear()
    yield
    ee_workflows._GEOCODE_CACHE.clear()


def _context(mode: str = "single", **overrides: Any) -> tools_base.ToolContext:
    values: dict[str, Any] = dict(
        session_id="ses_test",
        mode=mode,
        category="water",
        question="Where is the water?",
        upload_ids=("upl_a",),
        upload_kinds=("optical",),
        acquisition_times=("2026-08-24T05:22:00Z",),
    )
    values.update(overrides)
    return tools_base.ToolContext(**values)


# --- executor happy path ---------------------------------------------------------


def test_water_mapping_happy_path_contract_shape(ee_env: _Graph) -> None:
    graph = ee_env
    result, traces = ee_workflows.try_execute("water_mapping", _context())
    assert result is not None
    assert [trace.op for trace in traces] == [
        "get_ee",
        "resolve_aoi",
        "select_scene",
        "compute_ndwi",
    ]
    assert all(trace.ok for trace in traces)
    assert any("source=demo-fallback" in (trace.detail or "") for trace in traces)
    assert any("scene=COPERNICUS" in (trace.detail or "") for trace in traces)

    layer = result.layers[0]
    assert layer["id"] == "single"
    assert layer["label"].startswith("NDWI water bodies")
    features = layer["features"]
    assert [feature["id"] for feature in features] == ["ndwi1", "ndwi2"]
    for feature in features:
        ring = feature["geometry"]["coordinates"][0]
        assert ring[0] == ring[-1]                     # closed ring
        assert all(len(point) == 2 for point in ring)  # [lng, lat]
        assert 72.0 <= ring[0][0] <= 74.0 and 18.0 <= ring[0][1] <= 20.0
        assert feature["type"] == "water"
        assert isinstance(feature["area_m2"], int) and feature["area_m2"] >= 0
        assert 0.05 <= feature["confidence"] <= 0.95

    assert result.metrics["engine"] == "earthengine"
    assert result.metrics["scene_id"] == graph.scene_id
    assert result.metrics["water_fraction"] == pytest.approx(0.2)
    # Scene facts are recorded: the REAL scene date + cloud cover, plus the
    # declared anchor and the bounded search window (no silent date swap).
    assert result.metrics["scene_date"] == "2026-09-05"
    assert result.metrics["cloud_pct"] == pytest.approx(41.97)
    assert result.metrics["anchor_date"] == "2026-08-24"
    assert result.metrics["window_start"] == "2026-07-10"  # anchor - 45 days
    assert result.metrics["window_end"] == "2026-08-28"    # anchor + 4 (exclusive)
    select_trace = next(trace for trace in traces if trace.op == "select_scene")
    assert select_trace.detail is not None
    assert "scene_date=2026-09-05" in select_trace.detail
    assert "cloud_pct=41.97" in select_trace.detail
    assert "anchor_date=2026-08-24" in select_trace.detail
    assert "window=2026-07-10..2026-08-28" in select_trace.detail
    assert "ceiling<50.00" in select_trace.detail
    assert graph.collection_ids == ["COPERNICUS/S2_SR_HARMONIZED"]
    assert graph.dates == [("2026-07-10", "2026-08-28")]
    assert graph.cloud_filter == ("CLOUDY_PIXEL_PERCENTAGE", "less_than", 50.0)
    assert graph.sorts == ["CLOUDY_PIXEL_PERCENTAGE"]  # ranked ascending
    assert graph.nd_bands == ("B3", "B8")
    assert graph.threshold == ee_workflows._NDWI_THRESHOLD
    assert graph.feature_limit == ee_workflows._MAX_FEATURES
    assert graph.mapped is True


def test_water_mapping_uses_nominatim_source_when_resolved(
    ee_env: _Graph, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        ee_workflows,
        "_nominatim_bbox",
        lambda city, state: (72.85, 19.02, 73.0, 19.12),
    )
    result, traces = ee_workflows.try_execute(
        "water_mapping",
        _context(region={"city": "Mumbai", "state": "Maharashtra"}),
    )
    assert result is not None
    resolve = next(trace for trace in traces if trace.op == "resolve_aoi")
    assert resolve.detail is not None
    assert resolve.detail.startswith("source=nominatim")
    # Clamped per axis, preserving the (small) provided extent:
    assert "bbox=(72.8500, 19.0200, 73.0000, 19.1200)" in resolve.detail

# --- engine selection + fail-closed fallbacks ------------------------------------


def test_registry_selects_ee_engine_for_water_mapping(ee_env: _Graph) -> None:
    result = registry.dispatch("water_mapping", _context())
    assert result.metrics["engine"] == "earthengine"
    assert result.layers[0]["label"].startswith("NDWI water bodies")


def test_engine_default_is_template_never_touches_ee(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    assert get_settings().tools_engine == "template"

    def forbidden():
        raise AssertionError("EE must not be initialized on the template engine")

    monkeypatch.setattr(ee_client, "get_ee", forbidden)
    result = registry.dispatch("water_mapping", _context())
    assert list(result.layers) == worker.workflow_template("water_mapping")["layers"]
    assert result.metrics == {
        "source": "worker.template",
        "workflow_id": "water_mapping",
    }


def test_no_scene_falls_back_with_reason(ee_env: _Graph) -> None:
    ee_env.scene_id = ""
    result = registry.dispatch("water_mapping", _context())
    assert result.metrics["engine"] == "template-fallback"
    assert list(result.layers) == worker.workflow_template("water_mapping")["layers"]
    assert [trace.op for trace in result.traces[:3]] == [
        "get_ee",
        "resolve_aoi",
        "select_scene",
    ]
    select_trace = next(trace for trace in result.traces if trace.op == "select_scene")
    assert select_trace.ok is False
    assert "no cloud-filtered scene" in (select_trace.detail or "")
    assert "in 2026-07-10..2026-08-28" in (select_trace.detail or "")
    assert "CLOUDY_PIXEL_PERCENTAGE < 50.00" in (select_trace.detail or "")
    assert result.traces[-1].op == "build_layers"  # deterministic trace appended


def test_empty_cloud_filtered_collection_reported_not_raised(ee_env: _Graph) -> None:
    """Real-SDK behaviour: property reads on an empty image raise EEException.

    The size() guard must report the sanitized no-scene reason instead of
    letting that exception surface as a generic execute failure, and the
    deterministic fallback must still apply.
    """
    ee_env.scene_count = 0
    result, traces = ee_workflows.try_execute("water_mapping", _context())
    assert result is None
    select_trace = next(trace for trace in traces if trace.op == "select_scene")
    assert select_trace.ok is False
    assert "no cloud-filtered scene" in (select_trace.detail or "")
    # The empty-image exception never surfaced as a generic execute failure:
    assert all(trace.op != "execute" for trace in traces)

    fallback = registry.dispatch("water_mapping", _context())
    assert fallback.metrics["engine"] == "template-fallback"
    assert list(fallback.layers) == worker.workflow_template("water_mapping")["layers"]


def test_zero_water_falls_back(ee_env: _Graph) -> None:
    ee_env.water_area_m2 = 0.0
    result = registry.dispatch("water_mapping", _context())
    assert result.metrics["engine"] == "template-fallback"
    ee_attempt = next(trace for trace in result.traces if trace.op == "compute_ndwi")
    assert ee_attempt.ok is False
    assert "no water pixels" in (ee_attempt.detail or "")


def test_non_water_workflow_has_no_ee_executor(ee_env: _Graph) -> None:
    result, traces = ee_workflows.try_execute(
        "change_detection", _context(mode="twoDate")
    )
    assert result is None
    assert len(traces) == 1
    assert traces[0].detail == "no earthengine executor registered for this workflow"


def test_ee_failure_is_sanitized_and_falls_back(
    ee_env: _Graph, monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken_get_ee():
        raise ee_client.EeClientError("Earth Engine is disabled")

    monkeypatch.setattr(ee_client, "get_ee", broken_get_ee)
    result = registry.dispatch("water_mapping", _context())
    assert result.metrics["engine"] == "template-fallback"
    execute_trace = result.traces[0]
    assert execute_trace.op == "execute"
    assert execute_trace.ok is False
    assert execute_trace.error == "EeClientError"  # sanitized: type name only
    assert list(result.layers) == worker.workflow_template("water_mapping")["layers"]


def test_unparseable_acquisition_date_falls_back(ee_env: _Graph) -> None:
    result, traces = ee_workflows.try_execute(
        "water_mapping", _context(acquisition_times=("not-a-date",))
    )
    assert result is None
    select = traces[-1]
    assert select.op == "select_scene" and select.ok is False
    assert "no parseable acquisition date" in (select.detail or "")

# --- store integration: acquisition_times reach the registry ----------------------


def test_store_populates_acquisition_times(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    captured: dict[str, Any] = {}

    def fake_dispatch(workflow_id: str, context: tools_base.ToolContext):
        captured["workflow_id"] = workflow_id
        captured["context"] = context
        return tools_base.ToolResult(
            layers=tuple(worker.workflow_template(workflow_id)["layers"])
        )

    monkeypatch.setattr(tools, "dispatch", fake_dispatch)
    upload = make_ready_upload(client)
    session = create_session(client, "single", [upload])
    job = submit_analysis(client, session["session_id"])
    age_job(job["job_id"], 9.5)
    client.get(f"{API}/jobs/{job['job_id']}").json()

    assert captured["workflow_id"] == "single_image_vqa"
    assert captured["context"].acquisition_times == ("2026-08-24T05:22:00Z",)


# --- Nominatim resolver units -----------------------------------------------------


class _FakeUrlopenResponse:
    def __init__(self, payload: bytes) -> None:
        self._payload = payload

    def read(self) -> bytes:
        return self._payload

    def __enter__(self) -> "_FakeUrlopenResponse":
        return self

    def __exit__(self, *args: Any) -> bool:
        return False


def test_nominatim_bbox_parses_and_caches(
    ee_env: _Graph, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[tuple[str, dict[str, str]]] = []
    payload = json.dumps(
        [{"boundingbox": ["18.9", "19.2", "72.8", "73.1"]}]
    ).encode("utf-8")

    def fake_urlopen(request: Any, timeout: float | None = None) -> _FakeUrlopenResponse:
        calls.append((request.full_url, dict(request.headers)))
        return _FakeUrlopenResponse(payload)

    monkeypatch.setattr(ee_workflows.urllib.request, "urlopen", fake_urlopen)

    first = ee_workflows._nominatim_bbox("Mumbai", "Maharashtra")
    second = ee_workflows._nominatim_bbox("Mumbai", "Maharashtra")
    assert first == (72.8, 18.9, 73.1, 19.2)
    assert second == first
    assert len(calls) == 1  # second call served from the cache
    url, headers = calls[0]
    assert "nominatim" in url and "Mumbai" in url and "India" in url
    assert any("user-agent" in key.lower() for key in headers)


def test_nominatim_bbox_failure_returns_none(
    ee_env: _Graph, monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken(request: Any, timeout: float | None = None) -> Any:
        raise OSError("nominatim down")

    monkeypatch.setattr(ee_workflows.urllib.request, "urlopen", broken)
    assert ee_workflows._nominatim_bbox("Mumbai", "Maharashtra") is None


def test_nominatim_skipped_without_region(
    ee_env: _Graph, monkeypatch: pytest.MonkeyPatch
) -> None:
    def forbidden(request: Any, timeout: float | None = None) -> Any:
        raise AssertionError("Nominatim must not be called without a region")

    monkeypatch.setattr(ee_workflows.urllib.request, "urlopen", forbidden)
    assert ee_workflows._nominatim_bbox(None, None) is None


# --- scene-selection parameters (explicit configuration) --------------------------


def test_scene_selection_defaults_are_documented_values() -> None:
    """Defaults are explicit: 45-day lookback, 4 forward days, 50% ceiling."""
    settings = get_settings()
    assert settings.ee_scene_lookback_days == 45
    assert settings.ee_scene_forward_days == 4
    assert settings.ee_max_cloud_percent == 50.0


def test_scene_selection_parameters_are_configurable(
    ee_env: _Graph, monkeypatch: pytest.MonkeyPatch
) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "ee_scene_lookback_days", 10)
    monkeypatch.setattr(settings, "ee_scene_forward_days", 2)
    monkeypatch.setattr(settings, "ee_max_cloud_percent", 35.0)

    result, traces = ee_workflows.try_execute("water_mapping", _context())
    assert result is not None
    assert ee_env.dates == [("2026-08-14", "2026-08-26")]  # anchor ± configured
    assert ee_env.cloud_filter == ("CLOUDY_PIXEL_PERCENTAGE", "less_than", 35.0)
    assert result.metrics["anchor_date"] == "2026-08-24"
    assert result.metrics["window_start"] == "2026-08-14"
    assert result.metrics["window_end"] == "2026-08-26"
    select_trace = next(trace for trace in traces if trace.op == "select_scene")
    assert "ceiling<35.00" in (select_trace.detail or "")


def test_ranked_selection_orders_by_cloud_before_first(ee_env: _Graph) -> None:
    result, _traces = ee_workflows.try_execute("water_mapping", _context())
    assert result is not None
    assert ee_env.sorts == ["CLOUDY_PIXEL_PERCENTAGE"]


def test_acquisition_anchor_is_preserved_from_upload_metadata(ee_env: _Graph) -> None:
    """Different declared dates yield different windows — never "today"."""
    anchors = []
    for acquisition, upload_id in (
        ("2026-08-24T05:22:00Z", "upl_a"),
        ("2026-03-02T09:00:00Z", "upl_b"),
    ):
        result, _traces = ee_workflows.try_execute(
            "water_mapping",
            _context(acquisition_times=(acquisition,), upload_ids=(upload_id,)),
        )
        assert result is not None
        anchors.append(
            (
                result.metrics["anchor_date"],
                result.metrics["window_start"],
                result.metrics["window_end"],
            )
        )
    assert anchors == [
        ("2026-08-24", "2026-07-10", "2026-08-28"),
        ("2026-03-02", "2026-01-16", "2026-03-06"),
    ]


def test_missing_scene_date_is_recorded_as_unknown(ee_env: _Graph) -> None:
    """A scene without ``system:time_start`` is still selected, but reported."""
    ee_env.scene_time_ms = None
    result, traces = ee_workflows.try_execute("water_mapping", _context())
    assert result is not None
    assert result.metrics["scene_date"] is None
    select_trace = next(trace for trace in traces if trace.op == "select_scene")
    assert "scene_date=unknown" in (select_trace.detail or "")