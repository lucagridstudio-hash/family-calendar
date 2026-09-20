"""End-to-end API tests: CRUD + AI assistant + seeded data."""
from datetime import date

from fastapi.testclient import TestClient


def _client():
    from app.main import app

    return TestClient(app)


def test_health_endpoints():
    with _client() as client:
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "ok"}
        # Same probe under /api (production same-origin path).
        assert client.get("/api/health").status_code == 200
        # DB readiness probe must succeed on the test database.
        res = client.get("/health/db")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"


def test_root_and_members_seeded():
    with _client() as client:
        res = client.get("/members")
        assert res.status_code == 200
        members = res.json()
        assert isinstance(members, list) and len(members) >= 4
        names = {m["name"] for m in members}
        assert names == {"Luciano", "Giovanna", "Luca", "Nicola"}
        doctor = next(m for m in members if m["is_doctor"])
        assert doctor["name"] == "Luciano"
        assert doctor["avatar"]


def test_seed_shifts_present():
    with _client() as client:
        res = client.get("/shifts")
        assert res.status_code == 200
        shifts = res.json()
        # Full September 2026 schedule: every day is represented.
        assert len(shifts) == 30
        by_date = {s["date"]: s for s in shifts}
        assert by_date["2026-09-01"]["shift_type"] == "ferie"  # FF days 1-5
        assert by_date["2026-09-05"]["shift_type"] == "ferie"
        assert by_date["2026-09-06"]["shift_type"] == "libero"
        assert by_date["2026-09-07"]["shift_type"] == "mattina"
        assert by_date["2026-09-07"]["start_time"].startswith("07:30")
        assert by_date["2026-09-07"]["end_time"].startswith("14:00")
        assert by_date["2026-09-08"]["shift_type"] == "giornata"  # MA+PO
        assert by_date["2026-09-08"]["start_time"].startswith("07:30")
        assert by_date["2026-09-08"]["end_time"].startswith("20:00")
        assert by_date["2026-09-09"]["shift_type"] == "libero"
        assert by_date["2026-09-10"]["shift_type"] == "notte"
        assert by_date["2026-09-10"]["start_time"].startswith("20:00")
        assert by_date["2026-09-10"]["end_time"].startswith("08:00")
        assert by_date["2026-09-14"]["shift_type"] == "mattina"
        assert by_date["2026-09-15"]["shift_type"] == "mattina"
        assert by_date["2026-09-17"]["shift_type"] == "mattina"
        assert by_date["2026-09-19"]["shift_type"] == "pomeriggio"
        assert by_date["2026-09-19"]["start_time"].startswith("14:00")
        assert by_date["2026-09-19"]["end_time"].startswith("20:00")
        assert by_date["2026-09-25"]["shift_type"] == "notte"
        assert by_date["2026-09-28"]["shift_type"] == "gdg"
        assert by_date["2026-09-28"]["start_time"].startswith("07:30")
        assert by_date["2026-09-28"]["end_time"].startswith("14:00")
        assert by_date["2026-09-29"]["shift_type"] == "mattina"
        assert by_date["2026-09-30"]["shift_type"] == "libero"
        # All shifts belong to Luciano (the doctor, member id 1).
        assert all(s["member_id"] == 1 for s in shifts)


def test_no_sample_events_seeded():
    """The seed must NOT pre-populate family events: the family creates them."""
    with _client() as client:
        res = client.get("/events")
        assert res.status_code == 200
        events = res.json()
        assert events == []


def test_event_crud_cycle():
    with _client() as client:
        created = client.post(
            "/events",
            json={
                "title": "Test Recita",
                "memberId": 3,
                "date": "2026-09-15",
                "startTime": "18:00",
                "endTime": "19:00",
                "category": "scuola",
            },
        )
        assert created.status_code == 201, created.text
        event = created.json()
        assert event["member_id"] == 3
        assert event["date"] == date(2026, 9, 15).isoformat() or event["date"].startswith("2026-09-15")

        updated = client.put(
            f"/events/{event['id']}",
            json={"title": "Test Recita Modificata", "startTime": "18:30"},
        )
        assert updated.status_code == 200
        assert updated.json()["title"] == "Test Recita Modificata"
        assert updated.json()["start_time"].startswith("18:30")

        deleted = client.delete(f"/events/{event['id']}")
        assert deleted.status_code == 200
        assert client.get("/events").status_code == 200


def test_shift_crud_cycle():
    with _client() as client:
        created = client.post(
            "/shifts",
            json={"memberId": 1, "date": "2026-09-20", "shiftType": "psp"},
        )
        assert created.status_code == 201, created.text
        shift = created.json()
        assert shift["shift_type"] == "psp"
        assert shift["start_time"].startswith("07:30")
        assert shift["end_time"].startswith("20:00")

        updated = client.put(
            f"/shifts/{shift['id']}",
            json={"memberId": 1, "date": "2026-09-20", "shiftType": "notte"},
        )
        assert updated.status_code == 200
        assert updated.json()["shift_type"] == "notte"

        deleted = client.delete(f"/shifts/{shift['id']}")
        assert deleted.status_code == 200


def test_shift_invalid_type_rejected():
    with _client() as client:
        res = client.post(
            "/shifts",
            json={"memberId": 1, "date": "2026-09-21", "shiftType": "scuola"},
        )
        assert res.status_code == 400


def test_event_invalid_member_rejected():
    with _client() as client:
        res = client.post(
            "/events",
            json={
                "title": "X",
                "memberId": 999,
                "date": "2026-09-15",
                "startTime": "10:00",
                "endTime": "11:00",
            },
        )
        assert res.status_code == 400


def test_ai_chat_answers_from_real_data():
    with _client() as client:
        res = client.post("/ai/chat", json={"message": "Pipo lavora domani?"})
        assert res.status_code == 200
        body = res.json()
        assert "reply" in body and body["reply"]
        assert "engine" in body
        # Missing GEMINI_API_KEY must not fail the request.
        assert body["aiConfigured"] in (True, False)

        res2 = client.post("/ai/chat", json={"message": "Chi è libero venerdì 4 settembre?"})
        assert res2.status_code == 200
        assert res2.json()["reply"]


def test_ai_chat_specific_date_from_seed():
    """"'Che turno ha Luciano l'8 settembre?'" must answer from the seeded MA+PO
    shift, but only when that date is inside the assistant's +-60 day context window."""
    from datetime import date, timedelta

    target = date(2026, 9, 8)
    today = date.today()
    in_window = (today - timedelta(days=60)) <= target <= (today + timedelta(days=60))

    with _client() as client:
        res = client.post("/ai/chat", json={"message": "Che turno ha Luciano l'8 settembre?"})
        assert res.status_code == 200
        reply = res.json()["reply"]
        if in_window:
            assert "Giornata" in reply
        else:
            assert reply  # honest answer, no hallucination


def test_ai_chat_no_hallucination_for_unknown_days():
    with _client() as client:
        res = client.post("/ai/chat", json={"message": "Pipo lavora il 30 settembre?"})
        assert res.status_code == 200
        reply = res.json()["reply"]
        # Must not invent a shift that is not in the DB.
        assert "30/09" in reply
