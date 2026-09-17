"""Local SQLite metadata engine for pytest (tests run without the dev DB)."""
import os

os.environ.setdefault("FAMILY_CALENDAR_DB", "sqlite:///./test_family_calendar.db")

from app.database import Base, engine  # noqa: E402
from app.models import models  # noqa: E402,F401
from app.seed_data import ensure_seeded  # noqa: E402

Base.metadata.create_all(bind=engine)
ensure_seeded()
