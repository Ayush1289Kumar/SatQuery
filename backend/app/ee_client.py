"""Google Earth Engine client (M2): lazy, thread-safe, fail-closed.

``get_ee()`` is the only entry point future tool executors depend on. It
initializes the installed ``earthengine-api`` at most once per process using
the service-account credential PATH from Settings (never its contents) and the
credential's own registered Cloud project — the same proven pattern as
``backend/scripts/verify_ee_auth.py`` (which remains the standalone ops check).

Discipline mirrors ``ai.py``:

- lazy SDK import: importing this module performs no work whatsoever,
- sanitized errors: exception *type* only — never SDK messages, key material,
  tokens, service-account emails, or project identifiers,
- a dedicated ``EeClientError`` so callers fail closed cleanly,
- cached outcomes: one successful initialization; a failed initialization is
  remembered (sanitized) so concurrent callers fail fast instead of hammering
  Google's auth endpoints.

The module handle returned by ``get_ee()`` never carries per-job computation
graphs: executors construct fresh Earth Engine objects per request.
"""
from __future__ import annotations

import threading
from pathlib import Path
from typing import Any, Optional

from .config import get_settings

EE_SCOPE = "https://www.googleapis.com/auth/earthengine"

_REPO_ROOT = Path(__file__).resolve().parents[2]

_state_lock = threading.Lock()
_ee_module: Optional[Any] = None
_init_failed_message: Optional[str] = None


class EeClientError(Exception):
    """Earth Engine client failure, sanitized (never includes secret material)."""


def _resolve_credentials_path(raw: str) -> Path:
    """Anchor a relative credentials path to the repository root so the
    setting works from any working directory (same discipline as config.py).
    """
    path = Path(raw)
    if path.is_absolute():
        return path
    return _REPO_ROOT / path


def get_ee() -> Any:
    """Return the initialized ``earthengine-api`` module, initializing once.

    Raises ``EeClientError`` (sanitized) when Earth Engine is disabled,
    misconfigured, or when initialization fails. Safe under concurrent first
    use: the state lock guarantees a single initialization attempt settles
    before any other caller proceeds.
    """
    if _ee_module is not None:  # fast path: already initialized
        return _ee_module
    if _init_failed_message is not None:  # fast path: cached sanitized failure
        raise EeClientError(_init_failed_message)
    with _state_lock:
        if _ee_module is not None:
            return _ee_module
        if _init_failed_message is not None:
            raise EeClientError(_init_failed_message)
        _initialize()
        return _ee_module


def _initialize() -> None:
    """Perform the one-time initialization. Caller must hold ``_state_lock``."""
    global _ee_module, _init_failed_message
    settings = get_settings()
    if not settings.ee_enabled:
        _init_failed_message = "Earth Engine is disabled (EE_ENABLED is not true)."
        raise EeClientError(_init_failed_message)
    try:
        from google.oauth2 import service_account

        import ee  # lazy: mock mode and the test suite never need the SDK

        key_path = _resolve_credentials_path(settings.ee_credentials_path)
        if not key_path.is_file():
            _init_failed_message = (
                "Earth Engine credential file not found (check EE_CREDENTIALS_PATH)."
            )
            raise EeClientError(_init_failed_message)
        credentials = service_account.Credentials.from_service_account_file(
            str(key_path), scopes=[EE_SCOPE]
        )
        project_id = credentials.project_id
        if not project_id:
            _init_failed_message = (
                "Earth Engine credential JSON has no project_id field."
            )
            raise EeClientError(_init_failed_message)
        ee.Initialize(credentials=credentials, project=project_id)
    except EeClientError:
        raise
    except ImportError:
        _init_failed_message = "The earthengine-api package is not installed."
        raise EeClientError(_init_failed_message) from None
    except Exception as exc:  # sanitized like ai.py: exception type only
        _init_failed_message = (
            f"Earth Engine initialization failed ({type(exc).__name__})."
        )
        raise EeClientError(_init_failed_message) from None
    else:
        _ee_module = ee
        _init_failed_message = None


def _reset_for_tests() -> None:
    """Test seam: drop cached initialization state (never used by the app)."""
    global _ee_module, _init_failed_message
    with _state_lock:
        _ee_module = None
        _init_failed_message = None
