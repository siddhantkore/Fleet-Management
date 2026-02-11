from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.location import Location
from app.models.user import User
from app.schemas.location import LocationCreate, LocationResponse, LocationUpdate

router = APIRouter(prefix="/locations", tags=["locations"])


@router.post("/", response_model=LocationResponse)
def create_location(
    location: LocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_loc = db.query(Location).filter(Location.location_id == location.location_id).first()
    if db_loc:
        raise HTTPException(status_code=400, detail="Location ID already exists")
    new_loc = Location(**location.dict())
    db.add(new_loc)
    db.commit()
    db.refresh(new_loc)
    return new_loc


@router.get("/", response_model=List[LocationResponse])
def get_locations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Location).all()


@router.get("/{location_id}", response_model=LocationResponse)
def get_location(
    location_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    loc = db.query(Location).filter(Location.location_id == location_id).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return loc


@router.put("/{location_id}", response_model=LocationResponse)
def update_location(
    location_id: str,
    location: LocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_loc = db.query(Location).filter(Location.location_id == location_id).first()
    if not db_loc:
        raise HTTPException(status_code=404, detail="Location not found")

    update_data = location.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_loc, key, value)

    db.commit()
    db.refresh(db_loc)
    return db_loc


@router.delete("/{location_id}")
def delete_location(
    location_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    db_loc = db.query(Location).filter(Location.location_id == location_id).first()
    if not db_loc:
        raise HTTPException(status_code=404, detail="Location not found")

    # Check for linked drivers
    from app.models.driver import Driver

    linked_drivers = db.query(Driver).filter(Driver.home_plant_id == location_id).first()
    if linked_drivers:
        raise HTTPException(
            status_code=400, detail="Cannot delete location: Drivers are assigned to this plant"
        )

    # Check for linked users
    linked_users = db.query(User).filter(User.plant_id == location_id).first()
    if linked_users:
        raise HTTPException(
            status_code=400, detail="Cannot delete location: Admins are assigned to this plant"
        )

    db.delete(db_loc)
    db.commit()
    return {"detail": "Location deleted successfully"}
