# Famiglia Insieme — Family Calendar

Family calendar that manages family events and the hospital shifts of
Luciano, with an AI assistant that answers from real calendar data.

## Architecture

- **Frontend**: React 19 + Vite + Tailwind CSS 4 (`src/`)
- **Backend**: FastAPI + SQLAlchemy + SQLite (`backend/`)
- **AI**: Gemini (`google-genai`) with a deterministic local fallback that uses
  the same database context — the assistant always answers from real data.

## Quick start

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

The SQLite database (`backend/family_calendar.db`) is created and seeded
automatically at first startup: the four family members (Luciano, Giovanna,
Luca, Nicola), Luciano's known September 2026 shifts and sample family
events. To reset it, delete the file and restart the backend. To seed
manually: `bun run seed`.

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Backend (8000) + frontend dev server (3000) together |
| `bun run dev:frontend` | Frontend dev server only (port 3000) |
| `bun run build` | Frontend production build to `dist/` |
| `bun run lint` | TypeScript check (`tsc --noEmit`) |
| `bun run backend` | Backend dev server with reload (port 8000) |
| `bun run backend:start` | Backend server without reload |
| `bun run backend:test` | Backend pytest suite |
| `bun run seed` | Manual DB seed (idempotent) |

## Configuration

| Variable | Where | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | backend env | Optional. Enables Gemini-powered answers; without it the assistant answers from the DB directly. |
| `GEMINI_MODEL` | backend env | Optional. Defaults to `gemini-2.5-flash`. |
| `FAMILY_CALENDAR_DB` | backend env | Optional SQLite URL override. |
| `VITE_API_URL` | frontend env | Optional. Backend URL (defaults to `http://localhost:8000` in dev, same-origin in production). |

## Shift codes (hospital sheet legend)

| Code | Meaning | Time |
| --- | --- | --- |
| MA | Mattina | 07:30–14:00 |
| PO | Pomeriggio | 14:00–20:00 |
| MA+PO | Giornata | 07:30–20:00 |
| NO | Notte | 20:00–08:00 |
| PSP | Sala operatoria | 07:30–20:00 |
| GDG | Pronto soccorso | 07:30–14:00 |
| FF | Ferie | — |
| $ | Libero | — |

## API overview

Base URL: `http://localhost:8000` (dev).

- `GET /members` — family members
- `GET/POST /events`, `PUT/DELETE /events/{id}` — calendar events (JSON)
- `GET/POST /shifts`, `PUT/DELETE /shifts/{id}` — doctor shifts (JSON)
- `POST /ai/chat` — `{ "message": "Luciano lavora domani?" }` → `{ reply, engine, aiConfigured, warning? }`

In production, the backend serves the built frontend from `dist/` when present
(API also available under the `/api` prefix in that mode).

## Tests

```bash
bun run backend:test   # FastAPI TestClient suite (CRUD, seeding, AI)
bun run lint           # frontend type check
bun run build          # frontend production build
```
