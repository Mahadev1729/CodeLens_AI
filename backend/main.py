import os
import sys
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Ensure single-threaded execution for ML/OpenMP runtimes to prevent segfaults and OOM crashes
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

# Ensure project root is in sys.path
PROJECT_DIR = Path(__file__).resolve().parents[1]
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

import asyncio
from contextlib import asynccontextmanager

from backend.config import CORS_ORIGINS
from backend.database import init_db
from backend.routes.auth_routes import router as auth_router
from backend.routes.repo_routes import router as repo_router
from backend.routes.ai_routes import router as ai_router
from backend.routes.activity_routes import router as activity_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Non-blocking background database initialization so port binds immediately
    print("[CodeMentorAI] Server startup: scheduling background database initialization...")
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, init_db)
    yield
    print("[CodeMentorAI] Server shutting down...")


app = FastAPI(
    title="CodeMentorAI Backend API",
    description="FastAPI backend powering CodeMentorAI with Groq LLMs, FAISS Vector Search, and TiDB/MySQL database",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register API Routers
app.include_router(auth_router)
app.include_router(repo_router)
app.include_router(ai_router)
app.include_router(activity_router)


@app.get("/health")
@app.get("/api/health")
def health_check():
    from backend.database import DB_ENGINE
    return {
        "status": "ok",
        "service": "CodeMentorAI Backend API",
        "database_engine": DB_ENGINE,
    }


# Serve React Frontend in Production (Render / Docker)
FRONTEND_DIST = PROJECT_DIR / "frontend" / "dist"
if not FRONTEND_DIST.exists():
    FRONTEND_DIST = PROJECT_DIR / "static_dist"

if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        # Don't intercept API routes, health, docs, or openapi
        if full_path in ("health", "api/health", "docs", "openapi.json", "redoc") or full_path.startswith("api/"):
            return {"error": "Not Found"}
        
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"error": "Frontend build not found"}
else:
    @app.get("/")
    def root():
        return {
            "status": "ok",
            "service": "CodeMentorAI Backend API",
            "message": "Backend is running. In production, the React frontend is served here.",
        }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
