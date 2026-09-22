import base64
import hashlib
import hmac
import json
import re
import secrets
import time
from datetime import datetime, timedelta
from typing import Optional, Tuple
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from backend.config import JWT_SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES
from backend.database import get_user_by_username, create_user

security = HTTPBearer(auto_error=False)


def _b64_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')


def _b64_decode(data_str: str) -> bytes:
    padding = 4 - (len(data_str) % 4)
    if padding != 4:
        data_str += '=' * padding
    return base64.urlsafe_b64decode(data_str.encode('utf-8'))


def hash_password(password: str, salt: Optional[bytes] = None) -> Tuple[str, str]:
    if salt is None:
        salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return key.hex(), salt.hex()


def verify_password(password: str, password_hash: str, salt_hex: str) -> bool:
    try:
        salt = bytes.fromhex(salt_hex)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return secrets.compare_digest(key.hex(), password_hash)
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    header_json = json.dumps(header, separators=(',', ':')).encode('utf-8')
    header_b64 = _b64_encode(header_json)

    payload = data.copy()
    now = int(time.time())
    if expires_delta:
        exp = now + int(expires_delta.total_seconds())
    else:
        exp = now + (ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    payload["exp"] = exp
    payload["iat"] = now

    payload_json = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = _b64_encode(payload_json)

    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(JWT_SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_b64 = _b64_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def decode_access_token(token: str) -> dict:
    parts = token.split('.')
    if len(parts) != 3:
        raise ValueError("Invalid token format")
    header_b64, payload_b64, signature_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    expected_sig = hmac.new(JWT_SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    actual_sig = _b64_decode(signature_b64)

    if not secrets.compare_digest(expected_sig, actual_sig):
        raise ValueError("Invalid token signature")

    payload_bytes = _b64_decode(payload_b64)
    payload = json.loads(payload_bytes.decode('utf-8'))

    if payload.get("exp") and payload["exp"] < int(time.time()):
        raise ValueError("Token expired")

    return payload


def register_new_user(username: str, password: str) -> Tuple[bool, str]:
    username = username.strip()
    if not username:
        return False, "Username cannot be empty."

    if len(username) < 3 or len(username) > 30:
        return False, "Username must be between 3 and 30 characters."

    if not re.match(r"^[a-zA-Z0-9_.-]+$", username):
        return False, "Username can only contain letters, numbers, dots, hyphens, and underscores."

    if len(password) < 6:
        return False, "Password must be at least 6 characters long."

    existing = get_user_by_username(username)
    if existing:
        return False, f"Username '{username}' is already taken."

    pwd_hash, salt_hex = hash_password(password)
    success = create_user(username, pwd_hash, salt_hex)
    if success:
        return True, "Account registered successfully."
    return False, "Failed to create user."


def authenticate_user_credentials(username: str, password: str) -> Tuple[bool, Optional[str]]:
    username = username.strip()
    user = get_user_by_username(username)
    if not user:
        return False, "Invalid username or password."

    if not verify_password(password, user["password_hash"], user["salt"]):
        return False, "Invalid username or password."

    return True, user["username"]


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    try:
        payload = decode_access_token(token)
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user_by_username(username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user["username"]


async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[str]:
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = decode_access_token(token)
        return payload.get("sub")
    except Exception:
        return None
