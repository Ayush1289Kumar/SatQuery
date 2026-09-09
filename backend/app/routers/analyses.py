"""Analysis submission endpoints (api.md section 4)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from ..deps import get_current_user, get_request_id
from ..schemas import AnalysisCreateRequest, envelope
from ..store import get_store
from ..worker import DURATION_SECONDS, route_workflow

router = APIRouter()


@router.post("/sessions/{session_id}/analyses", status_code=202)
def submit_analysis(
    session_id: str,
    body: AnalysisCreateRequest,
    request: Request,
    user: Any = Depends(get_current_user),
) -> dict[str, Any]:
    """Submit the question and place an asynchronous job on the (mock) queue.

    Honors the ``Idempotency-Key`` header: the same key returns the existing
    job instead of creating a duplicate analysis (api.md section 4).
    """
    request_id = get_request_id(request)
    store = get_store()
    session = store.get_session(session_id)
    workflow = route_workflow(session.mode, body.question)
    job, _created = store.create_job(
        session,
        question=body.question,
        requested_outputs=body.requested_outputs,
        language=body.language,
        idempotency_key=request.headers.get("idempotency-key"),
        workflow=workflow,
        category=body.category or session.category,
    )
    # Matches the documented submission example: the job is accepted as queued;
    # GET /jobs/{job_id} reports the live stage progression from here on.
    return envelope(
        {
            "job_id": job.job_id,
            "session_id": job.session_id,
            "status": "queued",
            "stage": "validate",
            "progress": 0,
            "estimated_seconds": int(job.ai_estimate_s or DURATION_SECONDS),
            "created_at": job.created_at,
        },
        request_id,
    )
