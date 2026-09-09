"""Small HTTP helpers so the contract tests read like the api.md workflow."""
from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi.testclient import TestClient

from backend.app import store as store_module

API = "/api/v1"


def initiate_upload(
    client: TestClient,
    *,
    filename: str = "scene_2026-08-24_optical.tif",
    content_type: str = "image/tiff",
    size_bytes: int = 1024,
    kind: str = "optical",
    mode: str = "single",
) -> dict[str, Any]:
    resp = client.post(
        f"{API}/uploads/initiate",
        json={
            "filename": filename,
            "content_type": content_type,
            "size_bytes": size_bytes,
            "kind": kind,
            "mode": mode,
        },
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]


def complete_upload(client: TestClient, upload_id: str) -> dict[str, Any]:
    resp = client.post(f"{API}/uploads/{upload_id}/complete", json={})
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]


def make_ready_upload(client: TestClient, **kwargs: Any) -> str:
    """initiate + complete. The demo store finalises 'validating' on first use."""
    data = initiate_upload(client, **kwargs)
    complete_upload(client, data["upload_id"])
    return data["upload_id"]


def create_session(
    client: TestClient,
    mode: str,
    upload_ids: list[str],
    category: str = "disaster",
) -> dict[str, Any]:
    resp = client.post(
        f"{API}/sessions",
        json={"mode": mode, "upload_ids": upload_ids, "category": category},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]


def submit_analysis(
    client: TestClient,
    session_id: str,
    question: str = "What changed between these two dates?",
    *,
    idempotency_key: str | None = None,
    category: str | None = None,
) -> dict[str, Any]:
    headers = {"Idempotency-Key": idempotency_key} if idempotency_key else {}
    payload: dict[str, Any] = {"question": question}
    if category is not None:
        payload["category"] = category
    resp = client.post(
        f"{API}/sessions/{session_id}/analyses",
        json=payload,
        headers=headers,
    )
    assert resp.status_code == 202, resp.text
    return resp.json()["data"]


def put_upload_bytes(client: TestClient, upload_id: str, data: bytes = b"demo-image-bytes") -> None:
    """Direct PUT to the mock storage sink (bytes retained when AI_PROVIDER=gemini)."""
    resp = client.put(f"{API}/uploads/{upload_id}/data", content=data)
    assert resp.status_code == 200


def join_ai_threads(timeout: float = 10.0) -> None:
    """Wait for in-flight real-AI jobs so tests stay deterministic (no sleeps)."""
    store_module.get_store().join_ai_threads(timeout=timeout)


def age_job(job_id: str, seconds: float) -> None:
    """Rewind a job's clocks so the deterministic worker timeline advances.

    The mock worker derives stage/progress from elapsed monotonic/wall time,
    so aging the timestamps reproduces any point of the 9-second timeline
    instantly — no sleeps, fully deterministic.
    """
    job = store_module.get_store().get_job(job_id)
    job.started_monotonic -= seconds
    job.started_wall -= timedelta(seconds=seconds)
