from typing import Optional
from fastapi import APIRouter, Depends, Query
from starlette.concurrency import run_in_threadpool

from backend.auth import get_current_user, get_optional_user
from backend.database import (
    get_user_activities_db,
    clear_user_activities_db,
    get_chat_history_db,
    clear_user_chat_history,
)

router = APIRouter(prefix="/api/activities", tags=["Activities"])


@router.get("")
async def get_activities(
    activity_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(150, ge=1, le=500),
    current_user: Optional[str] = Depends(get_optional_user),
):
    username = current_user or "guest"
    activities = await run_in_threadpool(
        get_user_activities_db,
        username=username,
        limit=limit,
        activity_type=activity_type,
        search_query=search,
    )
    return {"activities": activities, "total": len(activities)}


@router.post("/clear")
async def clear_activities(current_user: Optional[str] = Depends(get_optional_user)):
    username = current_user or "guest"
    success = await run_in_threadpool(clear_user_activities_db, username)
    return {"success": success}


@router.get("/stats")
async def get_activity_stats(current_user: Optional[str] = Depends(get_optional_user)):
    username = current_user or "guest"
    activities = await run_in_threadpool(get_user_activities_db, username=username, limit=1000)
    chat_history = await run_in_threadpool(get_chat_history_db, username=username, limit=1000)

    user_questions = [m for m in chat_history if m.get("role") == "user"]
    distinct_repos = list(set(a.get("repo_name") for a in activities if a.get("repo_name")))

    counts_by_type = {}
    for a in activities:
        atype = a.get("activity_type", "other")
        counts_by_type[atype] = counts_by_type.get(atype, 0) + 1

    last_active = activities[0]["timestamp"] if activities else None

    return {
        "username": username,
        "total_activities": len(activities),
        "total_questions": len(user_questions),
        "total_messages": len(chat_history),
        "distinct_repos_count": len(distinct_repos),
        "distinct_repos": distinct_repos,
        "counts_by_type": counts_by_type,
        "last_active": last_active,
    }


@router.get("/chat-history")
async def get_chat_history_endpoint(
    repo_name: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=500),
    current_user: Optional[str] = Depends(get_optional_user),
):
    username = current_user or "guest"
    history = await run_in_threadpool(get_chat_history_db, username=username, repo_name=repo_name, limit=limit)
    return {"chat_history": history}


@router.post("/chat-history/clear")
async def clear_chat_history_endpoint(
    repo_name: Optional[str] = Query(None),
    current_user: Optional[str] = Depends(get_optional_user),
):
    username = current_user or "guest"
    success = await run_in_threadpool(clear_user_chat_history, username=username, repo_name=repo_name)
    return {"success": success}
