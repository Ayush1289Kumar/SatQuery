"""Image validation tool (Blueprint Section 7 & 18)."""
from __future__ import annotations

from typing import Any

from .base import Tool


class ImageValidatorTool(Tool):
    name = "image_validator"
    version = "1.0.0"
    role = "raster validation"

    def validate(self, inputs: dict[str, Any]) -> bool:
        return "images" in inputs and len(inputs["images"]) > 0

    def execute(self, inputs: dict[str, Any], parameters: dict[str, Any] | None = None) -> dict[str, Any]:
        images = inputs.get("images", [])
        mode = inputs.get("mode", "single")

        validated = []
        for idx, img in enumerate(images):
            # Extract basic dimensions/metadata or provide safe defaults
            meta = {
                "index": idx,
                "valid": True,
                "format": getattr(img, "content_type", "image/png"),
                "size_bytes": getattr(img, "size_bytes", 1024 * 1024),
                "crs": getattr(img, "crs", "EPSG:4326"),
                "modality": getattr(img, "kind", "optical"),
            }
            validated.append(meta)

        compatible = True
        error_msg = None
        if mode == "twoDate" and len(images) < 2:
            compatible = False
            error_msg = "Two-date change detection requires exactly 2 images."
        elif mode == "opticalSar" and len(images) < 2:
            compatible = False
            error_msg = "Optical + SAR fusion requires an optical and a SAR image."

        return {
            "status": "valid" if compatible else "invalid",
            "compatible": compatible,
            "images_checked": len(validated),
            "details": validated,
            "error": error_msg,
        }
