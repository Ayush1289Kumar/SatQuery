"""Contract tests for the env-gated Gemini provider (Task 4).

``ai.generate_ai_answer`` is replaced with fakes, so no network access, SDK
install, or API key is needed. The deterministic worker remains the fallback
in every failure case, and the ResultPayload contract stays unchanged.
"""
from __future__ import annotations

from typing import Any

from fastapi.testclient import TestClient

from backend.app import ai
from backend.app.config import get_settings
from backend.tests.helpers import (
    API,
    complete_upload,
    create_session,
    initiate_upload,
    join_ai_threads,
    put_upload_bytes,
    submit_analysis,
)

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


def _enable_gemini(monkeypatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "ai_provider", "gemini")
    monkeypatch.setattr(settings, "gemini_model", "gemini-test-model")
    monkeypatch.setattr(settings, "gemini_timeout_s", 5.0)


def _fake_success(
    monkeypatch,
    answer: str = "Gemini: newly flooded areas appear along the central plain.",
    workflow_id: str | None = None,
    elapsed: float = 1.5,
) -> list[dict[str, Any]]:
    calls: list[dict[str, Any]] = []

    def fake_generate(**kwargs: Any) -> ai.AiAnswer:
        calls.append(kwargs)
        return ai.AiAnswer(
            answer=answer,
            model_name=get_settings().gemini_model,
            used=True,
            workflow_id=workflow_id,
            elapsed_s=elapsed,
        )

    monkeypatch.setattr(ai, "generate_ai_answer", fake_generate)
    return calls


def _ready_png(client: TestClient, filename: str = "scene_2026-08-24.png") -> str:
    data = initiate_upload(client, filename=filename, content_type="image/png")
    put_upload_bytes(client, data["upload_id"], b"png-bytes-" + filename.encode())
    complete_upload(client, data["upload_id"])
    return data["upload_id"]


def _two_date_session(client: TestClient) -> dict[str, Any]:
    upload_a = _ready_png(client, "scene_2026-08-18.png")
    upload_b = _ready_png(client, "scene_2026-08-24.png")
    return create_session(client, "twoDate", [upload_a, upload_b])


def test_gemini_success_answer_and_provenance(client: TestClient, monkeypatch) -> None:
    _enable_gemini(monkeypatch)
    calls = _fake_success(monkeypatch)
    session = _two_date_session(client)
    job = submit_analysis(client, session["session_id"])
    assert job["estimated_seconds"] == 20  # real-AI estimate, not the mock 9s

    join_ai_threads()
    body = client.get(f"{API}/jobs/{job['job_id']}").json()["data"]
    assert body["status"] == "completed"

    result = client.get(
        f"{API}/sessions/{session['session_id']}/results/latest"
    ).json()["data"]
    assert result["answer"].startswith("Gemini:")
    # Provenance honesty: Gemini first, deterministic segmentation models kept.
    assert result["models"][0]["name"] == "gemini-test-model"
    assert result["models"][0]["role"] == "multimodal answer generation"
    assert result["models"][1]["name"] == "sat-query/changeformer-siamese"
    assert result["usage_time_sec"] == 1.5  # real provider elapsed
    # Contract preserved: workflow/layers/inputs identical in shape.
    assert result["workflow"]["id"] == "change_detection"
    assert result["layers"][0]["geometry_format"] == "geojson"
    assert len(result["inputs"]) == 2
    # The provider really received the question and both image bytes.
    assert calls[0]["question"] == "What changed between these two dates?"
    assert len(calls[0]["images"]) == 2
    assert calls[0]["images"][0][1] == "image/png"


def test_gemini_failure_falls_back_to_deterministic(client: TestClient, monkeypatch) -> None:
    _enable_gemini(monkeypatch)

    def fake_generate(**kwargs: Any) -> ai.AiAnswer:
        return ai.AiAnswer(
            answer=None,
            model_name=get_settings().gemini_model,
            used=False,
            error="Gemini call failed (Timeout).",
        )

    monkeypatch.setattr(ai, "generate_ai_answer", fake_generate)
    session = _two_date_session(client)
    job = submit_analysis(client, session["session_id"])
    join_ai_threads()

    body = client.get(f"{API}/jobs/{job['job_id']}").json()["data"]
    assert body["status"] == "completed"  # job still completes on failure
    result = client.get(
        f"{API}/sessions/{session['session_id']}/results/latest"
    ).json()["data"]
    assert result["answer"].startswith("Between 18 and 24 August")  # deterministic text
    assert all("gemini" not in m["name"].lower() for m in result["models"])  # no false claim


def test_gemini_exception_never_sticks_the_job(client: TestClient, monkeypatch) -> None:
    _enable_gemini(monkeypatch)

    def boom(**kwargs: Any) -> ai.AiAnswer:
        raise RuntimeError("provider exploded")

    monkeypatch.setattr(ai, "generate_ai_answer", boom)
    session = _two_date_session(client)
    job = submit_analysis(client, session["session_id"])
    join_ai_threads()

    body = client.get(f"{API}/jobs/{job['job_id']}").json()["data"]
    assert body["status"] == "completed"  # guaranteed completion
    result = client.get(
        f"{API}/sessions/{session['session_id']}/results/latest"
    ).json()["data"]
    assert result["answer"]  # deterministic fallback present
    assert all("gemini" not in m["name"].lower() for m in result["models"])


def test_result_payload_keys_unchanged(client: TestClient, monkeypatch) -> None:
    _enable_gemini(monkeypatch)
    _fake_success(monkeypatch)
    session = _two_date_session(client)
    job = submit_analysis(client, session["session_id"])
    join_ai_threads()
    result = client.get(
        f"{API}/sessions/{session['session_id']}/results/latest"
    ).json()["data"]
    assert set(result.keys()) == RESULT_KEYS


def test_gemini_valid_workflow_suggestion_is_honoured(client: TestClient, monkeypatch) -> None:
    _enable_gemini(monkeypatch)
    _fake_success(monkeypatch, workflow_id="water_mapping")
    upload = _ready_png(client)
    session = create_session(client, "single", [upload], category="water")
    job = submit_analysis(client, session["session_id"], "Describe this image.")
    join_ai_threads()
    result = client.get(
        f"{API}/sessions/{session['session_id']}/results/latest"
    ).json()["data"]
    assert result["workflow"]["id"] == "water_mapping"  # AI suggestion applied
    assert result["answer"].startswith("Gemini:")


def test_gemini_invalid_workflow_suggestion_is_ignored(client: TestClient, monkeypatch) -> None:
    _enable_gemini(monkeypatch)
    _fake_success(monkeypatch, workflow_id="make_everything_flood")
    upload = _ready_png(client)
    session = create_session(client, "single", [upload])
    job = submit_analysis(client, session["session_id"], "Describe this image.")
    join_ai_threads()
    result = client.get(
        f"{API}/sessions/{session['session_id']}/results/latest"
    ).json()["data"]
    assert result["workflow"]["id"] == "single_image_vqa"  # keyword route kept


def test_idempotent_replay_spawns_exactly_one_ai_call(client: TestClient, monkeypatch) -> None:
    _enable_gemini(monkeypatch)
    calls = _fake_success(monkeypatch)
    session = _two_date_session(client)
    submit_analysis(client, session["session_id"], idempotency_key="ai-key-1")
    submit_analysis(client, session["session_id"], idempotency_key="ai-key-1")
    join_ai_threads()
    assert len(calls) == 1

