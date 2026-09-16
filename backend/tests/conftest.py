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
from backend.app.config import get_settings
from backend.app.main import app


@pytest.fixture(autouse=True)
def mock_ai_provider(monkeypatch):
    """Pin the deterministic worker as the default provider in tests.

    backend/.env is now loaded regardless of the working directory, so a
    developer's AI_PROVIDER=gemini would otherwise leak into tests that expect
    the mock 9-second timeline (see config.py). Tests exercising the real-AI
    path call ``_enable_gemini(monkeypatch)`` in the test body, which runs
    after this fixture and therefore wins.
    """
    monkeypatch.setattr(get_settings(), "ai_provider", "mock")


@pytest.fixture()
def fresh_store(monkeypatch):
    """Reset the process-wide store singleton so every test starts empty."""
    monkeypatch.setattr(store_module, "_store", None)
    return store_module.get_store()


@pytest.fixture()
def client(fresh_store) -> TestClient:
    """In-process API client bound to a fresh in-memory store."""
    return TestClient(app)
