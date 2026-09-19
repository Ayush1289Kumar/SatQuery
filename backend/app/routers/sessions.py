"""Analysis session endpoints (api.md section 3)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from ..deps import get_current_user, get_request_id
from ..schemas import SessionCreateRequest, envelope
from ..store import get_store

router = APIRouter()


@router.post("/sessions")
def create_session(
    body: SessionCreateRequest,
    request: Request,
    user: Any = Depends(get_current_user),
) -> dict[str, Any]:
    """Create an analysis session after all uploads are ready (mode rules enforced)."""
    request_id = get_request_id(request)
    session = get_store().create_session(
        mode=body.mode,
        upload_ids=body.upload_ids,
        category=body.category or "general",
        region=body.region.model_dump() if body.region is not None else None,
    )
    return envelope(
        {
            "session_id": session.session_id,
            "mode": session.mode,
            "status": session.status,
            "upload_ids": session.upload_ids,
            "created_at": session.created_at,
        },
        request_id,
    )
