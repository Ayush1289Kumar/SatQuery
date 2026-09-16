"""M4.1 provenance-plumbing tests.

Covers: full ToolResult retention in the store (strictly once-per-job
dispatch), metrics/trace survival through result construction, additive
evidence/provenance fields appearing ONLY for genuine Earth Engine execution
(``engine == "earthengine"``), no invention of missing metric values, no
secret leakage, and byte-identical payloads for the template /
template-fallback / mock paths (including change_detection regression).

Everything here is hermetic: Earth Engine is simulated via monkeypatched
``tools.dispatch``; no EE SDK, network, or credentials are involved.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

from backend.app import store as store_module
from backend.app import tools, worker
from backend.app.tools import base as tools_base
from backend.tests.helpers import (
    API,
    age_job,
    create_session,
    make_ready_upload,
    submit_analysis,
)

# --- crafted Earth Engine tool output (mirrors the M3 executor shape) ---------

EE_METRICS: dict[str, Any] = {
    "engine": "earthengine",
    "collection": "COPERNICUS/S2_SR_HARMONIZED",
    "scene_id": "S2B_43PFR_20260824_0_L2A",
    "scene_date": "2026-08-24",
    "cloud_pct": 12.4,
    "anchor_date": "2026-08-24",
    "window_start": "2026-08-17",
    "window_end": "2026-08-31",
    "ndwi_threshold": 0.15,
    "water_area_m2": 4_210_000,
    "aoi_area_m2": 510_000_000,
    "water_fraction": 0.0083,
    "confidence": 0.42,
}

# Deliberately non-whitelisted (internal) keys that must never surface.
SECRET_METRICS: dict[str, Any] = {
    "credentials_path": "C:/backend/credentials/satquery-earth-engine.json",
    "api_key": "AIzaSySECRET-KEY-VALUE",
    "project_id": "satquery-ee-project",
    "service_account": "sa@satquery-ee-project.iam.gserviceaccount.com",
}

EE_LAYER: dict[str, Any] = {
    "id": "single",
    "label": "NDWI water bodies · S2B_43PFR_20260824_0_L2A",
    "opacity": 1.0,
    "features": [
        {
            "id": "ee_w1",
            "type": "water",
            "label": "Water body",
            "confidence": 0.42,
            "area_m2": 1_234_567,
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [72.9, 19.13], [72.94, 19.17], [72.99, 19.15],
                        [72.97, 19.1], [72.93, 19.09], [72.9, 19.11],
                        [72.9, 19.13],
                    ]
                ],
            },
        }
    ],
}

EE_TRACES: tuple[tools_base.ToolTrace, ...] = (
    tools_base.ToolTrace(
        "ee:water_mapping",
        "resolve_aoi",
        True,
        0.12,
        None,
        "aoi_source=demo-fallback (no Nominatim offline)",
    ),
    tools_base.ToolTrace(
        "ee:water_mapping",
        "select_scene",
        True,
        0.35,
        None,
        "scene=S2B_43PFR_20260824_0_L2A; cloud_pct=12.4",
    ),
    tools_base.ToolTrace(
        "ee:water_mapping",
        "compute_ndwi",
        True,
        1.4,
        None,
        "water_km2=4.21; water_fraction=0.0083; features=1",
    ),
)

BASE_RESULT_KEYS = {
    "result_id",
    "session_id",
    "job_id",
    "question",
    "answer",
    "confidence",
    "confidence_band",
    "workflow",
    "models",
    "usage_time_sec",
    "created_at",
    "completed_at",
    "inputs",
    "layers",
}

TRACE_FIELD_KEYS = {"tool_id", "op", "ok", "duration_s", "error", "detail"}


def _ee_tool_result() -> tools_base.ToolResult:
    return tools_base.ToolResult(
        layers=(EE_LAYER,),
        metrics=dict(EE_METRICS),
        traces=EE_TRACES,
    )


def _water_job(client: TestClient) -> tuple[dict[str, Any], dict[str, Any]]:
    """Single-mode water_mapping job aged past the mock timeline."""
    upload = make_ready_upload(client)
    session = create_session(client, "single", [upload])
    job = submit_analysis(
        client, session["session_id"], "Where are the water bodies in this image?"
    )
    age_job(job["job_id"], 9.5)
    return session, job


def _latest_result(client: TestClient, session_id: str) -> dict[str, Any]:
    resp = client.get(f"{API}/sessions/{session_id}/results/latest")
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]


# --- full ToolResult retention (strictly once-per-job dispatch) ---------------


def test_full_tool_result_retained_per_job(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    seen: list[str] = []

    def ee_dispatch(
        workflow_id: str, context: tools_base.ToolContext
    ) -> tools_base.ToolResult:
        seen.append(workflow_id)
        return _ee_tool_result()

    monkeypatch.setattr(tools, "dispatch", ee_dispatch)
    session, job = _water_job(client)

    store = store_module.get_store()
    job_record = store.get_job(job["job_id"])
    first = store.ensure_result(job_record)
    assert first is not None

    # The full ToolResult (layers + metrics + traces) is retained per job...
    retained = store._tool_results[job["job_id"]]
    assert isinstance(retained, tools_base.ToolResult)
    assert retained.metrics["engine"] == "earthengine"
    assert retained.layers[0]["id"] == "single"
    assert len(retained.traces) == len(EE_TRACES)

    # ...and repeated result builds never re-dispatch the tool.
    second = store.ensure_result(job_record)
    third = _latest_result(client, session["session_id"])
    assert seen == ["water_mapping"]
    assert second["result_id"] == first["result_id"]
    assert third["result_id"] == first["result_id"]


def test_metrics_and_traces_survive_result_construction(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        tools, "dispatch", lambda workflow_id, context: _ee_tool_result()
    )
    session, _ = _water_job(client)
    result = _latest_result(client, session["session_id"])

    # Metrics survive (whitelisted keys, verbatim values)...
    evidence = result["evidence"]
    for key, value in EE_METRICS.items():
        if key in ("engine", "collection"):
            # engine is the emission discriminator and collection the internal
            # EE handle — both deliberately excluded from the payload.
            assert key not in evidence
            continue
        assert evidence[key] == value, key

    assert result["answer_source"] == "deterministic+earthengine"

    # ...and traces survive field-by-field, whitelist-only.
    traces = result["provenance"]["traces"]
    assert len(traces) == len(EE_TRACES)
    for trace in traces:
        assert set(trace.keys()) == TRACE_FIELD_KEYS
    assert [trace["op"] for trace in traces] == [
        "resolve_aoi",
        "select_scene",
        "compute_ndwi",
    ]
    assert all(trace["error"] is None for trace in traces)
    assert traces[0]["detail"] == EE_TRACES[0].detail
    assert traces[1]["tool_id"] == "ee:water_mapping"


# --- engine gating: only engine="earthengine" gains the additive fields ----


def test_template_tool_result_gains_no_provenance(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        tools,
        "dispatch",
        lambda workflow_id, context: tools_base.ToolResult(
            layers=(dict(worker.workflow_template("water_mapping")["layers"][0]),),
            metrics={"source": "worker.template", "workflow_id": workflow_id},
        ),
    )
    session, _ = _water_job(client)
    result = _latest_result(client, session["session_id"])
    assert "answer_source" not in result
    assert "evidence" not in result
    assert "provenance" not in result


def test_template_fallback_metrics_gain_no_provenance(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        tools,
        "dispatch",
        lambda workflow_id, context: tools_base.ToolResult(
            layers=(dict(worker.workflow_template("water_mapping")["layers"][0]),),
            metrics={"engine": "template-fallback", "workflow_id": workflow_id},
            traces=EE_TRACES,
        ),
    )
    session, _ = _water_job(client)
    result = _latest_result(client, session["session_id"])
    assert "answer_source" not in result
    assert "evidence" not in result
    assert "provenance" not in result


def test_dispatch_failure_gains_no_provenance(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def boom(
        workflow_id: str, context: tools_base.ToolContext
    ) -> tools_base.ToolResult:
        raise tools_base.ToolError("simulated registry failure")

    monkeypatch.setattr(tools, "dispatch", boom)
    session, _ = _water_job(client)
    result = _latest_result(client, session["session_id"])
    assert "answer_source" not in result
    assert "evidence" not in result
    assert "provenance" not in result
    # Fail-closed layers: the deterministic template evidence remains.
    assert len(result["layers"]) == len(
        worker.workflow_template("water_mapping")["layers"]
    )


# --- additive-only guarantees ------------------------------------------------


def test_template_path_payload_has_exactly_base_keys(client: TestClient) -> None:
    """Default template path: result keys are exactly the pre-M4.1 set."""
    session, _ = _water_job(client)
    result = _latest_result(client, session["session_id"])
    assert set(result.keys()) == BASE_RESULT_KEYS


def test_existing_fields_unchanged_with_ee_metrics(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        tools, "dispatch", lambda workflow_id, context: _ee_tool_result()
    )
    session, _ = _water_job(client)
    result = _latest_result(client, session["session_id"])
    template = worker.workflow_template("water_mapping")
    # Only the three additive fields appear on top of the base payload...
    assert set(result.keys()) - BASE_RESULT_KEYS == {
        "answer_source",
        "evidence",
        "provenance",
    }
    # ...and every existing field keeps its exact template value (the answer
    # is the M4.3 facts-honest composition for genuine EE executions).
    assert result["answer"] == tools_base.compose_water_answer(
        tools_base.MeasurementFacts.from_metrics(dict(EE_METRICS))
    )
    assert result["confidence"] == template["confidence"]
    assert result["confidence_band"] == worker.confidence_band(
        float(template["confidence"])
    )
    assert result["workflow"]["id"] == "water_mapping"
    assert result["models"] == template["models"]
    assert result["usage_time_sec"] == template["usage_time_sec"]
    # The EE layer remains the map evidence.
    assert result["layers"][0]["id"] == EE_LAYER["id"]
    assert result["layers"][0]["label"] == EE_LAYER["label"]


def test_provenance_never_leaks_secrets(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    hostile_traces = (
        tools_base.ToolTrace(
            "ee:water_mapping",
            "select_scene",
            False,
            0.05,
            RuntimeError(
                "EEException: project satquery-ee-project key AIzaSySECRET-KEY-VALUE "
                "credentials C:/backend/credentials/satquery-earth-engine.json"
            ),
            "scene=S2B_43PFR_20260824_0_L2A; cloud_pct=12.4",
        ),
    )
    monkeypatch.setattr(
        tools,
        "dispatch",
        lambda workflow_id, context: tools_base.ToolResult(
            layers=(EE_LAYER,),
            metrics={**EE_METRICS, **SECRET_METRICS},
            traces=hostile_traces,
        ),
    )
    session, _ = _water_job(client)
    result = _latest_result(client, session["session_id"])
    blob = json.dumps(result)
    for secret in (
        "AIzaSySECRET-KEY-VALUE",
        "satquery-ee-project",
        "credentials",
        "service_account",
        "gserviceaccount",
    ):
        assert secret not in blob, secret
    # Whitelist-only evidence: injected non-measurement keys are dropped.
    assert set(result["evidence"]) == set(EE_METRICS) - {"engine", "collection"}
    # The failed trace exposes the exception TYPE only, never its message.
    trace = result["provenance"]["traces"][0]
    assert trace["error"] == "RuntimeError"
    assert trace["ok"] is False
    assert trace["detail"] == "scene=S2B_43PFR_20260824_0_L2A; cloud_pct=12.4"


def test_change_detection_workflow_no_regression(client: TestClient) -> None:
    """twoDate/change_detection template path: no provenance, labels intact."""
    before = make_ready_upload(client, filename="city_2026-08-10.tif")
    after = make_ready_upload(client, filename="city_2026-09-01.tif")
    session = create_session(client, "twoDate", [before, after])
    job = submit_analysis(client, session["session_id"])
    age_job(job["job_id"], 9.5)
    result = _latest_result(client, session["session_id"])
    assert result["workflow"]["id"] == "change_detection"
    assert set(result.keys()) == BASE_RESULT_KEYS
    assert [layer["label"] for layer in result["layers"]] == [
        "2026-08-10 (before)",
        "2026-09-01 (after)",
    ]