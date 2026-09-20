"""Database engine configuration.

Priority order (checked from top to bottom):

1. ``DATABASE_URL``      — full SQLAlchemy URL, used in production (Render /
                           Supabase PostgreSQL). ``postgres://`` and
                           ``postgresql://`` schemes are normalised to
                           ``postgresql+psycopg2://`` so the psycopg2 driver
                           is always used.
2. ``FAMILY_CALENDAR_DB`` — optional SQLite URL override (existing behaviour,
                           used by tests and local tooling).
3. default               — ``sqlite:///./family_calendar.db`` (local dev file,
                           created/seeded automatically at startup).

Without ``DATABASE_URL`` the app keeps using the local SQLite file exactly as
before: local development is never broken. The SQLite file itself is never
deleted or rewritten by this module; use ``backend/scripts/`` for the
read-only audit, the backup and the one-way migration to PostgreSQL.
"""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


def _database_url() -> str:
    url = (os.environ.get("DATABASE_URL") or "").strip()
    if url:
        if url.startswith(("postgres://", "postgresql://")) and "+psycopg2" not in url:
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+psycopg2://", 1)
            else:
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url
    return os.environ.get("FAMILY_CALENDAR_DB", "sqlite:///./family_calendar.db")


DATABASE_URL = _database_url()

IS_POSTGRES = DATABASE_URL.startswith("postgresql")

if IS_POSTGRES:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,   # survive transient DB restarts / idle connections
        pool_size=5,
        max_overflow=10,
    )
else:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
