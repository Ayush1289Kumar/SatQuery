"""End-to-end smoke test for the real Gemini provider (run manually).

Exercises the production flow through the real API lifecycle:
uploads/initiate -> direct PUT -> complete -> session -> analysis -> jobs -> results,
with the real ``ai.generate_ai_answer`` (no mocks, no monkeypatching).

Usage (from anywhere; paths are anchored, like config.py):
    .venv\\Scripts\\python.exe -u backend\\scripts\\smoke_gemini.py

Requires backend/.env with AI_PROVIDER=gemini, GEMINI_API_KEY=... and
GEMINI_MODEL=... The API key is NEVER printed, logged, or included in any
output — only booleans (key_loaded) and model names are shown.

Scenario 1 proves a real Gemini answer reaches the application.
Scenario 2 removes the key in-process to prove the fail-closed deterministic
fallback engages on actual provider failure and the job still completes.
"""
from __future__ import annotations

import struct
import sys
import zlib
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient  # noqa: E402

from backend.app.config import get_settings  # noqa: E402
from backend.app.main import app  # noqa: E402
from backend.app.store import get_store  # noqa: E402

API = "/api/v1"


def tiny_png() -> bytes:
    """A valid 1x1 RGB PNG (stdlib only) so the API receives a real image."""
    def chunk(tag: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + tag
            + payload
            + struct.pack(">I", zlib.crc32(tag + payload))
        )

    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)  # 1x1, depth 8, RGB
    idat = zlib.compress(b"\x00\xff\x00\x00")  # filter byte + one RGB pixel
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", idat)
        + chunk(b"IEND", b"")
    )


def run_scenario(client: TestClient, question: str) -> dict[str, Any]:
    """The real SatQuery flow: initiate -> PUT -> complete -> session -> job -> result."""
    store = get_store()
    png = tiny_png()

    init = client.post(
        f"{API}/uploads/initiate",
        json={
            "filename": "scene_2026-09-10_optical.png",
            "content_type": "image/png",
            "size_bytes": len(png),
            "kind": "optical",
            "mode": "single",
        },
    )
    assert init.status_code == 200, init.text
    data = init.json()["data"]

    put = client.put(data["upload_url"], content=png)
    assert put.status_code == 200, put.text

    comp = client.post(f"{API}/uploads/{data['upload_id']}/complete", json={})
    assert comp.status_code == 200, comp.text

    sess = client.post(
        f"{API}/sessions",
        json={"mode": "single", "upload_ids": [data["upload_id"]], "category": "water"},
    )
    assert sess.status_code == 200, sess.text
    session = sess.json()["data"]

    job_resp = client.post(
        f"{API}/sessions/{session['session_id']}/analyses",
        json={"question": question},
    )
    assert job_resp.status_code == 202, job_resp.text
    job = job_resp.json()["data"]

    # Align with the app's real tolerance: the frontend poller allows 180s,
    # which covers the provider retry budget (3 x 45s requests + 8s backoff).
    store.join_ai_threads(timeout=180)  # wait for the real Gemini call to finish

    result_resp = client.get(f"{API}/sessions/{session['session_id']}/results/latest")
    result = result_resp.json()["data"] if result_resp.status_code == 200 else None
    job_record = store.get_job(job["job_id"])
    return {
        "job": job,
        "result": result,
        "result_status": result_resp.status_code,
        "ai_error": job_record.ai_error,
        "ai_elapsed_s": job_record.ai_elapsed_s,
    }

def probe_raw(settings: Any) -> None:
    """Print HTTP status codes for minimal request variants (key scrubbed).

    Runs the same model string against progressively larger request shapes so a
    persistent provider failure can be attributed to the model/endpoint itself,
    the image part, or the JSON-mode config used by ai.py.
    """
    from google import genai
    from google.genai import errors, types

    key = settings.gemini_api_key or ""

    def scrub(text: str) -> str:
        return text.replace(key, "[REDACTED]") if key else text

    client = genai.Client(api_key=key, http_options=types.HttpOptions(timeout=30000))
    png = tiny_png()
    variants = [
        ("text-only", {"contents": ["Reply with the single word OK."]}),
        (
            "text+image",
            {
                "contents": [
                    "Reply with the single word OK.",
                    types.Part.from_bytes(data=png, mime_type="image/png"),
                ]
            },
        ),
        (
            "full parity (json mode, as ai.py)",
            {
                "contents": [
                    'Reply with strict JSON {"answer": string}.',
                    types.Part.from_bytes(data=png, mime_type="image/png"),
                ],
                "config": types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            },
        ),
    ]
    for label, kwargs in variants:
        try:
            resp = client.models.generate_content(
                model=settings.gemini_model, **kwargs
            )
            print(f"probe[{label}]: OK -> {(resp.text or '')[:60]!r}")
        except errors.APIError as exc:
            msg = scrub(str(getattr(exc, "message", "") or ""))
            print(
                f"probe[{label}]: APIError status={getattr(exc, 'code', '?')} "
                f"msg={msg[:180]!r}"
            )
        except Exception as exc:  # noqa: BLE001
            print(f"probe[{label}]: {type(exc).__name__}: {scrub(str(exc))[:180]!r}")


def describe(title: str, outcome: dict[str, Any]) -> None:
    print(f"\n=== {title} ===")
    print(f"job_id:          {outcome['job']['job_id']}")
    print(f"ai_elapsed_s:    {outcome['ai_elapsed_s']}")
    # Sanitized by ai.py/store.py: exception type only, never SDK messages/key.
    print(f"ai_error:        {outcome['ai_error']}")
    print(f"results/latest:  HTTP {outcome['result_status']}")
    result = outcome["result"]
    if result is None:
        return
    print(f"models[]:        {[m['name'] for m in result['models']]}")
    print(f"workflow.id:     {result['workflow']['id']}")
    print(f"confidence:      {result['confidence']} ({result['confidence_band']})")
    print(f"usage_time_sec:  {result['usage_time_sec']}")
    print(f"answer[:240]:    {result['answer'][:240]!r}")


def main() -> int:
    settings = get_settings()
    print("=== configuration (key value never printed) ===")
    print(f"ai_provider:      {settings.ai_provider}")
    print(f"gemini_model:     {settings.gemini_model}")
    print(f"key_loaded:       {settings.gemini_api_key is not None}")
    print(f"gemini_timeout_s: {settings.gemini_timeout_s}")
    if settings.ai_provider != "gemini" or not settings.gemini_api_key:
        print("FAIL: backend/.env must set AI_PROVIDER=gemini and GEMINI_API_KEY.")
        return 1

    client = TestClient(app)
    ok = True

    # 1) Real call: expect models[0] == gemini-3.8-flash and a Gemini answer.
    s1 = run_scenario(client, "What do you see in this image?")
    describe("Scenario 1: real Gemini call", s1)
    used_gemini = s1["result"] is not None and any(
        settings.gemini_model in m["name"] for m in s1["result"]["models"]
    )
    print(f"scenario1 real-gemini:        {'PASS' if used_gemini else 'FAIL'}")
    ok = ok and used_gemini
    if not used_gemini:
        print("\n--- raw provider diagnosis (HTTP codes; key scrubbed) ---")
        probe_raw(settings)

    # 2) Induced provider failure (config-only, in-process): key removed.
    settings.gemini_api_key = None
    s2 = run_scenario(client, "Describe this image.")
    describe("Scenario 2: induced provider failure (key removed in-process)", s2)
    r2 = s2["result"]
    fallback_ok = (
        r2 is not None
        and all("gemini" not in m["name"].lower() for m in r2["models"])
        and s2["ai_error"] == "GEMINI_API_KEY is not configured."
        and bool(r2["answer"])
    )
    print(f"scenario2 fail-closed fallback: {'PASS' if fallback_ok else 'FAIL'}")
    ok = ok and fallback_ok

    print("\nSMOKE TEST:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
