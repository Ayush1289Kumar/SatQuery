"""Real Gemini provider for natural-language answer generation (Task 4).

Enabled only when ``AI_PROVIDER=gemini`` (see config.py). The worker calls
:func:`generate_ai_answer` from a background thread; every failure mode —
missing key, missing SDK, network error, timeout, unusable output — is
reported via ``AiAnswer.used=False`` so the caller falls back to the
deterministic worker and the job still completes.

Security: the API key is only ever passed to the Google SDK client. It is
never logged, never embedded in exception text, and never returned in any API
response. Gemini never generates GIS polygons — the deterministic worker owns
all map evidence; Gemini contributes the natural-language answer (and, when
it returns a valid one, a workflow-id suggestion the caller must validate).
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any

from .config import get_settings

# MIME types Gemini accepts inline. GeoTIFF/TIFF is NOT supported by the API —
# such uploads are skipped (with a prompt note) and the deterministic worker
# remains responsible for the map evidence either way.
SUPPORTED_IMAGE_MIME = {"image/png", "image/jpeg", "image/webp"}

# Gemini inline-data budget (per request); larger uploads are not retained.
MAX_INLINE_IMAGE_BYTES = 19 * 1024 * 1024


@dataclass(frozen=True)
class AiAnswer:
    """Outcome of one Gemini call.

    ``used`` is True only when Gemini genuinely produced the answer text —
    provenance in ``models[]`` may claim Gemini only when this is True.
    ``workflow_id`` is a *suggestion*: the caller must validate it against the
    allowed workflow set and the session mode before honoring it.
    """

    answer: str | None
    model_name: str
    used: bool
    workflow_id: str | None = None
    elapsed_s: float = 0.0
    error: str | None = None


def _build_prompt(question: str, mode: str, image_count: int, context_note: str | None) -> str:
    context = {
        "single": "one satellite image",
        "twoDate": (
            "two satellite images of the same area from different dates "
            "(the first attached image is the earlier date, the second the later date)"
        ),
        "opticalSar": "one optical and one SAR satellite image of the same area",
    }[mode]
    lines = [
        "You are a remote-sensing analyst helping a non-expert user.",
        f"The user uploaded {context}; {image_count} image(s) are attached.",
        "Answer the user's question in 2-4 short sentences of plain English.",
        "Describe only what is visible or measurable in the attached imagery; be concrete and cautious.",
        'Respond with strict JSON: {"answer": string, "workflow_id": string or null}.',
        "workflow_id (the specialist analysis workflow your answer reflects) must be exactly one of:",
        '- for a single optical image: "water_mapping", "builtup_mapping", or "single_image_vqa"',
        '- for a two-date comparison: "change_detection"',
        '- for optical+SAR: "optical_sar_fusion"',
        "or null if none applies.",
    ]
    if context_note:
        lines.append(context_note)
    return "\n".join(lines) + f"\n\nUser question: {question}"


def generate_ai_answer(
    question: str,
    images: list[tuple[bytes, str]],
    mode: str,
    timeout_s: float,
    context_note: str | None = None,
) -> AiAnswer:
    """Call Gemini with the question + image bytes. Sync; runs in a worker thread.

    Every failure mode returns ``used=False`` with a sanitized error string
    (exception *type* only — never SDK messages, never the API key).
    """
    settings = get_settings()
    if not settings.gemini_api_key:
        return AiAnswer(
            answer=None,
            model_name=settings.gemini_model,
            used=False,
            error="GEMINI_API_KEY is not configured.",
        )
    try:
        from google import genai  # lazy import: mock mode and tests never need the SDK
        from google.genai import types as genai_types
    except Exception:  # pragma: no cover - only when the SDK is absent
        return AiAnswer(
            answer=None,
            model_name=settings.gemini_model,
            used=False,
            error="The google-genai SDK is not installed.",
        )

    started = time.monotonic()
    try:
        client = genai.Client(
            api_key=settings.gemini_api_key,
            http_options=genai_types.HttpOptions(timeout=int(timeout_s * 1000)),
        )
        contents: list[Any] = [_build_prompt(question, mode, len(images), context_note)]
        for image_bytes, mime_type in images:
            contents.append(
                genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            )
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=contents,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        raw = (response.text or "").strip()
        parsed: Any = json.loads(raw) if raw else {}
        if not isinstance(parsed, dict):
            parsed = {}
        answer = str(parsed.get("answer") or "").strip()
        raw_workflow = parsed.get("workflow_id")
        workflow_id = str(raw_workflow).strip() if raw_workflow else None
        elapsed = time.monotonic() - started
        if not answer:
            return AiAnswer(
                answer=None,
                model_name=settings.gemini_model,
                used=False,
                elapsed_s=elapsed,
                error="Gemini returned an unusable answer.",
            )
        return AiAnswer(
            answer=answer,
            model_name=settings.gemini_model,
            used=True,
            workflow_id=workflow_id or None,
            elapsed_s=elapsed,
        )
    except Exception as exc:  # network / timeout / auth / parse — sanitized on purpose
        return AiAnswer(
            answer=None,
            model_name=settings.gemini_model,
            used=False,
            elapsed_s=time.monotonic() - started,
            error=f"Gemini call failed ({type(exc).__name__}).",
        )

