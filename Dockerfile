# Multi-stage Docker build for Family Calendar
# Stage 1: Build frontend with Node (ARM64 compatible)
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy frontend files
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY src ./src
COPY public ./public
COPY index.html ./
COPY scripts ./scripts

# Install dependencies
RUN npm ci

# Build frontend for production
RUN npm run build

# Stage 2: Backend with Python (ARM64 compatible)
FROM python:3.12-slim AS backend-builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy backend files
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/app ./app
COPY backend/scripts ./scripts
COPY backend/tests ./tests

# Stage 3: Final production image
FROM python:3.12-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser:appuser /app
USER appuser

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/dist ./dist

# Copy installed Python dependencies from stage 2
COPY --from=backend-builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=backend-builder /app/app ./app
COPY --from=backend-builder /app/scripts ./scripts
COPY --from=backend-builder /app/tests ./tests

# Copy backend requirements for reference
COPY --from=backend-builder /app/requirements.txt ./

# Expose port
EXPOSE 8000

# Health check using Python standard library (no extra packages needed)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=1)" || exit 1

# Start the application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
