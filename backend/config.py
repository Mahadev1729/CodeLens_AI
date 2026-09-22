import os
import re
from urllib.parse import urlparse, parse_qs
from pathlib import Path
from dotenv import load_dotenv

PROJECT_DIR = Path(__file__).resolve().parents[1]

# Load .env file
load_dotenv(dotenv_path=PROJECT_DIR / ".env")

# Handle potential BOM in environment variable keys
def _get_env(key: str, default: str = "") -> str:
    val = os.getenv(key)
    if val is None:
        val = os.getenv(f"\ufeff{key}")
    return val.strip() if val is not None else default

# Database configuration (TiDB / MySQL / SQLite)
DATABASE_URL = _get_env("DATABASE_URL", _get_env("TIDB_DATABASE_URL", ""))

MYSQL_HOST = _get_env("MYSQL_HOST", _get_env("TIDB_HOST", "localhost"))
MYSQL_PORT = int(_get_env("MYSQL_PORT", _get_env("TIDB_PORT", "3306" if "tidb" not in MYSQL_HOST.lower() else "4000")))
MYSQL_USER = _get_env("MYSQL_USER", _get_env("TIDB_USER", "root"))
MYSQL_PASSWORD = _get_env("MYSQL_PASSWORD", _get_env("TIDB_PASSWORD", ""))
MYSQL_DATABASE = _get_env("MYSQL_DATABASE", _get_env("TIDB_DATABASE", "codementorai"))
MYSQL_SSL_CA = _get_env("MYSQL_SSL_CA", _get_env("TIDB_SSL_CA", ""))
MYSQL_USE_SSL = _get_env("MYSQL_USE_SSL", "").lower() in {"true", "1", "yes"} or "tidbcloud.com" in MYSQL_HOST.lower() or "tidb" in MYSQL_HOST.lower()

# Parse DATABASE_URL if provided
if DATABASE_URL:
    try:
        # Normalize protocol if needed
        clean_url = DATABASE_URL
        if clean_url.startswith("mysql+pymysql://"):
            clean_url = "mysql://" + clean_url[len("mysql+pymysql://"):]
        parsed = urlparse(clean_url)
        if parsed.hostname:
            MYSQL_HOST = parsed.hostname
        if parsed.port:
            MYSQL_PORT = parsed.port
        if parsed.username:
            MYSQL_USER = parsed.username
        if parsed.password:
            MYSQL_PASSWORD = parsed.password
        if parsed.path and len(parsed.path) > 1:
            MYSQL_DATABASE = parsed.path.lstrip("/")
        if "ssl" in parsed.query.lower() or "tidb" in MYSQL_HOST.lower():
            MYSQL_USE_SSL = True
    except Exception as e:
        print(f"[Config] Warning: Could not parse DATABASE_URL: {e}")

# Groq and LLM Settings
DEFAULT_GROQ_API_KEY = _get_env("GROQ_API_KEY", "")
DEFAULT_MODEL = _get_env("DEFAULT_MODEL", "openai/gpt-oss-120b")

# Security & Auth Settings
JWT_SECRET_KEY = _get_env("JWT_SECRET_KEY", "codementorai_super_secure_jwt_secret_key_2026_!@#$%")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
GOOGLE_CLIENT_ID = _get_env("GOOGLE_CLIENT_ID", "")

# CORS Allowed Origins
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "*",
]
