import hashlib
import os
import re
import secrets
import sqlite3
from pathlib import Path
from typing import Optional, Tuple

DB_PATH = Path(__file__).resolve().parents[1] / "users.db"


def get_db_connection(db_path: Optional[Path] = None) -> sqlite3.Connection:
    target_path = db_path or DB_PATH
    conn = sqlite3.connect(str(target_path), timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(db_path: Optional[Path] = None) -> None:
    """Initializes the SQLite database and creates the users table if it does not exist."""
    conn = get_db_connection(db_path)
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
    finally:
        conn.close()


def hash_password(password: str, salt: Optional[bytes] = None) -> Tuple[str, str]:
    """Hashes a password using PBKDF2-HMAC-SHA256 with a unique cryptographic salt."""
    if salt is None:
        salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return key.hex(), salt.hex()


def verify_password(password: str, password_hash: str, salt_hex: str) -> bool:
    """Verifies a password against the stored hash and salt."""
    try:
        salt = bytes.fromhex(salt_hex)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return secrets.compare_digest(key.hex(), password_hash)
    except Exception:
        return False


def register_user(username: str, password: str, db_path: Optional[Path] = None) -> Tuple[bool, str]:
    """
    Registers a new user with validation.
    Returns:
        (True, "Success message") or (False, "Error message")
    """
    init_db(db_path)

    username = username.strip()
    if not username:
        return False, "Username cannot be empty."

    if len(username) < 3 or len(username) > 30:
        return False, "Username must be between 3 and 30 characters."

    if not re.match(r"^[a-zA-Z0-9_.-]+$", username):
        return False, "Username can only contain letters, numbers, dots, hyphens, and underscores."

    if len(password) < 6:
        return False, "Password must be at least 6 characters long."

    pwd_hash, salt_hex = hash_password(password)

    conn = get_db_connection(db_path)
    try:
        with conn:
            conn.execute(
                "INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)",
                (username, pwd_hash, salt_hex),
            )
        return True, "Account registered successfully! You can now log in."
    except sqlite3.IntegrityError:
        return False, f"Username '{username}' is already taken."
    except Exception as e:
        return False, f"Registration failed: {str(e)}"
    finally:
        conn.close()


def authenticate_user(username: str, password: str, db_path: Optional[Path] = None) -> Tuple[bool, str]:
    """
    Validates user credentials against SQLite database.
    Returns:
        (True, original_username) or (False, "Error message")
    """
    init_db(db_path)

    username = username.strip()
    if not username or not password:
        return False, "Please enter both username and password."

    conn = get_db_connection(db_path)
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT username, password_hash, salt FROM users WHERE username = ?",
            (username,),
        )
        row = cursor.fetchone()
        if not row:
            return False, "Invalid username or password."

        stored_username = row["username"]
        stored_hash = row["password_hash"]
        stored_salt = row["salt"]

        if verify_password(password, stored_hash, stored_salt):
            return True, stored_username
        return False, "Invalid username or password."
    except Exception as e:
        return False, f"Authentication error: {str(e)}"
    finally:
        conn.close()
