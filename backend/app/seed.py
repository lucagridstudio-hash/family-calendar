from app.database import SessionLocal
from app.models.models import FamilyMember

db = SessionLocal()

members = [
    FamilyMember(name="Pipo", role="father"),
    FamilyMember(name="Mimo", role="mother"),
    FamilyMember(name="Luca", role="daughter"),
    FamilyMember(name="Nico", role="son"),
]

for member in members:
    db.add(member)

db.commit()
db.close()

print("FAMIGLIA INSERITA")
