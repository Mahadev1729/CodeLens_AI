from pathlib import Path
from utils.helper import build_folder_tree, safe_read_file
from rag.ingestion.loader import iter_source_files
from rag.llm.llm_client import invoke_with_fallback, DEFAULT_GROQ_MODEL


SUMMARY_PROMPT = """You are a senior software architect. Analyze this codebase and provide a comprehensive project summary.

Repository Name: {repo_name}

Folder Structure:
{folder_tree}

Sample Files (first few files with content):
{sample_files}

Generate a detailed summary with these exact sections:

## Project Overview
[What this project does, its primary purpose and core features]

## Folder Organization
[High-level directory layout and purpose of key folders]

## Core Technologies & Dependencies
[Key libraries, frameworks, and tools used in the project]

## Entry Points
[How the application starts, main entry files and configurations]

## Architecture Pattern
[Overall architecture pattern and system design]

## Key Modules & Components
[Key classes, modules, or services and their roles]

## Key Insights & Suggestions
[3-5 practical takeaways or improvement suggestions]"""


def generate_summary(
    repo_path: str,
    api_key: str,
    model: str = DEFAULT_GROQ_MODEL,
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

    sample_files = "\n\n".join(
        sample_files_parts) if sample_files_parts else "No readable files found."

    prompt = SUMMARY_PROMPT.format(
        repo_name=repo_name,
        folder_tree=folder_tree,
        sample_files=sample_files,
    )

    return invoke_with_fallback(
        api_key=api_key,
        prompt_or_messages=prompt,
        model=model,
        temperature=0.1,
        max_tokens=4096,
    )
