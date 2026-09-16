"""M2 Earth Engine client tests — fully hermetic.

No real Earth Engine network calls and no reads of the developer's
service-account JSON: the ``ee`` module and
``google.oauth2.service_account.Credentials`` are replaced with fakes, and the
credential path points at a pytest tmp file whose contents are never parsed.
"""
from __future__ import annotations

import sys
import threading
import time
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from backend.app import ee_client
from backend.app.config import get_settings


class _FakeCredentials:
    project_id = "fake-ee-project"
    load_calls = 0

    def __init__(self, scopes: list[str] | None = None) -> None:
        self.scopes = list(scopes or [])

    @classmethod
    def from_service_account_file(
        cls, path: str, scopes: list[str]
    ) -> "_FakeCredentials":
        cls.load_calls += 1
        return cls(scopes)


class _FakeEe:
    def __init__(self, *, fail: bool = False, init_delay_s: float = 0.0) -> None:
        self.initialize_calls: list[dict[str, Any]] = []
        self._fail = fail
        self.init_delay_s = init_delay_s

    def Initialize(self, credentials: Any = None, project: Any = None) -> None:
        if self.init_delay_s:
            time.sleep(self.init_delay_s)
        self.initialize_calls.append({"credentials": credentials, "project": project})
        if self._fail:
            raise RuntimeError("project [SECRET-PROJECT] token=SECRET-TOKEN")


@pytest.fixture()
def fresh_ee_state(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    """Reset cached EE state; isolate the credential path to a tmp dummy file.

    The dummy file is created so the existence check passes, but its contents
    are never parsed (Credentials is replaced by _FakeCredentials).
    """
    ee_client._reset_for_tests()
    settings = get_settings()
    fake_key = tmp_path / "fake-service-account.json"
    fake_key.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(settings, "ee_enabled", True)
    monkeypatch.setattr(settings, "ee_credentials_path", str(fake_key))
    yield settings
    ee_client._reset_for_tests()


@pytest.fixture()
def fake_sdk(monkeypatch: pytest.MonkeyPatch) -> _FakeEe:
    fake_ee = _FakeEe()
    monkeypatch.setitem(sys.modules, "ee", fake_ee)
    from google.oauth2 import service_account as sa_module

    monkeypatch.setattr(sa_module, "Credentials", _FakeCredentials)
    _FakeCredentials.load_calls = 0
    return fake_ee


# --- lazy initialization -------------------------------------------------------


def test_import_does_not_initialize_ee(fresh_ee_state, fake_sdk) -> None:
    # The module was already imported at the top of this file, with no EE SDK
    # activity: state must still be pristine and the fake must be untouched.
    assert ee_client._ee_module is None
    assert ee_client._init_failed_message is None
    assert fake_sdk.initialize_calls == []


def test_disabled_ee_fails_safely_and_fast(fresh_ee_state, monkeypatch) -> None:
    monkeypatch.setattr(get_settings(), "ee_enabled", False)
    with pytest.raises(ee_client.EeClientError, match="disabled"):
        ee_client.get_ee()
    # The sanitized failure is cached: a second call fails fast, same message.
    with pytest.raises(ee_client.EeClientError, match="disabled"):
        ee_client.get_ee()
    assert ee_client._init_failed_message == (
        "Earth Engine is disabled (EE_ENABLED is not true)."
    )


# --- successful initialization --------------------------------------------------


def test_successful_initialization_uses_credential_project(
    fresh_ee_state, fake_sdk
) -> None:
    module = ee_client.get_ee()
    assert module is fake_sdk
    assert len(fake_sdk.initialize_calls) == 1
    call = fake_sdk.initialize_calls[0]
    assert call["project"] == "fake-ee-project"
    assert call["credentials"].scopes == [ee_client.EE_SCOPE]
    assert _FakeCredentials.load_calls == 1
    # Singleton behavior: a second call never re-initializes.
    assert ee_client.get_ee() is fake_sdk
    assert len(fake_sdk.initialize_calls) == 1

# --- concurrency / single initialization ----------------------------------------


def test_concurrent_get_ee_initializes_once(fresh_ee_state, fake_sdk) -> None:
    fake_sdk.init_delay_s = 0.05  # widen the race window deliberately

    barrier = threading.Barrier(8)
    results: list[Any] = []
    errors: list[BaseException] = []

    def caller() -> None:
        barrier.wait(timeout=10)
        try:
            results.append(ee_client.get_ee())
        except BaseException as exc:  # pragma: no cover - must not happen
            errors.append(exc)

    threads = [threading.Thread(target=caller, name=f"ee-{i}") for i in range(8)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=30)

    assert errors == []
    assert len(results) == 8
    assert len({id(result) for result in results}) == 1
    assert results[0] is fake_sdk
    assert len(fake_sdk.initialize_calls) == 1


# --- sanitized failure surface ---------------------------------------------------


def test_initialization_failure_surfaced_sanitized(
    fresh_ee_state, fake_sdk, monkeypatch: pytest.MonkeyPatch
) -> None:
    failing = _FakeEe(fail=True)
    monkeypatch.setitem(sys.modules, "ee", failing)

    with pytest.raises(ee_client.EeClientError) as excinfo:
        ee_client.get_ee()
    message = str(excinfo.value)
    assert message == "Earth Engine initialization failed (RuntimeError)."
    assert "SECRET" not in message and "SECRET-TOKEN" not in message

    # Cached sanitized failure: a second call fails fast without a new attempt.
    with pytest.raises(ee_client.EeClientError, match="failed"):
        ee_client.get_ee()
    assert len(failing.initialize_calls) == 1


def test_missing_credential_file_fails_without_leaking_paths(
    fresh_ee_state, fake_sdk, monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    missing = tmp_path / "does-not-exist.json"
    monkeypatch.setattr(get_settings(), "ee_credentials_path", str(missing))

    with pytest.raises(ee_client.EeClientError, match="credential file not found"):
        ee_client.get_ee()
    message = str(ee_client._init_failed_message)
    assert str(missing) not in message
    assert _FakeCredentials.load_calls == 0  # nothing was ever parsed


# --- credential path handling -----------------------------------------------------


def test_relative_credentials_path_anchors_to_repo_root(tmp_path: Path) -> None:
    resolved = ee_client._resolve_credentials_path(
        "backend/credentials/satquery-earth-engine.json"
    )
    assert resolved == (
        ee_client._REPO_ROOT / "backend/credentials/satquery-earth-engine.json"
    )
    absolute = tmp_path / "abs.json"
    assert ee_client._resolve_credentials_path(str(absolute)) == absolute


# --- existing flow must never touch the EE client ---------------------------------


def test_existing_job_flow_never_touches_ee_client(
    client: TestClient, fresh_ee_state, fake_sdk
) -> None:
    from backend.tests.helpers import API, age_job, create_session, make_ready_upload, submit_analysis

    upload = make_ready_upload(client)
    session = create_session(client, "single", [upload])
    job = submit_analysis(client, session["session_id"])
    age_job(job["job_id"], 9.5)

    assert client.get(f"{API}/jobs/{job['job_id']}").json()["data"]["status"] == "completed"
    result = client.get(
        f"{API}/sessions/{session['session_id']}/results/latest"
    ).json()["data"]
    assert result["answer"]

    # The full job flow ran without initializing or even attempting EE.
    assert ee_client._ee_module is None
    assert ee_client._init_failed_message is None
    assert fake_sdk.initialize_calls == []
    assert _FakeCredentials.load_calls == 0

