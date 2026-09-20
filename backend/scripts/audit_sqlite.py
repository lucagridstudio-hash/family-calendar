"""READ-ONLY audit of the real SQLite database + safe backup.

Never writes to the source database:
  - opens the SQLite file with ``mode=ro`` (SQLite refuses writes at driver level);
  - the backup is produced with ``sqlite3.backup()`` (consistent copy, source untouched).

Reports (FASE 1):
  - record counts per table (family_members, calendar_events, doctor_shifts);
  - full ID lists for events, shifts and members;
  - min/max dates for events and shifts;
  - duplicate checks (per-table duplicate IDs, duplicate member names,
    duplicate event (date, start_time, member_id), duplicate shift (date, member_id));
  - simple anomaly checks (events pointing to missing members, NULL titles,
    end_time < start_time, empty member table).

Usage:
  cd backend && python3 -m scripts.audit_sqlite [path/to/family_calendar.db]

Default database path: ``backend/family_calendar.db`` (override with the
``FAMILY_CALENDAR_DB`` environment variable or the first CLI argument).
"""
import os
import sqlite3
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]

TABLES = ("family_members", "calendar_events", "doctor_shifts")


def _resolve_db_path(argv: list[str]) -> Path:
    if len(argv) > 1:
        return Path(argv[1]).resolve()
    env = os.environ.get("FAMILY_CALENDAR_DB", "")
    if env.startswith("sqlite:///"):
        return Path(env.replace("sqlite:///", "", 1)).resolve()
    default = BACKEND_DIR / "family_calendar.db"
    return default.resolve()


def open_readonly(db_path: Path) -> sqlite3.Connection:
    if not db_path.is_file():
        print(f"ERROR: database not found: {db_path}")
        print("This workspace does not contain the SQLite file (it is gitignored).")
        print("Run this script on the machine that has the real database,")
        print("or point it at a backup copy with:")
        print("  python3 -m scripts.audit_sqlite /path/to/family_calendar.db")
        raise SystemExit(2)
    uri = f"file:{db_path}?mode=ro"
    return sqlite3.connect(uri, uri=True)


def _ids(conn: sqlite3.Connection, table: str) -> list[int]:
    return [row[0] for row in conn.execute(f"SELECT id FROM {table} ORDER BY id")]


def _dupes(conn: sqlite3.Connection, sql: str) -> list[tuple]:
    return conn.execute(sql).fetchall()


def audit(conn: sqlite3.Connection) -> None:
    existing = {
        row[0]
        for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    }

    print("=" * 62)
    print("SQLITE DATABASE AUDIT (read-only)")
    print("=" * 62)

    counts: dict[str, int] = {}
    for table in TABLES:
        if table not in existing:
            counts[table] = 0
            print(f"{table:<20}: TABLE MISSING")
            continue
        counts[table] = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        print(f"{table:<20}: {counts[table]}")

    members_ids = _ids(conn, "family_members") if "family_members" in existing else []
    events_ids = _ids(conn, "calendar_events") if "calendar_events" in existing else []
    shifts_ids = _ids(conn, "doctor_shifts") if "doctor_shifts" in existing else []

    print(f"\nfamily_members IDs   : {members_ids}")
    print(f"calendar_events IDs  : {events_ids}")
    print(f"doctor_shifts IDs    : {shifts_ids}")

    # ------------------------------------------------------------------
    # Date ranges
    # ------------------------------------------------------------------
    print("\nDate ranges")
    print("-" * 62)
    if "calendar_events" in existing and counts["calendar_events"]:
        row = conn.execute(
            "SELECT MIN(date), MAX(date) FROM calendar_events"
        ).fetchone()
        print(f"calendar_events dates: min={row[0]}  max={row[1]}")
    else:
        print("calendar_events dates: (no rows)")
    if "doctor_shifts" in existing and counts["doctor_shifts"]:
        row = conn.execute(
            "SELECT MIN(date), MAX(date) FROM doctor_shifts"
        ).fetchone()
        print(f"doctor_shifts dates  : min={row[0]}  max={row[1]}")
    else:
        print("doctor_shifts dates  : (no rows)")

    # ------------------------------------------------------------------
    # Duplicates
    # ------------------------------------------------------------------
    print("\nDuplicate checks")
    print("-" * 62)
    problems: list[str] = []

    for table in TABLES:
        if table not in existing:
            continue
        dupes = _dupes(
            conn,
            f"SELECT id, COUNT(*) c FROM {table} GROUP BY id HAVING c > 1",
        )
        if dupes:
            problems.append(f"{table}: duplicate IDs {dupes}")
    print(f"duplicate IDs        : {'NONE' if not problems else problems}")

    if "family_members" in existing:
        dup_names = _dupes(
            conn,
            "SELECT name, COUNT(*) c FROM family_members GROUP BY name HAVING c > 1",
        )
        print(f"duplicate names      : {dup_names if dup_names else 'NONE'}")
        if dup_names:
            problems.append(f"family_members duplicate names: {dup_names}")

    if "calendar_events" in existing:
        dup_events = _dupes(
            conn,
            """SELECT member_id, date, start_time, COUNT(*) c
                 FROM calendar_events GROUP BY member_id, date, start_time
                 HAVING c > 1""",
        )
        print(f"dup event (m,date,t) : {dup_events if dup_events else 'NONE'}")
        if dup_events:
            problems.append(f"calendar_events duplicate rows: {dup_events}")

    if "doctor_shifts" in existing:
        dup_shifts = _dupes(
            conn,
            """SELECT member_id, date, COUNT(*) c
                 FROM doctor_shifts GROUP BY member_id, date HAVING c > 1""",
        )
        print(f"dup shift (m,date)   : {dup_shifts if dup_shifts else 'NONE'}")
        if dup_shifts:
            problems.append(f"doctor_shifts duplicate rows: {dup_shifts}")

    # ------------------------------------------------------------------
    # Anomalies
    # ------------------------------------------------------------------
    print("\nAnomaly checks")
    print("-" * 62)
    if "family_members" in existing and "calendar_events" in existing:
        orphan_events = conn.execute(
            """SELECT e.id FROM calendar_events e
                 LEFT JOIN family_members m ON m.id = e.member_id
                 WHERE m.id IS NULL"""
        ).fetchall()
        print(f"orphan events        : {orphan_events if orphan_events else 'NONE'}")
        if orphan_events:
            problems.append(f"orphan events (no member): {orphan_events}")

    if "family_members" in existing and "doctor_shifts" in existing:
        orphan_shifts = conn.execute(
            """SELECT s.id FROM doctor_shifts s
                 LEFT JOIN family_members m ON m.id = s.member_id
                 WHERE m.id IS NULL"""
        ).fetchall()
        print(f"orphan shifts        : {orphan_shifts if orphan_shifts else 'NONE'}")
        if orphan_shifts:
            problems.append(f"orphan shifts (no member): {orphan_shifts}")

    if "calendar_events" in existing:
        bad_times = conn.execute(
            """SELECT id, start_time, end_time FROM calendar_events
                 WHERE start_time IS NOT NULL AND end_time IS NOT NULL
                   AND end_time < start_time"""
        ).fetchall()
        print(f"end < start events   : {bad_times if bad_times else 'NONE'}")
        if bad_times:
            problems.append(f"events with end_time < start_time: {bad_times}")

        null_titles = conn.execute(
            "SELECT id FROM calendar_events WHERE title IS NULL OR TRIM(title) = ''"
        ).fetchall()
        print(f"empty titles         : {null_titles if null_titles else 'NONE'}")
        if null_titles:
            problems.append(f"events with empty title: {null_titles}")

    print("\n" + "=" * 62)
    if problems:
        print(f"AUDIT RESULT: {len(problems)} problem(s) found")
        for p in problems:
            print(f"  - {p}")
    else:
        print("AUDIT RESULT: OK — no duplicates, no anomalies detected")
    print("=" * 62)


def backup(conn: sqlite3.Connection, source_path: Path) -> Path:
    backup_path = source_path.parent / f"{source_path.stem}.backup-{_stamp()}.db"
    dst = sqlite3.connect(backup_path)
    try:
        conn.backup(dst)
    finally:
        dst.close()
    return backup_path


def _stamp() -> str:
    from datetime import datetime

    return datetime.now().strftime("%Y%m%d-%H%M%S")


def main() -> None:
    db_path = _resolve_db_path(sys.argv)
    conn = open_readonly(db_path)
    try:
        print(f"Source DB (READ-ONLY): {db_path}")
        audit(conn)
        backup_path = backup(conn, db_path)
        print(f"\nBackup created with sqlite3.backup(): {backup_path}")
        print("The source database was NOT modified.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
