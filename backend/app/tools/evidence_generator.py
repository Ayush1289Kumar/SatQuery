"""Evidence generation and normalization tool (Blueprint Section 35)."""
from __future__ import annotations

from typing import Any

from .base import Tool


class EvidenceGeneratorTool(Tool):
    name = "evidence_generator"
    version = "1.0.0"
    role = "evidence layer synthesis"

    def execute(self, inputs: dict[str, Any], parameters: dict[str, Any] | None = None) -> dict[str, Any]:
        highlights = inputs.get("highlights", [])
        layer_label = inputs.get("layer_label", "Analysis Evidence")
        layer_id = inputs.get("layer_id", "layer_evidence_1")

        # Ensure all highlights conform to standard GeoJSON polygon format
        formatted_highlights = []
        for hl in highlights:
            geom = hl.get("geometry", {})
            coords = geom.get("coordinates", [[]])[0]
            # Ensure closed ring
            if coords and coords[0] != coords[-1]:
                coords.append(coords[0])
            
            formatted_highlights.append({
                "id": hl.get("id", "hl_1"),
                "type": hl.get("type", "water"),
                "label": hl.get("label", "Detected Feature"),
                "confidence": float(hl.get("confidence", 0.9)),
                "area_m2": int(hl.get("area_m2", 0)),
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [coords],
                },
            })

        layers = [
            {
                "id": layer_id,
                "label": layer_label,
                "opacity": 0.85,
                "highlights": formatted_highlights,
            }
        ]

        return {
            "layers": layers,
            "feature_count": len(formatted_highlights),
            "status": "ready",
        }
