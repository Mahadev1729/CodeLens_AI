import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from backend.auth import get_current_user, get_optional_user
from backend.config import PROJECT_DIR
from backend.database import log_activity_db, get_user_session_state, save_user_session_state
from rag import (
    clone_repository,
    get_repo_info,
    is_valid_repo_path,
    load_documents,
    get_repository_stats,
    chunk_documents,
    build_vectorstore,
    load_vectorstore,
    vectorstore_exists,
)
from utils.helper import normalize_github_url, extract_repo_name, safe_read_file, get_language, get_file_size_str

router = APIRouter(prefix="/api/repo", tags=["Repository"])


class CloneRequest(BaseModel):
    repo_url: str = Field(..., min_length=3)


class BuildKbRequest(BaseModel):
    repo_path: Optional[str] = None
    repo_name: Optional[str] = None
    groq_api_key: Optional[str] = None


@router.post("/clone")
async def clone_repo_endpoint(req: CloneRequest, current_user: Optional[str] = Depends(get_optional_user)):
    raw_url = req.repo_url.strip()
    normalized_url = normalize_github_url(raw_url)
    if not normalized_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GitHub repository URL. Please provide a valid GitHub link (e.g. 'https://github.com/user/repo' or 'user/repo').",
        )

    try:
        success, local_path, error = await run_in_threadpool(clone_repository, normalized_url)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Clone process encountered an error: {str(e)}",
        )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Clone failed: {error}",
        )

    try:
        repo_name = extract_repo_name(normalized_url)
        stats = await run_in_threadpool(get_repository_stats, local_path)
        repo_info = await run_in_threadpool(get_repo_info, local_path)
        kb_exists = await run_in_threadpool(vectorstore_exists, repo_name)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to inspect cloned repository: {str(e)}",
        )

    # Save session state if user is logged in
    try:
        username = current_user or "guest"
        current_state = get_user_session_state(username)
        current_state.update({
            "repo_path": local_path,
            "repo_name": repo_name,
            "repo_stats": stats,
            "knowledge_base_built": kb_exists,
            "summary_cache": None,
            "bug_cache": None,
            "architecture_cache": None,
            "readme_cache": None,
            "selected_file": None,
        })
        save_user_session_state(username, current_state)
    except Exception as e:
        print(f"[Repo] Warning: Failed to save session state: {e}")

    if current_user:
        try:
            log_activity_db(
                username=current_user,
                activity_type="clone",
                title=f"Cloned repository '{repo_name}'",
                details=f"Source: {normalized_url}",
                repo_name=repo_name,
                metadata={"url": normalized_url, "files": stats.get("total_files", 0), "lines": stats.get("total_lines", 0)},
            )
        except Exception as e:
            print(f"[Repo] Warning: Failed to log activity: {e}")

    return {
        "success": True,
        "repo_path": local_path,
        "repo_name": repo_name,
        "repo_info": repo_info,
        "repo_stats": stats,
        "knowledge_base_built": kb_exists,
    }


@router.post("/build-kb")
async def build_kb_endpoint(req: BuildKbRequest, current_user: Optional[str] = Depends(get_optional_user)):
    username = current_user or "guest"
    session_state = get_user_session_state(username)

    repo_path = req.repo_path or session_state.get("repo_path")
    repo_name = req.repo_name or session_state.get("repo_name")

    if not repo_path or not is_valid_repo_path(repo_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid repository path is required. Please clone a repository first.",
        )

    if not repo_name:
        repo_name = Path(repo_path).name

    try:
        documents, skipped = await run_in_threadpool(load_documents, repo_path)
        if not documents:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No supported code or markdown files found in the repository.",
            )

        chunks = await run_in_threadpool(chunk_documents, documents)
        await run_in_threadpool(build_vectorstore, chunks, repo_name)

        session_state.update({
            "knowledge_base_built": True,
            "repo_path": repo_path,
            "repo_name": repo_name,
        })
        save_user_session_state(username, session_state)

        if current_user:
            log_activity_db(
                username=current_user,
                activity_type="build_kb",
                title=f"Built Knowledge Base for '{repo_name}'",
                details=f"Indexed {len(chunks)} chunks from {len(documents)} files",
                repo_name=repo_name,
                metadata={"chunks": len(chunks), "files": len(documents), "skipped": len(skipped)},
            )

        return {
            "success": True,
            "message": f"Knowledge base built! {len(chunks)} chunks indexed.",
            "total_documents": len(documents),
            "total_chunks": len(chunks),
            "skipped_files": skipped,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to build knowledge base: {str(e)}",
        )


@router.get("/status")
async def get_status_endpoint(repo_path: Optional[str] = None, repo_name: Optional[str] = None, current_user: Optional[str] = Depends(get_optional_user)):
    username = current_user or "guest"
    session_state = get_user_session_state(username)

    target_path = repo_path or session_state.get("repo_path")
    target_name = repo_name or session_state.get("repo_name")

    if not target_path or not is_valid_repo_path(target_path):
        return {
            "loaded": False,
            "repo_path": None,
            "repo_name": None,
            "knowledge_base_built": False,
            "repo_info": None,
            "repo_stats": None,
        }

    if not target_name:
        target_name = Path(target_path).name

    repo_info = get_repo_info(target_path)
    kb_exists = vectorstore_exists(target_name)
    stats = get_repository_stats(target_path)

    return {
        "loaded": True,
        "repo_path": target_path,
        "repo_name": target_name,
        "knowledge_base_built": kb_exists,
        "repo_info": repo_info,
        "repo_stats": stats,
    }


@router.get("/files")
async def get_files_endpoint(repo_path: Optional[str] = None, search: Optional[str] = None, ext: Optional[str] = None, current_user: Optional[str] = Depends(get_optional_user)):
    username = current_user or "guest"
    session_state = get_user_session_state(username)
    target_path = repo_path or session_state.get("repo_path")

    if not target_path or not is_valid_repo_path(target_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid repository path found.",
        )

    stats = get_repository_stats(target_path)
    file_list = stats.get("file_list", [])

    if search and search.strip():
        q = search.strip().lower()
        file_list = [f for f in file_list if q in f["path"].lower()]

    if ext and ext != "All" and ext != "all":
        file_list = [f for f in file_list if f["extension"].lower() == ext.lower()]

    return {
        "files": file_list,
        "total": len(file_list),
        "extension_counts": stats.get("extension_counts", {}),
    }


@router.get("/file-content")
async def get_file_content_endpoint(file_path: str = Query(..., description="Relative path of file"), repo_path: Optional[str] = None, current_user: Optional[str] = Depends(get_optional_user)):
    username = current_user or "guest"
    session_state = get_user_session_state(username)
    target_path = repo_path or session_state.get("repo_path")

    if not target_path or not is_valid_repo_path(target_path):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid repository path found.",
        )

    full_path = Path(target_path) / file_path
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found.",
        )

    content = safe_read_file(str(full_path))
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not read file content (binary or unreadable).",
        )

    return {
        "path": file_path,
        "filename": full_path.name,
        "language": get_language(str(full_path)),
        "size": full_path.stat().st_size,
        "size_str": get_file_size_str(full_path.stat().st_size),
        "lines": len(content.splitlines()),
        "content": content,
    }


@router.get("/list")
async def list_local_repos():
    repos_dir = PROJECT_DIR / "repos"
    if not repos_dir.exists():
        return {"repos": []}
    
    repos = []
    for item in repos_dir.iterdir():
        if item.is_dir() and not item.name.startswith("."):
            info = get_repo_info(str(item))
            kb_exists = vectorstore_exists(item.name)
            repos.append({
                "name": item.name,
                "path": str(item),
                "knowledge_base_built": kb_exists,
                "info": info,
            })
    return {"repos": repos}
