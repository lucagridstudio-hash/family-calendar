import os
import sqlite3
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from app.services.shift_parser import parse_shift_image

router = APIRouter(prefix="/shifts", tags=["shifts"])
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "calendar.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS shifts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            shift_type TEXT,
            code TEXT,
            start_time TEXT,
            end_time TEXT,
            notes TEXT,
            doctor TEXT DEFAULT 'ONOFRIO LUCIANO'
        )
    """)
    conn.commit()
    conn.close()

init_db()

class ShiftItem(BaseModel):
    date: str
    shift_type: Optional[str] = ""
    code: Optional[str] = ""
    start_time: Optional[str] = ""
    end_time: Optional[str] = ""
    notes: Optional[str] = ""

@router.post("/preview")
async def preview_shifts(file: UploadFile = File(...)):
    contents = await file.read()
    shifts = parse_shift_image(contents)
    return shifts

@router.post("/batch")
@router.post("/save")
@router.post("")
async def save_shifts(shifts: List[ShiftItem]):
    if not shifts:
        raise HTTPException(status_code=400, detail="Nessun turno inviato per il salvataggio.")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        sample_date = shifts[0].date
        year_month = sample_date[:7]
        
        cursor.execute("DELETE FROM shifts WHERE date LIKE ?", (f"{year_month}%",))
        
        for shift in shifts:
            primary_code = shift.code or shift.shift_type or ""
            cursor.execute("""
                INSERT OR REPLACE INTO shifts (date, shift_type, code, start_time, end_time, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (shift.date, primary_code, primary_code, shift.start_time, shift.end_time, shift.notes))
            
        conn.commit()
        print(f">>> [DB]: Salvati con successo {len(shifts)} turni per il periodo {year_month}")
        return {"status": "success", "message": f"Salvati {len(shifts)} turni con successo."}
    except Exception as e:
        conn.rollback()
        print(f">>> [DB ERRORE]: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("")
async def get_shifts():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT date, shift_type, code, start_time, end_time, notes FROM shifts ORDER BY date ASC")
    rows = cursor.fetchall()
    conn.close()
    
    # Restituiamo una struttura pulita e coerente
    return [
        {
            "date": r[0],
            "shift_type": r[2] or r[1] or "",
            "code": r[2] or r[1] or "",
            "start_time": r[3] or "",
            "end_time": r[4] or "",
            "notes": r[5] or "",
            "department": "Reparto",
            "isStandby": False,
            "timeRange": f"{r[3]} - {r[4]}" if (r[3] and r[4]) else (r[3] or r[4] or "")
        }
        for r in rows
    ]
