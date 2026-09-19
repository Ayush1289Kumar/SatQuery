"""Tests verifying secure error handling: no stack traces, paths, or database errors leaked."""
from __future__ import annotations

import logging
from fastapi import APIRouter
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.schemas import ApiError

# Test router to trigger edge-case exceptions and verify global handlers
_test_router = APIRouter(prefix="/test-errors")


@_test_router.get("/unhandled-crash")
def trigger_unhandled_crash():
    """Simulate an unexpected code crash (ZeroDivisionError with internal path)."""
    # Intentional unhandled exception
    return 1 / 0


@_test_router.get("/database-error")
def trigger_database_error():
    """Simulate a raw database exception containing connection strings and table names."""
    raise ApiError(
        status=500,
        code="DB_QUERY_FAILED",
        title="Database query error",
        detail='Failed to execute query: SELECT * FROM users at postgresql://postgres:secret123@10.0.0.5:5432/prithviq_prod. relation "users" does not exist',
    )


@_test_router.get("/path-leak-error")
def trigger_path_leak_error():
    """Simulate an error that attempts to leak an internal server file path."""
    raise ApiError(
        status=400,
        code="INVALID_FILE",
        title="Invalid file",
        detail="Could not open file at C:\\Users\\Administrator\\Desktop\\SatQuery\\internal_secrets.key or /etc/passwd",
    )


# Attach test router for testing error boundaries
app.include_router(_test_router)


def test_unhandled_crash_returns_500_without_stack_trace_or_path(caplog) -> None:
    """Unhandled exception must return 500 with generic message and log details server-side."""
    no_raise_client = TestClient(app, raise_server_exceptions=False)
    with caplog.at_level(logging.ERROR):
        resp = no_raise_client.get("/test-errors/unhandled-crash")

    assert resp.status_code == 500
    body = resp.json()

    # Verify RFC 7807 structure and request ID
    assert body["status"] == 500
    assert body["code"] == "INTERNAL_SERVER_ERROR"
    assert "request_id" in body and body["request_id"].startswith("req_")

    # Confirm NO stack trace or internal path is exposed to client
    detail = body["detail"].lower()
    assert "traceback" not in detail
    assert "zerodivisionerror" not in detail
    assert "division by zero" not in detail
    assert "line " not in detail
    assert "users" not in detail
    assert "file" not in detail

    # Confirm server-side logged the full error with traceback
    assert any("Unhandled exception" in record.message for record in caplog.records)


def test_database_error_is_sanitized_and_masked(client: TestClient, caplog) -> None:
    """Database connection strings, passwords, and raw SQL queries must be masked."""
    with caplog.at_level(logging.ERROR):
        resp = client.get("/test-errors/database-error")

    assert resp.status_code == 500
    body = resp.json()

    raw_response = resp.text
    # Sensitive DB info must NOT be in response
    assert "secret123" not in raw_response
    assert "10.0.0.5" not in raw_response
    assert "postgresql://" not in raw_response
    assert "relation \"users\" does not exist" not in raw_response

    # Must give generic safe message
    assert "request ID" in body["detail"] or "request_id" in body["detail"] or "internal" in body["detail"].lower()


def test_internal_paths_are_redacted(client: TestClient) -> None:
    """Internal filesystem paths must be redacted in user-facing error details."""
    resp = client.get("/test-errors/path-leak-error")
    assert resp.status_code == 400
    body = resp.json()

    # Paths must be redacted
    assert "C:\\Users" not in body["detail"]
    assert "Administrator" not in body["detail"]
    assert "/etc/passwd" not in body["detail"]
    assert "[REDACTED_PATH]" in body["detail"]
