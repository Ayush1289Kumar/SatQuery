"""M1 tool-registry tests.

Covers: registration/lookup, valid dispatch, unknown/mode-disallowed rejection,
deterministic-executor compatibility with worker templates, and the thin
dispatch integration in the live job path (including fail-closed fallback).

No Earth Engine code exists in M1; everything here is hermetic.
"""
from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from backend.app import tools, worker
from backend.app.tools import base as tools_base
from backend.app.tools import registry
from backend.tests.helpers import (
    API,
    age_job,
    create_session,
    make_ready_upload,
    submit_analysis,
)


def _all_contract_ids() -> set[str]:
    ids: set[str] = set()
    for mode_ids in worker.ALLOWED_WORKFLOW_IDS.values():
        ids.update(mode_ids)
    return ids


def _mode_for(workflow_id: str) -> str:
    return next(
        mode
        for mode, ids in worker.ALLOWED_WORKFLOW_IDS.items()
        if workflow_id in ids
    )


def _context(mode: str = "single") -> tools_base.ToolContext:
    return tools_base.ToolContext(
        session_id="ses_test",
        mode=mode,
        category="water",
        question="Describe this image.",
        upload_ids=("upl_a",),
        upload_kinds=("optical",),
    )


# --- registration / lookup ---------------------------------------------------


def test_registry_installs_all_contract_workflows() -> None:
    contract_ids = _all_contract_ids()
    assert contract_ids == {
        "water_mapping",
        "builtup_mapping",
        "single_image_vqa",
        "change_detection",
        "optical_sar_fusion",
    }
    assert set(registry.registered_workflow_ids()) == contract_ids
    for workflow_id in contract_ids:
        spec = registry.get_spec(workflow_id)
        assert spec is not None
        assert spec.workflow_id == workflow_id
        assert spec.modes == frozenset(
            mode for mode, ids in worker.ALLOWED_WORKFLOW_IDS.items() if workflow_id in ids
        )


def test_register_tool_rejects_unknown_workflow_id() -> None:
    with pytest.raises(tools_base.ToolError):
        registry.register_tool("not_a_workflow", lambda ctx: tools_base.ToolResult(layers=()))


def test_register_tool_duplicate_requires_replace() -> None:
    original = registry.get_spec("water_mapping")
    assert original is not None
    with pytest.raises(tools_base.ToolError):
        registry.register_tool(
            "water_mapping", lambda ctx: tools_base.ToolResult(layers=())
        )
    try:
        replacement = registry.register_tool(
            "water_mapping", lambda ctx: tools_base.ToolResult(layers=()), replace=True
        )
        assert replacement.executor is not original.executor
    finally:
        registry.register_tool("water_mapping", original.executor, replace=True)
    assert registry.get_spec("water_mapping") == original


# --- dispatch: valid + rejections ---------------------------------------------


def test_dispatch_valid_workflow_returns_layers_and_trace() -> None:
    result = registry.dispatch("water_mapping", _context("single"))
    assert result.traces and result.traces[0].ok is True
    assert result.traces[0].tool_id == "deterministic:water_mapping"
    assert result.metrics["workflow_id"] == "water_mapping"


def test_dispatch_unknown_workflow_id_rejected() -> None:
    with pytest.raises(tools_base.ToolError, match="no tool registered"):
        registry.dispatch("not_a_workflow", _context("single"))


def test_dispatch_mode_mismatch_rejected() -> None:
    # change_detection is only allowed for twoDate; water_mapping not for twoDate.
    with pytest.raises(tools_base.ToolError, match="not allowed for mode"):
        registry.dispatch("change_detection", _context("single"))
    with pytest.raises(tools_base.ToolError, match="not allowed for mode"):
        registry.dispatch("water_mapping", _context("twoDate"))

# --- deterministic executor compatibility -------------------------------------


@pytest.mark.parametrize("workflow_id", sorted(_all_contract_ids()))
def test_deterministic_layers_match_worker_templates(workflow_id: str) -> None:
    context = _context(mode=_mode_for(workflow_id))
    result = registry.dispatch(workflow_id, context)
    template: dict[str, Any] = worker.workflow_template(workflow_id)
    assert list(result.layers) == template["layers"]
    trace = result.traces[0]
    assert trace.ok is True
    assert trace.tool_id == f"deterministic:{workflow_id}"
    assert trace.error is None


# --- thin dispatch integration in the live job path ---------------------------


def test_job_path_uses_registry_dispatch(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    original = tools.dispatch

    def marked(workflow_id: str, context: tools_base.ToolContext) -> tools_base.ToolResult:
        result = original(workflow_id, context)
        layers = tuple(
            dict(layer, label=f"registry:{layer['label']}") for layer in result.layers
        )
        return tools_base.ToolResult(layers=layers, metrics=result.metrics, traces=result.traces)

    monkeypatch.setattr(tools, "dispatch", marked)

    upload = make_ready_upload(client)
    session = create_session(client, "single", [upload])
    job = submit_analysis(client, session["session_id"], "Describe this image.")
    age_job(job["job_id"], 9.5)

    assert client.get(f"{API}/jobs/{job['job_id']}").json()["data"]["status"] == "completed"
    result = client.get(
        f"{API}/sessions/{session['session_id']}/results/latest"
    ).json()["data"]
    labels = [layer["label"] for layer in result["layers"]]
    assert labels and all(label.startswith("registry:") for label in labels)


def test_job_path_falls_back_on_dispatch_failure(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    def broken(workflow_id: str, context: tools_base.ToolContext) -> tools_base.ToolResult:
        raise tools_base.ToolError("simulated registry outage")

    monkeypatch.setattr(tools, "dispatch", broken)

    upload = make_ready_upload(client)
    session = create_session(client, "single", [upload])
    job = submit_analysis(client, session["session_id"], "Describe this image.")
    age_job(job["job_id"], 9.5)

    assert client.get(f"{API}/jobs/{job['job_id']}").json()["data"]["status"] == "completed"
    result = client.get(
        f"{API}/sessions/{session['session_id']}/results/latest"
    ).json()["data"]
    template = worker.workflow_template("single_image_vqa")
    assert [layer["label"] for layer in result["layers"]] == [
        layer["label"] for layer in template["layers"]
    ]
    assert [feature["id"] for layer in result["layers"] for feature in layer["features"]] == [
        feature["id"] for layer in template["layers"] for feature in layer["features"]
    ]
