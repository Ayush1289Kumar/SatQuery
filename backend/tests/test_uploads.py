"""Contract tests for the upload lifecycle (api.md section 2)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from backend.tests.helpers import API, initiate_upload


def test_initiate_returns_presigned_contract(client: TestClient) -> None:
    data = initiate_upload(client)
    assert data["upload_id"].startswith("upl_")
    assert data["upload_url"] == f"{API}/uploads/{data['upload_id']}/data"
    assert data["upload_headers"] == {"Content-Type": "image/tiff"}
    assert data["max_size_bytes"] == 1_073_741_824
    assert data["expires_at"].endswith("Z")


def test_direct_put_to_mock_storage_sink(client: TestClient) -> None:
    data = initiate_upload(client)
    resp = client.put(f"{API}/uploads/{data['upload_id']}/data", content=b"demo-bytes")
    assert resp.status_code == 200
    assert resp.headers["ETag"] == f'"mock-{data["upload_id"]}"'
    complete = client.post(f"{API}/uploads/{data['upload_id']}/complete", json={})
    assert complete.status_code == 200


def test_lifecycle_envelope_carries_live_request_id(client: TestClient) -> None:
    """Unlike health, lifecycle endpoints echo the live request id in the body."""
    resp = client.post(
        f"{API}/uploads/initiate",
        json={
            "filename": "scene_2026-08-24_optical.tif",
            "content_type": "image/tiff",
            "size_bytes": 1024,
            "kind": "optical",
            "mode": "single",
        },
    )
    body = resp.json()
    assert body["request_id"].startswith("req_")
    assert body["request_id"] == resp.headers["X-Request-ID"]


def test_initiate_unsupported_content_type_415(client: TestClient) -> None:
    resp = client.post(
        f"{API}/uploads/initiate",
        json={
            "filename": "x.exe",
            "content_type": "application/octet-stream",
            "size_bytes": 10,
            "kind": "optical",
            "mode": "single",
        },
    )
    assert resp.status_code == 415
    problem = resp.json()
    assert problem["code"] == "UNSUPPORTED_MEDIA_TYPE"
    assert problem["status"] == 415
    assert problem["title"] == "Unsupported media type"
    assert problem["detail"]
    assert problem["request_id"].startswith("req_")
    assert problem["type"].endswith("/problems/unsupported_media_type")


def test_initiate_extension_mime_mismatch_415(client: TestClient) -> None:
    resp = client.post(
        f"{API}/uploads/initiate",
        json={
            "filename": "photo.png",
            "content_type": "image/tiff",
            "size_bytes": 10,
            "kind": "optical",
            "mode": "single",
        },
    )
    assert resp.status_code == 415
    assert resp.json()["code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_initiate_oversize_413(client: TestClient) -> None:
    resp = client.post(
        f"{API}/uploads/initiate",
        json={
            "filename": "huge.tif",
            "content_type": "image/tiff",
            "size_bytes": 1_073_741_825,
            "kind": "optical",
            "mode": "single",
        },
    )
    assert resp.status_code == 413
    assert resp.json()["code"] == "FILE_TOO_LARGE"


def test_initiate_invalid_kind_422_with_field_errors(client: TestClient) -> None:
    resp = client.post(
        f"{API}/uploads/initiate",
        json={
            "filename": "a.tif",
            "content_type": "image/tiff",
            "size_bytes": 10,
            "kind": "thermal",
            "mode": "single",
        },
    )
    assert resp.status_code == 422
    problem = resp.json()
    assert problem["code"] == "VALIDATION_ERROR"
    fields = [entry["field"] for entry in problem["field_errors"]]
    assert "kind" in fields


def test_complete_and_metadata_lifecycle(client: TestClient) -> None:
    initiated = initiate_upload(client)
    upload_id = initiated["upload_id"]

    # Metadata before completion: 'initiated', no raster metadata yet.
    meta = client.get(f"{API}/uploads/{upload_id}").json()["data"]
    assert meta["status"] == "initiated"
    assert meta["crs"] is None
    assert meta["bands"] == []

    complete = client.post(f"{API}/uploads/{upload_id}/complete", json={})
    assert complete.status_code == 200
    assert complete.json()["data"] == {"upload_id": upload_id, "status": "validating"}

    # Re-complete is idempotent (documented demo behavior).
    again = client.post(f"{API}/uploads/{upload_id}/complete", json={})
    assert again.status_code == 200

    meta = client.get(f"{API}/uploads/{upload_id}").json()["data"]
    assert meta["status"] == "ready"
    assert meta["original_name"] == "scene_2026-08-24_optical.tif"
    assert meta["mime_type"] == "image/tiff"
    assert meta["crs"] == "EPSG:4326"
    assert meta["bbox"] == [72.8, 18.9, 73.1, 19.2]
    assert meta["width"] == 4096
    assert meta["height"] == 4096
    assert meta["resolution_m"] == 10
    assert meta["bands"] == ["B02", "B03", "B04", "B08"]
    assert meta["nodata"] == 0
    assert meta["validation_errors"] == []
    assert meta["acquisition_time"] == "2026-08-24T05:22:00Z"


def test_upload_metadata_unknown_404(client: TestClient) -> None:
    resp = client.get(f"{API}/uploads/upl_missing")
    assert resp.status_code == 404
    assert resp.json()["code"] == "UPLOAD_NOT_FOUND"
