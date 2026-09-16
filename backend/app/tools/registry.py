"""Workflow-id -> ToolSpec registry (the SatQuery tool registry).

The workflow contract is owned by ``worker.ALLOWED_WORKFLOW_IDS``: a ToolSpec
may only be registered for a workflow id that appears there, and ``dispatch``
validates the (mode, workflow_id) pair against it before executing. Unknown or
mode-disallowed ids raise ToolError; the job path treats every ToolError as
fail-closed and keeps the deterministic template layers.
"""
from __future__ import annotations

import threading

from .. import worker
from ..config import get_settings
from .base import ToolContext, ToolError, ToolExecutor, ToolResult, ToolSpec

_REGISTRY: dict[str, ToolSpec] = {}
_LOCK = threading.RLock()


def _all_contract_ids() -> set[str]:
    ids: set[str] = set()
    for mode_ids in worker.ALLOWED_WORKFLOW_IDS.values():
        ids.update(mode_ids)
    return ids


def register_tool(
    workflow_id: str, executor: ToolExecutor, *, replace: bool = False
) -> ToolSpec:
    """Register ``executor`` for ``workflow_id``.

    ``modes`` is derived from the ALLOWED_WORKFLOW_IDS contract, so a spec can
    never drift from it. Registration of an unknown workflow id, or a duplicate
    without ``replace=True``, raises ToolError.
    """
    if workflow_id not in _all_contract_ids():
        raise ToolError(
            f"workflow_id '{workflow_id}' is not part of worker.ALLOWED_WORKFLOW_IDS"
        )
    modes = frozenset(
        mode for mode, ids in worker.ALLOWED_WORKFLOW_IDS.items() if workflow_id in ids
    )
    spec = ToolSpec(workflow_id=workflow_id, modes=modes, executor=executor)
    with _LOCK:
        if workflow_id in _REGISTRY and not replace:
            raise ToolError(f"workflow_id '{workflow_id}' is already registered")
        _REGISTRY[workflow_id] = spec
    return spec


def get_spec(workflow_id: str) -> ToolSpec | None:
    with _LOCK:
        return _REGISTRY.get(workflow_id)


def is_registered(workflow_id: str) -> bool:
    with _LOCK:
        return workflow_id in _REGISTRY


def registered_workflow_ids() -> tuple[str, ...]:
    with _LOCK:
        return tuple(sorted(_REGISTRY))


def dispatch(workflow_id: str, context: ToolContext) -> ToolResult:
    """Execute the registered tool for ``workflow_id`` in ``context.mode``.

    Engine selection (M3): ``Settings.tools_engine == "earthengine"`` routes
    through the EE executor for the workflow first and falls back to the
    deterministic template executor — with the EE attempt recorded in the
    combined traces — on any failure. The default ``template`` engine keeps
    M1 behavior byte-identical, and the EE tools module is imported only when
    that engine is actually selected.

    Raises ToolError for unknown ids and mode-disallowed ids — callers fail closed.
    """
    with _LOCK:
        spec = _REGISTRY.get(workflow_id)
    if spec is None:
        raise ToolError(f"no tool registered for workflow_id '{workflow_id}'")
    if workflow_id not in worker.ALLOWED_WORKFLOW_IDS.get(context.mode, set()):
        raise ToolError(
            f"workflow '{workflow_id}' is not allowed for mode '{context.mode}'"
        )
    if get_settings().tools_engine == "earthengine":
        from . import earthengine_workflows as ee_workflows

        ee_result, ee_traces = ee_workflows.try_execute(workflow_id, context)
        if ee_result is not None:
            return ee_result
        fallback = spec.executor(context)
        return ToolResult(
            layers=fallback.layers,
            metrics={**fallback.metrics, "engine": "template-fallback"},
            traces=(*ee_traces, *fallback.traces),
        )
    return spec.executor(context)
