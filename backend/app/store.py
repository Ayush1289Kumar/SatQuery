"""In-memory, deterministic demo store for the analysis lifecycle.

Single-process only (uvicorn default / ``--reload``). All state lives in dicts
guarded by an ``RLock``; ids are unique per record but analysis outcomes are
fully deterministic (see ``worker.py``). This module is the swap point for the
future PostgreSQL/PostGIS persistence layer — routers depend only on this
interface.
"""
from __future__ import annotations

import re
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

from . import ai
from . import worker
from .config import get_settings
from .schemas import ApiError

_DATE_IN_NAME = re.compile(r"(\d{4}-\d{2}-\d{2})")
_FALLBACK_ACQUISITION = "2026-08-24T05:22:00Z"
_DEMO_BBOX = [72.8, 18.9, 73.1, 19.2]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def _acquisition_from_name(filename: str) -> str:
    """Deterministic acquisition timestamp: date parsed from the file name."""
    match = _DATE_IN_NAME.search(filename)
    if match is None:
        return _FALLBACK_ACQUISITION
    return f"{match.group(1)}T05:22:00Z"


@dataclass
class UploadRecord:
    upload_id: str
    original_name: str
    kind: str
    mode: str
    mime_type: str
    size_bytes: int
    sha256: Optional[str]
    status: str = "initiated"
    created_at: str = field(default_factory=_now_iso)
    acquisition_time: str = _FALLBACK_ACQUISITION
    received_bytes: int = 0
    etag: Optional[str] = None
    # Retained only when AI_PROVIDER=gemini (capped) so Gemini can see the image.
    bytes_data: Optional[bytes] = None


@dataclass
class SessionRecord:
    session_id: str
    mode: str
    category: str
    region: Optional[dict[str, str]]
    upload_ids: list[str]
    status: str = "created"
    created_at: str = field(default_factory=_now_iso)


@dataclass
class JobRecord:
    job_id: str
    session_id: str
    question: str
    category: str
    requested_outputs: list[str]
    language: str
    idempotency_key: Optional[str]
    workflow: dict[str, Any]
    started_monotonic: float = field(default_factory=time.monotonic)
    started_wall: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    status_override: Optional[str] = None
    # Real-AI execution state (Task 4); unused on the deterministic mock path.
    real_ai: bool = False
    ai_estimate_s: float = 0.0
    ai_finished: bool = False
    ai_finished_wall: Optional[datetime] = None
    ai_answer: Optional[str] = None
    ai_workflow_id: Optional[str] = None
    ai_elapsed_s: Optional[float] = None
    ai_error: Optional[str] = None

    @property
    def created_at(self) -> str:
        return worker.iso_utc(self.started_wall)


class Store:
    """Thread-safe in-memory repositories for uploads, sessions, jobs, results."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._uploads: dict[str, UploadRecord] = {}
        self._sessions: dict[str, SessionRecord] = {}
        self._jobs: dict[str, JobRecord] = {}
        self._session_jobs: dict[str, list[str]] = {}
        self._results: dict[str, dict[str, Any]] = {}
        self._idempotency: dict[str, str] = {}
        self._ai_threads: list[threading.Thread] = []

    # -- uploads -------------------------------------------------------------

    def create_upload(
        self,
        *,
        filename: str,
        content_type: str,
        size_bytes: int,
        sha256: Optional[str],
        kind: str,
        mode: str,
    ) -> UploadRecord:
        with self._lock:
            record = UploadRecord(
                upload_id=_new_id("upl"),
                original_name=filename,
                kind=kind,
                mode=mode,
                mime_type=content_type,
                size_bytes=size_bytes,
                sha256=sha256,
                acquisition_time=_acquisition_from_name(filename),
            )
            self._uploads[record.upload_id] = record
            return record

    def get_upload(self, upload_id: str) -> UploadRecord:
        with self._lock:
            record = self._uploads.get(upload_id)
        if record is None:
            raise ApiError(
                status=404,
                code="UPLOAD_NOT_FOUND",
                title="Upload not found",
                detail=f"Upload '{upload_id}' does not exist or has expired.",
            )
        return record

    def mark_upload_data(
        self, upload_id: str, data: Optional[bytes], content_length: int
    ) -> UploadRecord:
        """Mock object-storage sink: acknowledge bytes, advance to 'uploading'.

        Image bytes are retained (capped at the Gemini inline limit) only when
        the real AI provider is enabled; mock mode discards them immediately.
        """
        record = self.get_upload(upload_id)
        with self._lock:
            if record.status == "initiated":
                record.status = "uploading"
            record.received_bytes = max(
                record.received_bytes, content_length, len(data or b"")
            )
            if (
                data
                and get_settings().ai_provider == "gemini"
                and len(data) <= ai.MAX_INLINE_IMAGE_BYTES
            ):
                record.bytes_data = data
            return record

    def complete_upload(
        self, upload_id: str, *, etag: Optional[str], sha256: Optional[str]
    ) -> UploadRecord:
        record = self.get_upload(upload_id)
        with self._lock:
            if record.status in ("validating", "ready"):
                return record  # idempotent re-complete
            if record.status in ("rejected", "expired"):
                raise ApiError(
                    status=409,
                    code="INVALID_UPLOAD_STATE",
                    title="Upload cannot be completed",
                    detail=f"Upload '{upload_id}' is '{record.status}' and cannot be completed.",
                )
            record.etag = etag
            record.sha256 = sha256 or record.sha256
            record.status = "validating"
            return record

    def upload_view(self, record: UploadRecord) -> dict[str, Any]:
        """Contract upload view; deterministic demo validation succeeds instantly."""
        with self._lock:
            if record.status == "validating":
                record.status = "ready"
            ready = record.status == "ready"
            return {
                "upload_id": record.upload_id,
                "original_name": record.original_name,
                "kind": record.kind,
                "status": record.status,
                "mime_type": record.mime_type,
                "size_bytes": record.size_bytes,
                "sha256": record.sha256,
                "acquisition_time": record.acquisition_time if ready else None,
                "crs": "EPSG:4326" if ready else None,
                "bbox": list(_DEMO_BBOX) if ready else None,
                "width": 4096 if ready else None,
                "height": 4096 if ready else None,
                "resolution_m": 10 if ready else None,
                "bands": (
                    ["B02", "B03", "B04", "B08"] if record.kind == "optical" else ["VV", "VH"]
                )
                if ready
                else [],
                "nodata": 0 if ready else None,
                "validation_errors": [],
            }

    # -- sessions ------------------------------------------------------------

    def create_session(
        self,
        *,
        mode: str,
        upload_ids: list[str],
        category: str,
        region: Optional[dict[str, str]],
    ) -> SessionRecord:
        with self._lock:
            records = []
            for upload_id in upload_ids:
                record = self._uploads.get(upload_id)
                if record is None:
                    raise ApiError(
                        status=404,
                        code="UPLOAD_NOT_FOUND",
                        title="Upload not found",
                        detail=f"Upload '{upload_id}' does not exist or has expired.",
                    )
                if record.status == "validating":
                    record.status = "ready"  # deterministic demo validation
                records.append(record)
            if len(set(upload_ids)) != len(upload_ids):
                raise ApiError(
                    status=422,
                    code="INVALID_UPLOAD_COUNT",
                    title="Invalid upload count",
                    detail="An analysis session requires distinct uploads.",
                )
            if mode == "single":
                if len(records) != 1:
                    raise ApiError(
                        status=422,
                        code="INVALID_UPLOAD_COUNT",
                        title="Invalid upload count",
                        detail="Mode 'single' requires exactly one upload.",
                    )
                if records[0].kind != "optical":
                    raise ApiError(
                        status=422,
                        code="INVALID_IMAGE_PAIR",
                        title="Invalid image pair",
                        detail="Mode 'single' requires one optical image.",
                    )
            elif mode == "twoDate":
                if len(records) != 2:
                    raise ApiError(
                        status=422,
                        code="INVALID_UPLOAD_COUNT",
                        title="Invalid upload count",
                        detail="Mode 'twoDate' requires exactly two uploads.",
                    )
                if any(record.kind != "optical" for record in records):
                    raise ApiError(
                        status=422,
                        code="INVALID_IMAGE_PAIR",
                        title="Invalid image pair",
                        detail="Mode 'twoDate' requires two optical images.",
                    )
                if (
                    get_settings().strict_pair_validation
                    and records[0].acquisition_time == records[1].acquisition_time
                ):
                    raise ApiError(
                        status=422,
                        code="INVALID_IMAGE_PAIR",
                        title="Invalid image pair",
                        detail="Mode 'twoDate' requires two different acquisition dates.",
                    )
            else:  # opticalSar
                if len(records) != 2:
                    raise ApiError(
                        status=422,
                        code="INVALID_UPLOAD_COUNT",
                        title="Invalid upload count",
                        detail="Mode 'opticalSar' requires exactly two uploads.",
                    )
                if sorted(record.kind for record in records) != ["optical", "sar"]:
                    raise ApiError(
                        status=422,
                        code="INVALID_IMAGE_PAIR",
                        title="Invalid image pair",
                        detail="Mode 'opticalSar' requires exactly one optical and one SAR image.",
                    )
            not_ready = [record.upload_id for record in records if record.status != "ready"]
            if not_ready:
                raise ApiError(
                    status=409,
                    code="UPLOAD_NOT_READY",
                    title="Uploads not ready",
                    detail=(
                        "Uploads must be completed and validated before session creation: "
                        + ", ".join(not_ready)
                        + "."
                    ),
                )
            session = SessionRecord(
                session_id=_new_id("ses"),
                mode=mode,
                category=category,
                region=region,
                upload_ids=list(upload_ids),
            )
            self._sessions[session.session_id] = session
            return session

    def get_session(self, session_id: str) -> SessionRecord:
        with self._lock:
            session = self._sessions.get(session_id)
        if session is None:
            raise ApiError(
                status=404,
                code="SESSION_NOT_FOUND",
                title="Session not found",
                detail=f"Session '{session_id}' does not exist or has expired.",
            )
        return session

    # -- jobs / results ------------------------------------------------------

    def create_job(
        self,
        session: SessionRecord,
        *,
        question: str,
        requested_outputs: list[str],
        language: str,
        idempotency_key: Optional[str],
        workflow: dict[str, Any],
        category: str,
    ) -> tuple[JobRecord, bool]:
        """Create a job on the (mock) queue; honors Idempotency-Key semantics."""
        with self._lock:
            if idempotency_key:
                existing_id = self._idempotency.get(idempotency_key)
                if existing_id is not None:
                    existing = self._jobs.get(existing_id)
                    if existing is not None:
                        if existing.session_id != session.session_id:
                            raise ApiError(
                                status=409,
                                code="IDEMPOTENCY_CONFLICT",
                                title="Idempotency key conflict",
                                detail=(
                                    "This Idempotency-Key was already used for a different "
                                    "session."
                                ),
                            )
                        return existing, False
            job = JobRecord(
                job_id=_new_id("job"),
                session_id=session.session_id,
                question=question,
                category=category,
                requested_outputs=list(requested_outputs),
                language=language,
                idempotency_key=idempotency_key,
                workflow=workflow,
            )
            self._jobs[job.job_id] = job
            self._session_jobs.setdefault(session.session_id, []).append(job.job_id)
            if idempotency_key:
                self._idempotency[idempotency_key] = job.job_id
            session.status = "active"
            if get_settings().ai_provider == "gemini":
                # Real execution: spawn Gemini in a daemon thread. Idempotent
                # replays return above and never reach this spawn.
                job.real_ai = True
                job.ai_estimate_s = 20.0
                self._start_ai_job(job, session)
            return job, True

    def get_job(self, job_id: str) -> JobRecord:
        with self._lock:
            job = self._jobs.get(job_id)
        if job is None:
            raise ApiError(
                status=404,
                code="JOB_NOT_FOUND",
                title="Job not found",
                detail=f"Job '{job_id}' does not exist or has expired.",
            )
        return job

    # -- real-AI execution (Task 4) ------------------------------------------

    def _start_ai_job(self, job: JobRecord, session: SessionRecord) -> None:
        """Spawn the real Gemini execution for a freshly created job."""
        thread = threading.Thread(
            target=self._run_ai_job,
            args=(job, session),
            name=f"ai-job-{job.job_id}",
            daemon=True,
        )
        self._ai_threads.append(thread)
        thread.start()

    def join_ai_threads(self, timeout: float = 10.0) -> None:
        """Test seam: wait for in-flight AI jobs so tests stay deterministic."""
        for thread in list(self._ai_threads):
            thread.join(timeout=timeout)

    def _run_ai_job(self, job: JobRecord, session: SessionRecord) -> None:
        """Real background execution: Gemini answer -> result.

        Guarantees completion: on provider failure, timeout, or any unexpected
        error, the deterministic worker takes over and the job still completes.
        """
        try:
            settings = get_settings()
            images: list[tuple[bytes, str]] = []
            skipped: list[str] = []
            with self._lock:
                for upload_id in session.upload_ids:
                    record = self._uploads[upload_id]
                    if record.bytes_data is None:
                        continue
                    if record.mime_type in ai.SUPPORTED_IMAGE_MIME:
                        images.append((record.bytes_data, record.mime_type))
                    else:
                        skipped.append(record.original_name)
            if not images:
                raise RuntimeError(
                    "no renderable image bytes were retained for the AI call"
                )
            context_note = (
                "Note: some uploaded rasters could not be rendered for this "
                "model; answer from the attached imagery where possible."
                if skipped
                else None
            )
            outcome = ai.generate_ai_answer(
                question=job.question,
                images=images,
                mode=session.mode,
                timeout_s=settings.gemini_timeout_s,
                context_note=context_note,
            )
            with self._lock:
                job.ai_elapsed_s = outcome.elapsed_s or None
                job.ai_finished_wall = datetime.now(timezone.utc)
                job.ai_finished = True
                if outcome.used and outcome.answer:
                    job.ai_answer = outcome.answer
                    if (
                        outcome.workflow_id
                        and outcome.workflow_id != job.workflow["id"]
                        and outcome.workflow_id
                        in worker.ALLOWED_WORKFLOW_IDS.get(session.mode, set())
                    ):
                        job.workflow = worker.workflow_template(outcome.workflow_id)
                else:
                    job.ai_error = (
                        outcome.error or "AI provider returned no usable answer."
                    )
        except Exception as exc:  # last resort: never leave the job stuck
            with self._lock:
                job.ai_error = f"AI execution failed ({type(exc).__name__})."
                job.ai_finished_wall = datetime.now(timezone.utc)
                job.ai_finished = True
        finally:
            with self._lock:
                if not job.ai_finished:
                    job.ai_error = job.ai_error or "AI execution ended unexpectedly."
                    job.ai_finished_wall = datetime.now(timezone.utc)
                    job.ai_finished = True
                self.ensure_result(job)

    def ensure_result(self, job: JobRecord) -> Optional[dict[str, Any]]:
        """Build the result once the job completes (lazy timeline or real AI)."""
        with self._lock:
            existing = self._results.get(job.job_id)
            if existing is not None:
                return existing
            if job.real_ai:
                if not job.ai_finished:
                    return None
            elif worker.job_view(job)["status"] != "completed":
                return None
            session = self._sessions[job.session_id]
            uploads = [self._uploads[upload_id] for upload_id in session.upload_ids]
            result = worker.build_result(
                job=job,
                session=session,
                uploads=uploads,
                answer_text=job.ai_answer,
                gemini_model=(get_settings().gemini_model if job.ai_answer else None),
                ai_elapsed_s=job.ai_elapsed_s,
            )
            self._results[job.job_id] = result
            session.status = "completed"
            return result

    def latest_result(self, session_id: str) -> dict[str, Any]:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                raise ApiError(
                    status=404,
                    code="SESSION_NOT_FOUND",
                    title="Session not found",
                    detail=f"Session '{session_id}' does not exist or has expired.",
                )
            job_ids = self._session_jobs.get(session_id, [])
            if not job_ids:
                raise ApiError(
                    status=404,
                    code="NO_ANALYSIS",
                    title="No analysis submitted",
                    detail="Submit an analysis for this session before requesting results.",
                )
            newest = self._jobs[job_ids[-1]]
            result = self.ensure_result(newest)
            if result is None:
                view = worker.job_view(newest)
                raise ApiError(
                    status=409,
                    code="RESULT_NOT_READY",
                    title="Result not ready",
                    detail=(
                        f"The latest job '{newest.job_id}' is still '{view['status']}' "
                        f"(stage '{view['stage']}', progress {view['progress']}%)."
                    ),
                )
            return result


_store: Store | None = None


def get_store() -> Store:
    """Process-wide store singleton (in-memory; resets on process restart)."""
    global _store
    if _store is None:
        _store = Store()
    return _store





