from datetime import date, time

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import CalendarEvent, DoctorShift, FamilyMember

router = APIRouter()


@router.get("/members")
def get_members(db: Session = Depends(get_db)):
    return db.query(FamilyMember).all()


@router.post("/members")
def create_member(
    name: str,
    role: str,
    db: Session = Depends(get_db),
):
    member = FamilyMember(name=name, role=role)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.get("/events")
def get_events(db: Session = Depends(get_db)):
    return db.query(CalendarEvent).all()


@router.post("/events")
def create_event(
    title: str,
    member_id: int,
    event_date: date,
    start_time: time,
    end_time: time,
    category: str,
    location: str | None = None,
    notes: str | None = None,
    db: Session = Depends(get_db),
):
    event = CalendarEvent(
        title=title,
        member_id=member_id,
        date=event_date,
        start_time=start_time,
        end_time=end_time,
        category=category,
        location=location,
        notes=notes,
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return event


@router.get("/shifts")
def get_shifts(db: Session = Depends(get_db)):
    return db.query(DoctorShift).all()


@router.post("/shifts")
def create_shift(
    member_id: int,
    shift_date: date,
    shift_type: str,
    title: str,
    start_time: time | None = None,
    end_time: time | None = None,
    department: str | None = None,
    is_standby: bool = False,
    notes: str | None = None,
    confidence: int | None = None,
    status: str = "confermato",
    db: Session = Depends(get_db),
):
    shift = DoctorShift(
        member_id=member_id,
        date=shift_date,
        shift_type=shift_type,
        title=title,
        start_time=start_time,
        end_time=end_time,
        department=department,
        is_standby=is_standby,
        notes=notes,
        confidence=confidence,
        status=status,
    )

    db.add(shift)
    db.commit()
    db.refresh(shift)

    return shift
