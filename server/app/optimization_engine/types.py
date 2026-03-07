from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from app.models.driver import Driver
from app.models.vehicle import Vehicle


@dataclass(frozen=True)
class OptimizationRequest:
    from_loc: str
    to_loc: str
    cargo_weight: float
    cargo_volume_cbm: float = 0.0


@dataclass(frozen=True)
class CandidateVehicle:
    vehicle: Vehicle
    reposition_distance_km: float
    recent_maintenance_events: int
    idle_days: float
    recent_trip_count: int


@dataclass(frozen=True)
class CandidateDriver:
    driver: Driver
    reposition_distance_km: float
    recent_trip_count: int


@dataclass(frozen=True)
class LocationPoint:
    location_id: str
    latitude: float
    longitude: float


@dataclass(frozen=True)
class ContinuationRecommendation:
    destination_id: str
    distance_km: float
    estimated_cost: float
    reason: str


@dataclass(frozen=True)
class OptimizationSolution:
    vehicle: CandidateVehicle
    driver: CandidateDriver
    route_distance_km: float
    estimated_cost: float
    continuation: ContinuationRecommendation
    generated_at: datetime
