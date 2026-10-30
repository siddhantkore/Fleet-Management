"""
SMS notification service using Twilio.

Sends automated SMS messages to drivers when a trip is assigned to them.
Gracefully degrades (logs a warning) if Twilio is not configured.
"""

import logging
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration — pulled from environment (set in .env)
# ---------------------------------------------------------------------------
TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER: str = os.getenv("TWILIO_FROM_NUMBER", "")  # E.164 e.g. +12015550123


@dataclass
class TripSMSContext:
    """All data needed to compose the trip-assignment SMS."""

    driver_name: str
    driver_phone: str  # E.164 or local format — we normalise below
    trip_id: str
    vehicle_id: str
    vehicle_license_plate: str
    from_location: str
    to_location: str
    start_time: datetime
    cargo_type: str
    cargo_weight_kg: float
    distance_km: float


def _normalise_phone(phone: str) -> str:
    """
    Normalise an Indian phone number to E.164 (+91XXXXXXXXXX).
    Twilio requires E.164 format.
    Handles formats like: 9876543210, +919876543210, 09876543210
    """
    digits = "".join(filter(str.isdigit, phone))
    if digits.startswith("91") and len(digits) == 12:
        return f"+{digits}"
    if digits.startswith("0") and len(digits) == 11:
        return f"+91{digits[1:]}"
    if len(digits) == 10:
        return f"+91{digits}"
    # Return as-is with + prefix if it already looks international
    if phone.startswith("+"):
        return phone
    return f"+{digits}"


def _compose_message(ctx: TripSMSContext) -> str:
    """Compose a concise, informative SMS for the driver."""
    start_fmt = ctx.start_time.strftime("%d %b %Y, %I:%M %p")
    msg = (
        f"[Fleet Management] Trip Assigned\n"
        f"Trip ID : {ctx.trip_id}\n"
        f"Vehicle : {ctx.vehicle_license_plate} ({ctx.vehicle_id})\n"
        f"Route   : {ctx.from_location} → {ctx.to_location}\n"
        f"Depart  : {start_fmt}\n"
        f"Cargo   : {ctx.cargo_type} | {ctx.cargo_weight_kg:.0f} kg\n"
        f"Dist    : {ctx.distance_km:.1f} km\n"
        f"Please confirm receipt. Safe driving!"
    )
    return msg


def send_trip_assignment_sms(ctx: TripSMSContext) -> bool:
    """
    Send a trip-assignment SMS to the driver.

    Returns True on success, False on failure (never raises — the trip
    creation should still succeed even if SMS fails).
    """
    if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER]):
        logger.warning(
            "Twilio not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / "
            "TWILIO_FROM_NUMBER missing). SMS not sent for trip %s.",
            ctx.trip_id,
        )
        return False

    try:
        from twilio.rest import Client  # type: ignore[import]

        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        to_number = _normalise_phone(ctx.driver_phone)
        body = _compose_message(ctx)

        message = client.messages.create(
            body=body,
            from_=TWILIO_FROM_NUMBER,
            to=to_number,
        )
        logger.info(
            "SMS sent to driver %s (%s) for trip %s. SID=%s",
            ctx.driver_name,
            to_number,
            ctx.trip_id,
            message.sid,
        )
        return True

    except ImportError:
        logger.warning(
            "twilio package not installed. Run `pip install twilio` to enable SMS. "
            "SMS not sent for trip %s.",
            ctx.trip_id,
        )
        return False

    except Exception as exc:  # noqa: BLE001
        logger.error(
            "Failed to send SMS to driver %s for trip %s: %s",
            ctx.driver_name,
            ctx.trip_id,
            exc,
        )
        return False
