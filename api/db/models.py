import enum
import secrets
import string
from sqlalchemy import (
    Column, Integer, String, DateTime, Date, Float, Text, Enum as SQLAlchemyEnum, func, ForeignKey, Boolean
)
from sqlalchemy.orm import relationship
from .session import Base

def generate_invite_code(length=8):
    alphabet = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(alphabet) for i in range(length))

class UserRole(enum.Enum):
    athlete = "athlete"
    venue = "venue"
    admin = "admin"

class MatchStatus(enum.Enum):
    active = "active"
    completed = "completed"
    cancelled = "cancelled"

class MatchPlayerStatus(enum.Enum):
    confirmed = "confirmed"
    waitlist = "waitlist"
    noshow = "noshow"

class TimeSlotStatus(enum.Enum):
    available = "available"
    booked = "booked"
    unavailable = "unavailable"

class ReviewType(enum.Enum):
    sportsmanship = "sportsmanship"
    skill = "skill"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    pass_hash = Column(String(255), nullable=False)
    role = Column(SQLAlchemyEnum(UserRole), default=UserRole.athlete, nullable=False)
    full_name = Column(String(255))
    photo_url = Column(String(1024))
    level = Column(String(100))
    position = Column(String(100))
    achievements_doc = Column(String(1024))
    sportsmanship_rating = Column(Float, default=0, nullable=False)
    skill_rating = Column(Float, default=0, nullable=False)
    no_show_count = Column(Integer, default=0, nullable=False)
    reviews_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    venue_profile = relationship("VenueProfile", back_populates="owner", uselist=False)
    matches_as_captain = relationship("Match", back_populates="captain", foreign_keys='Match.captain_id')
    match_participations = relationship("MatchPlayer", back_populates="user")
    reviews_given = relationship("PlayerReview", back_populates="reviewer", foreign_keys='PlayerReview.reviewer_id')
    reviews_received = relationship("PlayerReview", back_populates="subject", foreign_keys='PlayerReview.subject_id')

class VenueProfile(Base):
    __tablename__ = "venue_profiles"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    iin_bin = Column(String(12), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    phone_number = Column(String(50))
    owner = relationship("User", back_populates="venue_profile")
    fields = relationship("Field", back_populates="venue", cascade="all, delete-orphan")

class Field(Base):
    __tablename__ = "fields"
    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("venue_profiles.id"), nullable=False)
    sport = Column(String(100), nullable=False)
    address = Column(String(512), nullable=False)
    price_per_hour = Column(Integer, nullable=False)
    description = Column(Text)
    amenities = Column(String(512))
    venue = relationship("VenueProfile", back_populates="fields")
    matches = relationship("Match", back_populates="field")
    slots = relationship("TimeSlot", back_populates="field", cascade="all, delete-orphan")

class Match(Base):
    __tablename__ = "matches"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=True)
    captain_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    starts_at = Column(DateTime, nullable=False)
    max_players = Column(Integer, default=10, nullable=False)
    status = Column(SQLAlchemyEnum(MatchStatus), default=MatchStatus.active, nullable=False)
    is_private = Column(Boolean, default=False)
    waitlist_enabled = Column(Boolean, nullable=False, server_default='true')
    slot_id = Column(Integer, ForeignKey("time_slots.id"), nullable=True, unique=True)
    invite_code = Column(String(10), unique=True, index=True, default=generate_invite_code)
    captain = relationship("User", back_populates="matches_as_captain", foreign_keys=[captain_id])
    field = relationship("Field", back_populates="matches")
    players = relationship("MatchPlayer", back_populates="match", cascade="all, delete-orphan")
    slot = relationship("TimeSlot", back_populates="match")

class MatchPlayer(Base):
    __tablename__ = "match_players"
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(SQLAlchemyEnum(MatchPlayerStatus), default=MatchPlayerStatus.confirmed, nullable=False)
    joined_at = Column(DateTime, server_default=func.now(), nullable=False)
    match = relationship("Match", back_populates="players")
    user = relationship("User", back_populates="match_participations")

class TimeSlot(Base):
    __tablename__ = "time_slots"
    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    price_override = Column(Integer)
    status = Column(SQLAlchemyEnum(TimeSlotStatus), default=TimeSlotStatus.available, nullable=False)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=True)
    field = relationship("Field", back_populates="slots")
    match = relationship("Match", back_populates="slot", uselist=False)

class PlayerReview(Base):
    __tablename__ = "player_reviews"
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    review_type = Column(SQLAlchemyEnum(ReviewType), nullable=False)
    rating = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    reviewer = relationship("User", back_populates="reviews_given", foreign_keys=[reviewer_id])
    subject = relationship("User", back_populates="reviews_received", foreign_keys=[subject_id])