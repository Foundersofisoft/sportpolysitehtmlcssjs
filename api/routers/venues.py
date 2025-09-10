from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from db import models, schemas, repository
from core.security import get_current_user, get_db

router = APIRouter()

@router.post("", response_model=schemas.VenueProfilePublic, status_code=status.HTTP_201_CREATED)
def create_venue(
    venue: schemas.VenueProfileCreate,
    db_session: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.venue_profile:
        raise HTTPException(status_code=400, detail="У этого пользователя уже есть профиль заведения")
    return repository.create_venue_profile(db=db_session, owner=current_user, venue=venue)

@router.get("", response_model=List[schemas.VenueProfilePublic])
def read_venues(skip: int = 0, limit: int = 100, db_session: Session = Depends(get_db)):
    return repository.get_venues(db=db_session, skip=skip, limit=limit)

@router.put("/{venue_id}", response_model=schemas.VenueProfilePublic)
def update_venue(
    venue_id: int,
    venue_update: schemas.VenueProfileUpdate,
    db_session: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_venue = repository.get_venue(db=db_session, venue_id=venue_id)
    if not db_venue or db_venue.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    return repository.update_venue_profile(db=db_session, db_venue=db_venue, venue_update=venue_update)

@router.post("/{venue_id}/fields", response_model=schemas.FieldPublic, status_code=status.HTTP_201_CREATED)
def create_field(
    venue_id: int,
    field: schemas.FieldCreate,
    db_session: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_venue = repository.get_venue(db=db_session, venue_id=venue_id)
    if not db_venue or db_venue.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    return repository.create_field_for_venue(db=db_session, venue_id=venue_id, field=field)

@router.put("/fields/{field_id}", response_model=schemas.FieldPublic)
def update_field(
    field_id: int,
    field_update: schemas.FieldUpdate,
    db_session: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_field = repository.get_field_by_id(db=db_session, field_id=field_id)
    if not db_field or db_field.venue.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    return repository.update_field(db=db_session, db_field=db_field, field_update=field_update)