"""M4.2 grounded-composition tests.

Covers the explicit opt-in path (``ai_provider="gemini"`` +
``tools_engine="earthengine"`` + ``answer_composition="gemini_facts"``): the
registered tool runs BEFORE Gemini, authoritative Earth Engine measurements
from the retained ToolResult reach the prompt as a structured facts block,
Gemini composes (never measures), provenance stays truthful in every failure
combination, and every non-grounded configuration keeps pre-M4.2 behavior.

Everything is hermetic: ``tools.dispatch`` and ``ai.generate_ai_answer`` are
monkeypatched — no Earth Engine SDK/network, no Gemini API, no credentials.
"""
from __future__ import annotations

import json
from typing import Any

from fastapi.testclient import TestClient

from backend.app import ai
from backend.app import tools
from backend.app import worker
from backend.app.config import get_settings
from backend.app.tools import base as tools_base
from backend.tests.helpers import (
    complete_upload,
    create_session,
    initiate_upload,
    join_ai_threads,
    put_upload_bytes,
    submit_analysis,
)

# --- crafted authoritative EE output (mirrors the M3 executor shape) ----------

EE_METRICS: dict[str, Any] = {
    "engine": "earthengine",
    "collection": "COPERNICUS/S2_SR_HARMONIZED",
    "scene_id": "S2B_43PFR_20260820_0_L2A",
    "scene_date": "2026-08-20",  # actual selected scene date
    "cloud_pct": 12.4,
    "anchor_date": "2026-08-24",  # declared upload-derived anchor (DIFFERENT)
    "window_start": "2026-07-10",
    "window_end": "2026-08-28",
    "ndwi_threshold": 0.15,
    "water_area_m2": 4_210_537,
    "aoi_area_m2": 510_499_233,
    "water_fraction": 0.008248,
    "confidence": 0.42,
}

# What may reach Gemini (and evidence): engine/collection are internal.
EXPECTED_FACTS: dict[str, Any] = {
    key: value for key, value in EE_METRICS.items() if key not in ("engine", "collection")
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

EE_LAYER: dict[str, Any] = {
    "id": "single",
    "label": "NDWI water bodies · S2B_43PFR_20260820_0_L2A",
    "opacity": 1.0,
    "features": [],
}


def _ee_tool_result() -> tools_base.ToolResult:
    return tools_base.ToolResult(
        layers=(EE_LAYER,), metrics=dict(EE_METRICS), traces=()
    )


def _enable_grounded(monkeypatch) -> None:
    """Activate the explicit M4.2 path (both engines + composition opt-in)."""
    settings = get_settings()
    monkeypatch.setattr(settings, "ai_provider", "gemini")
    monkeypatch.setattr(settings, "tools_engine", "earthengine")
    monkeypatch.setattr(settings, "answer_composition", "gemini_facts")
    monkeypatch.setattr(settings, "gemini_model", "gemini-test-model")
    monkeypatch.setattr(settings, "gemini_timeout_s", 5.0)


def _ready_png(client: TestClient, filename: str = "scene_2026-08-24.png") -> str:
    """Upload with retained bytes (retention requires gemini to be active)."""
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
    return session, job


def _instrument(
    monkeypatch,
    *,
    dispatch_result: Any,
    gemini_outcome: ai.AiAnswer | None = None,
) -> tuple[list[str], list[dict[str, Any]], list[str]]:
    """Fakes for tools.dispatch + ai.generate_ai_answer with a shared order log."""
    events: list[str] = []
    gemini_calls: list[dict[str, Any]] = []
    dispatch_calls: list[str] = []

    def fake_dispatch(workflow_id: str, context: Any) -> tools_base.ToolResult:
        events.append(f"dispatch:{workflow_id}")
        dispatch_calls.append(workflow_id)
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
    return events, gemini_calls, dispatch_calls


def _latest_result(client: TestClient, session_id: str) -> dict[str, Any]:
    resp = client.get(f"/api/v1/sessions/{session_id}/results/latest")
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]


# --- A: default composition keeps pre-M4.2 behavior ---------------------------


def test_default_composition_keeps_gemini_first_and_sends_no_facts(
    client: TestClient, monkeypatch
) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "ai_provider", "gemini")
    monkeypatch.setattr(settings, "tools_engine", "earthengine")
    # answer_composition stays "template" (the default).
    monkeypatch.setattr(settings, "gemini_model", "gemini-test-model")
    monkeypatch.setattr(settings, "gemini_timeout_s", 5.0)
    events, gemini_calls, _ = _instrument(
        monkeypatch, dispatch_result=_ee_tool_result()
    )

    session, _ = _single_water_job(client)
    join_ai_threads()
    result = _latest_result(client, session["session_id"])

    # Ordering unchanged: Gemini first, tool dispatch at result-build time.
    assert events == ["gemini", "dispatch:water_mapping"]
    assert gemini_calls[0]["measurements"] is None
    # M4.1 provenance behavior is unchanged by the default-off M4.2 gate.
    assert result["answer_source"] == "gemini+earthengine"


# --- B: explicit M4.2 activation dispatches the tool BEFORE Gemini ------------


def test_grounded_activation_dispatches_tool_before_gemini(
    client: TestClient, monkeypatch
) -> None:
    _enable_grounded(monkeypatch)
    events, gemini_calls, dispatch_calls = _instrument(
        monkeypatch, dispatch_result=_ee_tool_result()
    )

    session, _ = _single_water_job(client)
    join_ai_threads()
    _latest_result(client, session["session_id"])

    assert events == ["dispatch:water_mapping", "gemini"]
    assert dispatch_calls == ["water_mapping"]  # dispatched, not re-dispatched
    assert gemini_calls[0]["measurements"] is not None


# --- C + E + F: exact authoritative facts reach Gemini, verbatim --------------


def test_gemini_receives_exact_authoritative_ee_facts(
    client: TestClient, monkeypatch
) -> None:
    _enable_grounded(monkeypatch)
    _, gemini_calls, _ = _instrument(monkeypatch, dispatch_result=_ee_tool_result())

    session, _ = _single_water_job(client)
    join_ai_threads()

    measurements = gemini_calls[0]["measurements"]
    assert measurements is not None
    facts = json.loads(measurements)
    # Supplied numeric values preserved EXACTLY — no rounding, no invention.
    assert facts == EXPECTED_FACTS
    assert facts["water_area_m2"] == 4_210_537
    assert facts["aoi_area_m2"] == 510_499_233
    assert facts["water_fraction"] == 0.008248
    # anchor (declared) vs scene date (actual) remain separate concepts.
    assert facts["anchor_date"] == "2026-08-24"
    assert facts["scene_date"] == "2026-08-20"
    assert facts["anchor_date"] != facts["scene_date"]
    # Internal handles never reach the prompt.
    assert "engine" not in facts
    assert "collection" not in facts


# --- D1: template engine → no facts, pre-M4.2 ordering ------------------------


def test_no_facts_for_template_engine(client: TestClient, monkeypatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "ai_provider", "gemini")
    monkeypatch.setattr(settings, "tools_engine", "template")
    monkeypatch.setattr(settings, "answer_composition", "gemini_facts")
    monkeypatch.setattr(settings, "gemini_model", "gemini-test-model")
    monkeypatch.setattr(settings, "gemini_timeout_s", 5.0)
    template_result = tools_base.ToolResult(
        layers=(dict(worker.workflow_template("water_mapping")["layers"][0]),),
        metrics={"source": "worker.template", "workflow_id": "water_mapping"},
        traces=(),
    )
    events, gemini_calls, _ = _instrument(
        monkeypatch, dispatch_result=template_result
    )

    session, _ = _single_water_job(client)
    join_ai_threads()
    result = _latest_result(client, session["session_id"])

    assert events == ["gemini", "dispatch:water_mapping"]
    assert gemini_calls[0]["measurements"] is None
    assert "answer_source" not in result
    assert "evidence" not in result
    assert "provenance" not in result


# --- D2: template-fallback metrics never enter the facts block ----------------


def test_no_facts_for_template_fallback_metrics(
    client: TestClient, monkeypatch
) -> None:
    _enable_grounded(monkeypatch)
    fallback_result = tools_base.ToolResult(
        layers=(dict(worker.workflow_template("water_mapping")["layers"][0]),),
        metrics={
            "engine": "template-fallback",
            "source": "worker.template",
            "workflow_id": "water_mapping",
        },
        traces=(),
    )
    events, gemini_calls, _ = _instrument(
        monkeypatch, dispatch_result=fallback_result
    )

    session, _ = _single_water_job(client)
    join_ai_threads()
    result = _latest_result(client, session["session_id"])

    # Grounded ordering still applies, but the EE attempt failed → no facts.
    assert events == ["dispatch:water_mapping", "gemini"]
    assert gemini_calls[0]["measurements"] is None
    assert "answer_source" not in result
    assert "evidence" not in result


# --- D3: dispatch failure → no facts, fail-closed completion ------------------


def test_no_facts_when_tool_dispatch_fails(client: TestClient, monkeypatch) -> None:
    _enable_grounded(monkeypatch)
    events: list[str] = []
    gemini_calls: list[dict[str, Any]] = []

    def failing_dispatch(workflow_id: str, context: Any) -> tools_base.ToolResult:
        events.append(f"dispatch:{workflow_id}")
        raise tools_base.ToolError("simulated registry failure")

    def fake_generate(**kwargs: Any) -> ai.AiAnswer:
        events.append("gemini")
        gemini_calls.append(kwargs)
        return ai.AiAnswer(
            answer="Generic answer.",
            model_name="gemini-test-model",
            used=True,
            elapsed_s=1.0,
        )

    monkeypatch.setattr(tools, "dispatch", failing_dispatch)
    monkeypatch.setattr(ai, "generate_ai_answer", fake_generate)

    session, _ = _single_water_job(client)
    join_ai_threads()
    result = _latest_result(client, session["session_id"])

    assert events[0] == "dispatch:water_mapping"  # attempted before Gemini
    assert gemini_calls[0]["measurements"] is None
    # No facts were fabricated: Gemini composes from imagery alone (existing
    # behavior), the payload carries no EE provenance, and the job completes.
    assert set(result.keys()) == RESULT_KEYS
    assert result["answer"] == "Generic answer."
    assert result["models"][0]["name"] == "gemini-test-model"


def test_dispatch_failure_with_gemini_failure_stays_fully_deterministic(
    client: TestClient, monkeypatch
) -> None:
    """EE unavailable AND Gemini unavailable → the pre-M4.2 safe fallback."""
    _enable_grounded(monkeypatch)
    gemini_calls: list[dict[str, Any]] = []

    def failing_dispatch(workflow_id: str, context: Any) -> tools_base.ToolResult:
        raise tools_base.ToolError("simulated registry failure")

    def fake_generate(**kwargs: Any) -> ai.AiAnswer:
        gemini_calls.append(kwargs)
        return ai.AiAnswer(
            answer=None,
            model_name="gemini-test-model",
            used=False,
            elapsed_s=1.0,
            error="Gemini call failed (TimeoutError).",
        )

    monkeypatch.setattr(tools, "dispatch", failing_dispatch)
    monkeypatch.setattr(ai, "generate_ai_answer", fake_generate)

    session, _ = _single_water_job(client)
    join_ai_threads()
    result = _latest_result(client, session["session_id"])

    assert gemini_calls[0]["measurements"] is None
    assert set(result.keys()) == RESULT_KEYS
    assert result["answer"] == worker.workflow_template("water_mapping")["answer"]
    assert result["models"] == worker.workflow_template("water_mapping")["models"]


# --- G: grounded success → truthful gemini+earthengine provenance --------------


def test_grounded_result_provenance(client: TestClient, monkeypatch) -> None:
    _enable_grounded(monkeypatch)
    _instrument(monkeypatch, dispatch_result=_ee_tool_result())

    session, _ = _single_water_job(client)
    join_ai_threads()
    result = _latest_result(client, session["session_id"])

    assert result["answer_source"] == "gemini+earthengine"
    assert result["answer"] == "Grounded: about 4.2 km² of water was mapped."
    assert result["evidence"] == EXPECTED_FACTS
    # Gemini appears in models[] only because the answer was genuinely used.
    assert result["models"][0]["name"] == "gemini-test-model"
    assert result["models"][0]["role"] == "multimodal answer generation"
    assert result["usage_time_sec"] == 1.2


# --- H: Gemini failure → safe fallback, truthful provenance --------------------


def test_gemini_failure_keeps_safe_fallback_and_truthful_provenance(
    client: TestClient, monkeypatch
) -> None:
    _enable_grounded(monkeypatch)
    failed = ai.AiAnswer(
        answer=None,
        model_name="gemini-test-model",
        used=False,
        elapsed_s=2.0,
        error="Gemini call failed (TimeoutError).",
    )
    _, gemini_calls, _ = _instrument(
        monkeypatch, dispatch_result=_ee_tool_result(), gemini_outcome=failed
    )

    session, _ = _single_water_job(client)
    join_ai_threads()
    result = _latest_result(client, session["session_id"])

    # Facts were supplied to Gemini, but Gemini did not produce the answer —
    # provenance must NOT claim gemini+earthengine (the answer is the M4.3
    # facts-honest composition of the real EE metrics, never a fake template).
    assert gemini_calls[0]["measurements"] is not None
    assert result["answer_source"] == "deterministic+earthengine"
    assert result["answer"] == tools_base.compose_water_answer(
        tools_base.MeasurementFacts.from_metrics(dict(EE_METRICS))
    )
    assert result["models"] == worker.workflow_template("water_mapping")["models"]


# --- I: exactly one dispatch per job across repeated result builds -------------


def test_tool_dispatch_exactly_once_per_job(client: TestClient, monkeypatch) -> None:
    _enable_grounded(monkeypatch)
    _, _, dispatch_calls = _instrument(monkeypatch, dispatch_result=_ee_tool_result())

    session, _ = _single_water_job(client)
    join_ai_threads()

    # The AI thread's final build plus three more result fetches/polls.
    _latest_result(client, session["session_id"])
    _latest_result(client, session["session_id"])
    _latest_result(client, session["session_id"])

    assert dispatch_calls == ["water_mapping"]


# --- J: non-water workflows do not regress under the grounded gate -------------


def test_non_water_workflow_no_regression(client: TestClient, monkeypatch) -> None:
    _enable_grounded(monkeypatch)
    fallback = tools_base.ToolResult(
        layers=(dict(worker.workflow_template("builtup_mapping")["layers"][0]),),
        metrics={"engine": "template-fallback", "workflow_id": "builtup_mapping"},
        traces=(),
    )
    events, gemini_calls, dispatch_calls = _instrument(
        monkeypatch, dispatch_result=fallback
    )

    upload = _ready_png(client)
    session = create_session(client, "single", [upload])
    submit_analysis(client, session["session_id"], "Where are the built-up areas?")
    join_ai_threads()
    result = _latest_result(client, session["session_id"])

    # The tool still runs first (grounded gate), but has no EE executor → the
    # template-fallback metrics yield no facts and no provenance fields.
    assert events == ["dispatch:builtup_mapping", "gemini"]
    assert dispatch_calls == ["builtup_mapping"]
    assert gemini_calls[0]["measurements"] is None
    assert set(result.keys()) == RESULT_KEYS
    assert result["workflow"]["id"] == "builtup_mapping"


# --- structural guards: whitelist alignment + prompt authority rules ----------


def test_evidence_and_facts_whitelists_stay_aligned() -> None:
    assert set(worker._EVIDENCE_METRIC_KEYS) == set(tools_base.MEASUREMENT_FACT_KEYS)


def test_measurement_facts_reject_non_earthengine_metrics() -> None:
    assert tools_base.MeasurementFacts.from_metrics(None) is None
    assert (
        tools_base.MeasurementFacts.from_metrics({"engine": "template-fallback"})
        is None
    )
    facts = tools_base.MeasurementFacts.from_metrics(dict(EE_METRICS))
    assert facts is not None
    assert facts.water_area_m2 == 4_210_537
    assert facts.anchor_date == "2026-08-24"
    assert facts.scene_date == "2026-08-20"
    assert json.loads(facts.to_prompt_digest()) == EXPECTED_FACTS


def test_prompt_facts_block_states_authority_rules() -> None:
    facts = tools_base.MeasurementFacts.from_metrics(dict(EE_METRICS))
    assert facts is not None
    grounded = ai._build_prompt("q", "single", 1, None, facts.to_prompt_digest())
    assert "computed by Google Earth Engine" in grounded
    assert "authoritative" in grounded
    assert "never invent, round, alter, or substitute" in grounded
    assert "Never add measurements that are not supplied" in grounded
    assert "If a fact is absent above, do not claim it" in grounded
    assert "never conflate" in grounded
    assert '"water_area_m2": 4210537' in grounded
    # No facts → no facts block at all (prompt unchanged from pre-M4.2).
    plain = ai._build_prompt("q", "single", 1, None, None)
    assert "Structured facts block" not in plain
