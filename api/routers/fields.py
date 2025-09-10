from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date

from db import models, schemas, repository
from core.security import get_db, get_current_user

router = APIRouter()

@router.get("", response_model=List[schemas.FieldPublic])
def get_all_fields(db: Session = Depends(get_db)):
    """Возвращает список всех полей."""
    return repository.get_all_fields(db)

@router.post("/{field_id}/generate-schedule", status_code=status.HTTP_201_CREATED)
def generate_schedule(
    field_id: int,
    schedule_data: schemas.ScheduleGenerationRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Генерирует расписание (слоты) для поля. Доступно только владельцу."""
    db_field = repository.get_field_by_id(db, field_id)
    if not db_field or not db_field.venue or db_field.venue.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")

    count = repository.generate_schedule_for_field(db, field=db_field, schedule_data=schedule_data)
    return {"message": f"Successfully generated {count} new time slots."}

@router.get("/{field_id}/slots", response_model=List[schemas.TimeSlotPublic])
def get_available_slots(field_id: int, on_date: date, db: Session = Depends(get_db)):
    """Получает список слотов для поля на указанную дату."""
    return repository.get_slots_for_field_on_date(db, field_id=field_id, on_date=on_date)