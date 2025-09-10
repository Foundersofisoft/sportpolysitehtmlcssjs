from pydantic import BaseModel, EmailStr, field_validator
from datetime import date, datetime, time
from typing import Optional, List, Any

class UserBase(BaseModel):
    id: int
    email: EmailStr
    role: str
    full_name: Optional[str] = None
    photo_url: Optional[str] = None
    level: Optional[str] = None
    position: Optional[str] = None
    achievements_doc: Optional[str] = None
    sportsmanship_rating: float = 0
    skill_rating: float = 0
    no_show_count: int = 0
    class Config:
        from_attributes = True

class FieldPublic(BaseModel):
    id: int
    sport: str
    address: str
    price_per_hour: int
    description: Optional[str] = None
    amenities: Optional[str] = None
    venue_id: int
    class Config:
        from_attributes = True

class VenueProfilePublic(BaseModel):
    id: int
    owner_id: int
    title: str
    iin_bin: str
    description: Optional[str] = None
    phone_number: Optional[str] = None
    fields: List[FieldPublic] = []
    class Config:
        from_attributes = True

class UserProfile(UserBase):
    venue_profile: Optional[VenueProfilePublic] = None
    class Config:
        from_attributes = True

class MatchPublic(BaseModel):
    id: int
    title: str
    starts_at: datetime
    max_players: int
    status: str
    captain: UserBase
    field: Optional[FieldPublic] = None
    players_count: int = 0
    waitlist_enabled: bool
    is_private: bool
    invite_code: Optional[str] = None
    class Config:
        from_attributes = True

class TimeSlotPublic(BaseModel):
    id: int
    start_time: datetime
    end_time: datetime
    status: str
    price: int
    class Config:
        from_attributes = True

class MatchDetailsPublic(MatchPublic):
    players: List[UserBase] = []
    waitlist: List[UserBase] = []
    @field_validator('players', 'waitlist', mode='before')
    @classmethod
    def extract_users_from_match_players(cls, v: Any) -> Any:
        if v and isinstance(v, list) and len(v) > 0 and hasattr(v[0], 'user'):
             return [mp.user for mp in v]
        return v

class PlayerReviewCreate(BaseModel):
    subject_id: int
    review_type: str
    rating: int

class NoShowCreate(BaseModel):
    subject_id: int

class BulkReviewRequest(BaseModel):
    reviews: List[PlayerReviewCreate]
    no_shows: List[NoShowCreate]

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    level: Optional[str] = None
    position: Optional[str] = None
    
class FieldBase(BaseModel):
    sport: str
    address: str
    price_per_hour: int
    description: Optional[str] = None
    amenities: Optional[str] = None

class FieldCreate(FieldBase):
    pass

class FieldUpdate(FieldCreate):
    pass

class VenueProfileBase(BaseModel):
    title: str
    iin_bin: str
    description: Optional[str] = None
    phone_number: Optional[str] = None

class VenueProfileCreate(VenueProfileBase):
    pass

class VenueProfileUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    phone_number: Optional[str] = None

class MatchCreate(BaseModel):
    title: str
    slot_id: int
    max_players: int = 10
    waitlist_enabled: bool = True
    is_private: bool = False

class ScheduleGenerationRequest(BaseModel):
    start_date: date
    end_date: date
    start_time: time
    end_time: time
    slot_duration_minutes: int = 60

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None