from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from db import models, schemas, repository
from core.security import get_current_user, get_db

router = APIRouter()

@router.post("/match/{match_id}", status_code=status.HTTP_201_CREATED)
def submit_match_reviews(
    match_id: int,
    data: schemas.BulkReviewRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    match = repository.get_match_by_id(db, match_id)
    if not match or match.captain_id != current_user.id:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    if match.status != models.MatchStatus.completed:
        raise HTTPException(status_code=400, detail="Отзывы можно оставить только для завершенных матчей")

    repository.process_reviews_and_no_shows(db, match_id=match_id, reviewer_id=current_user.id, data=data)
    return {"message": "Отзывы успешно отправлены"}