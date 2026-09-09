"""Deterministic mock analysis worker.

Stands in for the future queue/GPU worker for the demo milestone (api.md
section 11): jobs advance through the documented stages on a fixed wall-clock
timeline and produce deterministic results mirroring the demo fixtures in
``src/data/mock.ts``. Result geometry uses closed GeoJSON rings in
``[longitude, latitude]`` (EPSG:4326) per the API contract.

Progress is derived lazily from elapsed time (no background task required),
and job outcomes depend only on the workflow chosen at submission time.
"""
from __future__ import annotations

import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

ROUTER_VERSION = "router-2026.09.1"
DURATION_SECONDS = 9.0

# (status, stage, start_s, end_s, progress_from, progress_to, message)
_STAGE_TIMELINE: list[tuple[str, str, float, float, int, int, str]] = [
    ("validating", "validate", 0.0, 1.0, 0, 10,
     "Validating upload metadata and pair compatibility."),
    ("queued", "validate", 1.0, 2.0, 10, 15,
     "Queued for the analysis worker."),
    ("routing", "route", 2.0, 3.5, 15, 30,
     "Selecting the specialist model workflow."),
    ("processing", "analyze", 3.5, 7.0, 30, 85,
     "Running model inference and geospatial post-processing."),
    ("explaining", "explain", 7.0, 9.0, 85, 99,
     "Composing the answer and map evidence."),
]

# Demo evidence polygons: closed GeoJSON rings, [longitude, latitude].
_WATER_RING: list[list[float]] = [
    [72.9, 19.13], [72.94, 19.17], [72.99, 19.15], [72.97, 19.1],
    [72.93, 19.09], [72.9, 19.11], [72.9, 19.13],
]
_FLOOD_NEW_RING: list[list[float]] = [
    [72.86, 19.03], [72.9, 19.07], [72.95, 19.05], [72.93, 19.01],
    [72.88, 19.0], [72.855, 19.015], [72.86, 19.03],
]
_FLOOD_EXTEND_RING: list[list[float]] = [
    [72.95, 18.99], [72.99, 19.02], [73.03, 19.0], [73.0, 18.965],
    [72.96, 18.955], [72.95, 18.99],
]
_BUILT_RING: list[list[float]] = [
    [72.8, 19.06], [72.82, 19.09], [72.86, 19.095], [72.87, 19.065],
    [72.845, 19.05], [72.8, 19.06],
]
_VEGETATION_RING: list[list[float]] = [
    [73.0, 19.11], [73.04, 19.14], [73.08, 19.12], [73.05, 19.08],
    [73.01, 19.07], [73.0, 19.11],
]
_LAND_RING: list[list[float]] = [
    [72.95, 19.02], [73.0, 19.05], [73.04, 19.02], [73.0, 18.99], [72.95, 19.02],
]

_SEGFORMER = {
    "name": "sat-query/segformer-b0-bigearthnet",
    "version": "2026.08.3",
    "role": "semantic segmentation",
}
_CLIPSEG = {
    "name": "ClipSeg-guide-v1",
    "version": "1.0.4",
    "role": "text-guided region highlighting",
}


def iso_utc(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _feature(
    feature_id: str,
    feature_type: str,
    label: str,
    confidence: float,
    area_m2: int,
    ring: list[list[float]],
) -> dict[str, Any]:
    return {
        "id": feature_id,
        "type": feature_type,
        "label": label,
        "confidence": confidence,
        "area_m2": area_m2,
        "geometry": {"type": "Polygon", "coordinates": [ring]},
    }


def _route_workflow_keyword(mode: str, question: str) -> dict[str, Any]:
    """Deterministic stand-in for the PRD 'Smart AI Router'."""
    question_lower = question.lower()
    if mode == "twoDate":
        return {
            "id": "change_detection",
            "label": "Change detection · bi-temporal segmentation",
            "models": [
                {"name": "sat-query/changeformer-siamese", "version": "2026.08.3", "role": "change segmentation"},
                {"name": "Raster-Register-v2", "version": "2.0.1", "role": "image registration"},
            ],
            "usage_time_sec": 11.2,
            "confidence": 0.81,
            "answer": (
                "Between 18 and 24 August, newly flooded areas appeared along the central flood "
                "plain (≈ 3.1 km² new water) and existing inundation extended eastward "
                "(≈ 1.8 km²). No build-up change was detected in this tile."
            ),
            "layers": [
                {
                    "id": "before",
                    "label": "18 Aug 2026 (before)",
                    "opacity": 1.0,
                    "features": [
                        _feature("b1", "water", "Water (before)", 0.9, 2_200_000, _WATER_RING)
                    ],
                },
                {
                    "id": "after",
                    "label": "24 Aug 2026 (after)",
                    "opacity": 0.6,
                    "features": [
                        _feature("a1", "flood", "Newly flooded", 0.84, 3_100_000, _FLOOD_NEW_RING),
                        _feature("a2", "flood", "Extent increased", 0.78, 1_800_000, _FLOOD_EXTEND_RING),
                    ],
                },
            ],
        }
    if mode == "opticalSar":
        return {
            "id": "optical_sar_fusion",
            "label": "Optical-SAR fusion · combined classification",
            "models": [
                {"name": "sat-query/fusion-unet-rs", "version": "2026.07.2", "role": "optical-SAR fusion"},
                {"name": "sar-despk-hybrid", "version": "1.1.0", "role": "SAR despeckling"},
            ],
            "usage_time_sec": 14.0,
            "confidence": 0.57,
            "answer": (
                "We found evidence of new built-up settlement around the south-western edge. "
                "Note: SAR backscatter was partly ambiguous due to wet conditions, so confidence "
                "is lower. Please verify with ground data before acting."
            ),
            "layers": [
                {
                    "id": "built",
                    "label": "New built-up (predicted)",
                    "opacity": 1.0,
                    "features": [
                        _feature("cu1", "built", "New built-up (low conf.)", 0.57, 640_000, _BUILT_RING)
                    ],
                },
            ],
        }
    if any(keyword in question_lower for keyword in ("water", "flood", "river", "lake", "reservoir")):
        return {
            "id": "water_mapping",
            "label": "Text-guided region segmentation · semantic segmentation",
            "models": [_SEGFORMER, _CLIPSEG],
            "usage_time_sec": 6.4,
            "confidence": 0.92,
            "answer": (
                "We detected 5 major water bodies covering roughly 12.4 km² in this scene. The "
                "highlighted areas are rivers, reservoirs, and seasonal lakes. The largest extent "
                "is in the north-eastern part of the image."
            ),
            "layers": [
                {
                    "id": "single",
                    "label": "Water bodies detected",
                    "opacity": 1.0,
                    "features": [
                        _feature("w1", "water", "Reservoir", 0.94, 8_900_000, _WATER_RING),
                        _feature("w2", "water", "Seasonal lake", 0.89, 3_500_000, _VEGETATION_RING),
                    ],
                },
            ],
        }
    if any(
        keyword in question_lower
        for keyword in ("built", "building", "urban", "construction", "settlement")
    ):
        return {
            "id": "builtup_mapping",
            "label": "Text-guided region highlighting · semantic segmentation",
            "models": [_SEGFORMER, _CLIPSEG],
            "usage_time_sec": 7.0,
            "confidence": 0.88,
            "answer": (
                "Built-up surfaces cover roughly 0.6 km² of this scene, concentrated along the "
                "south-western edge, with one new settlement cluster detected near the centre-west."
            ),
            "layers": [
                {
                    "id": "single",
                    "label": "Built-up areas detected",
                    "opacity": 1.0,
                    "features": [
                        _feature("bu1", "built", "Built-up cluster", 0.88, 640_000, _BUILT_RING)
                    ],
                },
            ],
        }
    return {
        "id": "single_image_vqa",
        "label": "Single-image VQA · captioning and region highlighting",
        "models": [
            {"name": "sat-query/vqa-base", "version": "1.2.0", "role": "visual question answering"},
            _SEGFORMER,
        ],
        "usage_time_sec": 7.1,
        "confidence": 0.9,
        "answer": (
            "This scene shows a mixed coastal landscape: open water along the north-east, "
            "healthy vegetation belts in the east, and bare land patches near the centre."
        ),
        "layers": [
            {
                "id": "single",
                "label": "Land cover highlights",
                "opacity": 1.0,
                "features": [
                    _feature("v1", "vegetation", "Vegetation belt", 0.86, 4_100_000, _VEGETATION_RING),
                    _feature("l1", "land", "Bare land patch", 0.83, 2_600_000, _LAND_RING),
                ],
            },
        ],
    }


ALLOWED_WORKFLOW_IDS: dict[str, set[str]] = {
    "single": {"water_mapping", "builtup_mapping", "single_image_vqa"},
    "twoDate": {"change_detection"},
    "opticalSar": {"optical_sar_fusion"},
}


def workflow_template(workflow_id: str) -> dict[str, Any]:
    """Return the deterministic template for a known workflow id.

    Each id resolves through the keyword router with a probe question, so the
    template is always exactly what the deterministic worker would produce.
    """
    if workflow_id == "change_detection":
        return _route_workflow_keyword("twoDate", "")
    if workflow_id == "water_mapping":
        return _route_workflow_keyword("single", "highlight water bodies")
    if workflow_id == "builtup_mapping":
        return _route_workflow_keyword("single", "built-up areas")
    if workflow_id == "single_image_vqa":
        return _route_workflow_keyword("single", "describe this image")
    if workflow_id == "optical_sar_fusion":
        return _route_workflow_keyword("opticalSar", "fusion analysis")
    raise KeyError(workflow_id)


def route_workflow(
    mode: str, question: str, ai_workflow_id: str | None = None
) -> dict[str, Any]:
    """AI-augmented router: honour a *validated* Gemini suggestion, else keywords."""
    if ai_workflow_id and ai_workflow_id in ALLOWED_WORKFLOW_IDS.get(mode, set()):
        return workflow_template(ai_workflow_id)
    return _route_workflow_keyword(mode, question)


def _real_ai_job_view(job: Any) -> dict[str, Any]:
    """Live view for a real-AI job (never stuck: the store guarantees completion)."""
    elapsed = max(0.0, time.monotonic() - job.started_monotonic)
    if job.ai_finished:
        return {
            "job_id": job.job_id,
            "session_id": job.session_id,
            "status": "completed",
            "stage": "explain",
            "progress": 100,
            "workflow_label": job.workflow["label"],
            "message": "Analysis completed.",
            "updated_at": iso_utc(datetime.now(timezone.utc)),
            "error": None,
        }
    # Early stages reuse the mock timeline so the UI still shows validate/route.
    if elapsed < 3.5:
        for status, stage, start, end, progress_from, progress_to, message in _STAGE_TIMELINE:
            if elapsed < end:
                span = end - start
                fraction = (elapsed - start) / span if span > 0 else 1.0
                return {
                    "job_id": job.job_id,
                    "session_id": job.session_id,
                    "status": status,
                    "stage": stage,
                    "progress": int(progress_from + (progress_to - progress_from) * fraction),
                    "workflow_label": job.workflow["label"],
                    "message": message,
                    "updated_at": iso_utc(job.started_wall + timedelta(seconds=elapsed)),
                    "error": None,
                }
    estimate = max(job.ai_estimate_s, DURATION_SECONDS)
    fraction = min(1.0, max(0.0, (elapsed - 3.5) / max(estimate - 3.5, 0.001)))
    return {
        "job_id": job.job_id,
        "session_id": job.session_id,
        "status": "processing",
        "stage": "analyze",
        "progress": int(30 + 55 * fraction),
        "workflow_label": job.workflow["label"],
        "message": "Generating the answer with the configured AI provider.",
        "updated_at": iso_utc(job.started_wall + timedelta(seconds=elapsed)),
        "error": None,
    }


def job_view(job: Any) -> dict[str, Any]:
    """Derive the documented job view from the fixed wall-clock timeline."""
    if job.real_ai:
        return _real_ai_job_view(job)
    if job.status_override == "cancelled":
        return {
            "job_id": job.job_id,
            "session_id": job.session_id,
            "status": "cancelled",
            "stage": "explain",
            "progress": 0,
            "workflow_label": job.workflow["label"],
            "message": "Cancellation requested.",
            "updated_at": iso_utc(datetime.now(timezone.utc)),
            "error": None,
        }
    elapsed = max(0.0, time.monotonic() - job.started_monotonic)
    if elapsed >= DURATION_SECONDS:
        status, stage, progress, message = "completed", "explain", 100, "Analysis completed."
    else:
        for status, stage, start, end, progress_from, progress_to, message in _STAGE_TIMELINE:
            if elapsed < end:
                span = end - start
                fraction = (elapsed - start) / span if span > 0 else 1.0
                progress = int(progress_from + (progress_to - progress_from) * fraction)
                break
        else:  # pragma: no cover - elapsed < DURATION_SECONDS always matches a stage
            status, stage, progress, message = "completed", "explain", 100, "Analysis completed."
    updated = job.started_wall + timedelta(seconds=min(elapsed, DURATION_SECONDS))
    return {
        "job_id": job.job_id,
        "session_id": job.session_id,
        "status": status,
        "stage": stage,
        "progress": progress,
        "workflow_label": job.workflow["label"],
        "message": message,
        "updated_at": iso_utc(updated),
        "error": None,
    }


def confidence_band(confidence: float) -> str:
    if confidence >= 0.8:
        return "high"
    if confidence >= 0.6:
        return "medium"
    return "low"


def build_result(
    *,
    job: Any,
    session: Any,
    uploads: list[Any],
    answer_text: str | None = None,
    gemini_model: str | None = None,
    ai_elapsed_s: float | None = None,
) -> dict[str, Any]:
    """Result payload per the documented result schema (api.md section 5).

    ``answer_text``/``gemini_model`` are provided only when Gemini genuinely
    produced the answer (provenance honesty); the defaults keep the
    deterministic mock output byte-identical. Gemini never generates the GIS
    layers — those always come from the deterministic templates.
    """
    workflow = job.workflow
    layers = workflow["layers"]
    if workflow["id"] == "change_detection" and len(uploads) == 2:
        ordered = sorted(uploads, key=lambda upload: upload.acquisition_time)
        layers = [
            dict(layers[0], label=f"{ordered[0].acquisition_time[:10]} (before)"),
            dict(layers[1], label=f"{ordered[1].acquisition_time[:10]} (after)"),
        ]
    models = list(workflow["models"])
    usage_time_sec = workflow["usage_time_sec"]
    if answer_text is not None and gemini_model:
        models.insert(
            0,
            {
                "name": gemini_model,
                "version": "google-genai",
                "role": "multimodal answer generation",
            },
        )
        if ai_elapsed_s is not None:
            usage_time_sec = round(ai_elapsed_s, 1)
    completed_at = job.ai_finished_wall or (
        job.started_wall + timedelta(seconds=DURATION_SECONDS)
    )
    return {
        "result_id": f"res_{uuid.uuid4().hex[:12]}",
        "session_id": job.session_id,
        "job_id": job.job_id,
        "question": job.question,
        "answer": answer_text if answer_text is not None else workflow["answer"],
        "confidence": workflow["confidence"],
        "confidence_band": confidence_band(float(workflow["confidence"])),
        "workflow": {
            "id": workflow["id"],
            "label": workflow["label"],
            "router_version": ROUTER_VERSION,
        },
        "models": models,
        "usage_time_sec": usage_time_sec,
        "created_at": iso_utc(job.started_wall),
        "completed_at": iso_utc(completed_at),
        "inputs": [
            {
                "upload_id": upload.upload_id,
                "original_name": upload.original_name,
                "kind": upload.kind,
                "acquisition_time": upload.acquisition_time,
            }
            for upload in uploads
        ],
        "layers": [
            {
                "id": layer["id"],
                "label": layer["label"],
                "opacity": layer["opacity"],
                "geometry_format": "geojson",
                "features": layer["features"],
            }
            for layer in layers
        ],
    }


