from datetime import date, time

from app.database import SessionLocal
from app.models.models import DoctorShift

db = SessionLocal()

shifts = [
    DoctorShift(
        member_id=1,
        date=date(2026, 9, 8),
        shift_type="mattina",
        title="Turno Mattina Reparto",
        start_time=time(7, 30),
        end_time=time(14, 0),
        department="Medicina d'Urgenza",
        is_standby=False,
        notes=None,
        confidence=100,
        status="confermato",
    ),
    DoctorShift(
        member_id=1,
        date=date(2026, 9, 9),
        shift_type="libero",
        title="Giorno Libero",
        start_time=None,
        end_time=None,
        department=None,
        is_standby=False,
        notes=None,
        confidence=100,
        status="confermato",
    ),
    DoctorShift(
        member_id=1,
        date=date(2026, 9, 10),
        shift_type="notte",
        title="Turno Notte",
        start_time=time(20, 0),
        end_time=time(8, 0),
        department="Pronto Soccorso",
        is_standby=False,
        notes="Termina il giorno successivo",
        confidence=100,
        status="confermato",
    ),
    DoctorShift(
        member_id=1,
        date=date(2026, 9, 11),
        shift_type="reperibilita",
        title="Reperibilità 24h",
        start_time=time(8, 0),
        end_time=time(8, 0),
        department="Trauma Team",
        is_standby=True,
        notes="A chiamata",
        confidence=100,
        status="confermato",
    ),
]

db.add_all(shifts)
db.commit()
db.close()

print("TURNI INSERITI")
