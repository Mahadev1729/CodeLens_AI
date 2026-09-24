from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.auth import get_optional_user
from backend.config import DEFAULT_GROQ_API_KEY, DEFAULT_MODEL
from backend.database import (
    get_chat_history_db,
    save_chat_message,
    log_activity_db,
    get_user_session_state,
    save_user_session_state,
)
from rag import (
    ask_question,
    explain_file,
    generate_summary,
    find_bugs,
    parse_bugs,
    generate_architecture,
    extract_mermaid_diagram,
    extract_python_diagram,
    render_python_diagram,
    generate_readme,
    load_vectorstore,
    vectorstore_exists,
)
from utils.helper import truncate_text

router = APIRouter(prefix="/api/ai", tags=["AI Intelligence"])


def _resolve_api_key(req_key: Optional[str], username: Optional[str] = None) -> str:
    if req_key and len(req_key.strip()) > 10:
        return req_key.strip()
    if username:
        state = get_user_session_state(username)
        if state.get("groq_api_key"):
            return state["groq_api_key"].strip()
    if DEFAULT_GROQ_API_KEY:
        return DEFAULT_GROQ_API_KEY
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Groq API Key is required. Please provide it in settings or environment.",
    )


class ChatQueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    repo_name: Optional[str] = None
    repo_path: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None


class SummaryRequest(BaseModel):
    repo_path: Optional[str] = None
    repo_name: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    regenerate: bool = False


class BugAnalysisRequest(BaseModel):
    repo_path: Optional[str] = None
    repo_name: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    regenerate: bool = False


class ArchitectureRequest(BaseModel):
    repo_path: Optional[str] = None
    repo_name: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    regenerate: bool = False
    format: str = "python"  # "python" (Diagram-as-Code) or "mermaid"


class ReadmeRequest(BaseModel):
    repo_path: Optional[str] = None
    repo_name: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    regenerate: bool = False


class ExplainFileRequest(BaseModel):
    file_path: str
    file_content: str
    repo_name: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None


@router.post("/chat")
async def chat_endpoint(req: ChatQueryRequest, current_user: Optional[str] = Depends(get_optional_user)):
    username = current_user or "guest"
    session_state = get_user_session_state(username)

    repo_name = req.repo_name or session_state.get("repo_name")
    if not repo_name and session_state.get("repo_path"):
        repo_name = Path(session_state["repo_path"]).name

    if not repo_name or not vectorstore_exists(repo_name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Knowledge base has not been built for this repository. Please clone and build KB first.",
        )

    api_key = _resolve_api_key(req.api_key, username)
    model = req.model or session_state.get("selected_model") or DEFAULT_MODEL

    vectorstore = load_vectorstore(repo_name)
    if vectorstore is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load vectorstore. Try rebuilding knowledge base.",
        )

    # Get recent chat history from database
    recent_history = get_chat_history_db(username, repo_name=repo_name, limit=10)

    # Save user message
    save_chat_message(username, "user", req.question, sources=[], repo_name=repo_name)

    try:
        answer, sources = ask_question(
            vectorstore,
            req.question,
            api_key,
            recent_history,
            model,
        )

        # Save assistant message
        save_chat_message(username, "assistant", answer, sources=sources, repo_name=repo_name)

        if current_user:
            log_activity_db(
                username=current_user,
                activity_type="chat",
                title=f"Asked: \"{truncate_text(req.question, 60)}\"",
                details=req.question,
                repo_name=repo_name,
                metadata={"question": req.question, "sources_count": len(sources) if sources else 0},
            )

        return {
            "answer": answer,
            "sources": sources or [],
            "repo_name": repo_name,
        }
    except Exception as e:
        error_msg = f"Error generating answer: {str(e)}"
        save_chat_message(username, "assistant", error_msg, sources=[], repo_name=repo_name)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_msg,
        )


@router.post("/summary")
async def summary_endpoint(req: SummaryRequest, current_user: Optional[str] = Depends(get_optional_user)):
    username = current_user or "guest"
    session_state = get_user_session_state(username)

    repo_path = req.repo_path or session_state.get("repo_path")
    repo_name = req.repo_name or session_state.get("repo_name")

    if not repo_path or not Path(repo_path).exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid repository path is required.",
        )

    if not req.regenerate and session_state.get("summary_cache"):
        return {"summary": session_state["summary_cache"], "cached": True}

    api_key = _resolve_api_key(req.api_key, username)
    model = req.model or session_state.get("selected_model") or DEFAULT_MODEL

    try:
        summary = generate_summary(repo_path, api_key, model)
        session_state["summary_cache"] = summary
        save_user_session_state(username, session_state)

        if current_user:
            log_activity_db(
                username=current_user,
                activity_type="summary",
                title=f"Generated Summary for '{repo_name}'",
                details=f"Model: {model}",
                repo_name=repo_name,
            )

        return {"summary": summary, "cached": False}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}",
        )


@router.post("/bugs")
async def bugs_endpoint(req: BugAnalysisRequest, current_user: Optional[str] = Depends(get_optional_user)):
    username = current_user or "guest"
    session_state = get_user_session_state(username)

    repo_path = req.repo_path or session_state.get("repo_path")
    repo_name = req.repo_name or session_state.get("repo_name")

    if not repo_path or not Path(repo_path).exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid repository path is required.",
        )

    if not req.regenerate and session_state.get("bug_cache"):
        raw = session_state["bug_cache"]
        issues = parse_bugs(raw)
        return {
            "raw_report": raw,
            "issues": issues,
            "counts": {
                "total": len(issues),
                "high": len([i for i in issues if i.get("severity", "").lower() == "high"]),
                "medium": len([i for i in issues if i.get("severity", "").lower() == "medium"]),
                "low": len([i for i in issues if i.get("severity", "").lower() == "low"]),
            },
            "cached": True,
        }

    api_key = _resolve_api_key(req.api_key, username)
    model = req.model or session_state.get("selected_model") or DEFAULT_MODEL

    try:
        raw_report = find_bugs(repo_path, api_key, model)
        issues = parse_bugs(raw_report)
        session_state["bug_cache"] = raw_report
        save_user_session_state(username, session_state)

        if current_user:
            log_activity_db(
                username=current_user,
                activity_type="bugs",
                title=f"Ran Bug & Quality Analysis on '{repo_name}'",
                details=f"Detected {len(issues)} potential issue(s)",
                repo_name=repo_name,
                metadata={"total_issues": len(issues)},
            )

        return {
            "raw_report": raw_report,
            "issues": issues,
            "counts": {
                "total": len(issues),
                "high": len([i for i in issues if i.get("severity", "").lower() == "high"]),
                "medium": len([i for i in issues if i.get("severity", "").lower() == "medium"]),
                "low": len([i for i in issues if i.get("severity", "").lower() == "low"]),
            },
            "cached": False,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find bugs: {str(e)}",
        )


@router.post("/architecture")
async def architecture_endpoint(req: ArchitectureRequest, current_user: Optional[str] = Depends(get_optional_user)):
    username = current_user or "guest"
    session_state = get_user_session_state(username)

    repo_path = req.repo_path or session_state.get("repo_path")
    repo_name = req.repo_name or session_state.get("repo_name")

    if not repo_path or not Path(repo_path).exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid repository path is required.",
        )

    diag_format = (req.format or "python").lower().strip()
    cache_key = f"architecture_cache_{diag_format}"

    if not req.regenerate and session_state.get(cache_key):
        cached_data = session_state[cache_key]
        return {**cached_data, "cached": True}

    api_key = _resolve_api_key(req.api_key, username)
    model = req.model or session_state.get("selected_model") or DEFAULT_MODEL

    try:
        arch_text = generate_architecture(repo_path, api_key, model, diagram_type=diag_format)

        if diag_format == "mermaid":
            diagram_code, notes = extract_mermaid_diagram(arch_text)
            resp_payload = {
                "format": "mermaid",
                "raw": arch_text,
                "diagram_code": diagram_code,
                "notes": notes,
                "cached": False,
            }
        else:
            diagram_code, notes = extract_python_diagram(arch_text)
            render_res = render_python_diagram(diagram_code)
            resp_payload = {
                "format": "python",
                "raw": arch_text,
                "diagram_code": diagram_code,
                "image_base64": render_res.get("image_base64"),
                "render_error": render_res.get("error"),
                "notes": notes,
                "cached": False,
            }

        session_state[cache_key] = resp_payload
        save_user_session_state(username, session_state)

        if current_user:
            log_activity_db(
                username=current_user,
                activity_type="architecture",
                title=f"Generated {diag_format.capitalize()} Architecture for '{repo_name}'",
                repo_name=repo_name,
            )

        return resp_payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate architecture: {str(e)}",
        )


@router.post("/readme")
async def readme_endpoint(req: ReadmeRequest, current_user: Optional[str] = Depends(get_optional_user)):
    username = current_user or "guest"
    session_state = get_user_session_state(username)

    repo_path = req.repo_path or session_state.get("repo_path")
    repo_name = req.repo_name or session_state.get("repo_name")

    if not repo_path or not Path(repo_path).exists():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid repository path is required.",
        )

    if not req.regenerate and session_state.get("readme_cache"):
        return {"readme": session_state["readme_cache"], "cached": True}

    api_key = _resolve_api_key(req.api_key, username)
    model = req.model or session_state.get("selected_model") or DEFAULT_MODEL

    try:
        readme = generate_readme(repo_path, api_key, model)
        session_state["readme_cache"] = readme
        save_user_session_state(username, session_state)

        if current_user:
            log_activity_db(
                username=current_user,
                activity_type="readme",
                title=f"Generated README for '{repo_name}'",
                repo_name=repo_name,
            )

        return {"readme": readme, "cached": False}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate README: {str(e)}",
        )


@router.post("/explain-file")
async def explain_file_endpoint(req: ExplainFileRequest, current_user: Optional[str] = Depends(get_optional_user)):
    username = current_user or "guest"
    session_state = get_user_session_state(username)

    api_key = _resolve_api_key(req.api_key, username)
    model = req.model or session_state.get("selected_model") or DEFAULT_MODEL

    try:
        explanation = explain_file(req.file_path, req.file_content, api_key, model)

        if current_user:
            log_activity_db(
                username=current_user,
                activity_type="file_explain",
                title=f"Explained file '{req.file_path}'",
                details=f"Repo: {req.repo_name or 'N/A'}",
                repo_name=req.repo_name or "",
                metadata={"file": req.file_path},
            )

        return {"explanation": explanation, "file_path": req.file_path}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to explain file: {str(e)}",
        )
