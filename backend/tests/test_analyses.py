"""Contract tests for analysis submission and idempotency (api.md section 4)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from backend.tests.helpers import API, create_session, make_ready_upload, submit_analysis


def _two_date_session(client: TestClient) -> dict:
    upload_a = make_ready_upload(client, filename="scene_2026-08-18_optical.tif")
    upload_b = make_ready_upload(client, filename="scene_2026-08-24_optical.tif")
    return create_session(client, "twoDate", [upload_a, upload_b])


def test_submit_returns_202_contract(client: TestClient) -> None:
    session = _two_date_session(client)
    data = submit_analysis(client, session["session_id"])
    assert data["job_id"].startswith("job_")
    assert data["session_id"] == session["session_id"]
    assert data["status"] == "queued"
    assert data["stage"] == "validate"
    assert data["progress"] == 0
    assert data["estimated_seconds"] == 9
    assert data["created_at"].endswith("Z")


def test_idempotency_key_returns_same_job(client: TestClient) -> None:
    session = _two_date_session(client)
    first = submit_analysis(client, session["session_id"], idempotency_key="demo-key-1")
    second = submit_analysis(client, session["session_id"], idempotency_key="demo-key-1")
    assert second["job_id"] == first["job_id"]


def test_idempotency_conflict_across_sessions(client: TestClient) -> None:
    session_one = _two_date_session(client)
    session_two = _two_date_session(client)
    submit_analysis(client, session_one["session_id"], idempotency_key="shared-key")
    resp = client.post(
        f"{API}/sessions/{session_two['session_id']}/analyses",
        json={"question": "What changed between these two dates?"},
        headers={"Idempotency-Key": "shared-key"},
    )
    assert resp.status_code == 409
    assert resp.json()["code"] == "IDEMPOTENCY_CONFLICT"


def test_without_key_each_submit_creates_new_job(client: TestClient) -> None:
    session = _two_date_session(client)
    first = submit_analysis(client, session["session_id"])
    second = submit_analysis(client, session["session_id"])
    assert first["job_id"] != second["job_id"]


def test_submit_unknown_session_404(client: TestClient) -> None:
    resp = client.post(f"{API}/sessions/ses_missing/analyses", json={"question": "hi"})
    assert resp.status_code == 404
    assert resp.json()["code"] == "SESSION_NOT_FOUND"


def test_question_over_limit_422_with_field_errors(client: TestClient) -> None:
    session = _two_date_session(client)
    resp = client.post(
        f"{API}/sessions/{session['session_id']}/analyses",
        json={"question": "x" * 2001},
    )
    assert resp.status_code == 422
    problem = resp.json()
    assert problem["code"] == "VALIDATION_ERROR"
    fields = [entry["field"] for entry in problem["field_errors"]]
    assert "question" in fields
