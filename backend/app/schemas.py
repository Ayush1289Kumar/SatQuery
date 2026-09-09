"""Pydantic schemas and API envelope/error helpers for the demo-critical API.

Mirrors the contract documented in ``api.md`` (sections 1-5) for the
demo-critical endpoints only: uploads, sessions, analyses, jobs, and results.
Successful responses are wrapped in the documented envelope::

    {"data": {...}, "request_id": "req_..."}

Errors use the RFC 7807-style problem body from ``api.md`` section 9.
"""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

UploadKind = Literal["optical", "sar"]
UploadMode = Literal["single", "twoDate", "opticalSar"]


class ApiError(Exception):
    """Contract-shaped error rendered as an RFC 7807-style problem body."""

    def __init__(
        self,
        *,
        status: int,
        code: str,
        title: str,
        detail: str,
        field_errors: Optional[list[dict[str, str]]] = None,
    ) -> None:
        super().__init__(detail)
        self.status = status
        self.code = code
        self.title = title
        self.detail = detail
        self.field_errors = field_errors


def envelope(data: Any, request_id: str) -> dict[str, Any]:
    """Wrap a payload in the documented ``{data, request_id}`` envelope."""
    return {"data": data, "request_id": request_id}


def problem(
    *,
    request_id: str,
    status: int,
    code: str,
    title: str,
    detail: str,
    field_errors: Optional[list[dict[str, str]]] = None,
) -> dict[str, Any]:
    """Build the RFC 7807-style error body from ``api.md`` section 9."""
    body: dict[str, Any] = {
        "type": f"https://api.prithviq.local/problems/{code.lower()}",
        "title": title,
        "status": status,
        "detail": detail,
        "code": code,
        "request_id": request_id,
    }
    if field_errors:
        body["field_errors"] = field_errors
    return body


# --- Uploads (api.md section 2) ---------------------------------------------


class UploadInitiateRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: str = Field(min_length=1)
    size_bytes: int = Field(gt=0)
    sha256: Optional[str] = None
    kind: UploadKind
    mode: UploadMode


class UploadCompleteRequest(BaseModel):
    etag: Optional[str] = None
    sha256: Optional[str] = None


# --- Sessions (api.md section 3) ---------------------------------------------


class RegionInfo(BaseModel):
    state: Optional[str] = None
    city: Optional[str] = None


class SessionCreateRequest(BaseModel):
    mode: UploadMode
    upload_ids: list[str] = Field(min_length=1, max_length=2)
    category: Optional[str] = "general"
    region: Optional[RegionInfo] = None


# --- Analyses (api.md section 4) ---------------------------------------------


class AnalysisCreateRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    requested_outputs: list[str] = Field(
        default_factory=lambda: ["answer", "map_evidence", "report"]
    )
    language: str = "en"
    category: Optional[str] = None
