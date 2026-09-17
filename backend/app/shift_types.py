"""Canonical shift types with defaults, matching the hospital shift legend:

Codice → Significato → Tipo turno
FF → Ferie → assenza (nessun orario)
$ → Libero → libero (nessun orario)
MA → Mattina → 07:30-14:00
PO → Pomeriggio → 14:00-20:00
NO → Notte → 20:00-08:00
MA+PO → Giornata completa → 07:30-20:00
PSP/PSp → Sala operatoria → giornata completa (07:30-20:00)
GDG/GDg → Pronto Soccorso → mattina (07:30-14:00)
"""

SHIFT_TYPES = {
    "mattina": {
        "label": "Mattina",
        "start": "07:30",
        "end": "14:00",
        "title": "Turno Mattina",
        "department": "Medicina d'Urgenza",
    },
    "pomeriggio": {
        "label": "Pomeriggio",
        "start": "14:00",
        "end": "20:00",
        "title": "Turno Pomeriggio",
        "department": "Medicina d'Urgenza",
    },
    "notte": {
        "label": "Notte",
        "start": "20:00",
        "end": "08:00",
        "title": "Turno Notte",
        "department": "Pronto Soccorso (DEA)",
    },
    "giornata": {
        "label": "MA+PO Giornata",
        "start": "07:30",
        "end": "20:00",
        "title": "Giornata (MA+PO)",
        "department": "Medicina d'Urgenza",
    },
    "ferie": {"label": "FF Ferie", "start": None, "end": None, "title": "Ferie (assenza)", "department": "Ferie"},
    "psp": {
        "label": "PSP Sala Operatoria",
        "start": "07:30",
        "end": "20:00",
        "title": "Sala Operatoria (PSP)",
        "department": "Sala Operatoria",
    },
    "gdg": {
        "label": "GDG Pronto Soccorso",
        "start": "07:30",
        "end": "14:00",
        "title": "Pronto Soccorso (GDG)",
        "department": "Pronto Soccorso",
    },
    "smonto": {
        "label": "Smonto Notte",
        "start": None,
        "end": None,
        "title": "Smonto Notte (Recupero)",
        "department": "Recupero Notte",
    },
    "reperibilita": {
        "label": "Reperibilità 24h",
        "start": "08:00",
        "end": "08:00",
        "title": "Reperibilità 24h",
        "department": "Trauma Team",
    },
    "libero": {"label": "Libero", "start": None, "end": None, "title": "Giorno Libero", "department": "—"},
}

VALID_SHIFT_TYPES = set(SHIFT_TYPES)
