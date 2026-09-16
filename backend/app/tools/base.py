"""Minimal typed contracts for the SatQuery tool registry (M1 skeleton).

A "tool" is an executable workflow step that produces the map-evidence layers
for one job. M1 ships only deterministic executors that wrap the existing
``worker.py`` templates; Earth Engine executors arrive in a later milestone and
must reuse these exact contracts. Keep this module small — no I/O, no SDKs.
"""
from __future__ import annotations

import json
import re
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


# --- M4.2: authoritative measurement facts (grounded Gemini composition) ------

# The authoritative Earth Engine metric keys that may ground a Gemini answer.
# Mirrors worker._EVIDENCE_METRIC_KEYS (the API-evidence whitelist); a test
# asserts the two tuples stay aligned so neither can silently drift.
MEASUREMENT_FACT_KEYS: tuple[str, ...] = (
    "scene_id",
    "scene_date",
    "cloud_pct",
    "anchor_date",
    "window_start",
    "window_end",
    "ndwi_threshold",
    "water_area_m2",
    "aoi_area_m2",
    "water_fraction",
    "confidence",
    "feature_count",
    "aoi_source",
)


@dataclass(frozen=True)
class MeasurementFacts:
    """Authoritative Earth Engine measurements for one tool execution.

    Derived ONLY from ``ToolResult.metrics`` of a genuine ``engine ==
    "earthengine"`` execution — never from templates, never re-computed, and
    missing metrics stay ``None`` (nothing is invented). ``anchor_date`` is
    the user-declared, upload-derived acquisition anchor; ``scene_date`` is
    the actual acquisition date of the Earth Engine-selected scene. They are
    different concepts and are kept as separate fields.
    """

    scene_id: Optional[str] = None
    scene_date: Optional[str] = None
    cloud_pct: Optional[float] = None
    anchor_date: Optional[str] = None
    window_start: Optional[str] = None
    window_end: Optional[str] = None
    ndwi_threshold: Optional[float] = None
    water_area_m2: Optional[float] = None
    aoi_area_m2: Optional[float] = None
    water_fraction: Optional[float] = None
    confidence: Optional[float] = None
    feature_count: Optional[int] = None
    aoi_source: Optional[str] = None

    @classmethod
    def from_metrics(cls, metrics: Any) -> "MeasurementFacts | None":
        """Project EE metrics into facts, or None for any non-EE execution."""
        if not isinstance(metrics, dict) or metrics.get("engine") != "earthengine":
            return None
        return cls(
            **{key: metrics[key] for key in MEASUREMENT_FACT_KEYS if key in metrics}
        )

    def to_prompt_digest(self) -> str:
        """Compact JSON of the supplied facts (absent fields are omitted)."""
        supplied = {
            key: getattr(self, key)
            for key in MEASUREMENT_FACT_KEYS
            if getattr(self, key) is not None
        }
        return json.dumps(supplied, ensure_ascii=False, sort_keys=True)


# --- M4.3: deterministic facts-honest composer ---------------------------------

# A fact may reach the composed answer only in its expected shape: numbers as
# real numbers, dates as strict ISO YYYY-MM-DD strings. Anything else (hostile
# strings, arbitrary objects, booleans) is omitted — never echoed into the
# answer — so no credential, exception text, or internal value can leak.
_ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _clean_number(value: Any) -> Any:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return value


def _clean_date(value: Any) -> Any:
    if isinstance(value, str) and _ISO_DATE_RE.match(value):
        return value
    return None


def compose_water_answer(facts: "MeasurementFacts | None") -> "str | None":
    """Deterministic water-mapping answer built ONLY from MeasurementFacts.

    Pure function of the supplied facts: no I/O, no Gemini, no templates. The
    same facts always produce the byte-identical answer. Only facts actually
    present are used — authoritative values verbatim (never invented, rounded,
    or substituted); absent facts omit their sentence cleanly. The declared
    acquisition anchor and the actual selected scene date are stated as
    distinct concepts whenever they differ. Returns None when no usable facts
    exist, so callers keep the hardcoded template answer as the safety net.
    """
    if facts is None:
        return None
    scene_date = _clean_date(facts.scene_date)
    anchor_date = _clean_date(facts.anchor_date)
    water = _clean_number(facts.water_area_m2)
    aoi = _clean_number(facts.aoi_area_m2)
    fraction = _clean_number(facts.water_fraction)
    threshold = _clean_number(facts.ndwi_threshold)
    cloud = _clean_number(facts.cloud_pct)
    confidence = _clean_number(facts.confidence)
    features = _clean_number(facts.feature_count)

    sentences: list[str] = []
    if scene_date and anchor_date and anchor_date != scene_date:
        sentences.append(
            f"Requested analysis date: {anchor_date}. "
            f"Selected Sentinel-2 scene: {scene_date}."
        )
    elif scene_date:
        sentences.append(f"Selected Sentinel-2 scene: {scene_date}.")
    elif anchor_date:
        sentences.append(
            f"Requested analysis date: {anchor_date} (scene date unavailable)."
        )
    if cloud is not None:
        sentences.append(f"Scene cloud cover: {cloud}%.")
    if water is not None:
        if aoi is not None:
            sentences.append(
                f"Mapped water: {water} m² of a {aoi} m² analysis area."
            )
        else:
            sentences.append(f"Mapped water: {water} m².")
    if fraction is not None:
        sentences.append(f"Water fraction: {fraction}.")
    if threshold is not None:
        sentences.append(f"Water detected where NDWI exceeds {threshold}.")
    if features is not None:
        sentences.append(f"Distinct water bodies: {features}.")
    if confidence is not None:
        sentences.append(f"Confidence: {confidence}.")
    if not sentences:
        return None
    return " ".join(sentences)
