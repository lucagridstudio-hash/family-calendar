"""Periodic PostgreSQL backup export (FASE 10).

Creates a plain-text SQL dump of the application tables outside the primary
database, so family data survives even a total loss of the managed instance.

Strategy:
  - run it on a schedule (GitHub Actions cron or any
    machine with network access to the database);
  - keep the dumps OUTSIDE the git repository (family data must never be
    committed — the .gitignore already excludes ``*.backup/`` and dumps);
  - push the dump to an external store (S3/B2/Drive) or another machine;
  - PostgreSQL backups depend on the deployment platform and its configured backup policy.

Usage:
  DATABASE_URL="postgresql://..." python3 -m scripts.backup_postgres \\
      --output ~/backups/family_calendar

  # Also upload to S3 (requires AWS credentials in the environment):
  DATABASE_URL="postgresql://..." python3 -m scripts.backup_postgres \\
      --output ~/backups/family_calendar --s3-bucket my-backup-bucket

The script uses ``pg_dump`` when available (full fidelity, includes schema)
and falls back to a pure-Python JSON export of the application tables
(no external tools needed, restore via scripts/restore_postgres.py).
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine, inspect, text

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.models import models  # noqa: E402,F401  (register tables)

TABLES = ("family_members", "calendar_events", "doctor_shifts")


def _stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def dump_with_pg_dump(database_url: str, output_dir: Path) -> Path | None:
    """Full-fidelity dump with pg_dump if the binary is available."""
    if shutil.which("pg_dump") is None:
        return None
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / f"family_calendar-{_stamp()}.sql"
    env = dict(os.environ)
    # pg_dump reads the connection string from the environment.
    env["PGDATABASE"] = ""
    result = subprocess.run(
        ["pg_dump", "--no-owner", "--no-privileges", "--file", str(out_path),
         database_url.replace("postgresql+psycopg2://", "postgresql://")],
        env=env,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"pg_dump failed: {result.stderr.strip()}")
        return None
    return out_path


def dump_as_json(database_url: str, output_dir: Path) -> Path:
    """Pure-Python JSON export of the application tables."""
    engine = create_engine(database_url, pool_pre_ping=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    out_path = output_dir / f"family_calendar-{_stamp()}.json"

    payload: dict = {"exported_at": _stamp(), "tables": {}}
    with engine.connect() as conn:
        for table in TABLES:
            if not inspect(engine).has_table(table):
                payload["tables"][table] = []
                continue
            rows = conn.execute(text(f"SELECT * FROM {table} ORDER BY id"))
            payload["tables"][table] = [
                {k: (v.isoformat() if hasattr(v, "isoformat") else v)
                 for k, v in dict(r._mapping).items()}
                for r in rows
            ]

    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=1),
                        encoding="utf-8")
    return out_path


def upload_to_s3(path: Path, bucket: str) -> bool:
    """Best-effort upload using boto3 if installed and credentials configured."""
    try:
        import boto3  # type: ignore
    except ImportError:
        print("NOTE: boto3 not installed — skipping S3 upload "
              "(pip install boto3 to enable).")
        return False
    try:
        client = boto3.client("s3")
        key = f"family-calendar/{path.name}"
        client.upload_file(str(path), bucket, key)
        print(f"uploaded to s3://{bucket}/{key}")
        return True
    except Exception as exc:  # noqa: BLE001 — backup must not crash silently
        print(f"S3 upload failed: {exc.__class__.__name__}: {exc}")
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="PostgreSQL backup export")
    parser.add_argument("--database-url",
                        default=os.environ.get("DATABASE_URL", ""),
                        help="PostgreSQL URL (or set DATABASE_URL)")
    parser.add_argument("--output", default="~/backups/family_calendar",
                        help="output directory for dumps (default: ~/backups)")
    parser.add_argument("--s3-bucket", default="",
                        help="optional S3 bucket for off-site copy")
    args = parser.parse_args()

    if not args.database_url:
        print("ERROR: DATABASE_URL missing.")
        raise SystemExit(2)

    output_dir = Path(args.output).expanduser()
    out_path = dump_with_pg_dump(args.database_url, output_dir)
    method = "pg_dump (full SQL)"
    if out_path is None:
        out_path = dump_as_json(args.database_url, output_dir)
        method = "JSON export (application tables)"

    size_kb = out_path.stat().st_size / 1024
    print(f"backup ok [{method}]: {out_path} ({size_kb:.1f} KB)")

    if args.s3_bucket:
        upload_to_s3(out_path, args.s3_bucket)

    print("\nKeep this file outside the git repository and sync it to an "
          "external store.")


if __name__ == "__main__":
    main()
