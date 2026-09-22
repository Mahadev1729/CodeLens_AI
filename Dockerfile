# ==========================================
# Stage 1: Build React Frontend (Vite)
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Python Backend Runtime
# ==========================================
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies (git for repo cloning, build tools, SSL certs)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY backend/ ./backend/
COPY rag/ ./rag/
COPY utils/ ./utils/

# Copy built React frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port (Render automatically maps $PORT)
EXPOSE 8000

# Start FastAPI application
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
