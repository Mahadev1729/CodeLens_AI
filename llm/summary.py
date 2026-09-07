from pathlib import Path
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from utils.helper import build_folder_tree, safe_read_file
from services.loader import iter_source_files


SUMMARY_PROMPT = """You are a senior software architect. Analyze this codebase and provide a comprehensive project summary.

Repository Name: {repo_name}

Folder Structure:
{folder_tree}

Sample Files (first few files with content):
{sample_files}

Generate a detailed summary with these exact sections:

## Project Overview
[What this project does, its purpose and goals]

## Folder Structure
[Explain the directory layout and organization]

## Tech Stack
[All technologies, frameworks, libraries detected]

## Entry Point
[How the application starts, main entry files]

## Architecture
[Overall architecture pattern - MVC, microservices, monolith, etc.]

## Authentication
[Authentication mechanism if present, or "Not detected"]

## Database
[Database technology and schema approach, or "Not detected"]

## APIs
[API endpoints or interfaces exposed, or "Not detected"]

## Major Components
[Key classes, modules, or components and their roles]

## Suggestions
[3-5 concrete improvement suggestions based on code quality, architecture, or missing features]"""


def generate_summary(
    repo_path: str,
    api_key: str,
    model: str = "openai/gpt-oss-20b",
) -> str:
    repo_name = Path(repo_path).name
    folder_tree = build_folder_tree(repo_path, max_depth=4)

    sample_files_parts = []
    count = 0
    for file_path in iter_source_files(repo_path):
        if count >= 8:
            break
        content = safe_read_file(str(file_path))
        if content and len(content.strip()) > 50:
            rel_path = str(file_path.relative_to(Path(repo_path)))
            ext = file_path.suffix.lstrip(".")
            sample_files_parts.append(
                f"### {rel_path}\n```{ext}\n{content[:1500]}\n```"
            )
            count += 1

    sample_files = "\n\n".join(sample_files_parts) if sample_files_parts else "No readable files found."

    prompt = SUMMARY_PROMPT.format(
        repo_name=repo_name,
        folder_tree=folder_tree,
        sample_files=sample_files,
    )

    llm = ChatGroq(api_key=api_key, model=model, temperature=0.1, max_tokens=4096)
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content
