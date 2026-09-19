"""Job progress endpoints (api.md section 4)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from ..deps import get_current_user, get_request_id
from ..schemas import envelope
from ..store import get_store
from ..worker import job_view

router = APIRouter()


@router.get("/jobs/{job_id}")
def get_job_status(
    job_id: str,
    request: Request,
    user: Any = Depends(get_current_user),
) -> dict[str, Any]:
    """Poll analysis progress for the AnalyzingScreen (stage/progress/message)."""
    request_id = get_request_id(request)
    store = get_store()
    job = store.get_job(job_id)
    view = job_view(job)
    # Lazily finalise: once the deterministic timeline is exhausted, generate and
    # persist the result so results/latest can serve it immediately afterwards.
    store.ensure_result(job)
    return envelope(view, request_id)
