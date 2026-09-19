"""SatQuery intent classification and plan router (Blueprint Sections 26-28).

Converts natural language questions and image modalities into structured
execution plans across specialist remote-sensing tools.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

TaskType = Literal[
    "single_image_vqa",
    "water_mapping",
    "builtup_mapping",
    "grounding",
    "bi_temporal_change",
    "optical_sar_fusion",
]

ALLOWED_TOOLS = {
    "image_validator",
    "image_aligner",
    "vqa_tool",
    "change_detector",
    "fusion_tool",
    "grounding_tool",
    "evidence_generator",
}


@dataclass
class PlanStep:
    step_num: int
    tool: str
    description: str
    parameters: dict[str, Any] = field(default_factory=dict)


@dataclass
class ExecutionPlan:
    task: TaskType
    workflow_id: str
    workflow_label: str
    required_inputs: list[str]
    steps: list[PlanStep]
    estimated_seconds: float
    confidence_basis: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "task": self.task,
            "workflow_id": self.workflow_id,
            "workflow_label": self.workflow_label,
            "required_inputs": self.required_inputs,
            "steps": [
                {
                    "step": s.step_num,
                    "tool": s.tool,
                    "description": s.description,
                    "parameters": s.parameters,
                }
                for s in self.steps
            ],
            "estimated_seconds": self.estimated_seconds,
            "confidence_basis": self.confidence_basis,
        }


def classify_intent(mode: str, question: str) -> ExecutionPlan:
    """Classify the user intent using deterministic signals and construct a validated plan."""
    q_lower = question.lower()

    # Mode: twoDate -> Change Detection
    if mode == "twoDate":
        return ExecutionPlan(
            task="bi_temporal_change",
            workflow_id="change_detection",
            workflow_label="Bi-Temporal Change Analysis",
            required_inputs=["before_image", "after_image"],
            steps=[
                PlanStep(1, "image_validator", "Validate raster dimensions, bounds, and CRS alignment"),
                PlanStep(2, "image_aligner", "Co-register and normalize before/after rasters"),
                PlanStep(3, "change_detector", "Compute differential spectral features and change mask", {"threshold": 0.25}),
                PlanStep(4, "evidence_generator", "Synthesize spatial change polygons and area statistics"),
            ],
            estimated_seconds=9.0,
            confidence_basis=["spatial_coregistration", "spectral_change_vector", "segmentation_agreement"],
        )

    # Mode: opticalSar -> Optical + SAR Fusion
    if mode == "opticalSar":
        return ExecutionPlan(
            task="optical_sar_fusion",
            workflow_id="optical_sar_fusion",
            workflow_label="Optical + SAR Fusion",
            required_inputs=["optical_image", "sar_image"],
            steps=[
                PlanStep(1, "image_validator", "Verify optical RGB and SAR polarization channels"),
                PlanStep(2, "image_aligner", "Resample SAR backscatter to optical grid"),
                PlanStep(3, "fusion_tool", "Extract optical features and SAR surface texture", {"fusion_strategy": "feature_level"}),
                PlanStep(4, "evidence_generator", "Produce dual-modality evidence layers and water/structure masks"),
            ],
            estimated_seconds=9.0,
            confidence_basis=["cross_modality_agreement", "speckle_filtered_sar", "optical_clarity"],
        )

    # Mode: single -> Grounding / Water / Builtup / General VQA
    if any(term in q_lower for term in ["locate", "ground", "find the", "where is", "bounding box", "runway"]):
        return ExecutionPlan(
            task="grounding",
            workflow_id="grounding",
            workflow_label="Text-Guided Grounding",
            required_inputs=["single_image"],
            steps=[
                PlanStep(1, "image_validator", "Validate optical resolution and color channels"),
                PlanStep(2, "grounding_tool", "Detect target regions referenced in query"),
                PlanStep(3, "evidence_generator", "Generate bounding boxes and confidence score"),
            ],
            estimated_seconds=8.0,
            confidence_basis=["clipseg_activation", "box_iou_consistency"],
        )

    if any(term in q_lower for term in ["water", "river", "flood", "lake", "ocean", "pond", "reservoir", "coast"]):
        return ExecutionPlan(
            task="water_mapping",
            workflow_id="water_mapping",
            workflow_label="Water & Flood Mapping",
            required_inputs=["single_image"],
            steps=[
                PlanStep(1, "image_validator", "Validate optical raster headers and bounds"),
                PlanStep(2, "vqa_tool", "Extract NDWI and water body boundaries"),
                PlanStep(3, "evidence_generator", "Construct closed GeoJSON water polygons and surface area"),
            ],
            estimated_seconds=8.5,
            confidence_basis=["ndwi_spectral_index", "semantic_segmenter"],
        )

    if any(term in q_lower for term in ["urban", "built", "building", "structure", "city", "settlement", "road", "house"]):
        return ExecutionPlan(
            task="builtup_mapping",
            workflow_id="builtup_mapping",
            workflow_label="Built-Up Area Mapping",
            required_inputs=["single_image"],
            steps=[
                PlanStep(1, "image_validator", "Validate optical raster headers and bounds"),
                PlanStep(2, "vqa_tool", "Run built-up density analysis and structural classification"),
                PlanStep(3, "evidence_generator", "Synthesize urban footprint layers and metrics"),
            ],
            estimated_seconds=8.5,
            confidence_basis=["builtup_feature_density", "ndbi_spectral_index"],
        )

    # Default fallback: Single-Image VQA
    return ExecutionPlan(
        task="single_image_vqa",
        workflow_id="single_image_vqa",
        workflow_label="Single-Image Remote-Sensing VQA",
        required_inputs=["single_image"],
        steps=[
            PlanStep(1, "image_validator", "Validate optical raster format and metadata"),
            PlanStep(2, "vqa_tool", "Perform visual question answering over land cover"),
            PlanStep(3, "evidence_generator", "Generate explanatory scene evidence polygons"),
        ],
        estimated_seconds=8.0,
        confidence_basis=["vqa_model_confidence", "scene_feature_clarity"],
    )
