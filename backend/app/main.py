import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

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


@app.get("/api/health")
def health():
    return {"message": "Family Calendar API is running"}


WEB_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "dist"))

# Serve the built frontend (dist/) when present (self-hosted production mode).
# The mount is registered LAST so API routes always take precedence.
if os.path.isdir(WEB_DIST):
    app.mount("/", StaticFiles(directory=WEB_DIST, html=True), name="web")
else:

    @app.get("/")
    def read_root():
        return {"message": "Family Calendar API is running"}
