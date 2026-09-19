"""Tests for SIH specialist endpoints and evaluation framework."""
from __future__ import annotations

import io
from fastapi.testclient import TestClient
from backend.tests.helpers import API


def test_root_ready_endpoint(client: TestClient):
    resp = client.get("/ready")
    assert resp.status_code in (200, 503)


def test_asset_direct_upload_and_get(client: TestClient):
    fake_file = io.BytesIO(b"fake-geotiff-bytes")
    resp = client.post(
        f"{API}/assets",
        files={"file": ("test_scene.tif", fake_file, "image/tiff")},
        data={"modality": "optical"},
    )
    assert resp.status_code == 200
    asset_data = resp.json()["data"]
    assert asset_data["asset_id"].startswith("ast_")
    assert asset_data["crs"] == "EPSG:4326"
    assert asset_data["bands"] == 4

    # GET asset
    r_get = client.get(f"{API}/assets/{asset_data['asset_id']}")
    assert r_get.status_code == 200
    assert r_get.json()["data"]["asset_id"] == asset_data["asset_id"]


def test_vqa_direct_endpoint(client: TestClient):
    resp = client.post(
        f"{API}/vqa",
        json={"image_id": "ast_123", "question": "Is water present in this scene?"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["task"] == "single_image_vqa"
    assert "water" in data["answer"].lower()
    assert data["confidence"]["score"] > 0.8
    assert "trace_id" in data


def test_grounding_direct_endpoint(client: TestClient):
    resp = client.post(
        f"{API}/ground",
        json={"image_id": "ast_123", "text": "airport runway"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["task"] == "grounding"
    assert len(data["objects"]) > 0
    assert data["objects"][0]["label"] == "airport runway"


def test_caption_direct_endpoint(client: TestClient):
    resp = client.post(
        f"{API}/caption",
        json={"image_id": "ast_123"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["task"] == "captioning"
    assert len(data["caption"]) > 10


def test_change_direct_endpoint(client: TestClient):
    resp = client.post(
        f"{API}/change",
        json={
            "before_image_id": "ast_before",
            "after_image_id": "ast_after",
            "question": "Did urban expansion occur?",
        },
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["task"] == "bi_temporal_change"
    assert "change_statistics" in data
    assert len(data["layers"]) > 0


def test_fusion_direct_endpoint(client: TestClient):
    resp = client.post(
        f"{API}/fusion/optical-sar",
        json={
            "optical_image_id": "ast_opt",
            "sar_image_id": "ast_sar",
            "question": "What does SAR add?",
        },
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["task"] == "optical_sar_fusion"
    assert data["modalities"]["sar"]["used"] is True


def test_universal_analyze_endpoint(client: TestClient):
    resp = client.post(
        f"{API}/analyze",
        json={
            "query": "Compare these two satellite images and map flooded areas.",
            "asset_ids": ["ast_1", "ast_2"],
        },
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "completed"
    assert "trace_id" in data
    assert len(data["layers"]) > 0


def test_evaluation_run_endpoint(client: TestClient):
    resp = client.post(
        f"{API}/evaluation/run",
        json={"task": "vqa", "dataset": "datasets/rs_vqa/test.json", "model": "satquery-vqa"},
    )
    assert resp.status_code == 200
    eval_data = resp.json()["data"]
    eval_id = eval_data["evaluation_id"]
    assert eval_data["baseline_model"]["f1_score"] > 0.5
    assert eval_data["adapted_model"]["f1_score"] > eval_data["baseline_model"]["f1_score"]

    # GET evaluation
    r_get = client.get(f"{API}/evaluation/{eval_id}")
    assert r_get.status_code == 200
    assert r_get.json()["data"]["evaluation_id"] == eval_id
