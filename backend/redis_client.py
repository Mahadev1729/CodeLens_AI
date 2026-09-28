import json
import logging
import hashlib
from typing import Any, Optional, Union
import redis
from backend.config import REDIS_URL

logger = logging.getLogger("codementor.redis")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

_redis_client: Optional[redis.Redis] = None
_redis_checked: bool = False


def get_redis_client() -> Optional[redis.Redis]:
    """
    Returns a connected Redis client instance.
    Supports Upstash (rediss:// with SSL) and standard Redis URLs (redis://).
    Returns None safely if Redis is unavailable or unconfigured.
    """
    global _redis_client, _redis_checked

    if _redis_client is not None:
        return _redis_client

    if not REDIS_URL:
        if not _redis_checked:
            logger.info("[Redis] REDIS_URL not configured. Running without Redis cache.")
            _redis_checked = True
        return None

    try:
        # Connect using URL (handles SSL for Upstash rediss:// automatically)
        client = redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_timeout=3,
            socket_connect_timeout=3,
            retry_on_timeout=True,
        )
        # Test ping
        client.ping()
        _redis_client = client
        logger.info("[Redis] Successfully connected to Redis / Upstash database.")
        return _redis_client
    except Exception as e:
        logger.warning(f"[Redis] Could not connect to Redis at {REDIS_URL.split('@')[-1]}: {e}. Falling back to memory/database.")
        _redis_client = None
        return None


def is_redis_available() -> bool:
    """Checks if Redis is currently connected and responsive."""
    client = get_redis_client()
    if client is None:
        return False
    try:
        return bool(client.ping())
    except Exception:
        return False


def make_cache_key(*parts: Any) -> str:
    """Creates a normalized, hashed cache key from input parts."""
    raw = ":".join(str(p).strip() for p in parts if p is not None)
    if len(raw) > 120:
        hashed = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]
        prefix = raw.split(":")[0] if ":" in raw else "key"
        return f"codementor:{prefix}:{hashed}"
    return f"codementor:{raw}"


def cache_get(key: str) -> Optional[Any]:
    """
    Retrieves and deserializes data from Redis.
    Returns None if missing, expired, or on Redis error.
    """
    client = get_redis_client()
    if client is None:
        return None
    try:
        data = client.get(key)
        if data is None:
            return None
        try:
            return json.loads(data)
        except (ValueError, TypeError):
            return data
    except Exception as e:
        logger.debug(f"[Redis] Error reading cache key '{key}': {e}")
        return None


def cache_set(key: str, value: Any, ttl_seconds: int = 86400) -> bool:
    """
    Serializes and stores data in Redis with a TTL (default: 24 hours).
    Returns True if stored successfully, False otherwise.
    """
    client = get_redis_client()
    if client is None:
        return False
    try:
        if isinstance(value, (dict, list, bool, int, float)):
            serialized = json.dumps(value)
        else:
            serialized = str(value)
        return bool(client.set(key, serialized, ex=ttl_seconds))
    except Exception as e:
        logger.debug(f"[Redis] Error setting cache key '{key}': {e}")
        return False


def cache_delete(key: str) -> bool:
    """Deletes a key from Redis."""
    client = get_redis_client()
    if client is None:
        return False
    try:
        return bool(client.delete(key))
    except Exception as e:
        logger.debug(f"[Redis] Error deleting cache key '{key}': {e}")
        return False


def cache_delete_pattern(pattern: str) -> int:
    """Deletes all keys matching a pattern (e.g. 'codementor:summary:*')."""
    client = get_redis_client()
    if client is None:
        return 0
    try:
        keys = client.keys(pattern)
        if keys:
            return client.delete(*keys)
        return 0
    except Exception as e:
        logger.debug(f"[Redis] Error deleting pattern '{pattern}': {e}")
        return 0
