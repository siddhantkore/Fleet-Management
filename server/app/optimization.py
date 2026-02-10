import math
from sqlalchemy.orm import Session
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.location import Location
from datetime import datetime

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great-circle distance between two points 
    on the Earth's surface using the Haversine formula.
    """
    R = 6371  # Earth radius in kilometers
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * R * math.asin(math.sqrt(a))

def get_coordinates(db: Session, loc_id_or_coords: str):
    """
    Returns (lat, lon, location_id) for a given input.
    Input can be a location_id or string formatted as "lat,lon".
    If it's coords, it creates a custom location entry if needed.
    """
    if "," in loc_id_or_coords:
        try:
            lat_str, lon_str = loc_id_or_coords.split(",")
            lat, lon = float(lat_str), float(lon_str)
            # Check if this custom location already exists
            loc_id = f"LOC-{abs(hash(loc_id_or_coords)) % 1000000}"
            existing = db.query(Location).filter(Location.location_id == loc_id).first()
            if not existing:
                new_loc = Location(
                    location_id=loc_id,
                    name=f"Custom Location ({lat_str}, {lon_str})",
                    type="Custom",
                    latitude=lat,
                    longitude=lon,
                    city="Unknown"
                )
                db.add(new_loc)
                db.commit()
                db.refresh(new_loc)
            return lat, lon, loc_id
        except Exception as e:
            print(f"Error parsing coordinates: {e}")
            pass
    
    loc = db.query(Location).filter(Location.location_id == loc_id_or_coords).first()
    if loc:
        return loc.latitude, loc.longitude, loc.location_id
    
    return None, None, None

def optimize_trip(db: Session, from_loc: str, to_loc: str, cargo_weight: float):
    """
    Optimizes vehicle and driver selection for a trip.
    """
    from_lat, from_lon, from_id = get_coordinates(db, from_loc)
    to_lat, to_lon, to_id = get_coordinates(db, to_loc)

    if from_lat is None or to_lat is None:
        return None, "Invalid source or destination coordinates/location ID."

    # 1. Vehicle Selection Logic
    # Filter: Available, and can carry the cargo
    available_vehicles = db.query(Vehicle).filter(
        Vehicle.current_status == "Available",
        Vehicle.capacity_kg >= cargo_weight
    ).all()

    if not available_vehicles:
        return None, "No available vehicles found with sufficient capacity."

    # Sort vehicles by distance from 'from_loc' if we knew their current position.
    # For now, let's assume they are at their home plant.
    # Improvement: Find vehicles at the same plant as 'from_loc'
    at_plant_vehicles = [v for v in available_vehicles if v.plant_loc_id == from_id]
    
    if at_plant_vehicles:
        # Pick the one with the lowest cost per km
        at_plant_vehicles.sort(key=lambda x: x.cost_per_km)
        selected_vehicle = at_plant_vehicles[0]
        vehicle_reason = f"Vehicle {selected_vehicle.vehicle_id} is already at the starting plant and has the lowest operational cost."
    else:
        # Pick any available vehicle with lowest cost
        available_vehicles.sort(key=lambda x: x.cost_per_km)
        selected_vehicle = available_vehicles[0]
        vehicle_reason = f"Vehicle {selected_vehicle.vehicle_id} was selected based on its efficiency and availability."

    # 2. Driver Selection Logic
    # Filter: Active, Available, Not on leave
    available_drivers = db.query(Driver).filter(
        Driver.status == "Active",
        Driver.current_status == "Available",
        Driver.is_on_leave == False
    ).all()

    if not available_drivers:
        return None, "No available drivers found at the moment."

    # Preference for drivers at the same home plant
    at_plant_drivers = [d for d in available_drivers if d.home_plant_id == from_id]
    
    if at_plant_drivers:
        at_plant_drivers.sort(key=lambda x: x.rating, reverse=True)
        selected_driver = at_plant_drivers[0]
        driver_reason = f"Driver {selected_driver.name} is stationed at this plant and has a high performance rating of {selected_driver.rating}."
    else:
        available_drivers.sort(key=lambda x: x.rating, reverse=True)
        selected_driver = available_drivers[0]
        driver_reason = f"Driver {selected_driver.name} was selected based on their high performance rating and current availability."

    distance = haversine(from_lat, from_lon, to_lat, to_lon)
    
    summary = f"""**Trip Optimization Report**

Based on the requirement to transport {cargo_weight} kg from {from_id} to {to_id}, our optimization engine has selected the following:

**Selected Vehicle:** {selected_vehicle.vehicle_id} ({selected_vehicle.license_plate})
- **Reasoning:** {vehicle_reason} It has a capacity of {selected_vehicle.capacity_kg}kg, which comfortably fits the cargo. Its fuel type ({selected_vehicle.fuel_type}) and cost of ${selected_vehicle.cost_per_km}/km make it the most economical choice for this {distance:.2f} km route.

**Selected Driver:** {selected_driver.name}
- **Reasoning:** {driver_reason} The driver is currently in 'Active' status and is not on leave. Their history of {selected_driver.rating}/5.0 stars ensures high service quality for this delivery.

**Route Statistics:**
- **Mode:** Direct Route (Haversine Optimized)
- **Estimated Distance:** {distance:.2f} km
- **Estimated Operational Cost:** ${ (distance * selected_vehicle.cost_per_km):.2f}
"""

    return {
        "vehicle_id": selected_vehicle.vehicle_id,
        "driver_id": selected_driver.driver_id,
        "distance_km": round(distance, 2),
        "summary": summary,
        "from_id": from_id,
        "to_id": to_id
    }, None
