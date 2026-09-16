"""M4.3 deterministic facts-honest composer tests.

The composer turns genuine Earth Engine MeasurementFacts into a stable
answer when Gemini produced none — and only then. Covers: verbatim facts,
clean omission of absent/hostile facts, distinct anchor vs scene dates,
byte-for-byte determinism, the end-to-end EE-success + Gemini-failure path,
unchanged Gemini-success and template-fallback paths, non-water workflows,
secret safety, and payload-shape compatibility.

Hermetic throughout: tools.dispatch and ai.generate_ai_answer are
monkeypatched; no Earth Engine, no Gemini, no credentials.
"""
from __future__ import annotations

import json
from typing import Any

import pytest
from fastapi.testclient import TestClient

from backend.app import ai
from backend.app import tools
from backend.app import worker
from backend.app.config import get_settings
from backend.app.tools import base as tools_base
from backend.tests.helpers import (
    age_job,
    complete_upload,
    create_session,
    initiate_upload,
    join_ai_threads,
    put_upload_bytes,
    submit_analysis,
)

# M3-executor-shaped EE metrics (feature_count/aoi_source genuinely absent).
EE_METRICS: dict[str, Any] = {
    "engine": "earthengine",
    "collection": "COPERNICUS/S2_SR_HARMONIZED",
    "scene_id": "S2B_43PFR_20260820_0_L2A",
    "scene_date": "2026-08-20",
    "cloud_pct": 12.4,
    "anchor_date": "2026-08-24",
    "window_start": "2026-07-10",
    "window_end": "2026-08-28",
    "ndwi_threshold": 0.15,
    "water_area_m2": 4_210_537,
    "aoi_area_m2": 510_499_233,
    "water_fraction": 0.008248,
    "confidence": 0.42,
}

RESULT_KEYS = {
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

ADDITIVE_KEYS = {"answer_source", "evidence", "provenance"}

EE_LAYER: dict[str, Any] = {
    "id": "single",
    "label": "NDWI water bodies · S2B_43PFR_20260820_0_L2A",
    "opacity": 1.0,
    "features": [],
}


def compose(metrics: "dict[str, Any] | None") -> "str | None":
    """Compose from metrics via the single shared extraction path."""
    facts = (
        tools_base.MeasurementFacts.from_metrics(dict(metrics))
        if metrics is not None
        else None
    )
    return tools_base.compose_water_answer(facts)


def _ee_tool_result(metrics: dict[str, Any] | None = None) -> tools_base.ToolResult:
    trace = tools_base.ToolTrace(
        "ee:water_mapping",
        "compute_ndwi",
        True,
        1.4,
        None,
        "water_km2=4.21; water_fraction=0.0083; features=1",
    )
    return tools_base.ToolResult(
        layers=(EE_LAYER,),
        metrics=dict(EE_METRICS if metrics is None else metrics),
        traces=(trace,),
    )


def _enable_ee_engine(monkeypatch) -> None:
    """Opt into the Earth Engine tool engine (provider stays mock)."""
    monkeypatch.setattr(get_settings(), "tools_engine", "earthengine")


def _enable_grounded(monkeypatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "ai_provider", "gemini")
    monkeypatch.setattr(settings, "tools_engine", "earthengine")
    monkeypatch.setattr(settings, "answer_composition", "gemini_facts")
    monkeypatch.setattr(settings, "gemini_model", "gemini-test-model")
    monkeypatch.setattr(settings, "gemini_timeout_s", 5.0)


def _ready_png(client: TestClient, filename: str = "scene_2026-08-24.png") -> str:
    data = initiate_upload(client, filename=filename, content_type="image/png")
    put_upload_bytes(client, data["upload_id"], b"png-bytes-" + filename.encode())
    complete_upload(client, data["upload_id"])
    return data["upload_id"]


def _single_water_job(client: TestClient) -> tuple[dict[str, Any], dict[str, Any]]:
    upload = _ready_png(client)
    session = create_session(client, "single", [upload])
    job = submit_analysis(
        client, session["session_id"], "Where are the water bodies in this image?"
    )
    age_job(job["job_id"], 9.5)  # advance the mock timeline past completion
    return session, job


def _instrument(
    monkeypatch,
    *,
    dispatch_result: Any,
    gemini_outcome: ai.AiAnswer | None = None,
) -> tuple[list[str], list[dict[str, Any]]]:
    events: list[str] = []
    gemini_calls: list[dict[str, Any]] = []

    def fake_dispatch(workflow_id: str, context: Any) -> tools_base.ToolResult:
        events.append(f"dispatch:{workflow_id}")
        return dispatch_result

    def fake_generate(**kwargs: Any) -> ai.AiAnswer:
        events.append("gemini")
        gemini_calls.append(kwargs)
        if gemini_outcome is not None:
            return gemini_outcome
        return ai.AiAnswer(
            answer="Grounded: about 4.2 km² of water was mapped.",
            model_name="gemini-test-model",
            used=True,
            elapsed_s=1.2,
        )

    monkeypatch.setattr(tools, "dispatch", fake_dispatch)
    monkeypatch.setattr(ai, "generate_ai_answer", fake_generate)
    return events, gemini_calls


def _latest_result(client: TestClient, session_id: str) -> dict[str, Any]:
    resp = client.get(f"/api/v1/sessions/{session_id}/results/latest")
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]


# --- unit: composer over MeasurementFacts --------------------------------------


def test_complete_facts_compose_expected_answer() -> None:
    answer = compose(EE_METRICS)
    assert answer is not None
    # Distinct date semantics (anchor differs from actual scene date).
    assert "Requested analysis date: 2026-08-24." in answer
    assert "Selected Sentinel-2 scene: 2026-08-20." in answer
    # Authoritative values verbatim — never rounded or re-derived.
    assert "Scene cloud cover: 12.4%." in answer
    assert "Mapped water: 4210537 m² of a 510499233 m² analysis area." in answer
    assert "Water fraction: 0.008248." in answer
    assert "Water detected where NDWI exceeds 0.15." in answer
    assert "Confidence: 0.42." in answer
    # Only the whitelisted water facts appear — nothing else.
    assert "S2B_43PFR_20260820_0_L2A" not in answer
    assert "COPERNICUS" not in answer
    assert "2026-07-10" not in answer and "2026-08-28" not in answer
    assert "water bodies" not in answer  # feature_count genuinely absent


def test_missing_optional_facts_are_omitted_cleanly() -> None:
    minimal = {
        "engine": "earthengine",
        "scene_date": "2026-08-20",
        "water_area_m2": 4_210_537,
    }
    answer = compose(minimal)
    assert answer is not None
    assert answer == "Selected Sentinel-2 scene: 2026-08-20. Mapped water: 4210537 m²."
    # No fabricated placeholders for absent facts.
    for absent in (
        "Cloud cover",
        "fraction",
        "NDWI",
        "Confidence",
        "water bodies",
        "Requested analysis date",
    ):
        assert absent not in answer
    # Nothing usable at all → None (the template answer stays).
    assert compose({"engine": "earthengine"}) is None
    assert compose({}) is None
    assert compose(None) is None
    # Anchor without a scene date must not be back-filled.
    assert compose({"engine": "earthengine", "anchor_date": "2026-08-24"}) == (
        "Requested analysis date: 2026-08-24 (scene date unavailable)."
    )


def test_anchor_and_scene_dates_stay_distinct() -> None:
    differing = compose(EE_METRICS)
    assert differing is not None
    assert "Requested analysis date: 2026-08-24." in differing
    assert "Selected Sentinel-2 scene: 2026-08-20." in differing
    # Equal dates must NOT imply a spurious distinction...
    equal = compose({**EE_METRICS, "anchor_date": "2026-08-20"})
    assert equal is not None
    assert "Selected Sentinel-2 scene: 2026-08-20." in equal
    assert "Requested analysis date:" not in equal
    # ...and a missing scene date must never be presented as the anchor date.
    anchor_only = compose({**EE_METRICS, "scene_date": None})
    assert anchor_only is not None
    assert (
        "Requested analysis date: 2026-08-24 (scene date unavailable)."
        in anchor_only
    )
    assert "Selected Sentinel-2 scene:" not in anchor_only


def test_composer_is_deterministic() -> None:
    first = compose(EE_METRICS)
    second = compose(EE_METRICS)
    assert first is not None and second is not None
    assert first == second  # byte-for-byte identical
    rebuilt = tools_base.MeasurementFacts.from_metrics(dict(EE_METRICS))
    assert tools_base.compose_water_answer(rebuilt) == first
    # Source metrics key order must not matter.
    shuffled = dict(reversed(list(EE_METRICS.items())))
    assert compose(shuffled) == first


def test_hostile_fact_values_cannot_leak_into_the_answer() -> None:
    hostile = {
        "engine": "earthengine",
        "scene_date": "2026-08-20; credentials C:/backend/credentials/sa.json",
        "anchor_date": 12345,  # wrong type
        "cloud_pct": "AIzaSySECRET-KEY-VALUE",
        "water_area_m2": 4_210_537,
        "aoi_area_m2": {"evil": "payload"},
        "water_fraction": "not-a-number",
        "ndwi_threshold": True,  # bool must not masquerade as a number
        "confidence": 0.42,
        "feature_count": [1, 2, 3],
    }
    answer = compose(hostile)
    assert answer is not None
    blob = json.dumps(answer)
    for secret in ("AIza", "SECRET-KEY", "credentials", "C:/", "evil", "payload"):
        assert secret not in blob, secret
    # Only the well-typed facts survive; everything hostile is omitted.
    assert "Mapped water: 4210537 m²." in answer
    assert "Confidence: 0.42." in answer
    assert "Scene cloud cover" not in answer
    assert "Selected Sentinel-2 scene" not in answer
    assert "Requested analysis date" not in answer
    assert "Water fraction" not in answer
    assert "NDWI" not in answer
    assert "water bodies" not in answer


# --- end-to-end: EE success + Gemini failure → composer ------------------------


def test_ee_success_gemini_failure_uses_facts_composer(
    client: TestClient, monkeypatch
) -> None:
    _enable_ee_engine(monkeypatch)  # provider stays mock → Gemini unavailable
    monkeypatch.setattr(tools, "dispatch", lambda wf, ctx: _ee_tool_result())

    session, _ = _single_water_job(client)
    result = _latest_result(client, session["session_id"])

    expected = compose(EE_METRICS)
    assert expected is not None
    assert result["answer"] == expected
    assert "4210537" in result["answer"]
    assert result["answer_source"] == "deterministic+earthengine"
    assert result["evidence"] == {
        k: v for k, v in EE_METRICS.items() if k not in ("engine", "collection")
    }
    # Existing API contract intact: base fields + the three additive fields.
    assert set(result.keys()) == RESULT_KEYS | ADDITIVE_KEYS
    template = worker.workflow_template("water_mapping")
    assert result["confidence"] == template["confidence"]
    assert result["models"] == template["models"]  # no Gemini provenance claim
    assert result["usage_time_sec"] == template["usage_time_sec"]
    assert result["layers"][0]["id"] == "single"


def test_gemini_success_path_remains_unchanged(
    client: TestClient, monkeypatch
) -> None:
    _enable_grounded(monkeypatch)
    events, gemini_calls = _instrument(monkeypatch, dispatch_result=_ee_tool_result())

    session, _ = _single_water_job(client)
    join_ai_threads()
    result = _latest_result(client, session["session_id"])

    assert events == ["dispatch:water_mapping", "gemini"]
    assert gemini_calls[0]["measurements"] is not None
    # The Gemini answer wins; the composer must NOT override it.
    assert result["answer"] == "Grounded: about 4.2 km² of water was mapped."
    assert result["answer_source"] == "gemini+earthengine"
    assert result["models"][0]["name"] == "gemini-test-model"


def test_ee_failure_keeps_template_fallback(client: TestClient, monkeypatch) -> None:
    _enable_ee_engine(monkeypatch)
    fallback = tools_base.ToolResult(
        layers=(dict(worker.workflow_template("water_mapping")["layers"][0]),),
        metrics={
            "engine": "template-fallback",
            "source": "worker.template",
            "workflow_id": "water_mapping",
        },
        traces=(),
    )
    monkeypatch.setattr(tools, "dispatch", lambda wf, ctx: fallback)

    session, _ = _single_water_job(client)
    result = _latest_result(client, session["session_id"])

    template = worker.workflow_template("water_mapping")
    assert result["answer"] == template["answer"]  # hardcoded safety net intact
    assert set(result.keys()) == RESULT_KEYS  # no provenance fields, no EE claim
    assert "4210537" not in result["answer"]


def test_template_engine_keeps_existing_behavior(client: TestClient) -> None:
    # No settings changed at all: default template engine, mock provider.
    session, _ = _single_water_job(client)
    result = _latest_result(client, session["session_id"])

    template = worker.workflow_template("water_mapping")
    assert set(result.keys()) == RESULT_KEYS
    assert result["answer"] == template["answer"]
    assert result["layers"] == [
        {
            "id": layer["id"],
            "label": layer["label"],
            "opacity": layer["opacity"],
            "geometry_format": "geojson",
            "features": layer["features"],
        }
        for layer in template["layers"]
    ]


# --- non-water workflows and security ------------------------------------------


def test_non_water_workflow_not_routed_through_composer(
    client: TestClient, monkeypatch
) -> None:
    _enable_ee_engine(monkeypatch)
    # Hypothetical EE success for a workflow without a water composer.
    builtup_result = tools_base.ToolResult(
        layers=(dict(worker.workflow_template("builtup_mapping")["layers"][0]),),
        metrics={
            "engine": "earthengine",
            "water_area_m2": 4_210_537,  # water wording must NOT leak
            "scene_date": "2026-08-20",
        },
        traces=(),
    )
    monkeypatch.setattr(tools, "dispatch", lambda wf, ctx: builtup_result)

    upload = _ready_png(client)
    session = create_session(client, "single", [upload])
    job = submit_analysis(client, session["session_id"], "Where are the built-up areas?")
    age_job(job["job_id"], 9.5)  # advance the mock timeline past completion
    result = _latest_result(client, session["session_id"])

    template = worker.workflow_template("builtup_mapping")
    assert result["answer"] == template["answer"]
    assert "Mapped water" not in result["answer"]
    assert "4210537" not in result["answer"]
    # Provenance still records the genuine EE evidence additively.
    assert result["answer_source"] == "deterministic+earthengine"
    assert result["evidence"] == {"water_area_m2": 4_210_537, "scene_date": "2026-08-20"}


def test_hostile_metrics_cannot_leak_end_to_end(
    client: TestClient, monkeypatch
) -> None:
    _enable_ee_engine(monkeypatch)
    hostile_metrics = {
        "engine": "earthengine",
        "scene_date": "2026-08-20; credentials C:/backend/credentials/sa.json",
        "cloud_pct": "AIzaSySECRET-KEY-VALUE",
        "water_area_m2": 4_210_537,
        "confidence": 0.42,
    }
    monkeypatch.setattr(
        tools, "dispatch", lambda wf, ctx: _ee_tool_result(hostile_metrics)
    )

    session, _ = _single_water_job(client)
    result = _latest_result(client, session["session_id"])

    # M4.3 guarantee: the composed ANSWER never echoes hostile values.
    answer = result["answer"]
    for secret in ("AIza", "SECRET-KEY", "credentials", "C:/"):
        assert secret not in answer, secret
    assert result["answer_source"] == "deterministic+earthengine"
    assert "Mapped water: 4210537 m²." in answer
    assert "Scene cloud cover" not in answer
    # Note: M4.1's evidence field copies executor metrics verbatim by design
    # (real executors emit only numbers/None); the composer is the layer that
    # refuses malformed values in prose.


def test_payload_shape_compatible_on_composer_path(
    client: TestClient, monkeypatch
) -> None:
    _enable_ee_engine(monkeypatch)
    monkeypatch.setattr(tools, "dispatch", lambda wf, ctx: _ee_tool_result())

    session, _ = _single_water_job(client)
    result = _latest_result(client, session["session_id"])

    template = worker.workflow_template("water_mapping")
    assert isinstance(result["answer"], str) and result["answer"]
    assert result["confidence"] == template["confidence"]
    assert result["confidence_band"] == worker.confidence_band(
        float(template["confidence"])
    )
    assert result["workflow"]["id"] == "water_mapping"
    assert result["usage_time_sec"] == template["usage_time_sec"]
    assert result["inputs"] and set(result["inputs"][0]) == {
        "upload_id",
        "original_name",
        "kind",
        "acquisition_time",
    }
    assert set(result["layers"][0]) == {
        "id",
        "label",
        "opacity",
        "geometry_format",
        "features",
    }
    assert set(result["evidence"]) == set(EE_METRICS) - {"engine", "collection"}
    assert set(result["provenance"]["traces"][0].keys()) == {
        "tool_id",
        "op",
        "ok",
        "duration_s",
        "error",
        "detail",
    }
