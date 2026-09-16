"""Minimal typed contracts for the SatQuery tool registry (M1 skeleton).

A "tool" is an executable workflow step that produces the map-evidence layers
for one job. M1 ships only deterministic executors that wrap the existing
``worker.py`` templates; Earth Engine executors arrive in a later milestone and
must reuse these exact contracts. Keep this module small — no I/O, no SDKs.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Optional


class ToolError(Exception):
    """Unknown/disallowed workflow id, or an executor failure.

    The job path (store.ensure_result) treats every ToolError as fail-closed:
    the deterministic workflow-template layers remain in the result and the
    job still completes. Messages are safe for API surface (ids only).
    """


@dataclass(frozen=True)
class ToolContext:
    """Everything an executor may need for one job. Grows additively only."""

    session_id: str
    mode: str
    category: str
    question: str
    upload_ids: tuple[str, ...]
    upload_kinds: tuple[str, ...]
    region: Optional[dict[str, str]] = None
    # M3: acquisition stamps parsed from upload filenames (ISO 8601 or the
    # demo fallback), used by EE executors to select catalog scenes.
    acquisition_times: tuple[Optional[str], ...] = ()


@dataclass(frozen=True)
class ToolTrace:
    """One observable executor step.

    ``error`` is sanitized (exception type name only) and ``detail`` carries
    safe, non-secret facts (AOI source, scene id, thresholds, counts).
    """

    tool_id: str
    op: str
    ok: bool
    duration_s: float
    error: Optional[str] = None
    detail: Optional[str] = None


@dataclass(frozen=True)
class ToolResult:
    """Tool output consumed by worker.build_result via store.ensure_result.

    ``layers`` are workflow-template-shaped evidence layers (closed GeoJSON
    rings in [longitude, latitude]). Treat contents as immutable.
    """

    layers: tuple[dict[str, Any], ...]
    metrics: dict[str, Any] = field(default_factory=dict)
    traces: tuple[ToolTrace, ...] = ()


ToolExecutor = Callable[[ToolContext], ToolResult]


@dataclass(frozen=True)
class ToolSpec:
    """A registered tool: the executor bound to one contract workflow id.

    ``modes`` is derived from ``worker.ALLOWED_WORKFLOW_IDS`` at registration
    time so specs can never drift from the existing workflow contract.
    """

    workflow_id: str
    modes: frozenset[str]
    executor: ToolExecutor
