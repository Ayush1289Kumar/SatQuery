"""Pytest fixtures for the demo-critical contract tests.

The FastAPI app is exercised in-process through TestClient (httpx). Every test
receives a pristine in-memory store, so the suite is deterministic and
order-independent. No PostgreSQL/Redis/S3/GPU is involved anywhere; the mock
worker timeline is controlled deterministically via ``helpers.age_job``.
"""
from __future__ import annotations

import socket
import pytest
from fastapi.testclient import TestClient

# Resilient socketpair on Windows to avoid WinError 10013 ephemeral port collision
orig_socketpair = getattr(socket, "socketpair", None)
if orig_socketpair:
    def safe_socketpair(*args, **kwargs):
        for _ in range(5):
            try:
                return orig_socketpair(*args, **kwargs)
            except PermissionError:
                continue
        return orig_socketpair(*args, **kwargs)
    socket.socketpair = safe_socketpair

from backend.app import store as store_module
from backend.app.config import get_settings
from backend.app.main import app


@pytest.fixture()
def fresh_store(monkeypatch):
    """Reset the process-wide store singleton so every test starts empty."""
    monkeypatch.setenv("AI_PROVIDER", "mock")
    get_settings.cache_clear()
    monkeypatch.setattr(store_module, "_store", None)
    return store_module.get_store()


@pytest.fixture()
def client(fresh_store) -> TestClient:
    """In-process API client bound to a fresh in-memory store."""
    with TestClient(app) as c:
        yield c
