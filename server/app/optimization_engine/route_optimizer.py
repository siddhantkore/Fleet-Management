"""
Route Optimizer — fetches multiple route alternatives from OpenRouteService
and scores them to select the optimal route.

Route planning is algorithmic — AI/LLM is NOT used here.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import (
    OPENROUTES_API_KEY,
    OPENROUTES_BASE_URL,
    OPENROUTES_PROFILE,
    OPENROUTES_TIMEOUT_SECONDS,
)
from app.optimization_engine.data_provider import haversine
from app.optimization_engine.types import LocationPoint

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RouteAlternative:
    """A single route alternative with geometry and metrics."""

    index: int
    distance_km: float
    duration_minutes: float
    geometry_coords: list[list[float]]  # [[lon, lat], ...]
    ascent_m: float = 0.0
    descent_m: float = 0.0
    score: float = 0.0  # Lower is better
    is_selected: bool = False


@dataclass
class RouteOptimizationResult:
    """Result of route optimization with multiple alternatives."""

    routes: list[RouteAlternative] = field(default_factory=list)
    selected_index: int = 0
    mode: str = "unknown"
    error: str | None = None


def _fetch_ors_alternatives(
    start: LocationPoint,
    end: LocationPoint,
    max_alternatives: int = 3,
) -> list[dict] | None:
    """Fetch route alternatives from OpenRouteService Directions API."""
    if not OPENROUTES_API_KEY:
        return None

    url = f"{OPENROUTES_BASE_URL}/v2/directions/{OPENROUTES_PROFILE}/json"
    payload = json.dumps(
        {
            "coordinates": [
                [start.longitude, start.latitude],
                [end.longitude, end.latitude],
            ],
            "alternative_routes": {
                "share_factor": 0.6,
                "target_count": max_alternatives,
                "weight_factor": 1.4,
            },
            "geometry": True,
            "instructions": False,
            "elevation": True,
        }
    ).encode("utf-8")

    req = Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Authorization": OPENROUTES_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )

    try:
        with urlopen(req, timeout=OPENROUTES_TIMEOUT_SECONDS) as response:
            if response.status != 200:
                logger.warning(f"ORS returned status {response.status}")
                return None
            data = json.loads(response.read().decode("utf-8"))
            routes = data.get("routes", [])
            if routes:
                return routes
    except (HTTPError, URLError, TimeoutError, ValueError, OSError, json.JSONDecodeError) as exc:
        logger.warning(f"ORS alternative routes request failed: {exc}")

    # Fallback: try single route (no alternatives) — works for longer distances
    logger.info("Falling back to single ORS route (no alternatives)")
    return _fetch_ors_single(start, end)


def _fetch_ors_single(
    start: LocationPoint,
    end: LocationPoint,
) -> list[dict] | None:
    """Fetch a single route from ORS (no alternatives). Used as fallback."""
    if not OPENROUTES_API_KEY:
        return None

    url = f"{OPENROUTES_BASE_URL}/v2/directions/{OPENROUTES_PROFILE}/json"
    payload = json.dumps(
        {
            "coordinates": [
                [start.longitude, start.latitude],
                [end.longitude, end.latitude],
            ],
            "geometry": True,
            "instructions": False,
            "elevation": True,
        }
    ).encode("utf-8")

    req = Request(
        url,
        data=payload,
        method="POST",
        headers={
            "Authorization": OPENROUTES_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
    )

    try:
        with urlopen(req, timeout=OPENROUTES_TIMEOUT_SECONDS + 4) as response:
            if response.status != 200:
                logger.warning(f"ORS single-route returned status {response.status}")
                return None
            data = json.loads(response.read().decode("utf-8"))
            return data.get("routes", []) or None
    except (HTTPError, URLError, TimeoutError, ValueError, OSError, json.JSONDecodeError) as exc:
        logger.warning(f"ORS single route request failed: {exc}")
        return None


def _decode_ors_geometry(route_data: dict) -> list[list[float]]:
    """Extract geometry coordinates from ORS route response."""
    geometry = route_data.get("geometry")
    if not geometry:
        return []

    # ORS returns geometry as encoded polyline or as GeoJSON coordinates
    if isinstance(geometry, list):
        return geometry

    # Handle encoded polyline format
    # ORS with elevation=true uses 3D encoded polyline (lon, lat, alt)
    if isinstance(geometry, str):
        return _decode_polyline(geometry, dimensions=3)

    # Handle GeoJSON-style geometry
    if isinstance(geometry, dict):
        coords = geometry.get("coordinates", [])
        return coords

    return []


def _decode_polyline(encoded: str, precision: int = 5, dimensions: int = 3) -> list[list[float]]:
    """Decode an encoded polyline string.

    ORS with elevation=true encodes 3 dimensions (lat, lon, altitude).
    We decode all dimensions but only return [lon, lat] for mapping.
    """
    if not encoded:
        return []

    inv = 1.0 / (10**precision)
    decoded = []
    previous = [0] * dimensions
    i = 0
    length = len(encoded)

    while i < length:
        point_values = []
        for dim in range(dimensions):
            shift = 0
            result = 0
            while True:
                if i >= length:
                    # Truncated data — return what we have so far
                    return decoded if decoded else []
                char_code = ord(encoded[i]) - 63
                i += 1
                result |= (char_code & 0x1F) << shift
                shift += 5
                if char_code < 0x20:
                    break
            if result & 1:
                result = ~result
            result >>= 1
            previous[dim] += result
            point_values.append(previous[dim] * inv)

        # ORS encoded order is [lat, lon, alt] — we return [lon, lat] for mapping
        if len(point_values) >= 2:
            decoded.append([point_values[1], point_values[0]])

    return decoded


def _score_route(
    route: dict,
    vehicle_mileage_kmpl: float = 8.0,
    cargo_weight_kg: float = 0.0,
    vehicle_capacity_kg: float = 10000.0,
) -> float:
    """
    Score a route based on multiple factors (lower is better).

    Factors:
    - Distance (primary factor)
    - Duration (time cost)
    - Fuel consumption estimate based on vehicle mileage
    - Load factor penalty (heavier loads on longer routes cost more)
    """
    summary = route.get("summary", {})
    distance_km = summary.get("distance", 0) / 1000.0
    duration_min = summary.get("duration", 0) / 60.0
    ascent_m = summary.get("ascent", 0)

    # Effective mileage drops with load
    load_factor = cargo_weight_kg / max(vehicle_capacity_kg, 1.0)
    effective_mileage = vehicle_mileage_kmpl * (1.0 - 0.3 * load_factor)
    effective_mileage = max(effective_mileage, 2.0)

    fuel_cost = distance_km / effective_mileage  # litres
    elevation_penalty = ascent_m * 0.001  # slight penalty for uphill

    # Composite score: weighted sum
    score = (
        distance_km * 1.0
        + duration_min * 0.5
        + fuel_cost * 5.0
        + elevation_penalty * 2.0
    )

    return round(score, 2)


def optimize_routes(
    start: LocationPoint,
    end: LocationPoint,
    vehicle_mileage_kmpl: float = 8.0,
    cargo_weight_kg: float = 0.0,
    vehicle_capacity_kg: float = 10000.0,
    max_alternatives: int = 3,
) -> RouteOptimizationResult:
    """
    Fetch and score multiple route alternatives.
    Returns all routes with the optimal one marked.
    """
    ors_routes = _fetch_ors_alternatives(start, end, max_alternatives)

    if not ors_routes:
        # Fallback: generate a single straight-line route
        distance_km = haversine(
            start.latitude, start.longitude, end.latitude, end.longitude
        )
        fallback_route = RouteAlternative(
            index=0,
            distance_km=distance_km,
            duration_minutes=distance_km / 60.0 * 60.0,  # Assume 60 km/h average
            geometry_coords=[
                [start.longitude, start.latitude],
                [end.longitude, end.latitude],
            ],
            score=0.0,
            is_selected=True,
        )
        return RouteOptimizationResult(
            routes=[fallback_route],
            selected_index=0,
            mode="Haversine fallback (straight line)",
        )

    alternatives: list[RouteAlternative] = []

    for idx, route_data in enumerate(ors_routes):
        summary = route_data.get("summary", {})
        distance_km = summary.get("distance", 0) / 1000.0
        duration_min = summary.get("duration", 0) / 60.0
        ascent_m = summary.get("ascent", 0)
        descent_m = summary.get("descent", 0)

        coords = _decode_ors_geometry(route_data)

        score = _score_route(
            route_data,
            vehicle_mileage_kmpl=vehicle_mileage_kmpl,
            cargo_weight_kg=cargo_weight_kg,
            vehicle_capacity_kg=vehicle_capacity_kg,
        )

        alternatives.append(
            RouteAlternative(
                index=idx,
                distance_km=round(distance_km, 2),
                duration_minutes=round(duration_min, 1),
                geometry_coords=coords,
                ascent_m=round(ascent_m, 1),
                descent_m=round(descent_m, 1),
                score=score,
            )
        )

    if not alternatives:
        return RouteOptimizationResult(
            routes=[],
            error="No routes could be parsed from ORS response",
        )

    # Select the route with the lowest score
    best_idx = min(range(len(alternatives)), key=lambda i: alternatives[i].score)

    # Rebuild with is_selected flag
    final_routes = []
    for alt in alternatives:
        final_routes.append(
            RouteAlternative(
                index=alt.index,
                distance_km=alt.distance_km,
                duration_minutes=alt.duration_minutes,
                geometry_coords=alt.geometry_coords,
                ascent_m=alt.ascent_m,
                descent_m=alt.descent_m,
                score=alt.score,
                is_selected=(alt.index == alternatives[best_idx].index),
            )
        )

    return RouteOptimizationResult(
        routes=final_routes,
        selected_index=best_idx,
        mode=f"OpenRouteService ({OPENROUTES_PROFILE})",
    )


def routes_to_json(result: RouteOptimizationResult) -> str:
    """Serialize route optimization result to JSON string for DB storage."""
    data = {
        "mode": result.mode,
        "selected_index": result.selected_index,
        "routes": [
            {
                "index": r.index,
                "distance_km": r.distance_km,
                "duration_minutes": r.duration_minutes,
                "geometry_coords": r.geometry_coords,
                "ascent_m": r.ascent_m,
                "descent_m": r.descent_m,
                "score": r.score,
                "is_selected": r.is_selected,
            }
            for r in result.routes
        ],
    }
    return json.dumps(data)
