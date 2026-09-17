import json
import re
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

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

DEFAULT_STATE_FILE = Path(__file__).resolve().parents[1] / ".codementorai_state.json"


def _get_active_username(username: Optional[str] = None) -> Optional[str]:
    """Retrieves current logged-in username or sanitizes provided username."""
    if username:
        safe_user = re.sub(r"[^a-zA-Z0-9_.-]", "_", str(username).strip())
        return safe_user if safe_user else None
    try:
        import streamlit as st
        user = st.session_state.get("username")
        if user:
            safe_user = re.sub(r"[^a-zA-Z0-9_.-]", "_", str(user).strip())
            return safe_user if safe_user else None
    except Exception:
        pass
    return None


def get_user_storage_dir(base_dir: Optional[Path | str] = None, username: Optional[str] = None) -> Optional[Path]:
    """Returns dedicated user storage directory if a user is logged in, else None."""
    user = _get_active_username(username)
    if not user:
        return None
    root = Path(base_dir) if base_dir else Path(__file__).resolve().parents[1]
    user_dir = root / "user_data" / user
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir


def get_state_file_path(base_dir: Optional[Path | str] = None, username: Optional[str] = None) -> Path:
    user_dir = get_user_storage_dir(base_dir, username=username)
    if user_dir:
        return user_dir / ".codementorai_state.json"
    if base_dir is None:
        return DEFAULT_STATE_FILE
    return Path(base_dir) / ".codementorai_state.json"


def get_chat_history_db_path(base_dir: Optional[Path | str] = None, username: Optional[str] = None) -> Path:
    user_dir = get_user_storage_dir(base_dir, username=username)
    if user_dir:
        return user_dir / "chat_history.db"
    if base_dir is None:
        return Path(__file__).resolve().parents[1] / "chat_history.db"
    return Path(base_dir) / "chat_history.db"


def get_legacy_chat_history_db_path(base_dir: Optional[Path | str] = None, username: Optional[str] = None) -> Path:
    user_dir = get_user_storage_dir(base_dir, username=username)
    if user_dir:
        return user_dir / ".codementorai_chat_history.db"
    if base_dir is None:
        return Path(__file__).resolve().parents[1] / ".codementorai_chat_history.db"
    return Path(base_dir) / ".codementorai_chat_history.db"


def get_activities_db_path(base_dir: Optional[Path | str] = None, username: Optional[str] = None) -> Path:
    user_dir = get_user_storage_dir(base_dir, username=username)
    if user_dir:
        return user_dir / "activities.db"
    if base_dir is None:
        return Path(__file__).resolve().parents[1] / "activities.db"
    return Path(base_dir) / "activities.db"


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


def load_chat_history(base_dir: Optional[Path | str] = None, username: Optional[str] = None) -> list[dict[str, Any]]:
    db_path = get_chat_history_db_path(base_dir, username=username)
    if not db_path.exists():
        legacy_path = get_legacy_chat_history_db_path(base_dir, username=username)
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
            "SELECT role, content, sources, created_at FROM chat_history ORDER BY id ASC"
        ).fetchall()
    except sqlite3.Error:
        return []
    finally:
        connection.close()

    history: list[dict[str, Any]] = []
    for row in rows:
        msg: dict[str, Any] = {
            "role": row["role"],
            "content": row["content"],
            "timestamp": row["created_at"] if "created_at" in row.keys() else None,
        }
        sources = _deserialize_sources(row["sources"])
        if sources:
            msg["sources"] = sources
        history.append(msg)
    return history


def save_chat_history(history: list[dict[str, Any]], base_dir: Optional[Path | str] = None, username: Optional[str] = None) -> Path:
    db_path = get_chat_history_db_path(base_dir, username=username)
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
            timestamp = message.get("timestamp") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            connection.execute(
                "INSERT INTO chat_history (role, content, sources, created_at) VALUES (?, ?, ?, ?)",
                (role, content, sources, timestamp),
            )
        connection.commit()
    finally:
        connection.close()

    return db_path


def clear_chat_history(base_dir: Optional[Path | str] = None, username: Optional[str] = None) -> Path:
    db_path = get_chat_history_db_path(base_dir, username=username)
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


def init_activities_db(base_dir: Optional[Path | str] = None, username: Optional[str] = None) -> Path:
    """Initializes activities table for the given user."""
    db_path = get_activities_db_path(base_dir, username=username)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(db_path)
    try:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                activity_type TEXT NOT NULL,
                title TEXT NOT NULL,
                details TEXT,
                repo_name TEXT,
                metadata TEXT DEFAULT '{}',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.commit()
    finally:
        connection.close()
    return db_path


def log_user_activity(
    activity_type: str,
    title: str,
    details: Optional[str] = None,
    repo_name: Optional[str] = None,
    metadata: Optional[dict] = None,
    username: Optional[str] = None,
    base_dir: Optional[Path | str] = None,
) -> bool:
    """Logs a user activity event to SQLite database."""
    try:
        db_path = init_activities_db(base_dir, username=username)
        meta_json = json.dumps(metadata or {}, ensure_ascii=False)
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        connection = sqlite3.connect(db_path)
        try:
            connection.execute(
                """
                INSERT INTO activities (activity_type, title, details, repo_name, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (activity_type, title, details, repo_name, meta_json, timestamp),
            )
            connection.commit()
        finally:
            connection.close()
        return True
    except Exception as e:
        print(f"[Persistence] Failed to log activity: {e}")
        return False


def load_user_activities(
    username: Optional[str] = None,
    limit: int = 150,
    activity_type: Optional[str] = None,
    search_query: Optional[str] = None,
    base_dir: Optional[Path | str] = None,
) -> List[Dict[str, Any]]:
    """Loads past user activities sorted in reverse chronological order."""
    db_path = get_activities_db_path(base_dir, username=username)
    if not db_path.exists():
        return []

    try:
        connection = sqlite3.connect(db_path)
        connection.row_factory = sqlite3.Row
        init_activities_db(base_dir, username=username)

        query = "SELECT id, activity_type, title, details, repo_name, metadata, created_at FROM activities WHERE 1=1"
        params: List[Any] = []

        if activity_type and activity_type != "all":
            query += " AND activity_type = ?"
            params.append(activity_type)

        if search_query and search_query.strip():
            sq = f"%{search_query.strip()}%"
            query += " AND (title LIKE ? OR details LIKE ? OR repo_name LIKE ?)"
            params.extend([sq, sq, sq])

        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)

        rows = connection.execute(query, tuple(params)).fetchall()
        activities: List[Dict[str, Any]] = []
        for r in rows:
            meta = {}
            if r["metadata"]:
                try:
                    meta = json.loads(r["metadata"])
                except Exception:
                    meta = {}
            activities.append({
                "id": r["id"],
                "activity_type": r["activity_type"],
                "title": r["title"],
                "details": r["details"],
                "repo_name": r["repo_name"],
                "metadata": meta,
                "timestamp": r["created_at"],
            })
        return activities
    except Exception as e:
        print(f"[Persistence] Failed to load activities: {e}")
        return []
    finally:
        connection.close()


def clear_user_activities(username: Optional[str] = None, base_dir: Optional[Path | str] = None) -> bool:
    """Clears all logged activities for the user."""
    db_path = get_activities_db_path(base_dir, username=username)
    if not db_path.exists():
        return True
    try:
        connection = sqlite3.connect(db_path)
        try:
            connection.execute("DELETE FROM activities")
            connection.commit()
        finally:
            connection.close()
        return True
    except Exception as e:
        print(f"[Persistence] Failed to clear activities: {e}")
        return False


def get_user_stats_summary(username: Optional[str] = None, base_dir: Optional[Path | str] = None) -> Dict[str, Any]:
    """Returns summary statistics of user's past activities and chats."""
    activities = load_user_activities(username=username, limit=1000, base_dir=base_dir)
    chat_history = load_chat_history(base_dir=base_dir, username=username)

    user_questions = [m for m in chat_history if m.get("role") == "user"]
    distinct_repos = set(a.get("repo_name") for a in activities if a.get("repo_name"))
    
    counts_by_type: Dict[str, int] = {}
    for a in activities:
        atype = a.get("activity_type", "other")
        counts_by_type[atype] = counts_by_type.get(atype, 0) + 1

    last_active = activities[0]["timestamp"] if activities else None

    return {
        "total_activities": len(activities),
        "total_questions": len(user_questions),
        "total_messages": len(chat_history),
        "distinct_repos_count": len(distinct_repos),
        "distinct_repos": list(distinct_repos),
        "counts_by_type": counts_by_type,
        "last_active": last_active,
    }


def load_persisted_session_state(base_dir: Optional[Path | str] = None, username: Optional[str] = None) -> Dict[str, Any]:
    state_file = get_state_file_path(base_dir, username=username)
    chat_hist = load_chat_history(base_dir, username=username)

    if not state_file.exists():
        return {"chat_history": chat_hist}

    try:
        with state_file.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (json.JSONDecodeError, OSError, ValueError):
        return {"chat_history": chat_hist}

    if not isinstance(payload, dict):
        return {"chat_history": chat_hist}

    filtered = {
        key: value for key, value in payload.items() if key in set(PERSISTED_SESSION_KEYS)
    }
    filtered["chat_history"] = chat_hist
    return filtered


def save_persisted_session_state(session_state: Dict[str, Any], base_dir: Optional[Path | str] = None, username: Optional[str] = None) -> Path:
    state_file = get_state_file_path(base_dir, username=username)
    state_file.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        key: session_state.get(key)
        for key in PERSISTED_SESSION_KEYS
        if key in session_state and session_state.get(key) is not None
    }

    with state_file.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)

    if "chat_history" in session_state and session_state["chat_history"] is not None:
        save_chat_history(session_state["chat_history"], base_dir, username=username)

    return state_file
