from __future__ import annotations

import json
from dataclasses import dataclass
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


@dataclass(frozen=True)
class RouteEstimate:
    distance_km: float
    mode: str


def _ors_distance_km(start: LocationPoint, end: LocationPoint) -> float | None:
    if not OPENROUTES_API_KEY:
        return None

    url = f"{OPENROUTES_BASE_URL}/v2/directions/{OPENROUTES_PROFILE}/json"
    payload = json.dumps(
        {"coordinates": [[start.longitude, start.latitude], [end.longitude, end.latitude]]}
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
                return None
            payload_data = json.loads(response.read().decode("utf-8"))
            distance_m = payload_data.get("routes", [{}])[0].get("summary", {}).get("distance")
            if distance_m is None:
                return None
            distance_km = float(distance_m) / 1000.0
            if distance_km <= 0:
                return None
            return distance_km
    except (HTTPError, URLError, TimeoutError, ValueError, OSError, json.JSONDecodeError, KeyError):
        return None


def estimate_route(start: LocationPoint, end: LocationPoint) -> RouteEstimate:
    """Estimate road distance using OpenRouteService; fallback to Haversine if unavailable."""
    ors_km = _ors_distance_km(start, end)
    if ors_km is not None:
        return RouteEstimate(distance_km=ors_km, mode=f"OpenRouteService ({OPENROUTES_PROFILE})")

    return RouteEstimate(
        distance_km=haversine(start.latitude, start.longitude, end.latitude, end.longitude),
        mode="Haversine fallback",
    )
