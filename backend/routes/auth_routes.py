import json
import re
import secrets
import urllib.request
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from backend.config import GOOGLE_CLIENT_ID
from backend.auth import (
    register_new_user,
    authenticate_user_credentials,
    create_access_token,
    get_current_user,
    hash_password,
)
from backend.database import (
    get_user_by_username,
    create_user,
    get_user_session_state,
    save_user_session_state,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class AuthRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=6)


class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., min_length=10)


class SessionUpdateRequest(BaseModel):
    state: Dict[str, Any]


@router.get("/config")
async def get_auth_config():
    return {
        "google_client_id": GOOGLE_CLIENT_ID,
        "google_auth_enabled": bool(GOOGLE_CLIENT_ID),
    }


@router.post("/register")
async def register(req: AuthRequest):
    success, message = register_new_user(req.username, req.password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )
    token = create_access_token({"sub": req.username.strip()})
    return {
        "success": True,
        "message": message,
        "token": token,
        "username": req.username.strip(),
    }


@router.post("/login")
async def login(req: AuthRequest):
    success, result = authenticate_user_credentials(req.username, req.password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result,
        )
    token = create_access_token({"sub": result})
    session_state = get_user_session_state(result)
    return {
        "success": True,
        "token": token,
        "username": result,
        "session_state": session_state,
    }


@router.post("/google")
async def google_auth(req: GoogleAuthRequest):
    credential = req.credential.strip()
    try:
        # Validate Google ID Token with Google's tokeninfo API
        url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(credential)}"
        req_obj = urllib.request.Request(url, headers={"User-Agent": "CodeMentorAI/2.0"})
        with urllib.request.urlopen(req_obj, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))

        if "error" in payload or "error_description" in payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Google token verification failed: {payload.get('error_description', 'Invalid token')}",
            )

        email = payload.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google account did not provide an email address.",
            )

        # Generate a clean username from email
        base_name = email.split("@")[0]
        cleaned_username = re.sub(r"[^a-zA-Z0-9_.-]", "_", base_name)[:28]
        if len(cleaned_username) < 3:
            cleaned_username = f"user_{secrets.token_hex(3)}"

        # Check if user already exists
        existing_user = get_user_by_username(cleaned_username)
        if not existing_user:
            # Create a user record with a random secure password hash
            random_pwd = secrets.token_urlsafe(32)
            pwd_hash, salt_hex = hash_password(random_pwd)
            create_user(cleaned_username, pwd_hash, salt_hex)

        token = create_access_token({"sub": cleaned_username})
        session_state = get_user_session_state(cleaned_username)

        return {
            "success": True,
            "token": token,
            "username": cleaned_username,
            "email": email,
            "session_state": session_state,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google Authentication error: {str(e)}",
        )


@router.get("/me")
async def get_profile(current_user: str = Depends(get_current_user)):
    session_state = get_user_session_state(current_user)
    return {
        "username": current_user,
        "session_state": session_state,
    }


@router.post("/session")
async def update_session(req: SessionUpdateRequest, current_user: str = Depends(get_current_user)):
    success = save_user_session_state(current_user, req.state)
    return {"success": success}
