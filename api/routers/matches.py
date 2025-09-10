from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from typing import List
from db import models, schemas, repository
from core.security import get_current_user, get_db

router = APIRouter()

@router.post("", response_model=schemas.MatchPublic, status_code=status.HTTP_201_CREATED)
def create_new_match(
    match: schemas.MatchCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    result = repository.create_match(db=db, captain=current_user, match_data=match)
    if result == "slot_not_found":
        raise HTTPException(status_code=404, detail="Слот не найден")
    if result == "slot_not_available":
        raise HTTPException(status_code=400, detail="Слот уже занят")
    newly_created_match = repository.get_match_by_id(db, result.id)
    return newly_created_match

@router.get("", response_model=List[schemas.MatchPublic])
def get_all_active_matches(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return repository.get_active_matches(db, skip=skip, limit=limit)

@router.get("/invite/{invite_code}", response_model=schemas.MatchDetailsPublic)
def get_match_by_invite(invite_code: str, db: Session = Depends(get_db)):
    db_match = repository.get_match_by_invite_code(db, invite_code=invite_code)
    if db_match is None:
        raise HTTPException(status_code=404, detail="Матч по этому приглашению не найден")
    return repository.get_match_by_id(db, match_id=db_match.id)

@router.get("/{match_id}", response_model=schemas.MatchDetailsPublic)
def get_match_details(match_id: int, db: Session = Depends(get_db)):
    db_match = repository.get_match_by_id(db, match_id=match_id)
    if db_match is None:
        raise HTTPException(status_code=404, detail="Матч не найден")
    return db_match

@router.post("/{match_id}/join", response_model=schemas.MatchDetailsPublic)
def join_match(match_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_match = repository.get_match_by_id(db, match_id=match_id)
    if not db_match:
        raise HTTPException(status_code=404, detail="Матч не найден")
    repository.add_player_to_match(db=db, user=current_user, match=db_match)
    return repository.get_match_by_id(db, match_id=match_id)

@router.post("/{match_id}/leave", response_model=schemas.MatchDetailsPublic)
def leave_match(match_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_match = repository.get_match_by_id(db, match_id=match_id)
    if not db_match:
        raise HTTPException(status_code=404, detail="Матч не найден")
    updated_match = repository.remove_player_from_match(db=db, user=current_user, match=db_match)
    if updated_match is None:
        raise HTTPException(status_code=400, detail="Капитан не может покинуть матч")
    return repository.get_match_by_id(db, match_id=match_id)

@router.post("/{match_id}/complete", response_model=schemas.MatchDetailsPublic)
def complete_match(match_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_match = repository.get_match_by_id(db, match_id=match_id)
    if not db_match or db_match.captain_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    repository.update_match_status(db, match=db_match, status=models.MatchStatus.completed)
    return repository.get_match_by_id(db, match_id=match_id)

@router.post("/{match_id}/cancel", response_model=schemas.MatchDetailsPublic)
def cancel_match(match_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_match = repository.get_match_by_id(db, match_id=match_id)
    if not db_match or db_match.captain_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    repository.update_match_status(db, match=db_match, status=models.MatchStatus.cancelled)
    return repository.get_match_by_id(db, match_id=match_id)