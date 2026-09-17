#!/bin/sh
# Starts the FastAPI backend (port 8000, background) and the Vite frontend
# (foreground on $PORT or 3000). Used by `bun run dev:all` and the preview.
set -e

cd "$(dirname "$0")/.."

if [ ! -d node_modules ]; then
  echo "[dev] Installing frontend dependencies..."
  bun install || npm install
fi

if ! python3 -c "import fastapi" 2>/dev/null; then
  echo "[dev] Installing backend dependencies..."
  pip install -r backend/requirements.txt
fi

echo "[dev] Starting backend on :8000"
(cd backend && exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000) &

echo "[dev] Starting frontend on :${PORT:-3000}"
PORT="${PORT:-3000}" exec npx vite --port "${PORT:-3000}" --host 0.0.0.0 --strictPort
