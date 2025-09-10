from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import shutil
import os
from datetime import datetime
from db import models, schemas, repository
from core.security import get_current_user, get_db

router = APIRouter()

os.makedirs("static/avatars", exist_ok=True)
os.makedirs("static/docs", exist_ok=True)

@router.get("/me", response_model=schemas.UserProfile)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.UserProfile)
def update_users_me(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    updated_user = repository.update_user(db=db, db_user=current_user, user_update=user_update)
    return updated_user

@router.post("/me/upload-photo", response_model=schemas.UserProfile)
def upload_user_photo(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_extension = file.filename.split(".")[-1] if '.' in file.filename else 'jpg'
    file_name = f"{current_user.id}_{datetime.now().timestamp()}.{file_extension}"
    file_path = f"static/avatars/{file_name}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    current_user.photo_url = f"/{file_path}"
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/me/upload-document", response_model=schemas.UserProfile)
def upload_achievement_document(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_extension = file.filename.split(".")[-1] if '.' in file.filename else 'pdf'
    file_name = f"doc_{current_user.id}_{datetime.now().timestamp()}.{file_extension}"
    file_path = f"static/docs/{file_name}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    current_user.achievements_doc = f"/{file_path}"
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user