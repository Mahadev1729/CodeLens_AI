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


def render_auth_page():
    import streamlit as st
    from utils.helper import load_css
    load_css()

    st.markdown("""
        <div class="auth-header" style="text-align: center; padding: 2.5rem 1rem 1rem; margin-bottom: 1.5rem;">
            <h1 style="background: linear-gradient(90deg, #58a6ff, #bc8cff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 2.2rem; font-weight: 700; margin-bottom: 0.5rem;">🧠 AI Codebase Mentor</h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem;">Sign in to your account or register to access the repository analysis workspace.</p>
        </div>
    """, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 1.8, 1])
    with col2:
        tab_login, tab_register = st.tabs(["🔑 Sign In", "📝 Create Account"])

        # Tab: Sign In
        with tab_login:
            st.markdown("<br>", unsafe_allow_html=True)
            with st.form("login_form", clear_on_submit=False):
                login_user = st.text_input("Username", key="login_username", placeholder="Enter your username")
                login_pass = st.text_input("Password", type="password", key="login_password", placeholder="••••••••")
                submitted = st.form_submit_button("Sign In", use_container_width=True)

                if submitted:
                    success, message = authenticate_user(login_user, login_pass)
                    if success:
                        for k in list(st.session_state.keys()):
                            if k not in ("authenticated", "username"):
                                del st.session_state[k]
                        st.session_state.authenticated = True
                        st.session_state.username = message
                        st.rerun()
                    else:
                        st.error(message)

        # Tab: Register
        with tab_register:
            st.markdown("<br>", unsafe_allow_html=True)
            with st.form("register_form", clear_on_submit=True):
                reg_user = st.text_input("Choose Username", key="reg_username", placeholder="e.g. dev_johndoe")
                reg_pass = st.text_input("Choose Password", type="password", key="reg_password", placeholder="Min 6 characters")
                reg_pass_confirm = st.text_input("Confirm Password", type="password", key="reg_password_confirm", placeholder="••••••••")
                reg_submit = st.form_submit_button("Create Account", use_container_width=True)

                if reg_submit:
                    if reg_pass != reg_pass_confirm:
                        st.error("Passwords do not match.")
                    else:
                        ok, msg = register_user(reg_user, reg_pass)
                        if ok:
                            st.success(f"{msg} You can switch to the Sign In tab to log in.")
                        else:
                            st.error(msg)

