import logging
import uuid
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.driver import Driver
from app.models.trip import Trip
from app.models.location import Location
from app.models.user import User
from app.models.vehicle import Vehicle
from app.optimization import optimize_trip
from app.optimization_engine.fleet_intelligence import evaluate_vehicle_repositioning
from app.schemas.trip import TripResponse, TripScheduleRequest
from app.services.sms import TripSMSContext, send_trip_assignment_sms

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/trips", tags=["trips"])


@router.post("/schedule", response_model=TripResponse)
def schedule_trip(
    request: TripScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Schedules a trip using optimization logic.
    """
    optimized_data, error = optimize_trip(
        db,
        request.from_loc,
        request.to_loc,
        request.cargo_weight,
        request.cargo_volume_cbm or 0.0,
        request.cargo_type or "General",
        start_time=request.start_time,
    )
    if error:
        raise HTTPException(status_code=400, detail=error)

    # Overlap check
    est_duration_min = optimized_data.get("estimated_duration_min")
    if request.start_time and est_duration_min:
        new_start = request.start_time
        new_end = new_start + timedelta(minutes=est_duration_min)
        
        existing_trips = db.query(Trip).filter(
            or_(
                Trip.vehicle_id == optimized_data["vehicle_id"],
                Trip.driver_id == optimized_data["driver_id"]
            ),
            Trip.status.in_(["Planned", "In-Transit"])
        ).all()
        
        for ext_trip in existing_trips:
            if not ext_trip.start_time:
                continue
            ext_start = ext_trip.start_time
            if ext_trip.end_time:
                ext_end = ext_trip.end_time
            else:
                ext_dist = ext_trip.distance_km or 0
                ext_dur = ext_trip.estimated_duration_min or ((ext_dist / 50.0) * 1.15 * 60.0 + 120.0)
                ext_end = ext_start + timedelta(minutes=ext_dur)
            
            if not (ext_end <= new_start or ext_start >= new_end):
                raise HTTPException(
                    status_code=409, 
                    detail=f"Scheduling conflict with existing trip {ext_trip.trip_id}"
                )

    trip_id = f"TRP-{uuid.uuid4().hex[:8].upper()}"

    new_trip = Trip(
        trip_id=trip_id,
        vehicle_id=optimized_data["vehicle_id"],
        driver_id=optimized_data["driver_id"],
        from_loc=optimized_data["from_id"],
        to_loc=optimized_data["to_id"],
        start_time=request.start_time,
        end_time=request.end_time,
        distance_km=optimized_data["distance_km"],
        cargo_weight=request.cargo_weight,
        cargo_volume_cbm=request.cargo_volume_cbm or 0.0,
        cargo_type=request.cargo_type or "General",
        estimated_duration_min=optimized_data.get("estimated_duration_min"),
        status="Planned",
        summary=optimized_data["summary"],
        route_data=optimized_data.get("route_data"),
    )

    # Update vehicle and driver status
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == optimized_data["vehicle_id"]).first()
    driver = db.query(Driver).filter(Driver.driver_id == optimized_data["driver_id"]).first()

    if vehicle:
        if request.cargo_weight > vehicle.capacity_kg:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cargo weight {request.cargo_weight} exceeds vehicle capacity"
                    f" {vehicle.capacity_kg}"
                ),
            )
        if (request.cargo_volume_cbm or 0.0) > vehicle.volume_cbm:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cargo volume {request.cargo_volume_cbm} exceeds vehicle volume capacity"
                    f" {vehicle.volume_cbm}"
                ),
            )
        vehicle.current_status = "Assigned"
    if driver:
        driver.current_status = "Assigned"

    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)

    # ── SMS notification to driver ──────────────────────────────────────────
    if driver and vehicle:
        try:
            from_location_obj = db.query(Location).filter(
                Location.location_id == new_trip.from_loc
            ).first()
            to_location_obj = db.query(Location).filter(
                Location.location_id == new_trip.to_loc
            ).first()

            from_name = from_location_obj.name if from_location_obj else new_trip.from_loc
            to_name = to_location_obj.name if to_location_obj else new_trip.to_loc

            sms_ctx = TripSMSContext(
                driver_name=driver.name,
                driver_phone=driver.phone,
                trip_id=new_trip.trip_id,
                vehicle_id=vehicle.vehicle_id,
                vehicle_license_plate=vehicle.license_plate,
                from_location=from_name,
                to_location=to_name,
                start_time=new_trip.start_time,
                cargo_type=new_trip.cargo_type or "General",
                cargo_weight_kg=new_trip.cargo_weight or 0.0,
                distance_km=new_trip.distance_km or 0.0,
            )
            send_trip_assignment_sms(sms_ctx)
        except Exception as sms_exc:
            logger.error("SMS notification failed (non-fatal): %s", sms_exc)
    # ───────────────────────────────────────────────────────────────────────

    return new_trip


@router.get("/", response_model=List[TripResponse])
def get_trips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Trip).all()


@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.post("/{trip_id}/start")
def start_trip(
    trip_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip.status = "In-Transit"
    trip.start_time = datetime.now()

    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == trip.vehicle_id).first()
    driver = db.query(Driver).filter(Driver.driver_id == trip.driver_id).first()

    if vehicle:
        vehicle.current_status = "On-Trip"
    if driver:
        driver.current_status = "On-Trip"

    db.commit()
    return {"message": "Trip started", "trip_id": trip_id}


@router.post("/{trip_id}/complete")
def complete_trip(
    trip_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip.status = "Completed"
    trip.end_time = datetime.now()

    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == trip.vehicle_id).first()
    driver = db.query(Driver).filter(Driver.driver_id == trip.driver_id).first()

    if vehicle:
        vehicle.current_status = "Available"
        # Update vehicle location to the trip destination
        vehicle.plant_loc_id = trip.to_loc

        # Update odometer based on trip distance
        if vehicle.odometer_km is not None and trip.distance_km:
            vehicle.odometer_km += int(trip.distance_km)

    if driver:
        driver.current_status = "Available"
        
        # Update driver's live location to the destination
        from app.models.tracking import LiveLocation
        dest_loc = db.query(Location).filter(Location.location_id == trip.to_loc).first()
        if dest_loc:
            live_loc = db.query(LiveLocation).filter(LiveLocation.driver_id == driver.driver_id).first()
            if live_loc:
                live_loc.latitude = dest_loc.latitude
                live_loc.longitude = dest_loc.longitude
                live_loc.speed = 0
                live_loc.activity_type = "stationary"
            else:
                live_loc = LiveLocation(
                    driver_id=driver.driver_id,
                    latitude=dest_loc.latitude,
                    longitude=dest_loc.longitude,
                    speed=0,
                    activity_type="stationary",
                )
                db.add(live_loc)

    db.commit()

    # Trigger fleet intelligence: evaluate repositioning for the vehicle
    if vehicle:
        try:
            recommendation = evaluate_vehicle_repositioning(
                db,
                vehicle=vehicle,
                current_location_id=trip.to_loc,
                source_location_id=trip.from_loc,
            )
            if recommendation:
                logger.info(
                    f"Fleet intelligence recommendation generated: "
                    f"{recommendation.action} for {vehicle.vehicle_id}"
                )
        except Exception as exc:
            logger.error(f"Fleet intelligence evaluation failed: {exc}")

    return {"message": "Trip completed", "trip_id": trip_id}


# ---------------------------------------------------------------------------
# Manual SMS endpoint — admin can resend/send a custom message to a driver
# ---------------------------------------------------------------------------

from pydantic import BaseModel  # noqa: E402 – placed here to keep imports grouped


class ManualSMSRequest(BaseModel):
    """Request body for sending a manual SMS to a driver."""

    driver_id: str
    message: str


@router.post("/notify/sms")
def send_manual_sms(
    request: ManualSMSRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Admin endpoint: send an arbitrary SMS to a driver.

    Requires the driver to have a phone number on record.
    Returns the delivery status (success/failure) without raising if SMS fails.
    """
    driver = db.query(Driver).filter(Driver.driver_id == request.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    from app.services.sms import _normalise_phone, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER

    if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER]):
        return {
            "success": False,
            "reason": "Twilio not configured on the server. "
                      "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM_NUMBER in .env.",
        }

    try:
        from twilio.rest import Client  # type: ignore[import]

        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        to_number = _normalise_phone(driver.phone)
        msg = client.messages.create(
            body=f"[Fleet Management - Admin Message]\n{request.message}",
            from_=TWILIO_FROM_NUMBER,
            to=to_number,
        )
        logger.info(
            "Manual SMS sent to driver %s (%s). SID=%s",
            driver.name,
            to_number,
            msg.sid,
        )
        return {"success": True, "sid": msg.sid, "to": to_number, "driver": driver.name}

    except ImportError:
        return {
            "success": False,
            "reason": "twilio package not installed. Run `pip install twilio`.",
        }
    except Exception as exc:
        logger.error("Manual SMS to driver %s failed: %s", driver.driver_id, exc)
        return {"success": False, "reason": str(exc)}
