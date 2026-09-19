"""Unit tests for planner router, tools, and execution engine."""
from __future__ import annotations

from backend.app.planner.executor import execute_plan, get_trace
from backend.app.planner.router import classify_intent
from backend.app.tools.change_detector import ChangeDetectorTool
from backend.app.tools.evidence_generator import EvidenceGeneratorTool
from backend.app.tools.fusion_tool import FusionTool
from backend.app.tools.image_validator import ImageValidatorTool


def test_planner_intent_classification():
    # Two-date change detection
    plan_change = classify_intent("twoDate", "What changed between these dates?")
    assert plan_change.task == "bi_temporal_change"
    assert plan_change.workflow_id == "change_detection"
    assert any(s.tool == "change_detector" for s in plan_change.steps)

    # Optical-SAR fusion
    plan_fusion = classify_intent("opticalSar", "Penetrate clouds and inspect water")
    assert plan_fusion.task == "optical_sar_fusion"
    assert any(s.tool == "fusion_tool" for s in plan_fusion.steps)

    # Grounding query
    plan_grounding = classify_intent("single", "Locate the airport runway")
    assert plan_grounding.task == "grounding"

    # Water query
    plan_water = classify_intent("single", "Highlight all water bodies")
    assert plan_water.task == "water_mapping"

    # Builtup query
    plan_built = classify_intent("single", "Detect dense urban structures")
    assert plan_built.task == "builtup_mapping"


def test_image_validator_tool():
    validator = ImageValidatorTool()
    assert validator.validate({"images": [object()]}) is True
    assert validator.validate({"images": []}) is False

    res = validator.execute({"images": [object()], "mode": "single"})
    assert res["status"] == "valid"
    assert res["compatible"] is True

    res_err = validator.execute({"images": [object()], "mode": "twoDate"})
    assert res_err["compatible"] is False


def test_change_detector_tool():
    detector = ChangeDetectorTool()
    res = detector.execute({"question": "Did urban expansion occur?"})
    assert res["task"] == "bi_temporal_change"
    assert "urban expansion" in res["answer"].lower()
    assert "change_statistics" in res
    assert len(res["highlights"]) > 0

    res_flood = detector.execute({"question": "Analyze flood extent"})
    assert "inundated" in res_flood["answer"].lower()


def test_fusion_tool():
    fusion = FusionTool()
    res = fusion.execute({})
    assert res["task"] == "optical_sar_fusion"
    assert res["modalities"]["optical"]["used"] is True
    assert res["modalities"]["sar"]["used"] is True
    assert len(res["highlights"]) == 2


def test_evidence_generator_tool():
    generator = EvidenceGeneratorTool()
    highlights = [
        {
            "id": "hl_test_1",
            "type": "water",
            "label": "Test Lake",
            "confidence": 0.95,
            "area_m2": 150000,
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[72.8, 19.0], [72.9, 19.0], [72.9, 19.1], [72.8, 19.0]]],
            },
        }
    ]
    res = generator.execute({"highlights": highlights, "layer_label": "Water Layer"})
    assert res["status"] == "ready"
    assert res["feature_count"] == 1
    assert len(res["layers"]) == 1
    assert res["layers"][0]["highlights"][0]["label"] == "Test Lake"


def test_execution_engine_generates_trace():
    plan = classify_intent("twoDate", "What changed?")
    out, trace = execute_plan(
        plan=plan,
        analysis_id="an_test_123456",
        context_inputs={"question": "What changed?", "mode": "twoDate", "images": [object(), object()]},
    )
    assert trace.analysis_id == "an_test_123456"
    assert len(trace.steps) == len(plan.steps)
    assert get_trace(trace.trace_id) is not None
