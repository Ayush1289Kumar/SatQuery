"""Report generation endpoints (api.md Section 6)."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from ..deps import get_request_id
from ..schemas import ApiError, envelope
from ..store import get_store

router = APIRouter()

ReportFormat = Literal["pdf", "json", "geojson", "png", "txt"]


class ReportCreateRequest(BaseModel):
    format: ReportFormat = "pdf"
    include: list[str] = Field(
        default_factory=lambda: [
            "summary",
            "input_metadata",
            "map_evidence",
            "model_provenance",
            "confidence_warning",
        ]
    )


# In-memory store for generated reports
_REPORTS: dict[str, dict[str, Any]] = {}


@router.post("/results/{result_id}/reports", status_code=202)
def create_report(result_id: str, body: ReportCreateRequest, request: Request) -> dict[str, Any]:
    """Request generation of a downloadable report (api.md section 6)."""
    request_id = get_request_id(request)
    store = get_store()

    # Verify result exists
    matching_result = None
    with store._lock:
        for res in store._results.values():
            if res.get("result_id") == result_id:
                matching_result = res
                break

    if not matching_result:
        raise ApiError(
            status=404,
            code="RESULT_NOT_FOUND",
            title="Result Not Found",
            detail=f"Analysis result '{result_id}' was not found.",
        )

    report_id = f"rpt_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=2)

    report_data = {
        "report_id": report_id,
        "result_id": result_id,
        "status": "ready",
        "format": body.format,
        "created_at": now.isoformat(),
        "expires_at": expires.isoformat(),
        "download_url": f"/api/v1/reports/{report_id}/download",
        "includes": body.include,
        "content_summary": {
            "question": matching_result.get("question"),
            "answer": matching_result.get("answer"),
            "confidence": matching_result.get("confidence"),
            "workflow": matching_result.get("workflow", {}).get("label"),
            "models": [m.get("name") for m in matching_result.get("models", [])],
        },
    }
    _REPORTS[report_id] = report_data

    return envelope(
        {
            "report_id": report_id,
            "status": "ready",
            "format": body.format,
            "download_url": report_data["download_url"],
            "expires_at": report_data["expires_at"],
        },
        request_id,
    )


@router.get("/reports/{report_id}")
def get_report_status(report_id: str, request: Request) -> dict[str, Any]:
    """Check report generation status and download URL."""
    request_id = get_request_id(request)
    report = _REPORTS.get(report_id)

    if not report:
        raise ApiError(
            status=404,
            code="REPORT_NOT_FOUND",
            title="Report Not Found",
            detail=f"Report '{report_id}' does not exist or has expired.",
        )

    return envelope(report, request_id)


@router.get("/reports/{report_id}/download")
def download_report_file(report_id: str):
    """Download the synthesized analysis report file."""
    import json
    from fastapi.responses import Response

    report = _REPORTS.get(report_id)
    if not report:
        raise ApiError(
            status=404,
            code="REPORT_NOT_FOUND",
            title="Report Not Found",
            detail=f"Report '{report_id}' does not exist or has expired.",
        )

    fmt = report.get("format", "pdf")
    summary = report.get("content_summary", {})

    if fmt == "json":
        content = json.dumps(report, indent=2)
        media_type = "application/json"
        filename = f"{report_id}.json"
    else:
        lines = [
            "PrithviQ / SatQuery - Satellite Analysis Report",
            "=" * 50,
            f"Report ID: {report_id}",
            f"Generated: {report.get('created_at')}",
            f"Workflow: {summary.get('workflow', 'Remote Sensing Analysis')}",
            f"Question: {summary.get('question')}",
            "",
            "FINDINGS AND ANALYSIS",
            "-" * 30,
            f"Answer: {summary.get('answer')}",
            f"Confidence: {int((summary.get('confidence') or 0.85) * 100)}%",
            f"Models Used: {', '.join(summary.get('models', []))}",
            "",
            "CONFIDENTIALITY AND PROVENANCE",
            "-" * 30,
            "This report was automatically synthesized by SatQuery Remote Sensing Agent.",
        ]
        content = "\n".join(lines)
        media_type = "text/plain; charset=utf-8"
        filename = f"{report_id}.txt"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
