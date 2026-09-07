from pathlib import Path
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from utils.helper import build_folder_tree, safe_read_file
from services.loader import iter_source_files


README_PROMPT = """You are a professional technical writer and open-source contributor. Generate a comprehensive, well-formatted README.md for the following repository.

Repository: {repo_name}

Folder Structure:
{folder_tree}

Key Files:
{key_files}

Generate a professional README.md with these exact sections using proper Markdown formatting:

# {repo_name}

> [One-line description of the project]

[Badges if applicable - language, license, version]

## Description
[2-3 paragraphs explaining what the project does, the problem it solves, and why it exists]

## Features
[Bulleted list of key features]

## Tech Stack
[Technologies, frameworks, and libraries used]

## Folder Structure
[The folder tree with brief explanations]

## Installation
[Step-by-step installation instructions with code blocks]

## Usage
[How to use the project with examples and code blocks]

## Configuration
[Environment variables or config files needed]

## API Reference
[API endpoints if applicable, otherwise skip this section]

## Contributing
[How to contribute]

## License
[License information - default to MIT if not specified]

Output ONLY the README.md content, starting with the # heading. Do not include any preamble or explanation."""


def generate_readme(
    repo_path: str,
    api_key: str,
    model: str = "openai/gpt-oss-20b",
) -> str:
    repo_name = Path(repo_path).name
    folder_tree = build_folder_tree(repo_path, max_depth=4)

    key_files_parts = []
    total_chars = 0
    max_chars = 15000

    important_names = {
        "main.py", "app.py", "index.js", "index.ts", "server.js",
        "server.ts", "main.go", "main.rs", "Main.java", "Program.cs",
        "package.json", "pyproject.toml", "setup.py", "Makefile",
        "docker-compose.yml", "Dockerfile", "README.md",
    }

    all_files = list(iter_source_files(repo_path))
    priority = [f for f in all_files if f.name in important_names]
    rest = [f for f in all_files if f.name not in important_names]
    ordered = priority + rest

    for file_path in ordered:
        if total_chars >= max_chars:
            break
        content = safe_read_file(str(file_path))
        if not content or not content.strip():
            continue
        rel_path = str(file_path.relative_to(Path(repo_path)))
        ext = file_path.suffix.lstrip(".")
        snippet = content[:2000] if len(content) > 2000 else content
        part = f"### {rel_path}\n```{ext}\n{snippet}\n```"
        key_files_parts.append(part)
        total_chars += len(part)

    key_files = "\n\n".join(key_files_parts) if key_files_parts else "No files found."
    prompt = README_PROMPT.format(
        repo_name=repo_name,
        folder_tree=folder_tree,
        key_files=key_files,
    )

    llm = ChatGroq(api_key=api_key, model=model, temperature=0.3, max_tokens=4096)
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content
