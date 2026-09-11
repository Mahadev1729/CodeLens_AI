import json
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, Iterable, Optional

PERSISTED_SESSION_KEYS: Iterable[str] = (
    "repo_path",
    "repo_name",
    "repo_stats",
    "selected_file",
    "groq_api_key",
    "knowledge_base_built",
    "summary_cache",
    "bug_cache",
    "architecture_cache",
    "readme_cache",
    "selected_model",
)

DEFAULT_STATE_FILE = Path(__file__).resolve(
).parents[1] / ".codementorai_state.json"


def _get_active_username() -> Optional[str]:
    """Retrieves current logged-in username from Streamlit session state if available."""
    try:
        import streamlit as st
        user = st.session_state.get("username")
        if user:
            safe_user = re.sub(r"[^a-zA-Z0-9_.-]", "_", str(user).strip())
            return safe_user if safe_user else None
    except Exception:
        pass
    return None


def get_user_storage_dir(base_dir: Optional[Path | str] = None) -> Optional[Path]:
    """Returns dedicated user storage directory if a user is logged in, else None."""
    username = _get_active_username()
    if not username:
        return None
    root = Path(base_dir) if base_dir else Path(__file__).resolve().parents[1]
    user_dir = root / "user_data" / username
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir


def get_state_file_path(base_dir: Optional[Path | str] = None) -> Path:
    user_dir = get_user_storage_dir(base_dir)
    if user_dir:
        return user_dir / ".codementorai_state.json"
    if base_dir is None:
        return DEFAULT_STATE_FILE
    return Path(base_dir) / ".codementorai_state.json"


def get_chat_history_db_path(base_dir: Optional[Path | str] = None) -> Path:
    user_dir = get_user_storage_dir(base_dir)
    if user_dir:
        return user_dir / "chat_history.db"
    if base_dir is None:
        return Path(__file__).resolve().parents[1] / "chat_history.db"
    return Path(base_dir) / "chat_history.db"


def get_legacy_chat_history_db_path(base_dir: Optional[Path | str] = None) -> Path:
    user_dir = get_user_storage_dir(base_dir)
    if user_dir:
        return user_dir / ".codementorai_chat_history.db"
    if base_dir is None:
        return Path(__file__).resolve().parents[1] / ".codementorai_chat_history.db"
    return Path(base_dir) / ".codementorai_chat_history.db"


def _serialize_sources(sources: Any) -> str:
    if sources is None:
        return "[]"
    return json.dumps(sources, ensure_ascii=False)


def _deserialize_sources(raw: Any) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError):
        return []
    return parsed if isinstance(parsed, list) else []


def load_chat_history(base_dir: Optional[Path | str] = None) -> list[dict[str, Any]]:
    db_path = get_chat_history_db_path(base_dir)
    if not db_path.exists():
        legacy_path = get_legacy_chat_history_db_path(base_dir)
        if legacy_path.exists():
            db_path = legacy_path
    if not db_path.exists():
        return []

    try:
        connection = sqlite3.connect(db_path)
        connection.row_factory = sqlite3.Row
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                sources TEXT DEFAULT '[]',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        rows = connection.execute(
            "SELECT role, content, sources FROM chat_history ORDER BY id ASC"
        ).fetchall()
    except sqlite3.Error:
        return []
    finally:
        connection.close()

    history: list[dict[str, Any]] = []
    for row in rows:
        msg = {"role": row["role"], "content": row["content"]}
        sources = _deserialize_sources(row["sources"])
        if sources:
            msg["sources"] = sources
        history.append(msg)
    return history


def save_chat_history(history: list[dict[str, Any]], base_dir: Optional[Path | str] = None) -> Path:
    db_path = get_chat_history_db_path(base_dir)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(db_path)
    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                sources TEXT DEFAULT '[]',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute("DELETE FROM chat_history")
        for message in history:
            if not isinstance(message, dict):
                continue
            role = str(message.get("role", "user"))
            content = str(message.get("content", ""))
            sources = _serialize_sources(message.get("sources", []))
            connection.execute(
                "INSERT INTO chat_history (role, content, sources) VALUES (?, ?, ?)",
                (role, content, sources),
            )
        connection.commit()
    finally:
        connection.close()

    return db_path


def clear_chat_history(base_dir: Optional[Path | str] = None) -> Path:
    db_path = get_chat_history_db_path(base_dir)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(db_path)
    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                sources TEXT DEFAULT '[]',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute("DELETE FROM chat_history")
        connection.commit()
    finally:
        connection.close()

    return db_path


def load_persisted_session_state(base_dir: Optional[Path | str] = None) -> Dict[str, Any]:
    state_file = get_state_file_path(base_dir)
    if not state_file.exists():
        return {"chat_history": load_chat_history(base_dir)}

    try:
        with state_file.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (json.JSONDecodeError, OSError, ValueError):
        return {"chat_history": load_chat_history(base_dir)}

    if not isinstance(payload, dict):
        return {"chat_history": load_chat_history(base_dir)}

    filtered = {
        key: value for key, value in payload.items() if key in set(PERSISTED_SESSION_KEYS)
    }
    filtered["chat_history"] = load_chat_history(base_dir)
    return filtered


def save_persisted_session_state(session_state: Dict[str, Any], base_dir: Optional[Path | str] = None) -> Path:
    state_file = get_state_file_path(base_dir)
    state_file.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        key: session_state.get(key)
        for key in PERSISTED_SESSION_KEYS
        if key in session_state and session_state.get(key) is not None
    }

    with state_file.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)

    if "chat_history" in session_state:
        save_chat_history(session_state["chat_history"], base_dir)

    return state_file
