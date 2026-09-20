"""FastAPI application: JSON API + optional static frontend hosting.

Production layout (Render, single service, same origin):
  /            -> built React frontend (dist/), with SPA fallback
  /api/...     -> JSON API (same origin, no localhost anywhere)
  /health      -> liveness probe (fast, no database access)
  /health/db   -> readiness probe (verifies the database is reachable)

Development layout (unchanged):
  API at root AND under /api; Vite dev server on :3000 proxies /api -> :8000.
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database import engine
from app.routers import api
from app.seed_data import ensure_seeded


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_seeded()
    yield


app = FastAPI(title="Family Calendar API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The API is exposed at the root (dev default used by the frontend) and under
# /api (used when the built frontend is served by this same server).
app.include_router(api.router)
app.include_router(api.router, prefix="/api")


# ---------------------------------------------------------------------------
# Health checks (Render probes / monitoring)
# ---------------------------------------------------------------------------
@app.get("/health")
@app.get("/api/health")
def health():
    """Liveness probe: simple, fast, no database access, no random data."""
    return {"status": "ok"}


@app.get("/health/db")
@app.get("/api/health/db")
def health_db():
    """Readiness probe: verifies the configured database is really reachable."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": engine.dialect.name}
    except Exception as exc:  # noqa: BLE001 - probe must never raise
        return JSONResponse(
            status_code=503,
            content={"status": "unreachable", "error": exc.__class__.__name__},
        )


WEB_DIST = Path(__file__).resolve().parents[2] / "dist"


class SPAStaticFiles(StaticFiles):
    """StaticFiles with SPA fallback: unknown paths serve index.html.

    API routes are registered before the mount, so they always win; real
    files (assets/*) are served normally; anything else (e.g. a future
    client-side route opened directly) gets the SPA shell.
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._index = self.directory / "index.html" if self.directory else None

    async def get_response(self, path: str, scope):
        # Never SPA-fallback API paths: unknown API endpoints must keep
        # returning a proper 404, not the HTML shell.
        if path == "api" or path.startswith("api/"):
            return await super().get_response(path, scope)
        try:
            response = await super().get_response(path, scope)
        except StarletteHTTPException as exc:
            # StaticFiles RAISES HTTPException(404) for unknown paths:
            # convert it to the SPA shell (index.html).
            if exc.status_code == 404 and self._index and self._index.is_file():
                return FileResponse(self._index)
            raise
        if response.status_code == 404 and self._index and self._index.is_file():
            return FileResponse(self._index)
        return response


# Serve the built frontend (dist/) when present (self-hosted production mode).
# The mount is registered LAST so API routes always take precedence. In this
# mode the frontend talks to the API same-origin under /api — no localhost,
# no Vite dev server, no Codespaces dependency.
if WEB_DIST.is_dir():
    app.mount("/", SPAStaticFiles(directory=WEB_DIST, html=True), name="web")
else:

    @app.get("/")
    def read_root():
        return {"message": "Family Calendar API is running"}
