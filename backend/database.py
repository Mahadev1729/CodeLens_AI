import json
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path
from backend.config import (
    MYSQL_HOST,
    MYSQL_PORT,
    MYSQL_USER,
    MYSQL_PASSWORD,
    MYSQL_DATABASE,
    MYSQL_SSL_CA,
    MYSQL_USE_SSL,
    PROJECT_DIR,
)

# Global flag to track active engine and database
DB_ENGINE = "sqlite"  # 'mysql' or 'sqlite'
ACTIVE_MYSQL_DATABASE = MYSQL_DATABASE or "test"
SQLITE_DB_PATH = PROJECT_DIR / "app_database.db"


def _build_mysql_kwargs(database_name: Optional[str] = None, with_database: bool = True) -> dict:
    kwargs = {
        "host": MYSQL_HOST,
        "port": MYSQL_PORT,
        "user": MYSQL_USER,
        "password": MYSQL_PASSWORD,
        "connection_timeout": 8,
    }
    if with_database:
        db = database_name if database_name is not None else ACTIVE_MYSQL_DATABASE
        if db:
            kwargs["database"] = db

    if MYSQL_USE_SSL:
        kwargs["ssl_disabled"] = False
        kwargs["ssl_verify_identity"] = False
        if MYSQL_SSL_CA and Path(MYSQL_SSL_CA).exists():
            kwargs["ssl_ca"] = MYSQL_SSL_CA
    return kwargs


def _test_and_init_mysql() -> bool:
    global DB_ENGINE, ACTIVE_MYSQL_DATABASE
    try:
        import mysql.connector

        db_conn = None
        target_dbs = [MYSQL_DATABASE, "test"] if MYSQL_DATABASE and MYSQL_DATABASE != "test" else ["test", MYSQL_DATABASE]
        # Filter unique non-empty databases
        target_dbs = [d for i, d in enumerate(target_dbs) if d and d not in target_dbs[:i]]

        # 1. Try connecting directly to candidate databases
        for db_name in target_dbs:
            try:
                db_conn = mysql.connector.connect(**_build_mysql_kwargs(database_name=db_name))
                ACTIVE_MYSQL_DATABASE = db_name
                break
            except Exception as e:
                print(f"[Database] Could not connect directly to database '{db_name}': {e}")

        # 2. If direct database connections failed, try connecting without DB and creating it
        if db_conn is None:
            try:
                server_conn = mysql.connector.connect(**_build_mysql_kwargs(database_name=""))
                cursor = server_conn.cursor()
                target_db = MYSQL_DATABASE or "test"
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{target_db}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
                cursor.close()
                server_conn.close()
                db_conn = mysql.connector.connect(**_build_mysql_kwargs(database_name=target_db))
                ACTIVE_MYSQL_DATABASE = target_db
            except Exception as e:
                print(f"[Database] Could not create target database: {e}")
                raise e

        cur = db_conn.cursor()

        # Create Tables
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                salt VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL,
                repo_name VARCHAR(255) DEFAULT '',
                role VARCHAR(50) NOT NULL,
                content MEDIUMTEXT NOT NULL,
                sources JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS activities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL,
                activity_type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                details MEDIUMTEXT,
                repo_name VARCHAR(255),
                metadata_json JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                username VARCHAR(100) PRIMARY KEY,
                repo_path VARCHAR(500),
                repo_name VARCHAR(255),
                repo_stats JSON,
                selected_model VARCHAR(100),
                groq_api_key VARCHAR(255),
                knowledge_base_built BOOLEAN DEFAULT FALSE,
                summary_cache MEDIUMTEXT,
                bug_cache MEDIUMTEXT,
                architecture_cache MEDIUMTEXT,
                readme_cache MEDIUMTEXT,
                selected_file VARCHAR(500),
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        db_conn.commit()
        cur.close()
        db_conn.close()

        DB_ENGINE = "mysql"
        print(f"[Database] Successfully connected to TiDB / MySQL database '{ACTIVE_MYSQL_DATABASE}' at {MYSQL_HOST}:{MYSQL_PORT}")
        return True
    except Exception as e:
        print(f"[Database] TiDB / MySQL connection/initialization error: {e}. Falling back to SQLite.")
        DB_ENGINE = "sqlite"
        return False


def _init_sqlite():
    conn = sqlite3.connect(str(SQLITE_DB_PATH))
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
            conn.execute("""
                CREATE TABLE IF NOT EXISTS chat_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    repo_name TEXT DEFAULT '',
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    sources TEXT DEFAULT '[]',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS activities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    activity_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    details TEXT,
                    repo_name TEXT,
                    metadata_json TEXT DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_sessions (
                    username TEXT PRIMARY KEY,
                    repo_path TEXT,
                    repo_name TEXT,
                    repo_stats TEXT,
                    selected_model TEXT,
                    groq_api_key TEXT,
                    knowledge_base_built INTEGER DEFAULT 0,
                    summary_cache TEXT,
                    bug_cache TEXT,
                    architecture_cache TEXT,
                    readme_cache TEXT,
                    selected_file TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
        print(f"[Database] SQLite database initialized at {SQLITE_DB_PATH}")
    finally:
        conn.close()


def init_db():
    if not _test_and_init_mysql():
        _init_sqlite()


def get_mysql_connection():
    import mysql.connector
    return mysql.connector.connect(**_build_mysql_kwargs(with_database=True))


def get_sqlite_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(SQLITE_DB_PATH), timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


# --- DB Abstraction Functions ---

def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    init_db()
    if DB_ENGINE == "mysql":
        conn = get_mysql_connection()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("SELECT * FROM users WHERE LOWER(username) = LOWER(%s) LIMIT 1", (username.strip(),))
            row = cur.fetchone()
            return dict(row) if row else None
        finally:
            cur.close()
            conn.close()
    else:
        conn = get_sqlite_connection()
        try:
            row = conn.execute("SELECT * FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1", (username.strip(),)).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()


def create_user(username: str, password_hash: str, salt: str) -> bool:
    init_db()
    if DB_ENGINE == "mysql":
        conn = get_mysql_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "INSERT INTO users (username, password_hash, salt) VALUES (%s, %s, %s)",
                (username.strip(), password_hash, salt),
            )
            conn.commit()
            return True
        finally:
            cur.close()
            conn.close()
    else:
        conn = get_sqlite_connection()
        try:
            with conn:
                conn.execute(
                    "INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)",
                    (username.strip(), password_hash, salt),
                )
            return True
        finally:
            conn.close()


def save_chat_message(username: str, role: str, content: str, sources: Optional[List[str]] = None, repo_name: str = "") -> int:
    init_db()
    sources_json = json.dumps(sources or [], ensure_ascii=False)
    if DB_ENGINE == "mysql":
        conn = get_mysql_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                "INSERT INTO chat_history (username, repo_name, role, content, sources) VALUES (%s, %s, %s, %s, %s)",
                (username, repo_name or "", role, content, sources_json),
            )
            conn.commit()
            return cur.lastrowid
        finally:
            cur.close()
            conn.close()
    else:
        conn = get_sqlite_connection()
        try:
            with conn:
                cur = conn.execute(
                    "INSERT INTO chat_history (username, repo_name, role, content, sources) VALUES (?, ?, ?, ?, ?)",
                    (username, repo_name or "", role, content, sources_json),
                )
                return cur.lastrowid
        finally:
            conn.close()


def get_chat_history_db(username: str, repo_name: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
    init_db()
    if DB_ENGINE == "mysql":
        conn = get_mysql_connection()
        cur = conn.cursor(dictionary=True)
        try:
            if repo_name:
                cur.execute(
                    "SELECT id, role, content, sources, created_at, repo_name FROM chat_history WHERE username = %s AND (repo_name = %s OR repo_name = '') ORDER BY id ASC LIMIT %s",
                    (username, repo_name, limit),
                )
            else:
                cur.execute(
                    "SELECT id, role, content, sources, created_at, repo_name FROM chat_history WHERE username = %s ORDER BY id ASC LIMIT %s",
                    (username, limit),
                )
            rows = cur.fetchall()
            results = []
            for r in rows:
                src = r["sources"]
                if isinstance(src, str):
                    try:
                        src = json.loads(src)
                    except Exception:
                        src = []
                results.append({
                    "id": r["id"],
                    "role": r["role"],
                    "content": r["content"],
                    "sources": src or [],
                    "repo_name": r.get("repo_name", ""),
                    "timestamp": str(r["created_at"]),
                })
            return results
        finally:
            cur.close()
            conn.close()
    else:
        conn = get_sqlite_connection()
        try:
            if repo_name:
                rows = conn.execute(
                    "SELECT id, role, content, sources, created_at, repo_name FROM chat_history WHERE username = ? AND (repo_name = ? OR repo_name = '') ORDER BY id ASC LIMIT ?",
                    (username, repo_name, limit),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT id, role, content, sources, created_at, repo_name FROM chat_history WHERE username = ? ORDER BY id ASC LIMIT ?",
                    (username, limit),
                ).fetchall()
            results = []
            for r in rows:
                try:
                    src = json.loads(r["sources"]) if r["sources"] else []
                except Exception:
                    src = []
                results.append({
                    "id": r["id"],
                    "role": r["role"],
                    "content": r["content"],
                    "sources": src,
                    "repo_name": r["repo_name"] if "repo_name" in r.keys() else "",
                    "timestamp": str(r["created_at"]),
                })
            return results
        finally:
            conn.close()


def clear_user_chat_history(username: str, repo_name: Optional[str] = None) -> bool:
    init_db()
    if DB_ENGINE == "mysql":
        conn = get_mysql_connection()
        cur = conn.cursor()
        try:
            if repo_name:
                cur.execute("DELETE FROM chat_history WHERE username = %s AND (repo_name = %s OR repo_name = '')", (username, repo_name))
            else:
                cur.execute("DELETE FROM chat_history WHERE username = %s", (username,))
            conn.commit()
            return True
        finally:
            cur.close()
            conn.close()
    else:
        conn = get_sqlite_connection()
        try:
            with conn:
                if repo_name:
                    conn.execute("DELETE FROM chat_history WHERE username = ? AND (repo_name = ? OR repo_name = '')", (username, repo_name))
                else:
                    conn.execute("DELETE FROM chat_history WHERE username = ?", (username,))
            return True
        finally:
            conn.close()


def log_activity_db(
    username: str,
    activity_type: str,
    title: str,
    details: Optional[str] = None,
    repo_name: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> bool:
    init_db()
    meta_json = json.dumps(metadata or {}, ensure_ascii=False)
    if DB_ENGINE == "mysql":
        conn = get_mysql_connection()
        cur = conn.cursor()
        try:
            cur.execute(
                """
                INSERT INTO activities (username, activity_type, title, details, repo_name, metadata_json)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (username, activity_type, title, details, repo_name, meta_json),
            )
            conn.commit()
            return True
        except Exception as e:
            print(f"[DB] Log activity error: {e}")
            return False
        finally:
            cur.close()
            conn.close()
    else:
        conn = get_sqlite_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO activities (username, activity_type, title, details, repo_name, metadata_json)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (username, activity_type, title, details, repo_name, meta_json),
                )
            return True
        except Exception as e:
            print(f"[DB] Log activity error: {e}")
            return False
        finally:
            conn.close()


def get_user_activities_db(
    username: str,
    limit: int = 150,
    activity_type: Optional[str] = None,
    search_query: Optional[str] = None,
) -> List[Dict[str, Any]]:
    init_db()
    if DB_ENGINE == "mysql":
        conn = get_mysql_connection()
        cur = conn.cursor(dictionary=True)
        try:
            query = "SELECT id, activity_type, title, details, repo_name, metadata_json, created_at FROM activities WHERE username = %s"
            params: List[Any] = [username]

            if activity_type and activity_type != "all":
                query += " AND activity_type = %s"
                params.append(activity_type)

            if search_query and search_query.strip():
                sq = f"%{search_query.strip()}%"
                query += " AND (title LIKE %s OR details LIKE %s OR repo_name LIKE %s)"
                params.extend([sq, sq, sq])

            query += " ORDER BY id DESC LIMIT %s"
            params.append(limit)

            cur.execute(query, tuple(params))
            rows = cur.fetchall()
            results = []
            for r in rows:
                meta = r["metadata_json"]
                if isinstance(meta, str):
                    try:
                        meta = json.loads(meta)
                    except Exception:
                        meta = {}
                results.append({
                    "id": r["id"],
                    "activity_type": r["activity_type"],
                    "title": r["title"],
                    "details": r["details"],
                    "repo_name": r["repo_name"],
                    "metadata": meta or {},
                    "timestamp": str(r["created_at"]),
                })
            return results
        finally:
            cur.close()
            conn.close()
    else:
        conn = get_sqlite_connection()
        try:
            query = "SELECT id, activity_type, title, details, repo_name, metadata_json, created_at FROM activities WHERE username = ?"
            params: List[Any] = [username]

            if activity_type and activity_type != "all":
                query += " AND activity_type = ?"
                params.append(activity_type)

            if search_query and search_query.strip():
                sq = f"%{search_query.strip()}%"
                query += " AND (title LIKE ? OR details LIKE ? OR repo_name LIKE ?)"
                params.extend([sq, sq, sq])

            query += " ORDER BY id DESC LIMIT ?"
            params.append(limit)

            rows = conn.execute(query, tuple(params)).fetchall()
            results = []
            for r in rows:
                meta = {}
                if r["metadata_json"]:
                    try:
                        meta = json.loads(r["metadata_json"])
                    except Exception:
                        meta = {}
                results.append({
                    "id": r["id"],
                    "activity_type": r["activity_type"],
                    "title": r["title"],
                    "details": r["details"],
                    "repo_name": r["repo_name"],
                    "metadata": meta,
                    "timestamp": str(r["created_at"]),
                })
            return results
        finally:
            conn.close()


def clear_user_activities_db(username: str) -> bool:
    init_db()
    if DB_ENGINE == "mysql":
        conn = get_mysql_connection()
        cur = conn.cursor()
        try:
            cur.execute("DELETE FROM activities WHERE username = %s", (username,))
            conn.commit()
            return True
        finally:
            cur.close()
            conn.close()
    else:
        conn = get_sqlite_connection()
        try:
            with conn:
                conn.execute("DELETE FROM activities WHERE username = ?", (username,))
            return True
        finally:
            conn.close()


def get_user_session_state(username: str) -> Dict[str, Any]:
    init_db()
    if DB_ENGINE == "mysql":
        conn = get_mysql_connection()
        cur = conn.cursor(dictionary=True)
        try:
            cur.execute("SELECT * FROM user_sessions WHERE username = %s LIMIT 1", (username,))
            row = cur.fetchone()
            if not row:
                return {}
            row = dict(row)
            if isinstance(row.get("repo_stats"), str):
                try:
                    row["repo_stats"] = json.loads(row["repo_stats"])
                except Exception:
                    row["repo_stats"] = None
            return row
        finally:
            cur.close()
            conn.close()
    else:
        conn = get_sqlite_connection()
        try:
            row = conn.execute("SELECT * FROM user_sessions WHERE username = ? LIMIT 1", (username,)).fetchone()
            if not row:
                return {}
            d = dict(row)
            if d.get("repo_stats"):
                try:
                    d["repo_stats"] = json.loads(d["repo_stats"])
                except Exception:
                    d["repo_stats"] = None
            d["knowledge_base_built"] = bool(d.get("knowledge_base_built", 0))
            return d
        finally:
            conn.close()


def save_user_session_state(username: str, state: Dict[str, Any]) -> bool:
    init_db()
    stats_json = json.dumps(state.get("repo_stats")) if state.get("repo_stats") else None
    kb_built = 1 if state.get("knowledge_base_built") else 0

    if DB_ENGINE == "mysql":
        conn = get_mysql_connection()
        cur = conn.cursor()
        try:
            cur.execute("""
                INSERT INTO user_sessions (
                    username, repo_path, repo_name, repo_stats, selected_model,
                    groq_api_key, knowledge_base_built, summary_cache, bug_cache,
                    architecture_cache, readme_cache, selected_file
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    repo_path = VALUES(repo_path),
                    repo_name = VALUES(repo_name),
                    repo_stats = VALUES(repo_stats),
                    selected_model = VALUES(selected_model),
                    groq_api_key = VALUES(groq_api_key),
                    knowledge_base_built = VALUES(knowledge_base_built),
                    summary_cache = VALUES(summary_cache),
                    bug_cache = VALUES(bug_cache),
                    architecture_cache = VALUES(architecture_cache),
                    readme_cache = VALUES(readme_cache),
                    selected_file = VALUES(selected_file);
            """, (
                username,
                state.get("repo_path"),
                state.get("repo_name"),
                stats_json,
                state.get("selected_model", "openai/gpt-oss-120b"),
                state.get("groq_api_key", ""),
                kb_built,
                state.get("summary_cache"),
                state.get("bug_cache"),
                state.get("architecture_cache"),
                state.get("readme_cache"),
                state.get("selected_file"),
            ))
            conn.commit()
            return True
        except Exception as e:
            print(f"[DB] Save user session error: {e}")
            return False
        finally:
            cur.close()
            conn.close()
    else:
        conn = get_sqlite_connection()
        try:
            with conn:
                conn.execute("""
                    INSERT INTO user_sessions (
                        username, repo_path, repo_name, repo_stats, selected_model,
                        groq_api_key, knowledge_base_built, summary_cache, bug_cache,
                        architecture_cache, readme_cache, selected_file
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(username) DO UPDATE SET
                        repo_path = excluded.repo_path,
                        repo_name = excluded.repo_name,
                        repo_stats = excluded.repo_stats,
                        selected_model = excluded.selected_model,
                        groq_api_key = excluded.groq_api_key,
                        knowledge_base_built = excluded.knowledge_base_built,
                        summary_cache = excluded.summary_cache,
                        bug_cache = excluded.bug_cache,
                        architecture_cache = excluded.architecture_cache,
                        readme_cache = excluded.readme_cache,
                        selected_file = excluded.selected_file,
                        updated_at = CURRENT_TIMESTAMP;
                """, (
                    username,
                    state.get("repo_path"),
                    state.get("repo_name"),
                    stats_json,
                    state.get("selected_model", "openai/gpt-oss-120b"),
                    state.get("groq_api_key", ""),
                    kb_built,
                    state.get("summary_cache"),
                    state.get("bug_cache"),
                    state.get("architecture_cache"),
                    state.get("readme_cache"),
                    state.get("selected_file"),
                ))
            return True
        except Exception as e:
            print(f"[DB] Save user session error: {e}")
            return False
        finally:
            conn.close()
