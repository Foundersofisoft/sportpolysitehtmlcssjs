from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from routers import health, auth, users, venues, matches, fields, reviews
from core.config import settings

app = FastAPI(
    title="PlayoffArena API",
    description="API для создания и поиска спортивных матчей.",
    version="1.0.0"
)

app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.include_router(health.router, prefix="/api", tags=["System"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(venues.router, prefix="/api/venues", tags=["Venues"])
app.include_router(matches.router, prefix="/api/matches", tags=["Matches"])
app.include_router(fields.router, prefix="/api/fields", tags=["Fields"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["Reviews"])