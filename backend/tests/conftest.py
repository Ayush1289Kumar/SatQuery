"""Pytest fixtures for the demo-critical contract tests.

The FastAPI app is exercised in-process through TestClient (httpx). Every test
receives a pristine in-memory store, so the suite is deterministic and
order-independent. No PostgreSQL/Redis/S3/GPU is involved anywhere; the mock
worker timeline is controlled deterministically via ``helpers.age_job``.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.app import store as store_module
from backend.app.main import app


@pytest.fixture()
def fresh_store(monkeypatch):
    """Reset the process-wide store singleton so every test starts empty."""
    monkeypatch.setattr(store_module, "_store", None)
    return store_module.get_store()


@pytest.fixture()
def client(fresh_store) -> TestClient:
    """In-process API client bound to a fresh in-memory store."""
    return TestClient(app)
