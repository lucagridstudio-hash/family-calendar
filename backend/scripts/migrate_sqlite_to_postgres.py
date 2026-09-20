"""One-way migration: SQLite (source, NEVER modified) → PostgreSQL (destination).

Usage (run from ``backend/``):

    # Test/preparation phase: no INSERTs, destination schema only (FASE 6.1)
    python3 -m scripts.migrate_sqlite_to_postgres \\
        --database-url "postgresql://user:pass@host:5432/dbname" --dry-run

    # Final migration (FASE 6.4-6.5): snapshot + migrate + verify
    python3 -m scripts.migrate_sqlite_to_postgres \\
        --database-url "postgresql://user:pass@host:5432/dbname" --yes

What it does:
  1. Reads the source SQLite with ``mode=ro`` (SQLite refuses writes at driver
     level — the source can never be modified or deleted by this script).
  2. Creates a timestamped snapshot copy next to the source with
     ``sqlite3.backup()`` (snapshot finale, FASE 6.2).
  3. Creates the app tables on PostgreSQL if missing (schema only, never
     DROPs anything).
  4. Migrates ``family_members`` → ``calendar_events`` → ``doctor_shifts``
     preserving IDs and every column of the real schema (FASE 4).
  5. Idempotent: rows already present and identical are skipped; rows present
     with DIFFERENT content abort the run (nothing is overwritten).
  6. Verifies source vs destination: counts, missing IDs and full row content
     (dates, times, notes, categories, member_id, status, ...). Any
     difference makes the script FAIL with exit code 1 (FASE 5).
  7. Resets PostgreSQL id sequences after explicit-ID inserts.

Safety notes:
  - ``--dry-run`` inserts nothing: it only reports what would happen.
  - The destination URL is taken from ``--database-url`` or ``DATABASE_URL``;
    a ``sqlite://`` destination is refused (PostgreSQL only).
  - Before the FINAL run stop the local backend (uvicorn) so no writes happen
    during the copy (freeze delle scritture, FASE 6.3). The old SQLite stays
    on disk untouched as historical copy (FASE 6.6).
"""
from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from datetime import date, datetime, time as time_type
from pathlib import Path

from sqlalchemy import create_engine, inspect, text

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.database import Base  # noqa: E402
from app.models import models  # noqa: E402,F401  (register models on Base)

# Migration order respects foreign keys (member_id → family_members.id).
TABLES = ("family_members", "calendar_events", "doctor_shifts")


def parse_tables(spec: str) -> tuple[str, ...]:
    """Validate a --tables selection. Empty spec → all tables (canonical order)."""
    if not spec.strip():
        return TABLES
    names = {t.strip() for t in spec.split(",") if t.strip()}
    unknown = sorted(n for n in names if n not in TABLES)
    if unknown:
        print(f"ERROR: unknown table(s) {unknown}. Valid tables: {list(TABLES)}")
        raise SystemExit(2)
    selected = tuple(t for t in TABLES if t in names)
    if not selected:
        print("ERROR: empty --tables selection.")
        raise SystemExit(2)
    if "calendar_events" in selected and "family_members" not in selected:
        print("NOTE: events selected without members — the destination must "
              "already contain the referenced family_members rows (FK).")
    return selected


def column_kinds(table: str) -> dict[str, str]:
    """{column_name: date|time|bool|str} derived from the SQLAlchemy models."""
    out: dict[str, str] = {}
    for col in Base.metadata.tables[table].columns:
        py = col.type.__class__.__name__
        if py in ("Date", "DateTime"):
            out[col.name] = "date"
        elif py == "Time":
            out[col.name] = "time"
        elif py == "Boolean":
            out[col.name] = "bool"
        else:
            out[col.name] = "str"
    return out


# ---------------------------------------------------------------------------
# Source (SQLite, read-only)
# ---------------------------------------------------------------------------

def open_source(path: Path) -> sqlite3.Connection:
    if not path.is_file():
        print(f"ERROR: SQLite database not found: {path}")
        print("Run this on the machine holding backend/family_calendar.db, or pass:")
        print("  --sqlite /path/to/family_calendar.db")
        raise SystemExit(2)
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def source_tables(conn: sqlite3.Connection) -> set[str]:
    return {
        r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    }


# ---------------------------------------------------------------------------
# Value conversion SQLite → PostgreSQL and normalization for comparison
# ---------------------------------------------------------------------------

def coerce_for_insert(value, kind: str):
    """Convert raw SQLite values to Python objects matching the model types."""
    if value is None:
        return None
    if kind == "date":
        return value if isinstance(value, date) else date.fromisoformat(str(value))
    if kind == "time":
        if isinstance(value, time_type):
            return value
        # SQLite stores SQLAlchemy Time values as 'HH:MM:SS.ffffff' strings:
        # strip the fractional part BEFORE parsing, otherwise int('00.000000')
        # raises ValueError (bug found by the PostgreSQL E2E test).
        raw = str(value).split(".")[0]
        parts = raw.split(":")
        if len(parts) == 2:
            parts.append("00")
        return time_type(int(parts[0]), int(parts[1]), int(parts[2]))
    if kind == "bool":
        return bool(value)
    return value


def normalize_for_compare(value, kind: str):
    """Normalize both sides to comparable primitives (FASE 5)."""
    if value is None:
        return None
    if kind == "date":
        return value.isoformat() if hasattr(value, "isoformat") else str(value)
    if kind == "time":
        if isinstance(value, time_type):
            return value.isoformat(timespec="seconds")
        raw = str(value).split(".")[0]  # strip 'HH:MM:SS.ffffff' fractional part
        parts = raw.split(":")
        if len(parts) == 2:
            parts.append("00")
        return ":".join(parts[:3])
    if kind == "bool":
        if isinstance(value, (int, bool)):
            return bool(value)
        return str(value).lower() in ("true", "1", "t", "yes")
    return str(value)


# ---------------------------------------------------------------------------
# Destination (PostgreSQL)
# ---------------------------------------------------------------------------

def open_destination(url: str):
    if not url:
        print("ERROR: destination URL missing.")
        print("Pass --database-url or set the DATABASE_URL environment variable.")
        raise SystemExit(2)
    if url.startswith("sqlite"):
        print("ERROR: refusing a SQLite destination.")
        print("This script migrates SQLite → PostgreSQL only (the source stays intact).")
        raise SystemExit(2)
    engine = create_engine(url, pool_pre_ping=True)
    try:
        with engine.connect() as probe:
            probe.execute(text("SELECT 1"))
    except Exception as exc:
        print(f"ERROR: cannot reach destination PostgreSQL: "
              f"{exc.__class__.__name__}: {exc}")
        raise SystemExit(3)
    return engine


# ---------------------------------------------------------------------------
# Migration core
# ---------------------------------------------------------------------------

def read_all_rows(src: sqlite3.Connection, table: str, columns: list[str]) -> list[dict]:
    cols = ", ".join(columns)
    return [dict(r) for r in src.execute(f"SELECT {cols} FROM {table} ORDER BY id")]


def preflight_schema(src: sqlite3.Connection, dest_engine,
                     tables: tuple[str, ...] = TABLES) -> list[str]:
    """Check schema drift. Returns a list of problems (empty = OK)."""
    problems: list[str] = []
    src_tables = source_tables(src)
    insp = inspect(dest_engine)
    dest_tables = set(insp.get_table_names())

    for table in tables:
        if table not in src_tables:
            problems.append(f"source: table '{table}' is missing in SQLite")
            continue
        if table not in dest_tables:
            continue  # create_all will add it
        src_cols = {r[1] for r in src.execute(f"PRAGMA table_info({table})")}
        dest_cols = {c["name"] for c in insp.get_columns(table)}
        extra_src = src_cols - dest_cols
        if extra_src:
            problems.append(
                f"source '{table}' has columns unknown to the app models: "
                f"{sorted(extra_src)} — they would be LOST; extend the models first"
            )
    extra_tables = src_tables - set(TABLES) - {"sqlite_sequence", "sqlite_stat1"}
    if extra_tables:
        print(f"NOTE: extra tables present in SQLite (not migrated): {sorted(extra_tables)}")
    return problems


def ensure_dest_schema(dest_engine, dry_run: bool,
                       tables: tuple[str, ...] = TABLES) -> None:
    missing = [t for t in tables if not inspect(dest_engine).has_table(t)]
    if not missing:
        print("destination schema   : already present")
        return
    if dry_run:
        print(f"[dry-run] would create missing destination tables: {missing}")
        return
    Base.metadata.create_all(
        bind=dest_engine, tables=[Base.metadata.tables[t] for t in missing]
    )
    print(f"created destination tables: {missing}")


def migrate_table(src: sqlite3.Connection, dest, table: str, dry_run: bool) -> dict:
    """Migrate one table. Returns stats; raises SystemExit on conflicts."""
    kinds = column_kinds(table)
    columns = list(kinds.keys())
    rows = read_all_rows(src, table, columns)

    # Existing destination rows keyed by id. Select via the Table object so
    # SQLAlchemy applies its type result-processors (raw text() would return
    # unprocessed driver values, e.g. '18:00:00.000000' strings on SQLite).
    # The destination table may not exist yet (--dry-run does not create it):
    # in that case there is nothing to compare against (E2E-found bug).
    dest_table = Base.metadata.tables[table]
    # ID keys are kept RAW (no int()): real databases may use string IDs —
    # the migration must preserve them exactly as they are.
    existing_rows: dict = {}
    if inspect(dest.engine).has_table(table):
        for row in dest.execute(dest_table.select()):
            mapping = row._mapping
            existing_rows[mapping["id"]] = dict(mapping)

    stats = {"total": len(rows), "inserted": 0, "skipped": 0, "conflicts": []}

    for row in rows:
        rid = row["id"]
        if rid in existing_rows:
            same = all(
                normalize_for_compare(existing_rows[rid][c], kinds[c])
                == normalize_for_compare(coerce_for_insert(row[c], kinds[c]), kinds[c])
                for c in columns
            )
            if same:
                stats["skipped"] += 1
            else:
                stats["conflicts"].append((table, rid))
            continue
        if not dry_run:
            values = {c: coerce_for_insert(row[c], kinds[c]) for c in columns}
            dest.execute(Base.metadata.tables[table].insert().values(**values))
        stats["inserted"] += 1

    if not dry_run and stats["inserted"]:
        dest.commit()
    return stats


def reset_sequences(dest, tables: tuple[str, ...] = TABLES) -> None:
    """Advance PostgreSQL id sequences after explicit-ID inserts."""
    for table in tables:
        try:
            dest.execute(text(
                f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                f"COALESCE((SELECT MAX(id) FROM {table}), 0) + 1, false)"
            ))
        except Exception as exc:  # sequence may not exist (e.g. non-serial PK)
            print(f"NOTE: could not reset sequence for {table}: {exc.__class__.__name__}")
    dest.commit()


# ---------------------------------------------------------------------------
# Verification (FASE 5) — fails on ANY difference
# ---------------------------------------------------------------------------

def verify(src: sqlite3.Connection, dest_engine,
           tables: tuple[str, ...] = TABLES) -> list[str]:
    errors: list[str] = []
    kinds_by_table = {t: column_kinds(t) for t in tables}

    with dest_engine.connect() as dest:
        for table in tables:
            kinds = kinds_by_table[table]
            columns = list(kinds.keys())
            src_rows = {r["id"]: r for r in read_all_rows(src, table, columns)}
            # Select via the Table object so SQLAlchemy applies its type result
            # processors (raw text() would return unprocessed driver values,
            # e.g. '18:00:00.000000' strings on SQLite). ID keys stay RAW
            # (string IDs preserved exactly).
            dest_table = Base.metadata.tables[table]
            dest_rows = {
                r._mapping["id"]: dict(r._mapping)
                for r in dest.execute(dest_table.select())
            }

            src_count, dest_count = len(src_rows), len(dest_rows)
            missing_ids = sorted(set(src_rows) - set(dest_rows))
            extra_ids = sorted(set(dest_rows) - set(src_rows))

            print(f"\n{table}")
            print(f"  SQLite     : {src_count}")
            print(f"  PostgreSQL : {dest_count}")
            print(f"  ID mancanti: {len(missing_ids)}"
                  + (f" {missing_ids[:20]}" if missing_ids else ""))
            if extra_ids:
                print(f"  ID extra in PostgreSQL (preesistenti, non toccati): "
                      f"{extra_ids[:20]}")

            if missing_ids:
                errors.append(f"{table}: missing IDs {missing_ids}")

            differing: list = []
            for rid, srow in src_rows.items():
                drow = dest_rows.get(rid)
                if drow is None:
                    continue
                for col in columns:
                    kind = kinds[col]
                    a = normalize_for_compare(srow[col], kind)
                    b = normalize_for_compare(drow.get(col), kind)
                    if a != b:
                        differing.append(rid)
                        errors.append(
                            f"{table}[{rid}].{col}: "
                            f"SQLite={a!r} PostgreSQL={b!r}"
                        )
                        break
            print(f"  dati differenti: {len(differing)}"
                  + (f" IDs={differing[:20]}" if differing else ""))

    return errors


# ---------------------------------------------------------------------------
# Snapshot (FASE 6.2)
# ---------------------------------------------------------------------------

def snapshot(sqlite_path: Path) -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    snap_path = sqlite_path.parent / f"{sqlite_path.stem}.snapshot-{stamp}.db"
    src = sqlite3.connect(f"file:{sqlite_path}?mode=ro", uri=True)
    try:
        dst = sqlite3.connect(snap_path)
        try:
            src.backup(dst)
        finally:
            dst.close()
    finally:
        src.close()
    return snap_path


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="SQLite → PostgreSQL migration")
    parser.add_argument("--database-url", default=os.environ.get("DATABASE_URL", ""),
                        help="PostgreSQL destination URL (or set DATABASE_URL)")
    parser.add_argument("--sqlite", default="",
                        help="source SQLite path "
                             f"(default: {BACKEND_DIR / 'family_calendar.db'})")
    parser.add_argument("--dry-run", action="store_true",
                        help="test/preparation phase: no INSERTs")
    parser.add_argument("--yes", action="store_true",
                        help="required to perform the real migration")
    parser.add_argument("--tables", default="",
                        help="comma-separated subset of tables to migrate "
                             "(default: all of " + ",".join(TABLES) + ")")
    args = parser.parse_args()

    # Validate the destination BEFORE touching anything (not even a snapshot).
    dest_engine = open_destination(args.database_url)
    sqlite_path = (Path(args.sqlite).resolve() if args.sqlite
                   else BACKEND_DIR / "family_calendar.db")
    src = open_source(sqlite_path)
    tables = parse_tables(args.tables)
    mode = "DRY-RUN (no data writes)" if args.dry_run else "MIGRATION"
    print("=" * 64)
    print(f"SQLite → PostgreSQL migration — {mode}")
    print("=" * 64)
    print(f"source (read-only)  : {sqlite_path}")
    print(f"destination         : "
          f"{dest_engine.url.render_as_string(hide_password=True)}")

    snap_path = snapshot(sqlite_path)
    print(f"snapshot creato     : {snap_path} (sqlite3.backup, sorgente intatta)")

    problems = preflight_schema(src, dest_engine, tables)
    if problems:
        print("\nSCHEMA PROBLEMS — aborting before any change:")
        for p in problems:
            print(f"  - {p}")
        raise SystemExit(4)
    print("schema check        : OK")

    ensure_dest_schema(dest_engine, args.dry_run, tables)

    if not args.dry_run and not args.yes:
        print("\nRefusing to migrate without --yes (safety switch).")
        print("Run first with --dry-run, then add --yes for the real migration.")
        raise SystemExit(5)

    print()
    with dest_engine.connect() as dest:
        for table in tables:
            stats = migrate_table(src, dest, table, args.dry_run)
            label = "would insert" if args.dry_run else "inserted"
            print(
                f"{table:<18}: {stats['total']:>4} rows | {label}: "
                f"{stats['inserted']:<4} | already present (identical): "
                f"{stats['skipped']}"
            )
            if stats["conflicts"]:
                dest.rollback()
                print(f"  CONFLICTS in {table}: {stats['conflicts']}")
                print("  Destination rows differ from source; nothing overwritten.")
                print("  Inspect the destination data, then decide manually.")
                raise SystemExit(6)
        if not args.dry_run:
            reset_sequences(dest, tables)

    print("\n" + "=" * 64)
    print("VERIFICA ANTI-PERDITA (SQLite sorgente vs PostgreSQL)")
    print("=" * 64)
    errors = verify(src, dest_engine, tables)

    print()
    if errors:
        print(f"MIGRAZIONE NON VALIDA: {len(errors)} differenze rilevate:")
        for e in errors[:40]:
            print(f"  - {e}")
        raise SystemExit(1)
    print("Esito: SQLite e PostgreSQL sono coerenti.")
    print("ID mancanti = 0  |  dati differenti = 0")
    if args.dry_run:
        print("\nDRY-RUN completato: nessun dato scritto. Pass successivi:")
        print("  1. ferma il backend locale (freeze scritture)")
        print("  2. riesegui senza --dry-run e con --yes")
    else:
        print("\nMigrazione completata e verificata.")
        print(f"Snapshot storico: {snap_path}")
    print("Il database SQLite sorgente NON è stato modificato.")


if __name__ == "__main__":
    main()
