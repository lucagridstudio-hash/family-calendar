"""Idempotent database seeding: family members, the doctor's known shifts and sample events.

Runs automatically at API startup (and can be triggered manually with
`python -m app.seed_data`).

Family members are the four real family members (Luciano, Giovanna, Luca,
Nicola). `_ensure_family` runs on every startup and enforces exactly these
four records, renaming existing rows in place so their ids (and therefore
their shifts/events) are preserved. Placeholder members from earlier
development iterations ("Pipo", "Mimo", "Nico") are merged into the matching
real member by id, never left behind as duplicates.

Shift codes and meanings come from the hospital shift legend:
  MA = mattina (07:30-14:00) • PO = pomeriggio (14:00-20:00) • MA+PO = giornata (07:30-20:00)
  NO = notte (20:00-08:00) • PSP = sala operatoria (giornata completa)
  GDG = pronto soccorso (mattina, 07:30-14:00) • FF = ferie (assenza) • $ = libero
"""
from datetime import date

from app.database import Base, SessionLocal, engine
from app.models.models import CalendarEvent, DoctorShift, FamilyMember
from app.shift_types import SHIFT_TYPES

# The four real family members, keyed by stable id.
# id 1 = Luciano: the doctor (hospital shifts belong to him).
FAMILY = {
    1: {"name": "Luciano", "role": "father", "avatar": "👨‍⚕️", "color": "#0284c7", "is_doctor": True},
    2: {"name": "Giovanna", "role": "mother", "avatar": "👩", "color": "#7c3aed", "is_doctor": False},
    3: {"name": "Luca", "role": "son", "avatar": "👦", "color": "#2563eb", "is_doctor": False},
    4: {"name": "Nicola", "role": "son", "avatar": "👦", "color": "#059669", "is_doctor": False},
}

# Placeholder names from earlier development iterations, mapped to the real
# member that must inherit their data when migrating an old database.
STALE_MEMBERS = {"pipo": 1, "mimo": 2, "nico": 4}

# Complete September 2026 shift schedule for Luciano (provided directly by
# the family from the hospital sheet):
#   1-5 FF ferie • 6 $ libero • 7 MA • 8 MA+PO • 9 $ • 10 NO • 11-13 $
#   14-15 MA • 16 $ • 17 MA • 18 $ • 19 PO • 20-24 $ • 25 NO • 26-27 $
#   28 GDG • 29 MA • 30 $
KNOWN_SHIFTS = [
    {"day": 1, "type": "ferie"},
    {"day": 2, "type": "ferie"},
    {"day": 3, "type": "ferie"},
    {"day": 4, "type": "ferie"},
    {"day": 5, "type": "ferie"},
    {"day": 6, "type": "libero"},
    {"day": 7, "type": "mattina"},
    {"day": 8, "type": "giornata"},  # MA+PO
    {"day": 9, "type": "libero"},
    {"day": 10, "type": "notte"},
    {"day": 11, "type": "libero"},
    {"day": 12, "type": "libero"},
    {"day": 13, "type": "libero"},
    {"day": 14, "type": "mattina"},
    {"day": 15, "type": "mattina"},
    {"day": 16, "type": "libero"},
    {"day": 17, "type": "mattina"},
    {"day": 18, "type": "libero"},
    {"day": 19, "type": "pomeriggio"},
    {"day": 20, "type": "libero"},
    {"day": 21, "type": "libero"},
    {"day": 22, "type": "libero"},
    {"day": 23, "type": "libero"},
    {"day": 24, "type": "libero"},
    {"day": 25, "type": "notte"},
    {"day": 26, "type": "libero"},
    {"day": 27, "type": "libero"},
    {"day": 28, "type": "gdg"},
    {"day": 29, "type": "mattina"},
    {"day": 30, "type": "libero"},
]

# NOTE: no sample events are seeded on purpose — the family creates their own
# events through the app. Only the real shift schedule is pre-populated.


def _ensure_family(db) -> None:
    """Enforce exactly the four real family members.

    - Existing rows are renamed in place (ids preserved, so shifts/events stay
      attached to the right person).
    - Stale placeholder members (Pipo/Mimo/Nico from earlier iterations) are
      merged into the real member they map to; their shifts/events are
      re-pointed before the stale row is deleted.
    """
    existing = {m.id: m for m in db.query(FamilyMember).all()}
    by_name = {m.name.lower(): m for m in existing.values()}
    real_names = {info["name"].lower() for info in FAMILY.values()}

    # 1. Merge stale placeholders into their target member, then delete them.
    for stale_name, target_id in STALE_MEMBERS.items():
        stale = by_name.get(stale_name)
        if stale is None or stale.id == target_id or stale.name.lower() in real_names:
            continue
        db.query(DoctorShift).filter(DoctorShift.member_id == stale.id).update(
            {DoctorShift.member_id: target_id}
        )
        db.query(CalendarEvent).filter(CalendarEvent.member_id == stale.id).update(
            {CalendarEvent.member_id: target_id}
        )
        db.delete(stale)
    db.commit()

    # 2. Upsert the canonical four by id.
    for member_id, info in FAMILY.items():
        row = db.get(FamilyMember, member_id)
        if row is None:
            db.add(FamilyMember(id=member_id, **info))
            continue
        updates = {}
        if row.name != info["name"]:
            updates["name"] = info["name"]
        if row.role != info["role"]:
            updates["role"] = info["role"]
        # Avatars/colors are not editable in the UI: enforce the canonical
        # values so migrated databases don't keep mismatched icons.
        if row.avatar != info["avatar"]:
            updates["avatar"] = info["avatar"]
        if row.color != info["color"]:
            updates["color"] = info["color"]
        if bool(row.is_doctor) != info["is_doctor"]:
            updates["is_doctor"] = info["is_doctor"]
        if updates:
            db.query(FamilyMember).filter(FamilyMember.id == member_id).update(updates)
    db.commit()


def ensure_seeded() -> None:
    """Create tables and seed initial data. Safe to call on every startup."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _ensure_family(db)
        doctor_id = next(
            mid for mid, info in FAMILY.items() if info["is_doctor"]
        )

        if db.query(DoctorShift).count() == 0:
            rows = []
            for entry in KNOWN_SHIFTS:
                known = SHIFT_TYPES[entry["type"]]
                rows.append(
                    DoctorShift(
                        member_id=doctor_id,
                        date=date(2026, 9, entry["day"]),
                        shift_type=entry["type"],
                        title=known["title"],
                        start_time=_to_time(known["start"]) if known["start"] else None,
                        end_time=_to_time(known["end"]) if known["end"] else None,
                        is_standby=entry["type"] == "reperibilita",
                        department=known["department"],
                    )
                )
            db.add_all(rows)
            db.commit()
        print("[seed] Database ready: 4 family members and the September 2026 shift schedule.")
    finally:
        db.close()


def _to_time(value: str):
    from datetime import time

    hour, minute = value.split(":")
    return time(int(hour), int(minute))


if __name__ == "__main__":
    ensure_seeded()
