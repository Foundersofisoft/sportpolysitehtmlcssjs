from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import date, time, timedelta, datetime
from . import models, schemas
from core.security import hash_password
import uuid

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = hash_password(user.password)
    db_user = models.User(email=user.email, pass_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, db_user: models.User, user_update: schemas.UserUpdate):
    update_data = user_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_user, key, value)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_or_create_oauth_user(db: Session, user_info: dict):
    user = db.query(models.User).filter(models.User.email == user_info['email']).first()
    if not user:
        random_password = hash_password(str(uuid.uuid4()))
        user = models.User(
            email=user_info['email'],
            full_name=user_info.get('name'),
            photo_url=user_info.get('picture'),
            pass_hash=random_password
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

def get_venue(db: Session, venue_id: int):
    return db.query(models.VenueProfile).options(joinedload(models.VenueProfile.fields)).filter(models.VenueProfile.id == venue_id).first()

def get_venues(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.VenueProfile).options(joinedload(models.VenueProfile.fields)).offset(skip).limit(limit).all()
    
def create_venue_profile(db: Session, owner: models.User, venue: schemas.VenueProfileCreate):
    owner.role = models.UserRole.venue
    db.add(owner)
    db_venue = models.VenueProfile(**venue.model_dump(), owner_id=owner.id)
    db.add(db_venue)
    db.commit()
    db.refresh(db_venue)
    return db_venue

def update_venue_profile(db: Session, db_venue: models.VenueProfile, venue_update: schemas.VenueProfileUpdate):
    update_data = venue_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_venue, key, value)
    db.add(db_venue)
    db.commit()
    db.refresh(db_venue)
    return db_venue

def get_field_by_id(db: Session, field_id: int):
    return db.query(models.Field).filter(models.Field.id == field_id).first()

def get_all_fields(db: Session):
    return db.query(models.Field).all()

def create_field_for_venue(db: Session, venue_id: int, field: schemas.FieldCreate):
    db_field = models.Field(**field.model_dump(), venue_id=venue_id)
    db.add(db_field)
    db.commit()
    db.refresh(db_field)
    return db_field

def update_field(db: Session, db_field: models.Field, field_update: schemas.FieldUpdate):
    update_data = field_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_field, key, value)
    db.add(db_field)
    db.commit()
    db.refresh(db_field)
    return db_field

def create_match(db: Session, captain: models.User, match_data: schemas.MatchCreate):
    slot = db.query(models.TimeSlot).filter(models.TimeSlot.id == match_data.slot_id).first()
    if not slot: return "slot_not_found"
    if slot.status != models.TimeSlotStatus.available: return "slot_not_available"
    db_match = models.Match(
        title=match_data.title, max_players=match_data.max_players,
        waitlist_enabled=match_data.waitlist_enabled, is_private=match_data.is_private,
        captain_id=captain.id, slot_id=slot.id, field_id=slot.field_id, starts_at=slot.start_time
    )
    db.add(db_match)
    db.commit()
    slot.status = models.TimeSlotStatus.booked
    slot.match_id = db_match.id
    db.add(slot)
    db_match_player = models.MatchPlayer(match_id=db_match.id, user_id=captain.id)
    db.add(db_match_player)
    db.commit()
    db.refresh(db_match)
    return db_match

def get_active_matches(db: Session, skip: int = 0, limit: int = 100):
    player_count_subquery = db.query(
        models.MatchPlayer.match_id, func.count(models.MatchPlayer.id).label("players_count")
    ).group_by(models.MatchPlayer.match_id).subquery()
    matches_query = db.query(models.Match, player_count_subquery.c.players_count)\
        .outerjoin(player_count_subquery, models.Match.id == player_count_subquery.c.match_id)\
        .options(joinedload(models.Match.captain), joinedload(models.Match.field))\
        .filter(models.Match.status == models.MatchStatus.active)\
        .filter(models.Match.is_private == False)\
        .order_by(models.Match.starts_at.asc())
    matches = matches_query.offset(skip).limit(limit).all()
    result = []
    for match, count in matches:
        match.players_count = count if count is not None else 0
        result.append(match)
    return result

def get_match_by_id(db: Session, match_id: int):
    match = db.query(models.Match)\
        .options(
            joinedload(models.Match.captain), joinedload(models.Match.field),
            joinedload(models.Match.players).joinedload(models.MatchPlayer.user)
        ).filter(models.Match.id == match_id).first()
    if match:
        match.players_count = len(match.players)
    return match

def add_player_to_match(db: Session, user: models.User, match: models.Match):
    existing_entry = db.query(models.MatchPlayer).filter_by(user_id=user.id, match_id=match.id).first()
    if existing_entry: return match
    confirmed_players_count = db.query(models.MatchPlayer).filter_by(match_id=match.id, status=models.MatchPlayerStatus.confirmed).count()
    status_to_set = models.MatchPlayerStatus.confirmed
    if confirmed_players_count >= match.max_players:
        if match.waitlist_enabled: status_to_set = models.MatchPlayerStatus.waitlist
        else: return None
    db_match_player = models.MatchPlayer(match_id=match.id, user_id=user.id, status=status_to_set)
    db.add(db_match_player)
    db.commit()
    return match

def remove_player_from_match(db: Session, user: models.User, match: models.Match):
    if match.captain_id == user.id: return None 
    player_entry = db.query(models.MatchPlayer).filter_by(match_id=match.id, user_id=user.id).first()
    if player_entry:
        was_confirmed = player_entry.status == models.MatchPlayerStatus.confirmed
        db.delete(player_entry)
        db.commit()
        if was_confirmed and match.waitlist_enabled:
            waitlist_player = db.query(models.MatchPlayer)\
                .filter_by(match_id=match.id, status=models.MatchPlayerStatus.waitlist)\
                .order_by(models.MatchPlayer.joined_at.asc()).first()
            if waitlist_player:
                waitlist_player.status = models.MatchPlayerStatus.confirmed
                db.add(waitlist_player)
                db.commit()
    return match

def generate_schedule_for_field(db: Session, field: models.Field, schedule_data: schemas.ScheduleGenerationRequest):
    new_slots = []
    current_date = schedule_data.start_date
    while current_date <= schedule_data.end_date:
        current_time = datetime.combine(current_date, schedule_data.start_time)
        end_of_day = datetime.combine(current_date, schedule_data.end_time)
        while current_time < end_of_day:
            end_time = current_time + timedelta(minutes=schedule_data.slot_duration_minutes)
            if end_time > end_of_day: break
            exists = db.query(models.TimeSlot).filter_by(field_id=field.id, start_time=current_time).first()
            if not exists:
                new_slots.append(models.TimeSlot(field_id=field.id, start_time=current_time, end_time=end_time))
            current_time = end_time
        current_date += timedelta(days=1)
    db.add_all(new_slots)
    db.commit()
    return len(new_slots)

def get_slots_for_field_on_date(db: Session, field_id: int, on_date: date):
    start_of_day = datetime.combine(on_date, time.min)
    end_of_day = datetime.combine(on_date, time.max)
    slots = db.query(models.TimeSlot).join(models.Field)\
        .filter(models.TimeSlot.field_id == field_id)\
        .filter(models.TimeSlot.start_time.between(start_of_day, end_of_day))\
        .order_by(models.TimeSlot.start_time.asc()).all()
    for slot in slots:
        slot.price = slot.price_override if slot.price_override is not None else slot.field.price_per_hour
    return slots

def update_match_status(db: Session, match: models.Match, status: models.MatchStatus):
    match.status = status
    db.add(match)
    if status == models.MatchStatus.cancelled and match.slot:
        match.slot.status = models.TimeSlotStatus.available
        match.slot.match_id = None
        db.add(match.slot)
    db.commit()
    db.refresh(match)
    return match

def get_match_by_invite_code(db: Session, invite_code: str):
    return db.query(models.Match).filter(models.Match.invite_code == invite_code).first()

def process_reviews_and_no_shows(db: Session, match_id: int, reviewer_id: int, data: schemas.BulkReviewRequest):
    for review_data in data.reviews:
        existing_review = db.query(models.PlayerReview).filter_by(
            match_id=match_id,
            reviewer_id=reviewer_id,
            subject_id=review_data.subject_id,
            review_type=models.ReviewType[review_data.review_type]
        ).first()
        
        if not existing_review:
            new_review = models.PlayerReview(
                match_id=match_id,
                reviewer_id=reviewer_id,
                subject_id=review_data.subject_id,
                review_type=review_data.review_type,
                rating=review_data.rating
            )
            db.add(new_review)
            
            subject_user = db.query(models.User).filter_by(id=review_data.subject_id).first()
            if subject_user:
                total_reviews = subject_user.reviews_count or 0
                if review_data.review_type == 'skill':
                    current_total_score = (subject_user.skill_rating or 0) * total_reviews
                    subject_user.skill_rating = (current_total_score + review_data.rating) / (total_reviews + 1)
                elif review_data.review_type == 'sportsmanship':
                    current_total_score = (subject_user.sportsmanship_rating or 0) * total_reviews
                    subject_user.sportsmanship_rating = (current_total_score + review_data.rating) / (total_reviews + 1)
                
                subject_user.reviews_count = total_reviews + 1
                db.add(subject_user)

    for noshow_data in data.no_shows:
        player_in_match = db.query(models.MatchPlayer).filter_by(match_id=match_id, user_id=noshow_data.subject_id).first()
        if player_in_match and player_in_match.status != models.MatchPlayerStatus.noshow:
            player_in_match.status = models.MatchPlayerStatus.noshow
            db.add(player_in_match)
            
            subject_user = db.query(models.User).filter_by(id=noshow_data.subject_id).first()
            if subject_user:
                subject_user.no_show_count = (subject_user.no_show_count or 0) + 1
                db.add(subject_user)
                
    db.commit()
    return True