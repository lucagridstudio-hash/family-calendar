"""Migration logic tests: SQLite source → destination, on temporary files.

No real database is touched: both the source and the destination are
disposable SQLite files created inside each test. This exercises the exact
read/convert/insert/verify code path used by
``scripts.migrate_sqlite_to_postgres`` (the PostgreSQL-specific pieces —
sequence reset — are mocked out; the sqlite-destination refusal is a pure
argument check).
"""
import sqlite3
import sys
from datetime import time
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from scripts.migrate_sqlite_to_postgres import (  # noqa: E402
    column_kinds,
    coerce_for_insert,
    migrate_table,
    normalize_for_compare,
    preflight_schema,
    verify,
)
from app.database import Base  # noqa: E402
from app.models import models  # noqa: E402,F401

SCHEMA_SQL = """
CREATE TABLE family_members (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL,
    avatar VARCHAR(16),
    color VARCHAR(16),
    is_doctor BOOLEAN
);
CREATE TABLE calendar_events (
    id INTEGER PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    member_id INTEGER NOT NULL REFERENCES family_members(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(300),
    category VARCHAR(50) NOT NULL,
    notes TEXT,
    is_recurring BOOLEAN,
    recurrence_rule VARCHAR(100)
);
CREATE TABLE doctor_shifts (
    id INTEGER PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES family_members(id),
    date DATE NOT NULL,
    shift_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    start_time TIME,
    end_time TIME,
    department VARCHAR(200),
    is_standby BOOLEAN,
    notes TEXT,
    status VARCHAR(50)
);
"""

MEMBERS_SQL = """
INSERT INTO family_members (id, name, role, avatar, color, is_doctor) VALUES
 (1, 'Luciano', 'father', '👨‍⚕️', '#0284c7', 1),
 (2, 'Giovanna', 'mother', '👩', '#7c3aed', 0),
 (3, 'Luca', 'son', '👦', '#2563eb', 0);
"""

EVENTS_SQL = """
INSERT INTO calendar_events (id, title, member_id, date, start_time, end_time,
    location, category, notes, is_recurring, recurrence_rule) VALUES
 (1, 'Visita dal dentista', 3, '2026-09-15', '17:30', '18:00',
    'Studio Dott. Rossi', 'salute', 'portare tessera sanitaria', 0, NULL),
 (2, 'Cena di compleanno', 1, '2026-09-21', '20:00', '23:00',
    'Casa', 'famiglia', NULL, 0, NULL);
"""

SHIFTS_SQL = """
INSERT INTO doctor_shifts (id, member_id, date, shift_type, title, start_time,
    end_time, department, is_standby, notes, status) VALUES
 (1, 1, '2026-09-07', 'mattina', 'Turno Mattina', '07:30', '14:00',
    "Medicina d'Urgenza", 0, NULL, 'confermato'),
 (2, 1, '2026-09-10', 'notte', 'Turno Notte', '20:00', '08:00',
    'Pronto Soccorso (DEA)', 0, 'chiamata notturna', 'confermato');
"""


@pytest.fixture()
def sqlite_source(tmp_path):
    """Disposable SQLite file with a small realistic dataset (the 'source')."""
    db_path = tmp_path / "source.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # same as scripts.open_source()
    conn.executescript(SCHEMA_SQL)
    conn.execute(MEMBERS_SQL)
    conn.execute(EVENTS_SQL)
    conn.execute(SHIFTS_SQL)
    conn.commit()
    yield conn
    conn.close()


@pytest.fixture()
def dest_engine(tmp_path):
    """Disposable SQLAlchemy engine mirroring the app schema (the 'target')."""
    engine = create_engine(f"sqlite:///{tmp_path / 'dest.db'}")
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


def _migrate_all(src, dest_engine):
    """Run the real migration over all tables (the exact script code path)."""
    with dest_engine.connect() as dest:
        for table in ("family_members", "calendar_events", "doctor_shifts"):
            stats = migrate_table(src, dest, table, dry_run=False)
            assert stats["conflicts"] == []
    return stats


def test_column_kinds_cover_all_app_columns():
    for table in ("family_members", "calendar_events", "doctor_shifts"):
        kinds = column_kinds(table)
        assert kinds["id"] == "str"  # INTEGER columns default to "str" kind
        model_cols = {c.name for c in Base.metadata.tables[table].columns}
        assert set(kinds) == model_cols


def test_full_migration_preserves_ids_and_content(sqlite_source, dest_engine):
    _migrate_all(sqlite_source, dest_engine)
    errors = verify(sqlite_source, dest_engine)
    assert errors == [], errors

    with dest_engine.connect() as dest:
        ev = dest.execute(
            text("SELECT * FROM calendar_events WHERE id = 1")
        ).mappings().one()
        assert ev["title"] == "Visita dal dentista"
        assert str(ev["date"])[:10] == "2026-09-15"
        assert str(ev["start_time"])[:5] == "17:30"
        assert str(ev["end_time"])[:5] == "18:00"
        assert ev["notes"] == "portare tessera sanitaria"

        sh = dest.execute(
            text("SELECT * FROM doctor_shifts WHERE id = 2")
        ).mappings().one()
        assert sh["shift_type"] == "notte"
        assert sh["member_id"] == 1
        assert str(sh["start_time"])[:5] == "20:00"
        assert sh["notes"] == "chiamata notturna"

        members = dest.execute(text("SELECT COUNT(*) FROM family_members")).scalar()
        events = dest.execute(text("SELECT COUNT(*) FROM calendar_events")).scalar()
        shifts = dest.execute(text("SELECT COUNT(*) FROM doctor_shifts")).scalar()
        assert (members, events, shifts) == (3, 2, 2)


def test_migration_is_idempotent(sqlite_source, dest_engine):
    _migrate_all(sqlite_source, dest_engine)
    with dest_engine.connect() as dest:
        rerun = migrate_table(sqlite_source, dest, "calendar_events", dry_run=False)
        assert rerun["inserted"] == 0
        assert rerun["skipped"] == 2
        assert rerun["conflicts"] == []
    assert verify(sqlite_source, dest_engine) == []


def test_migration_fails_on_conflicting_destination_row(sqlite_source, dest_engine):
    _migrate_all(sqlite_source, dest_engine)
    # Tamper with one destination row: verification must catch the difference.
    with dest_engine.connect() as dest:
        dest.execute(text(
            "UPDATE calendar_events SET title = 'Righe corrotto' WHERE id = 2"
        ))
        dest.commit()
    errors = verify(sqlite_source, dest_engine)
    assert any("calendar_events[2].title" in e for e in errors), errors

    # The migration itself refuses to overwrite: re-running reports a conflict.
    with dest_engine.connect() as dest:
        rerun = migrate_table(sqlite_source, dest, "calendar_events", dry_run=False)
        assert rerun["conflicts"] == [("calendar_events", 2)]
        assert rerun["inserted"] == 0


def test_missing_row_is_detected(sqlite_source, dest_engine):
    _migrate_all(sqlite_source, dest_engine)
    with dest_engine.connect() as dest:
        dest.execute(text("DELETE FROM doctor_shifts WHERE id = 2"))
        dest.commit()
    errors = verify(sqlite_source, dest_engine)
    assert any("missing IDs" in e and "[2]" in e for e in errors), errors


def test_dry_run_inserts_nothing(sqlite_source, dest_engine):
    with dest_engine.connect() as dest:
        for table in ("family_members", "calendar_events", "doctor_shifts"):
            stats = migrate_table(sqlite_source, dest, table, dry_run=True)
            assert stats["inserted"] == stats["total"]
            assert stats["skipped"] == 0
    with dest_engine.connect() as dest:
        count = dest.execute(text("SELECT COUNT(*) FROM family_members")).scalar()
    assert count == 0


def test_preflight_detects_unknown_source_columns(sqlite_source, dest_engine):
    sqlite_source.execute(
        "ALTER TABLE calendar_events ADD COLUMN legacy_note TEXT"
    )
    sqlite_source.commit()
    problems = preflight_schema(sqlite_source, dest_engine)
    assert any("legacy_note" in p for p in problems), problems


def test_verify_counts_report_format(sqlite_source, dest_engine, capsys):
    _migrate_all(sqlite_source, dest_engine)
    assert verify(sqlite_source, dest_engine) == []
    out = capsys.readouterr().out
    assert "SQLite     :" in out
    assert "PostgreSQL :" in out
    assert "ID mancanti: 0" in out
    assert "dati differenti: 0" in out


def test_normalize_for_compare_units():
    from datetime import date as date_cls, time as time_cls

    assert normalize_for_compare(date_cls(2026, 9, 15), "date") == "2026-09-15"
    assert normalize_for_compare("2026-09-15", "date") == "2026-09-15"
    assert normalize_for_compare(time_cls(7, 30), "time") == "07:30:00"
    assert normalize_for_compare("07:30", "time") == "07:30:00"
    assert normalize_for_compare(1, "bool") is True
    assert normalize_for_compare("t", "bool") is True
    assert normalize_for_compare("0", "bool") is False
    assert normalize_for_compare(None, "date") is None


def test_coerce_handles_sqlite_microsecond_time_strings(tmp_path):
    """Regression (found by the real-PostgreSQL E2E): SQLAlchemy stores Time
    values on SQLite as 'HH:MM:SS.ffffff' strings. coerce_for_insert must
    parse them instead of crashing on the fractional part."""
    assert coerce_for_insert("07:30:00.000000", "time") == time(7, 30)
    assert coerce_for_insert("20:15:45.123456", "time") == time(20, 15, 45)
    assert coerce_for_insert("07:30", "time") == time(7, 30)

    # Full path: a source DB whose shift times carry microseconds must
    # migrate cleanly (this exact dataset crashed before the fix).
    db_path = tmp_path / "micro.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA_SQL)
    conn.execute(MEMBERS_SQL)
    conn.execute(EVENTS_SQL)
    conn.execute(
        """INSERT INTO doctor_shifts (id, member_id, date, shift_type, title,
            start_time, end_time, department, is_standby, notes, status) VALUES
         (1, 1, '2026-09-07', 'mattina', 'Turno Mattina', '07:30:00.000000',
            '14:00:00.000000', "Medicina d'Urgenza", 0, NULL, 'confermato')"""
    )
    conn.commit()
    engine = create_engine(f"sqlite:///{tmp_path / 'micro-dest.db'}")
    Base.metadata.create_all(bind=engine)
    try:
        with engine.connect() as dest:
            for table in ("family_members", "calendar_events", "doctor_shifts"):
                stats = migrate_table(conn, dest, table, dry_run=False)
                assert stats["conflicts"] == []
            shifts = migrate_table(conn, dest, "doctor_shifts", dry_run=False)
            assert shifts["skipped"] == 1  # idempotent rerun
        assert verify(conn, engine) == []
    finally:
        engine.dispose()
        conn.close()


def test_dry_run_works_when_destination_tables_missing(tmp_path, sqlite_source):
    """Regression (found by the real-PostgreSQL E2E): --dry-run must not
    crash with 'relation ... does not exist' when the destination tables
    have not been created yet (dry-run never creates them)."""
    engine = create_engine(f"sqlite:///{tmp_path / 'empty-dest.db'}")  # no tables
    try:
        with engine.connect() as dest:
            for table in ("family_members", "calendar_events", "doctor_shifts"):
                stats = migrate_table(sqlite_source, dest, table, dry_run=True)
                assert stats["inserted"] == stats["total"]
                assert stats["skipped"] == 0
    finally:
        engine.dispose()
