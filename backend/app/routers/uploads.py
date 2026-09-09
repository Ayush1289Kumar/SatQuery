"""Upload lifecycle endpoints (api.md section 2) plus the mock object-storage sink."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Request, Response

from .. import ai
from ..config import get_settings
from ..deps import get_current_user, get_request_id
from ..schemas import ApiError, UploadCompleteRequest, UploadInitiateRequest, envelope
from ..store import get_store

router = APIRouter()

# MVP accepted formats (api.md section 2 / backend-integration.md section 6.1)
_ALLOWED_TYPES: dict[str, set[str]] = {
    "image/tiff": {"tif", "tiff"},
    "image/png": {"png"},
    "image/jpeg": {"jpg", "jpeg"},
}


def _extension(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


@router.post("/uploads/initiate")
def initiate_upload(
    body: UploadInitiateRequest,
    request: Request,
    user: Any = Depends(get_current_user),
) -> dict[str, Any]:
    """Return a mock presigned upload target for the direct file upload."""
    request_id = get_request_id(request)
    settings = get_settings()
    extension = _extension(body.filename)
    allowed_extensions = _ALLOWED_TYPES.get(body.content_type.lower())
    if allowed_extensions is None or extension not in allowed_extensions:
        raise ApiError(
            status=415,
            code="UNSUPPORTED_MEDIA_TYPE",
            title="Unsupported media type",
            detail=(
                f"Filename '{body.filename}' with content type '{body.content_type}' is not "
                "supported. Use .tif/.tiff (image/tiff) or .png/.jpg/.jpeg for demo data."
            ),
        )
    if body.size_bytes > settings.max_upload_bytes:
        raise ApiError(
            status=413,
            code="FILE_TOO_LARGE",
            title="File too large",
            detail=(
                f"Declared size {body.size_bytes} bytes exceeds the "
                f"{settings.max_upload_bytes} byte limit."
            ),
        )
    record = get_store().create_upload(
        filename=body.filename,
        content_type=body.content_type,
        size_bytes=body.size_bytes,
        sha256=body.sha256,
        kind=body.kind,
        mode=body.mode,
    )
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    return envelope(
        {
            "upload_id": record.upload_id,
            "upload_url": f"{settings.api_prefix}/uploads/{record.upload_id}/data",
            "upload_headers": {"Content-Type": body.content_type},
            "expires_at": expires_at.isoformat(timespec="seconds").replace("+00:00", "Z"),
            "max_size_bytes": settings.max_upload_bytes,
        },
        request_id,
    )


@router.put("/uploads/{upload_id}/data")
async def put_upload_data(upload_id: str, request: Request) -> Response:
    """Mock object-storage target for the returned ``upload_url``.

    Emulates a presigned S3/MinIO PUT. Bytes are retained (capped at the Gemini
    inline limit) only when the real AI provider is enabled, so the Gemini call
    can attach them; mock mode discards them immediately. This endpoint is
    plumbing for the presigned flow, not a contract endpoint.
    """
    store = get_store()
    retain = get_settings().ai_provider == "gemini"
    data: bytes | None = None
    if retain:
        declared = request.headers.get("content-length")
        if declared is None or int(declared) <= ai.MAX_INLINE_IMAGE_BYTES:
            data = await request.body()
            if len(data) > ai.MAX_INLINE_IMAGE_BYTES:
                data = None
    content_length = int(request.headers.get("content-length") or 0)
    store.mark_upload_data(upload_id, data, content_length)
    return Response(status_code=200, headers={"ETag": f'"mock-{upload_id}"'})


@router.post("/uploads/{upload_id}/complete")
def complete_upload(
    upload_id: str,
    body: UploadCompleteRequest,
    request: Request,
    user: Any = Depends(get_current_user),
) -> dict[str, Any]:
    """Confirm the direct upload and start (deterministic) server-side validation."""
    request_id = get_request_id(request)
    record = get_store().complete_upload(upload_id, etag=body.etag, sha256=body.sha256)
    return envelope({"upload_id": record.upload_id, "status": record.status}, request_id)


@router.get("/uploads/{upload_id}")
def get_upload(
    upload_id: str,
    request: Request,
    user: Any = Depends(get_current_user),
) -> dict[str, Any]:
    """Return validation status and normalized (demo) raster metadata."""
    request_id = get_request_id(request)
    store = get_store()
    record = store.get_upload(upload_id)
    return envelope(store.upload_view(record), request_id)
