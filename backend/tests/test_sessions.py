"""Contract tests for analysis session creation (api.md section 3)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from backend.tests.helpers import API, create_session, initiate_upload, make_ready_upload


def test_create_session_success(client: TestClient) -> None:
    upload_a = make_ready_upload(client, filename="scene_2026-08-18_optical.tif")
    upload_b = make_ready_upload(client, filename="scene_2026-08-24_optical.tif")
    data = create_session(client, "twoDate", [upload_a, upload_b])
    assert data["session_id"].startswith("ses_")
    assert data["mode"] == "twoDate"
    assert data["status"] == "created"
    assert data["upload_ids"] == [upload_a, upload_b]
    assert data["created_at"].endswith("Z")


def test_session_requires_uploads_ready(client: TestClient) -> None:
    upload_id = initiate_upload(client)["upload_id"]  # never completed
    resp = client.post(f"{API}/sessions", json={"mode": "single", "upload_ids": [upload_id]})
    assert resp.status_code == 409
    assert resp.json()["code"] == "UPLOAD_NOT_READY"


def test_session_unknown_upload_404(client: TestClient) -> None:
    resp = client.post(
        f"{API}/sessions", json={"mode": "single", "upload_ids": ["upl_missing"]}
    )
    assert resp.status_code == 404
    assert resp.json()["code"] == "UPLOAD_NOT_FOUND"


def test_session_single_requires_optical(client: TestClient) -> None:
    sar = make_ready_upload(client, kind="sar", filename="s1_vv.tif")
    resp = client.post(f"{API}/sessions", json={"mode": "single", "upload_ids": [sar]})
    assert resp.status_code == 422
    assert resp.json()["code"] == "INVALID_IMAGE_PAIR"


def test_session_two_date_requires_two_uploads(client: TestClient) -> None:
    only = make_ready_upload(client)
    resp = client.post(f"{API}/sessions", json={"mode": "twoDate", "upload_ids": [only]})
    assert resp.status_code == 422
    assert resp.json()["code"] == "INVALID_UPLOAD_COUNT"


def test_session_optical_sar_pair_rules(client: TestClient) -> None:
    optical = make_ready_upload(client)
    second_optical = make_ready_upload(client, filename="scene_2.tif")
    sar = make_ready_upload(client, kind="sar", filename="s1_vv.tif")

    bad = client.post(
        f"{API}/sessions",
        json={"mode": "opticalSar", "upload_ids": [optical, second_optical]},
    )
    assert bad.status_code == 422
    assert bad.json()["code"] == "INVALID_IMAGE_PAIR"

    good = client.post(
        f"{API}/sessions", json={"mode": "opticalSar", "upload_ids": [optical, sar]}
    )
    assert good.status_code == 200
    assert good.json()["data"]["mode"] == "opticalSar"


def test_session_duplicate_upload_ids_rejected(client: TestClient) -> None:
    upload = make_ready_upload(client)
    resp = client.post(
        f"{API}/sessions", json={"mode": "single", "upload_ids": [upload, upload]}
    )
    assert resp.status_code == 422
    assert resp.json()["code"] == "INVALID_UPLOAD_COUNT"


def test_session_body_validation_problem_shape(client: TestClient) -> None:
    upload = make_ready_upload(client)
    resp = client.post(
        f"{API}/sessions",
        json={"mode": "twoDate", "upload_ids": [upload, upload, upload]},
    )
    assert resp.status_code == 422
    problem = resp.json()
    assert problem["code"] == "VALIDATION_ERROR"
    fields = [entry["field"] for entry in problem["field_errors"]]
    assert "upload_ids" in fields
