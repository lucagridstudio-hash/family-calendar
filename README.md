# Famiglia Insieme — Family Calendar

Family calendar that manages family events and the hospital shifts of
Luciano, with an AI assistant that answers from real calendar data.

## Architecture

- **Frontend**: React 19 + Vite + Tailwind CSS 4 (`src/`)
- **Backend**: FastAPI + SQLAlchemy (`backend/`)
- **Database**: SQLite for local development, PostgreSQL (Render Managed Postgres or Supabase) in production via `DATABASE_URL`
- **AI**: Gemini (`google-genai`) with a deterministic local fallback that uses
  the same database context — the assistant always answers from real data.

One single Render service serves both the API and the built frontend from the
same origin:

```
https://family-calendar-....onrender.com/          # frontend (dist/)
https://family-calendar-....onrender.com/api/events  # JSON API
https://family-calendar-....onrender.com/health      # liveness probe
https://family-calendar-....onrender.com/health/db   # readiness probe (DB check)
```

## Quick start (local development, SQLite)

```bash
# 1. Frontend deps
bun install            # or npm install

# 2. Backend deps
pip install -r backend/requirements.txt

# 3. Start backend (http://localhost:8000) + frontend (http://localhost:3000) together
bun run dev
```

Or run them separately:

```bash
bun run backend        # FastAPI on :8000 (seeds the DB automatically)
bun run dev:frontend   # Vite on :3000
```

Without `DATABASE_URL` the backend uses the SQLite file
(`backend/family_calendar.db`), created and seeded automatically at first
startup: the four family members (Luciano, Giovanna, Luca, Nicola), Luciano's
known September 2026 shifts and no sample events. To reset it, delete the
file and restart the backend. To seed manually: `bun run seed`.

**Local SQLite is the historical source of truth for the family data. It is
never deleted by any script; production PostgreSQL is filled from it by the
migration described below.**

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Backend (8000) + frontend dev server (3000) together |
| `bun run dev:frontend` | Frontend dev server only (port 3000) |
| `bun run build` | Frontend production build to `dist/` |
| `bun run lint` | TypeScript check (`tsc --noEmit`) |
| `bun run backend` | Backend dev server with reload (port 8000) |
| `bun run backend:start` | Backend server without reload |
| `bun run backend:test` | Backend pytest suite (always on temp SQLite) |
| `bun run seed` | Manual DB seed (idempotent) |
| `bun run db:audit` | Read-only audit of the SQLite DB + backup (sqlite3.backup) |
| `bun run db:migrate:dry-run` | Migration test: no INSERTs, verification only |
| `bun run db:migrate:run` | Real migration SQLite → PostgreSQL (needs `DATABASE_URL`) |
| `bun run db:backup` | PostgreSQL backup export (pg_dump or JSON fallback) |

## Configuration (environment variables)

| Variable | Where | Description |
| --- | --- | --- |
| `DATABASE_URL` | backend env | **Production only.** PostgreSQL URL (`postgresql://user:pass@host:5432/db`). When set, the backend uses PostgreSQL; when unset, SQLite is used. On Render it is injected automatically from the managed database. |
| `FAMILY_CALENDAR_DB` | backend env | Optional SQLite URL override (default `sqlite:///./family_calendar.db`). |
| `GEMINI_API_KEY` | backend env | Optional. Enables Gemini-powered answers; without it the assistant answers from the DB directly. Set it in the Render dashboard, never in the repo. |
| `GEMINI_MODEL` | backend env | Optional. Defaults to `gemini-2.5-flash`. |
| `VITE_API_URL` | frontend env | Optional. Defaults to `/api` (same-origin in production, proxied by Vite in dev). |

`.env.example` documents them; never commit real secrets.

## Frontend ↔ backend communication

- **Development**: Vite dev server on :3000 proxies `/api` → `http://localhost:8000`
  (no CORS issues, no localhost URLs in the code).
- **Production**: the frontend is served by FastAPI itself from `dist/`, so
  the API base is simply `/api` on the same origin. No `localhost`, no
  `127.0.0.1`, no Codespaces URL is ever referenced by the built app.

## API overview

Base URL: `http://localhost:8000` (dev) or the Render domain (production),
with routes mounted at both root and `/api`.

- `GET /health` — liveness probe (no database access)
- `GET /health/db` — readiness probe (checks the configured DB is reachable)
- `GET /members` — family members
- `GET/POST /events`, `PUT/DELETE /events/{id}` — calendar events (JSON)
- `GET/POST /shifts`, `PUT/DELETE /shifts/{id}` — doctor shifts (JSON)
- `POST /ai/chat` — `{ "message": "Luciano lavora domani?" }` → `{ reply, engine, aiConfigured, warning? }`

## Production deploy on Render

The PostgreSQL database is **created manually in the Render dashboard**
(the Blueprint does not create one: `render.yaml` has no `databases:`
block, so Render never spawns a second database).

1. Push this branch to GitHub (Freebuff's Changes panel).
2. Render Dashboard → **New → Blueprint** → select the repository. The
   `render.yaml` creates one Python Web Service `family-calendar` that:
   - installs backend deps + builds the frontend (`npm run build` → `dist/`);
   - starts `uvicorn app.main:app --host 0.0.0.0 --port $PORT`;
   - health check on `/health`.
3. Render asks for `DATABASE_URL` (`sync: false`): paste the **Internal
   Database URL** from the PostgreSQL instance's Connect screen
   (`postgresql://user:pass@dpg-.../family_calendar`). It is stored as a
   secret by Render — never in this repository.
4. (Optional) Add `GEMINI_API_KEY` as a secret env var in the Render dashboard.
5. First deploy runs `ensure_seeded()` on startup: it creates the schema and
   (only if empty) seeds members/shifts.
6. **Run the migration** (below) to fill the production database with the
   real family data from the local SQLite.
7. Deploys are automatic from the configured branch (`autoDeploy: true`):
   set the service to `agent/family-calendar-development` first — `main` may
   still carry the older Integer-ID schema, incompatible with the real
   database. Switch to `main` only after its schema is aligned.

The deploy never uses SQLite: on Render `DATABASE_URL` is always present.

**Internal vs External Database URL** (both on the database's Connect
screen): use the **Internal** URL for the web service's `DATABASE_URL`
(faster, no egress); use the **External** URL (hostname with an extra
region suffix, e.g. `...-a`) when running the migration or a backup from a
machine outside Render, such as Codespaces or your PC.

## Migration SQLite → PostgreSQL (one-way, source untouched)

Run **on the machine that holds the real `backend/family_calendar.db`**
(the file is gitignored, so it is not in this repository).

```bash
cd backend

# 0. Use the EXTERNAL Database URL when running this from outside Render
#    (Codespaces / local PC). Both `postgresql://...` and
#    `postgresql+psycopg2://...` schemes are accepted.

# 1. Audit the source database (read-only) + sqlite3.backup() copy
python3 -m scripts.audit_sqlite

# 2. Preparation/test phase: no INSERTs, destination schema only
DATABASE_URL="postgresql://user:pass@host:5432/db" \
  python3 -m scripts.migrate_sqlite_to_postgres --dry-run
#    (equivalently, from the repo root: npm run db:migrate:dry-run)

# 3. Stop the local backend (freeze writes), then the real migration:
DATABASE_URL="postgresql://user:pass@host:5432/db" \
  python3 -m scripts.migrate_sqlite_to_postgres --yes
#    (equivalently, from the repo root: npm run db:migrate:run)
```

### Migrating a subset of tables

By default all three tables are migrated. To migrate ONLY family members and
calendar events (leaving any pre-existing `doctor_shifts` rows in PostgreSQL
untouched, and never verifying/inserting shifts):

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db" \
  python3 -m scripts.migrate_sqlite_to_postgres --dry-run \
  --tables family_members,calendar_events

DATABASE_URL="postgresql://user:pass@host:5432/db" \
  python3 -m scripts.migrate_sqlite_to_postgres --yes \
  --tables family_members,calendar_events
```

Also point the audit at a specific source file with
`--sqlite /path/to/source.db` (never modified: opened read-only).

The script:

1. opens SQLite with `mode=ro` (the source **cannot** be modified);
2. creates a timestamped snapshot next to the source (`sqlite3.backup()`);
3. creates the tables on PostgreSQL if missing (never drops anything);
4. migrates `family_members` → `calendar_events` → `doctor_shifts`
   preserving IDs and all columns;
5. is idempotent: identical rows are skipped; conflicting rows abort the run
   (nothing is ever overwritten);
6. verifies source vs destination (counts, missing IDs, full row content:
   dates, times, notes, categories, member_id, status, ...). **Any difference
   fails the migration** (exit code 1);
7. resets PostgreSQL id sequences after explicit-ID inserts.

Verification report format:

```
SQLite:
family_members  = 4
calendar_events = 12
doctor_shifts   = 30

PostgreSQL:
family_members  = 4
calendar_events = 12
doctor_shifts   = 30

ID mancanti = 0   |   dati differenti = 0
```

Only a fully coherent result validates the migration. The old SQLite file
stays on disk untouched as historical copy — keep it as a backup.

## Backups (application-level)

- **SQLite (local)**: `bun run db:audit` also creates a `sqlite3.backup()`
  copy next to the source; the migration creates a final snapshot.
- **PostgreSQL (production)**:
  - Render automated backups (platform, base protection);
  - application-level export: `bun run db:backup` (uses `pg_dump` when
    available, otherwise a JSON export of the app tables), optionally pushed
    to S3 with `--s3-bucket`;
  - schedule it (Render Cron Job / GitHub Actions cron / cron on any machine
    that can reach the DB) and keep dumps **outside the repository** — never
    commit family data (`*.db`, `*.sql` and dump directories are gitignored).

## Restore

- **From a pg_dump**: `psql "$DATABASE_URL" -f backup.sql` (drops nothing by
  itself; restore into an empty database to avoid clashes).
- **From a JSON export**: use the migration script pointing
  `--sqlite` at a rebuilt SQLite file, or import with a small script using
  the same `mode=ro` + explicit-ID approach as `migrate_sqlite_to_postgres`.
- **From a SQLite snapshot**: copy the `.db` file back into place and point
  `FAMILY_CALENDAR_DB` at it.

## If the database is unreachable

- The API returns `503` from `GET /health/db` (the frontend keeps working for
  static assets; data screens will show the existing "server unreachable"
  state with a retry button).
- `GET /health` stays `200` as long as the process runs (Render uses it to
  decide restarts, not the DB state).
- Check `DATABASE_URL` in the Render dashboard, the database instance state,
  and network access (Render internal hostname vs public URL). After a
  restore, re-run the anti-loss verification before resuming use.
