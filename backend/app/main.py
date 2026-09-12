from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import shifts

app = FastAPI(title="Family Calendar API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(shifts.router)

@app.get("/")
def read_root():
    return {"message": "Family Calendar API is running"}

@app.get("/members")
def get_members():
    return [
        {"id": 1, "name": "Luciano", "color": "#3b82f6"},
        {"id": 2, "name": "Famiglia", "color": "#10b981"}
    ]

@app.get("/events")
def get_events():
    return []
