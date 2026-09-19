"""Contract tests for the health/readiness APIs (api.md section 8)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from backend.app import main as main_module

_UNCONFIGURED_FIELDS = (
    "jwt_secret",
    "database_url",
    "redis_url",
    "object_storage_endpoint",
    "object_storage_access_key",
    "object_storage_secret_key",
)


def test_health_envelope_preserved(client: TestClient) -> None:
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    body = resp.json()
    assert set(body) == {"data", "request_id"}
    assert body["data"]["status"] == "ok"
    assert body["data"]["service"] == main_module.settings.app_name
    # Preserved Stage-1 behavior: the health envelope keeps its static id...
    assert body["request_id"] == "local"
    # ...while the Task-G' middleware adds the live request id as a header.
    assert resp.headers["X-Request-ID"].startswith("req_")


def test_health_unversioned_route_preserved(client: TestClient) -> None:
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "ok"


def test_readiness_returns_503_when_unconfigured(client: TestClient, monkeypatch) -> None:
    for field in _UNCONFIGURED_FIELDS:
        monkeypatch.setattr(main_module.settings, field, None)
    resp = client.get("/api/v1/health/ready")
    assert resp.status_code == 503
    body = resp.json()
    assert body["data"]["status"] == "not_ready"
    assert body["data"]["api"] == "ok"
    assert body["data"]["auth"] == "not_configured"
    assert body["data"]["database"] == "not_configured"
    assert body["data"]["redis"] == "not_configured"
    assert body["data"]["object_storage"] == "not_configured"
    assert body["data"]["worker"] == "not_configured"


def test_readiness_unversioned_route_preserved(client: TestClient, monkeypatch) -> None:
    for field in _UNCONFIGURED_FIELDS:
        monkeypatch.setattr(main_module.settings, field, None)
    resp = client.get("/health/ready")
    assert resp.status_code == 503
