"""AI assistant for the family calendar.

Uses the Gemini API when GEMINI_API_KEY is configured; otherwise falls back to
a deterministic local engine that answers from the same real database data.
Both paths receive the identical JSON context, so answers never contradict the
calendar. The local fallback intentionally avoids inventing information that is
not in the database.
"""
import json
import os
from datetime import date, timedelta

from sqlalchemy.orm import Session

try:  # Optional dependency: only needed when GEMINI_API_KEY is configured.
    from google import genai as google_genai
except ImportError:  # pragma: no cover
    google_genai = None

from app.models.models import CalendarEvent, DoctorShift, FamilyMember

MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

ITALIAN_MONTHS = {
    "gennaio": 1, "febbraio": 2, "marzo": 3, "aprile": 4, "maggio": 5, "giugno": 6,
    "luglio": 7, "agosto": 8, "settembre": 9, "ottobre": 10, "novembre": 11, "dicembre": 12,
}

ITALIAN_DAYS = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"]

SHIFT_WORK_TYPES = {"mattina", "pomeriggio", "notte", "giornata", "psp", "gdg", "reperibilita"}

SYSTEM_PROMPT = """Sei l'assistente del "Calendario Famiglia". Rispondi in italiano, in modo
conciso (massimo 120 parole) e amichevole. Usa SOLO le informazioni presenti nel contesto
JSON (membri della famiglia, turni ospedalieri del medico di famiglia, eventi del calendario). Se la
informazione richiesta non è nel contesto, dillo chiaramente senza inventare dati.
Nomi dei giorni della settimana: lunedì, martedì, mercoledì, giovedì, venerdì, sabato, domenica.
Tipi di turno: mattina (MA), pomeriggio (PO), giornata MA+PO, notte (NO), sala operatoria (PSP),
pronto soccorso (GDG), ferie (FF), libero, smonto, reperibilità."""


def _fmt_time(value) -> str:
    return value.strftime("%H:%M") if value else ""


def build_context(db: Session, today: date, window_days: int = 60) -> dict:
    """Serializable snapshot of the DB used by both the LLM and the local fallback."""
    horizon = today + timedelta(days=window_days)
    window_start = today - timedelta(days=window_days)

    members = [
        {"id": m.id, "name": m.name, "role": m.role, "is_doctor": m.is_doctor}
        for m in db.query(FamilyMember).order_by(FamilyMember.id).all()
    ]

    shifts = [
        {
            "id": s.id,
            "member": next((m["name"] for m in members if m["id"] == s.member_id), "?"),
            "date": s.date.isoformat(),
            "type": s.shift_type,
            "title": s.title,
            "start": _fmt_time(s.start_time),
            "end": _fmt_time(s.end_time),
            "department": s.department or "",
        }
        for s in db.query(DoctorShift)
        .filter(DoctorShift.date >= window_start, DoctorShift.date <= horizon)
        .order_by(DoctorShift.date)
        .all()
    ]

    events = [
        {
            "id": e.id,
            "member": next((m["name"] for m in members if m["id"] == e.member_id), "?"),
            "date": e.date.isoformat(),
            "title": e.title,
            "start": _fmt_time(e.start_time),
            "end": _fmt_time(e.end_time),
            "location": e.location or "",
            "category": e.category,
        }
        for e in db.query(CalendarEvent)
        .filter(CalendarEvent.date >= window_start, CalendarEvent.date <= horizon)
        .order_by(CalendarEvent.date, CalendarEvent.start_time)
        .all()
    ]

    return {"oggi": today.isoformat(), "membri": members, "turni": shifts, "eventi": events}


def _iso_to_human(iso: str) -> str:
    d = date.fromisoformat(iso)
    return f"{ITALIAN_DAYS[d.weekday()]} {d.strftime('%d/%m')}"


def _member_name(ctx: dict, token: str) -> str | None:
    token = token.lower()
    matches = [m for m in ctx["membri"] if token in m["name"].lower()]
    if not matches:
        return None
    # Longest name that matches wins (e.g. "luciano" beats "luca" when both exist).
    return sorted(matches, key=lambda m: -len(m["name"]))[0]["name"]


def _local_answer(query: str, ctx: dict) -> str:
    q = query.lower()
    today = date.fromisoformat(ctx["oggi"])

    # --- Which day is the question about? -------------------------------------
    target = today
    if "ieri" in q:
        target = today - timedelta(days=1)
    elif "domani" in q:
        target = today + timedelta(days=1)
    elif "dopodomani" in q:
        target = today + timedelta(days=2)
    else:
        # "il 9 settembre" / "9/9" / weekday names
        import re

        month_match = None
        for month_name, month_num in ITALIAN_MONTHS.items():
            if month_name in q:
                month_match = month_num
                break
        day_match = re.search(r"\b(\d{1,2})\b", q)
        if month_match and day_match:
            candidate = date(today.year, month_match, int(day_match.group(1)))
            target = candidate
        elif day_match and "gior" not in q:
            # Bare day number: interpret within the current or next month.
            try:
                candidate = date(today.year, today.month, int(day_match.group(1)))
                target = candidate
            except ValueError:
                pass
        else:
            for offset, day_name in enumerate(ITALIAN_DAYS):
                if day_name in q:
                    delta = (offset - today.weekday()) % 7
                    target = today + timedelta(days=delta)
                    break

    target_iso = target.isoformat()
    target_label = _iso_to_human(target_iso)
    is_today = target == today

    shifts_on_target = [s for s in ctx["turni"] if s["date"] == target_iso]
    events_on_target = [e for e in ctx["eventi"] if e["date"] == target_iso]

    # --- Shift-type scan: "notte/ferie/psp..." over the horizon ---------------
    type_keywords = {
        "sala operatoria": "psp",
        "notte": "notte",
        "mattina": "mattina",
        "pomeriggio": "pomeriggio",
        "psp": "psp",
        "gdg": "gdg",
        "ferie": "ferie",
        "reperibil": "reperibilita",
        "libero": "libero",
    }
    asked_type = next((code for key, code in type_keywords.items() if key in q), None)
    week_window = ("settimana" in q) or ("week" in q)
    scan_requested = any(
        w in q for w in ("settimana", "prossim", "questa", "mese", "periodo", "quando", "hai", "ha ")
    )
    if asked_type and scan_requested and not any(d in q for d in ITALIAN_DAYS):
        horizon_date = today + timedelta(days=7 if week_window else 60)
        matches = [
            s for s in ctx["turni"]
            if s["type"] == asked_type
            and today <= date.fromisoformat(s["date"]) <= horizon_date
        ]
        if not matches:
            # Nothing upcoming: report the most recent occurrence in the data.
            past = [s for s in ctx["turni"] if s["type"] == asked_type]
            if past:
                last = max(past, key=lambda s: s["date"])
                time_info = f" ({last['start']}–{last['end']})" if last["start"] else ""
                return (
                    f"Nessun turno di tipo '{asked_type}' da oggi in poi; "
                    f"l'ultimo registrato è {_iso_to_human(last['date'])}: {last['title']}{time_info}."
                )
            return f"Nessun turno di tipo '{asked_type}' presente nel calendario."
        lines = [f"Turni di tipo '{asked_type}' trovati:"]
        for s in matches[:12]:
            time_info = f" ({s['start']}–{s['end']})" if s["start"] else ""
            lines.append(f"• {_iso_to_human(s['date'])}: {s['title']}{time_info}")
        return "\n".join(lines)

    # --- Shift-status questions about a specific person ----------------------
    # Default to the doctor member (hospital shifts belong to them), taken from
    # the real DB context — never a hardcoded name.
    doctor = next((m["name"] for m in ctx["membri"] if m.get("is_doctor")), None)
    name = doctor or (ctx["membri"][0]["name"] if ctx["membri"] else "")
    for m in ctx["membri"]:
        if m["name"].lower() in q and len(m["name"]) >= 3:
            name = m["name"]
            break

    asks_shifts = any(
        w in q for w in ("turno", "lavora", "lavoro", "turni", "reperibil", "notte", "mattina", "pomeriggio", "ferie", "liber", "oper")
    )
    asks_free = any(w in q for w in ("libero", "libera", "liberi", "ferie"))
    asks_events = any(w in q for w in ("impegno", "impegni", "evento", "eventi", "appuntamento", "programma"))

    if asks_shifts or not asks_events:
        person_shifts = [s for s in shifts_on_target if s["member"].lower() == name.lower()]
        if person_shifts:
            parts = []
            for s in person_shifts:
                working = s["type"] in SHIFT_WORK_TYPES
                if working:
                    time_info = f" dalle {s['start']} alle {s['end']}" if s["start"] else ""
                    dept = f" ({s['department']})" if s["department"] else ""
                    parts.append(f"{s['title']}{time_info}{dept}")
                elif s["type"] in ("ferie", "libero"):
                    parts.append("è libero/ferie 🎉")
                elif s["type"] == "smonto":
                    parts.append("smonta la notte (recupero)")
            label = "Oggi" if is_today else target_label.capitalize()
            return f"{label} {name} {parts[0]}." if len(parts) == 1 else (
                f"{label} {name}: " + "; ".join(parts) + "."
            )
        # No shift row for that day at all
        if asks_free:
            label = "Oggi" if is_today else target_label.capitalize()
            return (
                f"Sì: {label} {name} risulta libero (nessun turno registrato in quella data)."
            )
        if not asks_events and any(w in q for w in ("lavora", "turno", "notte", "reperibil", "mattina", "pomeriggio")):
            label = "Oggi" if is_today else target_label.capitalize()
            return (
                f"{label} non risultano turni registrati per {name}: "
                "il giorno è libero o non è ancora stato inserito nel calendario dei turni."
            )

    # --- Family availability --------------------------------------------------
    if any(w in q for w in ("disponibil", "tutti liber", "chi è liber", "chi e liber", "siamo liber")):
        busy = {e["member"] for e in events_on_target}
        free = [m["name"] for m in ctx["membri"] if m["name"] not in busy]
        shift_note = ""
        doctor_shift = [s for s in shifts_on_target if s["type"] in SHIFT_WORK_TYPES]
        if doctor_shift:
            names = ", ".join(sorted({s["member"] for s in doctor_shift}))
            shift_note = f" {names} è in turno ({doctor_shift[0]['title']})."
        if not free:
            return f"{target_label.capitalize()}: nessuno risulta completamente libero{shift_note}"
        return (
            f"{target_label.capitalize()}: liberi {', '.join(free)}.{shift_note}"
            + (f" Impegni in agenda: {len(events_on_target)}." if events_on_target else "")
        )

    # --- Events on a day ------------------------------------------------------
    if asks_events or "sabato" in q or "domenica" in q or "evento" in q:
        if events_on_target:
            lines = [f"{target_label.capitalize()} ({len(events_on_target)} impegni):"]
            for e in events_on_target:
                time_info = f" dalle {e['start']} alle {e['end']}" if e["start"] else ""
                place = f" presso {e['location']}" if e["location"] else ""
                lines.append(f"• {e['title']}{time_info}{place} — {e['member']}")
            return "\n".join(lines)
        return f"Non risultano impegni in calendario per {target_label}."

    # --- Week overview --------------------------------------------------------
    if week_window:
        lines = [f"Turni della settimana ({ctx['oggi']} →):"]
        week_shifts = [s for s in ctx["turni"] if today <= date.fromisoformat(s["date"]) <= today + timedelta(days=6)]
        for s in week_shifts:
            lines.append(f"• {s['date']}: {s['title']}" + (f" ({s['start']}–{s['end']})" if s["start"] else ""))
        if len(lines) == 1:
            lines.append("Nessun turno registrato questa settimana.")
        return "\n".join(lines)

    # --- Generic fallback: honest, data-driven --------------------------------
    total_shifts = len(ctx["turni"])
    total_events = len(ctx["eventi"])
    return (
        f"Ho accesso al calendario reale ({total_shifts} turni e {total_events} impegni nei prossimi giorni). "
        f"Prova a chiedere: \"{name} lavora domani?\", \"Chi è libero venerdì?\", \"Quali impegni ci sono sabato?\" "
        "oppure \"Mostrami i turni della settimana\"."
    )


def _gemini_answer(query: str, ctx: dict) -> str:
    client = google_genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=[
            {
                "role": "user",
                "parts": [
                    {"text": f"CONTESTO CALENDARIO (oggi: {ctx['oggi']}):\n"
                             f"{json.dumps(ctx, ensure_ascii=False, indent=1)}\n\n"
                             f"DOMANDA: {query}"}
                ],
            }
        ],
        config={"system_instruction": SYSTEM_PROMPT},
    )
    return (response.text or "").strip() or "Non ho saputo rispondere, riprova."


def ask_assistant(query: str, db: Session) -> dict:
    ctx = build_context(db, date.today())

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    use_gemini = bool(api_key) and google_genai is not None

    if use_gemini:
        try:
            return {"reply": _gemini_answer(query, ctx), "engine": "gemini", "aiConfigured": True}
        except Exception as exc:  # Key invalid, quota, network... -> graceful degradation
            reply = _local_answer(query, ctx)
            return {
                "reply": reply,
                "engine": "local",
                "aiConfigured": True,
                "warning": f"Gemini non disponibile ({exc.__class__.__name__}): risposta locale dai dati del calendario.",
            }

    reply = _local_answer(query, ctx)
    return {
        "reply": reply,
        "engine": "local",
        "aiConfigured": bool(api_key),  # key set but SDK missing
        "warning": None if api_key else "GEMINI_API_KEY non configurata: rispondo dai dati del calendario.",
    }
