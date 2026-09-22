import os
import sys
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Ensure project root is in sys.path
PROJECT_DIR = Path(__file__).resolve().parents[1]
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

from backend.config import CORS_ORIGINS
from backend.database import init_db
from backend.routes.auth_routes import router as auth_router
from backend.routes.repo_routes import router as repo_router
from backend.routes.ai_routes import router as ai_router
from backend.routes.activity_routes import router as activity_router

app = FastAPI(
    title="CodeMentorAI Backend API",
    description="FastAPI backend powering CodeMentorAI with Groq LLMs, FAISS Vector Search, and TiDB/MySQL database",
    version="2.0.0",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    print("[CodeMentorAI] Initializing database...")
    init_db()
    print("[CodeMentorAI] Server startup complete.")


# Register API Routers
app.include_router(auth_router)
app.include_router(repo_router)
app.include_router(ai_router)
app.include_router(activity_router)


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
        # Don't intercept API routes
        if full_path.startswith("api/"):
            return {"error": "Not Found"}
        
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return {"error": "Frontend build not found"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=False)
