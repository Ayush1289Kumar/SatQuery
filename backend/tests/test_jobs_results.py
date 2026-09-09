"""Contract tests for job polling and results (api.md sections 4-5).

The deterministic mock worker derives stage/progress from elapsed time;
``helpers.age_job`` rewinds a job's clocks so the whole 9-second timeline is
reproducible instantly — no sleeps, no app-code changes.
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from backend.tests.helpers import (
    API,
    age_job,
    create_session,
    make_ready_upload,
    submit_analysis,
)


def _two_date_session(client: TestClient) -> dict:
    upload_a = make_ready_upload(client, filename="scene_2026-08-18_optical.tif")
    upload_b = make_ready_upload(client, filename="scene_2026-08-24_optical.tif")
    return create_session(client, "twoDate", [upload_a, upload_b])


def test_job_status_unknown_404(client: TestClient) -> None:
    resp = client.get(f"{API}/jobs/job_missing")
    assert resp.status_code == 404
    assert resp.json()["code"] == "JOB_NOT_FOUND"


def test_job_stage_progression(client: TestClient) -> None:
    session = _two_date_session(client)
    job = submit_analysis(client, session["session_id"])
    job_id = job["job_id"]

    # (rewind delta, expected status, expected stage) — cumulative 9.5s total.
    timeline = [
        (0.5, "validating", "validate"),
        (1.0, "queued", "validate"),
        (1.25, "routing", "route"),
        (1.25, "processing", "analyze"),
        (4.0, "explaining", "explain"),
    ]
    progress_seen = -1
    for delta, status, stage in timeline:
        age_job(job_id, delta)
        body = client.get(f"{API}/jobs/{job_id}").json()["data"]
        assert body["status"] == status, body
        assert body["stage"] == stage
        assert progress_seen <= body["progress"] <= 100  # monotonic progress
        progress_seen = body["progress"]
        assert body["error"] is None
        assert body["workflow_label"] == "Change detection · bi-temporal segmentation"

    age_job(job_id, 1.5)  # total 9.5s >= DURATION_SECONDS
    body = client.get(f"{API}/jobs/{job_id}").json()["data"]
    assert body["status"] == "completed"
    assert body["progress"] == 100


def test_results_before_analysis_404(client: TestClient) -> None:
    session = _two_date_session(client)
    resp = client.get(f"{API}/sessions/{session['session_id']}/results/latest")
    assert resp.status_code == 404
    assert resp.json()["code"] == "NO_ANALYSIS"


def test_result_not_ready_while_job_running_409(client: TestClient) -> None:
    session = _two_date_session(client)
    job = submit_analysis(client, session["session_id"])
    age_job(job["job_id"], 4.0)  # mid 'processing'
    resp = client.get(f"{API}/sessions/{session['session_id']}/results/latest")
    assert resp.status_code == 409
    problem = resp.json()
    assert problem["code"] == "RESULT_NOT_READY"
    assert "processing" in problem["detail"]


def test_completed_result_contract(client: TestClient) -> None:
    session = _two_date_session(client)
    job = submit_analysis(client, session["session_id"])
    age_job(job["job_id"], 9.5)
    job_body = client.get(f"{API}/jobs/{job['job_id']}").json()["data"]
    assert job_body["status"] == "completed"

    resp = client.get(f"{API}/sessions/{session['session_id']}/results/latest")
    assert resp.status_code == 200
    result = resp.json()["data"]

    assert result["result_id"].startswith("res_")
    assert result["session_id"] == session["session_id"]
    assert result["job_id"] == job["job_id"]
    assert result["question"] == "What changed between these two dates?"
    assert result["answer"]
    assert result["confidence"] == 0.81
    assert result["confidence_band"] == "high"
    assert result["workflow"]["id"] == "change_detection"
    assert result["workflow"]["router_version"].startswith("router-")
    assert [model["name"] for model in result["models"]] == [
        "sat-query/changeformer-siamese",
        "Raster-Register-v2",
    ]
    assert result["usage_time_sec"] == 11.2
    assert result["created_at"].endswith("Z")
    assert result["completed_at"].endswith("Z")
    assert [item["original_name"] for item in result["inputs"]] == [
        "scene_2026-08-18_optical.tif",
        "scene_2026-08-24_optical.tif",
    ]

    layers = result["layers"]
    assert [layer["id"] for layer in layers] == ["before", "after"]
    assert [layer["label"] for layer in layers] == [
        "2026-08-18 (before)",
        "2026-08-24 (after)",
    ]
    assert [layer["opacity"] for layer in layers] == [1.0, 0.6]
    assert all(layer["geometry_format"] == "geojson" for layer in layers)
    assert [len(layer["features"]) for layer in layers] == [1, 2]

    features = layers[0]["features"] + layers[1]["features"]
    assert [feature["type"] for feature in features] == ["water", "flood", "flood"]
    for feature in features:
        assert 0.0 <= feature["confidence"] <= 1.0
        ring = feature["geometry"]["coordinates"][0]
        assert ring[0] == ring[-1]  # GeoJSON rings are closed
        first_lng, first_lat = ring[0]
        assert 72.0 < first_lng < 74.0  # [longitude, latitude] order (EPSG:4326)
        assert 18.0 < first_lat < 20.0
    assert features[1]["area_m2"] == 3_100_000


def test_single_mode_water_workflow(client: TestClient) -> None:
    upload = make_ready_upload(client)
    session = create_session(client, "single", [upload], category="water")
    job = submit_analysis(
        client, session["session_id"], "Highlight water bodies in this image."
    )
    age_job(job["job_id"], 9.5)
    result = client.get(
        f"{API}/sessions/{session['session_id']}/results/latest"
    ).json()["data"]
    assert result["workflow"]["id"] == "water_mapping"
    assert result["confidence"] == 0.92
    assert result["confidence_band"] == "high"
    types = [
        feature["type"] for layer in result["layers"] for feature in layer["features"]
    ]
    assert types == ["water", "water"]


def test_optical_sar_low_confidence_band(client: TestClient) -> None:
    optical = make_ready_upload(client)
    sar = make_ready_upload(client, kind="sar", filename="s1_vv.tif")
    session = create_session(client, "opticalSar", [optical, sar])
    job = submit_analysis(client, session["session_id"], "Has built-up area increased?")
    age_job(job["job_id"], 9.5)
    result = client.get(
        f"{API}/sessions/{session['session_id']}/results/latest"
    ).json()["data"]
    assert result["confidence"] == 0.57
    assert result["confidence_band"] == "low"  # below the 0.6 warning threshold
    assert result["workflow"]["id"] == "optical_sar_fusion"


def test_single_vqa_fallback_workflow(client: TestClient) -> None:
    upload = make_ready_upload(client)
    session = create_session(client, "single", [upload])
    job = submit_analysis(client, session["session_id"], "Describe this image.")
    age_job(job["job_id"], 9.5)
    result = client.get(
        f"{API}/sessions/{session['session_id']}/results/latest"
    ).json()["data"]
    assert result["workflow"]["id"] == "single_image_vqa"
    types = [
        feature["type"] for layer in result["layers"] for feature in layer["features"]
    ]
    assert types == ["vegetation", "land"]

