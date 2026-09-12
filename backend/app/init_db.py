from app.database import Base, engine
from app.models.models import CalendarEvent, DoctorShift, FamilyMember

Base.metadata.create_all(bind=engine)

print("DATABASE OK")
