"""JSON CRUD API for members, events and shifts + AI assistant endpoint."""
from datetime import date, datetime, time

from fastapi import APIRouter, Depends, FastAPI, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.ai import ask_assistant
from app.database import get_db
from app.models.models import CalendarEvent, DoctorShift, FamilyMember
from app.shift_types import SHIFT_TYPES

router = APIRouter()


def _parse_time(value: str | None) -> time | None:
    if value in (None, ""):
        return None
    value = value.strip()
    try:
        return datetime.strptime(value, "%H:%M:%S").time()
    except ValueError:
        return datetime.strptime(value, "%H:%M").time()


# ---------------------------------------------------------------------------
# Members
# ---------------------------------------------------------------------------

class MemberIn(BaseModel):
    name: str = Field(min_length=1)
    role: str = Field(min_length=1)
    avatar: str = "👤"
    color: str = "#0ea5e9"
    is_doctor: bool = False


@router.get("/members")
def get_members(db: Session = Depends(get_db)):
    return db.query(FamilyMember).order_by(FamilyMember.id).all()


@router.post("/members")
def create_member(member: MemberIn, db: Session = Depends(get_db)):
    row = FamilyMember(**member.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/members/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db)):
    row = db.get(FamilyMember, member_id)
    if not row:
        raise HTTPException(status_code=404, detail="Membro non trovato")
    has_events = (
        db.query(CalendarEvent).filter(CalendarEvent.member_id == member_id).first()
        or db.query(DoctorShift).filter(DoctorShift.member_id == member_id).first()
    )
    if has_events:
        raise HTTPException(status_code=409, detail="Il membro ha eventi o turni associati")
    db.delete(row)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------

class EventIn(BaseModel):
    title: str = Field(min_length=1)
    memberId: int
    date: str
    startTime: str
    endTime: str
    category: str = "famiglia"
    location: str | None = None
    notes: str | None = None
    isRecurring: bool = False
    recurrenceRule: str | None = None


class EventUpdate(BaseModel):
    title: str | None = None
    memberId: int | None = None
    date: str | None = None
    startTime: str | None = None
    endTime: str | None = None
    category: str | None = None
    location: str | None = None
    notes: str | None = None
    isRecurring: bool | None = None
    recurrenceRule: str | None = None


def _parse_date(value: str) -> date:
    return datetime.strptime(value.strip(), "%Y-%m-%d").date()


@router.get("/events")
def get_events(db: Session = Depends(get_db)):
    return db.query(CalendarEvent).order_by(CalendarEvent.date, CalendarEvent.start_time).all()


@router.post("/events", status_code=201)
def create_event(event: EventIn, db: Session = Depends(get_db)):
    if not db.get(FamilyMember, event.memberId):
        raise HTTPException(status_code=400, detail="Membro inesistente")
    row = CalendarEvent(
        title=event.title,
        member_id=event.memberId,
        date=_parse_date(event.date),
        start_time=_parse_time(event.startTime),
        end_time=_parse_time(event.endTime),
        category=event.category,
        location=event.location,
        notes=event.notes,
        is_recurring=event.isRecurring,
        recurrence_rule=event.recurrenceRule,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/events/{event_id}")
def update_event(event_id: int, payload: EventUpdate, db: Session = Depends(get_db)):
    row = db.get(CalendarEvent, event_id)
    if not row:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    data = payload.model_dump(exclude_unset=True)
    if "memberId" in data:
        if not db.get(FamilyMember, data["memberId"]):
            raise HTTPException(status_code=400, detail="Membro inesistente")
        row.member_id = data.pop("memberId")
    for field in ("title", "category", "location", "notes", "isRecurring", "recurrenceRule"):
        if field in data:
            setattr(row, "is_recurring" if field == "isRecurring" else field, data.pop(field))
    if "date" in data:
        row.date = _parse_date(data.pop("date"))
    if "startTime" in data:
        row.start_time = _parse_time(data.pop("startTime"))
    if "endTime" in data:
        row.end_time = _parse_time(data.pop("endTime"))
    db.commit()
    db.refresh(row)
    return row


@router.delete("/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    row = db.get(CalendarEvent, event_id)
    if not row:
        raise HTTPException(status_code=404, detail="Evento non trovato")
    db.delete(row)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Shifts
# ---------------------------------------------------------------------------

# Meaning of the hospital shift codes lives in app/shift_types.py.
VALID_SHIFT_TYPES = set(SHIFT_TYPES)


class ShiftIn(BaseModel):
    memberId: int = 1
    date: str
    shiftType: str
    startTime: str | None = None
    endTime: str | None = None
    department: str | None = None
    isStandby: bool = False
    notes: str | None = None
    status: str = "confermato"


def _apply_shift_defaults(row: DoctorShift, data: dict) -> None:
    known = SHIFT_TYPES.get(data["shiftType"])
    if known is None:
        raise HTTPException(status_code=400, detail=f"Tipo turno non valido: {data['shiftType']}")
    row.shift_type = data["shiftType"]
    row.title = data.get("title") or known["title"]
    row.start_time = _parse_time(data.get("startTime")) or _parse_time(known["start"])
    row.end_time = _parse_time(data.get("endTime")) or _parse_time(known["end"])
    row.department = data.get("department") or known["department"]
    row.is_standby = bool(data.get("isStandby", data["shiftType"] == "reperibilita"))
    if data.get("notes") is not None:
        row.notes = data["notes"]
    if data.get("status") is not None:
        row.status = data["status"]


@router.get("/shifts")
def get_shifts(db: Session = Depends(get_db)):
    return db.query(DoctorShift).order_by(DoctorShift.date, DoctorShift.start_time).all()


@router.post("/shifts", status_code=201)
def create_shift(shift: ShiftIn, db: Session = Depends(get_db)):
    if not db.get(FamilyMember, shift.memberId):
        raise HTTPException(status_code=400, detail="Membro inesistente")
    row = DoctorShift(member_id=shift.memberId, date=_parse_date(shift.date))
    _apply_shift_defaults(row, shift.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.put("/shifts/{shift_id}")
def update_shift(shift_id: int, payload: ShiftIn, db: Session = Depends(get_db)):
    row = db.get(DoctorShift, shift_id)
    if not row:
        raise HTTPException(status_code=404, detail="Turno non trovato")
    data = payload.model_dump(exclude_unset=False)
    data["shiftType"] = payload.shiftType
    _apply_shift_defaults(row, data)
    row.date = _parse_date(payload.date)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/shifts/{shift_id}")
def delete_shift(shift_id: int, db: Session = Depends(get_db)):
    row = db.get(DoctorShift, shift_id)
    if not row:
        raise HTTPException(status_code=404, detail="Turno non trovato")
    db.delete(row)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# AI assistant
# ---------------------------------------------------------------------------

class ChatIn(BaseModel):
    message: str = Field(min_length=1)


@router.post("/ai/chat")
def ai_chat(payload: ChatIn, db: Session = Depends(get_db)):
    return jsonable_encoder(ask_assistant(payload.message, db))
