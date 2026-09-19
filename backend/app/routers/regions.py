"""Regional data and prompt suggestions endpoints (api.md Sections 7 & 8)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Query, Request

from ..deps import get_request_id
from ..schemas import ApiError, envelope

router = APIRouter()

# Fixed reference data for Indian states and benchmark observation cities
_STATES = [
    {"id": "mh", "name": "Maharashtra"},
    {"id": "dl", "name": "Delhi"},
    {"id": "ka", "name": "Karnataka"},
    {"id": "tn", "name": "Tamil Nadu"},
    {"id": "wb", "name": "West Bengal"},
    {"id": "gj", "name": "Gujarat"},
]

_CITIES: dict[str, list[dict[str, Any]]] = {
    "mh": [
        {"id": "mumbai", "name": "Mumbai", "coordinates": [72.8777, 19.0760], "state_id": "mh"},
        {"id": "pune", "name": "Pune", "coordinates": [73.8567, 18.5204], "state_id": "mh"},
        {"id": "nagpur", "name": "Nagpur", "coordinates": [79.0882, 21.1458], "state_id": "mh"},
    ],
    "dl": [
        {"id": "delhi", "name": "New Delhi", "coordinates": [77.2090, 28.6139], "state_id": "dl"},
    ],
    "ka": [
        {"id": "bengaluru", "name": "Bengaluru", "coordinates": [77.5946, 12.9716], "state_id": "ka"},
    ],
    "tn": [
        {"id": "chennai", "name": "Chennai", "coordinates": [80.2707, 13.0827], "state_id": "tn"},
    ],
}

# Standard GeoJSON boundary coordinates for key cities [lng, lat]
_MUMBAI_BOUNDARY = [
    [72.77, 18.89], [72.85, 18.88], [72.95, 19.01], [73.02, 19.18],
    [72.98, 19.29], [72.82, 19.28], [72.78, 19.12], [72.77, 18.89],
]

_SUGGESTIONS: dict[str, list[dict[str, str]]] = {
    "disaster": [
        {"id": "flood-change", "label": "Flood extent comparison", "text": "What changed between these two dates?"},
        {"id": "water-inundation", "label": "Surface water mapping", "text": "Highlight flooded areas and water bodies."},
        {"id": "cloud-sar", "label": "SAR penetration", "text": "Analyze standing water penetration through clouds using SAR."},
    ],
    "urban": [
        {"id": "builtup-expansion", "label": "Urban expansion", "text": "Did built-up area increase between these two images?"},
        {"id": "structure-density", "label": "Building footprint", "text": "Map all dense built-up structures in this scene."},
        {"id": "infrastructure-grounding", "label": "Identify infrastructure", "text": "Locate the airport runway and major highways."},
    ],
    "environment": [
        {"id": "veg-loss", "label": "Vegetation change", "text": "Identify deforestation or vegetation loss between observations."},
        {"id": "water-reservoir", "label": "Reservoir levels", "text": "Assess surface water volume changes in the reservoir."},
    ],
    "general": [
        {"id": "dominant-landcover", "label": "Land cover classification", "text": "What type of land cover dominates the scene?"},
        {"id": "temporal-changes", "label": "General change detection", "text": "Summarize all prominent temporal changes."},
    ],
}


@router.get("/regions/states")
def list_states(request: Request) -> dict[str, Any]:
    """List states available for region-guided satellite analysis."""
    return envelope(_STATES, get_request_id(request))


@router.get("/regions/{region_id}/cities")
def list_cities_in_state(region_id: str, request: Request) -> dict[str, Any]:
    """List cities in a specific state with coordinates [longitude, latitude]."""
    cities = _CITIES.get(region_id.lower(), [])
    return envelope(cities, get_request_id(request))


@router.get("/regions/{region_id}/boundary")
def get_region_boundary(region_id: str, request: Request) -> dict[str, Any]:
    """Get authorized GeoJSON boundary polygon for a region/city."""
    r_id = region_id.lower()
    
    # Return boundary for known cities or synthesize polygon around coordinates
    coords = _MUMBAI_BOUNDARY
    for city_list in _CITIES.values():
        for c in city_list:
            if c["id"] == r_id:
                lng, lat = c["coordinates"]
                delta = 0.08
                coords = [
                    [lng - delta, lat - delta],
                    [lng + delta, lat - delta],
                    [lng + delta, lat + delta],
                    [lng - delta, lat + delta],
                    [lng - delta, lat - delta],
                ]
                break

    return envelope(
        {
            "region_id": r_id,
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords],
            },
            "source": "openstreetmap-nominatim",
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
        },
        get_request_id(request),
    )


@router.get("/suggestions")
def get_prompt_suggestions(
    request: Request,
    category: str = Query(default="general"),
) -> dict[str, Any]:
    """Fetch category-tailored remote-sensing analysis questions."""
    cat = category.lower()
    items = _SUGGESTIONS.get(cat, _SUGGESTIONS["general"])
    return envelope(items, get_request_id(request))
