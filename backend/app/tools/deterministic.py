"""Deterministic executors: wrap the CURRENT worker.py template behavior.

M1 keeps today's outputs exactly identical: for a workflow id the executor
returns the same template layers that worker.build_result would have read from
``job.workflow``. No Earth Engine code exists here (or anywhere in M1) — EE
executors arrive in a later milestone and will return the same ToolResult
shape, with this toolset kept registered as the fail-closed fallback.
"""
from __future__ import annotations

import time

from .. import worker
from . import registry
from .base import ToolContext, ToolResult, ToolTrace


def _make_executor(workflow_id: str):
    def executor(context: ToolContext) -> ToolResult:
        started = time.monotonic()
        template = worker.workflow_template(workflow_id)
        return ToolResult(
            layers=tuple(template["layers"]),
            metrics={"source": "worker.template", "workflow_id": workflow_id},
            traces=(
                ToolTrace(
                    tool_id=f"deterministic:{workflow_id}",
                    op="build_layers",
                    ok=True,
                    duration_s=round(time.monotonic() - started, 6),
                ),
            ),
        )

    return executor


def register_default_tools() -> None:
    """Install a deterministic executor for every contract workflow id."""
    for mode_ids in worker.ALLOWED_WORKFLOW_IDS.values():
        for workflow_id in mode_ids:
            registry.register_tool(
                workflow_id, _make_executor(workflow_id), replace=True
            )
