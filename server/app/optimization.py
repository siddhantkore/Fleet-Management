"""Backward-compatible optimizer façade.

The detailed implementation lives in app.optimization_engine to keep the
optimization concerns decoupled from API routes.
"""

from app.optimization_engine.planner import optimize_trip

__all__ = ["optimize_trip"]
