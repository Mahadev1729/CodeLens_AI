from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from backend.auth import (
    register_new_user,
    authenticate_user_credentials,
    create_access_token,
    get_current_user,
)
from backend.database import get_user_session_state, save_user_session_state

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class AuthRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=6)


class SessionUpdateRequest(BaseModel):
    state: Dict[str, Any]


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
