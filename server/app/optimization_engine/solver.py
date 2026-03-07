from __future__ import annotations

from dataclasses import dataclass

from app.optimization_engine.types import CandidateDriver, CandidateVehicle


@dataclass(frozen=True)
class AssignmentInput:
    start_location_id: str
    route_distance_km: float
    vehicles: list[CandidateVehicle]
    drivers: list[CandidateDriver]


@dataclass(frozen=True)
class AssignmentResult:
    vehicle_index: int
    driver_index: int
    objective_value: float


@dataclass(frozen=True)
class ContinuationOption:
    destination_id: str
    distance_km: float
    demand_count: int


@dataclass(frozen=True)
class ContinuationResult:
    option_index: int
    objective_value: float


def _scaled(value: float, scale: int = 100) -> int:
    return int(round(value * scale))


def _cp_model():
    try:
        from ortools.sat.python import cp_model
    except Exception as exc:  # pragma: no cover - exercised when dependency missing
        raise RuntimeError(
            "Google OR-Tools is not available. Install backend dependencies including 'ortools'."
        ) from exc
    return cp_model


def solve_best_assignment(data: AssignmentInput) -> AssignmentResult:
    """
    Use OR-Tools CP-SAT to select one feasible driver + vehicle pair.

    The objective combines transport cost, repositioning effort, maintenance pressure,
    and balancing terms (prefer vehicles idle for longer and reduce overused resources).
    """
    if not data.vehicles:
        raise ValueError("No eligible vehicles to optimize")
    if not data.drivers:
        raise ValueError("No eligible drivers to optimize")

    cp_model = _cp_model()

    model = cp_model.CpModel()
    pair_vars: dict[tuple[int, int], cp_model.IntVar] = {}

    for vi in range(len(data.vehicles)):
        for di in range(len(data.drivers)):
            pair_vars[(vi, di)] = model.NewBoolVar(f"x_v{vi}_d{di}")

    model.Add(sum(pair_vars.values()) == 1)

    for vi in range(len(data.vehicles)):
        model.Add(sum(pair_vars[(vi, di)] for di in range(len(data.drivers))) <= 1)
    for di in range(len(data.drivers)):
        model.Add(sum(pair_vars[(vi, di)] for vi in range(len(data.vehicles))) <= 1)

    terms: list[cp_model.LinearExpr] = []
    for (vi, di), decision_var in pair_vars.items():
        vehicle = data.vehicles[vi]
        driver = data.drivers[di]

        base_transport_cost = (
            data.route_distance_km + vehicle.reposition_distance_km
        ) * vehicle.vehicle.cost_per_km
        driver_reposition_cost = driver.reposition_distance_km * 0.35
        maintenance_penalty = float(vehicle.recent_maintenance_events) * 7.0
        vehicle_recent_usage_penalty = float(vehicle.recent_trip_count) * 2.5
        driver_recent_usage_penalty = float(driver.recent_trip_count) * 2.0
        idle_bonus = vehicle.idle_days * 0.5
        driver_rating_bonus = float(driver.driver.rating or 0.0) * 3.0

        same_start_plant_bonus = 0.0
        if vehicle.vehicle.plant_loc_id == data.start_location_id:
            same_start_plant_bonus += 5.0
        if driver.driver.home_plant_id == data.start_location_id:
            same_start_plant_bonus += 5.0

        pair_cost = (
            base_transport_cost
            + driver_reposition_cost
            + maintenance_penalty
            + vehicle_recent_usage_penalty
            + driver_recent_usage_penalty
            - idle_bonus
            - driver_rating_bonus
            - same_start_plant_bonus
        )
        terms.append(decision_var * _scaled(pair_cost))

    model.Minimize(sum(terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 5.0
    solver.parameters.num_search_workers = 8

    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError("No feasible assignment found by OR-Tools")

    for (vi, di), decision_var in pair_vars.items():
        if solver.Value(decision_var) == 1:
            return AssignmentResult(
                vehicle_index=vi,
                driver_index=di,
                objective_value=float(solver.ObjectiveValue()) / 100.0,
            )

    raise RuntimeError("Solver completed without selecting an assignment")


def solve_continuation_option(options: list[ContinuationOption]) -> ContinuationResult:
    """
    Use OR-Tools CP-SAT to choose the best next destination after delivery.
    """
    if not options:
        raise ValueError("No continuation options provided")

    cp_model = _cp_model()
    model = cp_model.CpModel()
    decision_vars = [model.NewBoolVar(f"next_{idx}") for idx in range(len(options))]
    model.Add(sum(decision_vars) == 1)

    terms: list[cp_model.LinearExpr] = []
    for idx, option in enumerate(options):
        # Lower cost is better; higher demand provides credit.
        score = option.distance_km - (option.demand_count * 10.0)
        terms.append(decision_vars[idx] * _scaled(score))
    model.Minimize(sum(terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 3.0
    solver.parameters.num_search_workers = 8

    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError("No feasible continuation option found by OR-Tools")

    for idx, var in enumerate(decision_vars):
        if solver.Value(var) == 1:
            return ContinuationResult(
                option_index=idx, objective_value=float(solver.ObjectiveValue()) / 100.0
            )

    raise RuntimeError("Solver completed without selecting continuation option")
