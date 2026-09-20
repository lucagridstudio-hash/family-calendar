"""Test engine setup: the suite ALWAYS runs on a temporary SQLite file.

``DATABASE_URL`` is cleared before importing ``app.database`` so a developer
with a real PostgreSQL URL exported in their shell (or a CI secret) can never
accidentally run the tests against production data.
"""
import os

# Tests must never touch a real database: drop any production URL and point
# SQLAlchemy at a disposable SQLite file.
os.environ.pop("DATABASE_URL", None)
os.environ["FAMILY_CALENDAR_DB"] = "sqlite:///./test_family_calendar.db"

from app.database import Base, engine  # noqa: E402
from app.models import models  # noqa: E402,F401
from app.seed_data import ensure_seeded  # noqa: E402

Base.metadata.create_all(bind=engine)
ensure_seeded()
