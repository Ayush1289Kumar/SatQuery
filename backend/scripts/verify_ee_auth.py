"""One-shot Google Earth Engine service-account verification (run manually).

Verifies, in order:
  1. the service-account JSON at backend/credentials/ loads via google-auth
     (the library reads the file; its contents are never printed),
  2. ee.Initialize succeeds against the credential's own Cloud project,
  3. a minimal, harmless, read-only server call returns.

Usage:
    .venv\\Scripts\\python.exe -u backend\\scripts\\verify_ee_auth.py

Nothing sensitive is ever printed: the service-account email, project id,
private key, and tokens are scrubbed from all output.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import ee  # noqa: E402  (installed via backend/requirements.txt)
from google.oauth2 import service_account  # noqa: E402

KEY_FILE = Path(__file__).resolve().parents[1] / "credentials" / "satquery-earth-engine.json"

# The standard Earth Engine OAuth scope (the one ee.ServiceAccountCredentials uses).
EE_SCOPE = "https://www.googleapis.com/auth/earthengine"


def _scrub(text: str, secrets: list[str]) -> str:
    for secret in secrets:
        if secret:
            text = text.replace(secret, "[redacted]")
    return text


def main() -> int:
    print(f"ee SDK version: {getattr(ee, '__version__', 'unknown')}")
    if not KEY_FILE.is_file():
        print("stage1 credential load: FAILED -> file not found at backend/credentials/")
        return 1

    # --- Stage 1: load the service-account credential (library reads the file;
    #     no contents are printed here or anywhere else in this script). ---
    try:
        creds = service_account.Credentials.from_service_account_file(
            str(KEY_FILE), scopes=[EE_SCOPE]
        )
        email = creds.service_account_email
        project_id = creds.project_id
        if not project_id:
            print("stage1 credential load: FAILED -> JSON has no project_id field")
            return 1
        secrets = [email or "", project_id or ""]
        print("stage1 credential load: OK (service_account parsed; details not shown)")
    except Exception as exc:  # noqa: BLE001
        print(f"stage1 credential load: FAILED -> {type(exc).__name__}")
        return 1

    # --- Stage 2: Earth Engine initialization for the registered project. ---
    try:
        ee.Initialize(credentials=creds, project=project_id)
        print("stage2 ee.Initialize: OK (project: [redacted])")
    except Exception as exc:  # noqa: BLE001
        print(
            "stage2 ee.Initialize: FAILED -> "
            f"{type(exc).__name__}: {_scrub(str(exc), secrets)[:220]!r}"
        )
        return 1

    # --- Stage 3: minimal harmless read-only verification (pure literal
    #     compute; no imagery, no user data, no expensive computation). ---
    try:
        value = ee.Number(2).add(3).getInfo()
        print(f"stage3 read-only API call (ee.Number(2).add(3).getInfo()): {value}")
        if value != 5:
            print("stage3 verification: FAILED -> unexpected server value")
            return 1
        print("stage3 read-only API call: OK")
    except Exception as exc:  # noqa: BLE001
        print(
            "stage3 read-only API call: FAILED -> "
            f"{type(exc).__name__}: {_scrub(str(exc), secrets)[:220]!r}"
        )
        return 1

    print("\nEARTH ENGINE AUTH VERIFICATION: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
