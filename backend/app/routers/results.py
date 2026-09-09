"""Result endpoints (api.md section 5)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from ..deps import get_current_user, get_request_id
from ..schemas import envelope
from ..store import get_store

router = APIRouter()


@router.get("/sessions/{session_id}/results/latest")
def latest_session_result(
    session_id: str,
    request: Request,
    user: Any = Depends(get_current_user),
) -> dict[str, Any]:
    """Return the completed result for ResultsScreen/MapView (GeoJSON [lng, lat])."""
    request_id = get_request_id(request)
    result = get_store().latest_result(session_id)
    return envelope(result, request_id)
