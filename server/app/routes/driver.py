from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models.driver import Driver
from app.models.user import User
from app.schemas.driver import DriverCreate, DriverResponse, DriverUpdate

router = APIRouter(prefix="/drivers", tags=["drivers"])


@router.post("/", response_model=DriverResponse)
def create_driver(
    driver: DriverCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if admin is restricted to a plant
    if current_user.plant_id and current_user.plant_id != driver.home_plant_id:
        raise HTTPException(status_code=403, detail="Not authorized to add driver to another plant")

    db_driver = db.query(Driver).filter(Driver.driver_id == driver.driver_id).first()
    if db_driver:
        raise HTTPException(status_code=400, detail="Driver ID already exists")

    new_driver = Driver(**driver.dict())
    db.add(new_driver)
    db.commit()
    db.refresh(new_driver)
    return new_driver


@router.get("/", response_model=List[DriverResponse])
def get_drivers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Driver)
    if current_user.plant_id:
        query = query.filter(Driver.home_plant_id == current_user.plant_id)
    return query.all()


@router.get("/{driver_id}", response_model=DriverResponse)
def get_driver(
    driver_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    if current_user.plant_id and driver.home_plant_id != current_user.plant_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this driver")

    return driver


@router.put("/{driver_id}", response_model=DriverResponse)
def update_driver(
    driver_id: str,
    driver: DriverUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if not db_driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    if current_user.plant_id and db_driver.home_plant_id != current_user.plant_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this driver")

    update_data = driver.dict(exclude_unset=True)

    # If updating home_plant_id, check permissions
    if "home_plant_id" in update_data and current_user.plant_id:
        if update_data["home_plant_id"] != current_user.plant_id:
            raise HTTPException(status_code=403, detail="Cannot move driver to another plant")

    for key, value in update_data.items():
        setattr(db_driver, key, value)

    db.commit()
    db.refresh(db_driver)
    return db_driver


@router.delete("/{driver_id}")
def delete_driver(
    driver_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    db_driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if not db_driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    if current_user.plant_id and db_driver.home_plant_id != current_user.plant_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this driver")

    db.delete(db_driver)
    db.commit()
    return {"detail": "Driver deleted successfully"}
