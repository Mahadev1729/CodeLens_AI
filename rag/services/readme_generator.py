from pathlib import Path
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from utils.helper import build_folder_tree, safe_read_file
from rag.services.loader import iter_source_files, get_repository_stats


README_PROMPT = """You are a technical writer and senior software engineer. Generate a comprehensive, production-grade README.md for this repository.

Repository: {repo_name}

Repository Stats:
- Total Files: {total_files}
- Total Lines: {total_lines}

Folder Structure:
{folder_tree}

Key Files Content:
{key_files}

Generate a complete, professional README.md with the following structure:

# {repo_name}

[Brief compelling description with badges if applicable]

## Features
[Bullet list of key features and capabilities]

## Tech Stack
[Table or bullet list of languages, frameworks, libraries, tools]

## Architecture Overview
[High-level description of the system design and data flow]

## Project Structure
[Annotated directory tree explaining key directories and files]

## Getting Started

### Prerequisites
[Required runtimes, tools, API keys]

### Installation
```bash
[Step-by-step install commands]
```

### Configuration
[Environment variables and configuration options]

### Running the Application
```bash
[Commands to run development server, build, tests]
```

## API Reference (if applicable)
[Key endpoints or interfaces]

## Contributing
[Standard contribution guidelines]

## License
[License section]

Output ONLY valid Markdown."""


def generate_readme(
    repo_path: str,
    api_key: str,
    model: str = "llama-3.1-8b-instant",
) -> str:
    repo_name = Path(repo_path).name
    folder_tree = build_folder_tree(repo_path, max_depth=3)
    stats = get_repository_stats(repo_path)

    key_files_parts = []
    total_chars = 0
    max_chars = 10000

    priority_names = {"readme", "package.json", "requirements.txt",
                      "dockerfile", "main", "app", "index", "config"}
    all_files = list(iter_source_files(repo_path))

    def is_priority(p: Path) -> bool:
        return any(k in p.stem.lower() for k in priority_names)

    priority_files = [f for f in all_files if is_priority(f)]
    other_files = [f for f in all_files if not is_priority(f)]
    ordered = priority_files + other_files

    for file_path in ordered:
        if total_chars >= max_chars:
            break
        content = safe_read_file(str(file_path))
        if not content or not content.strip():
            continue
        rel_path = str(file_path.relative_to(Path(repo_path)))
        ext = file_path.suffix.lstrip(".")
        snippet = content[:800] if len(content) > 800 else content
        part = f"### {rel_path}\n```{ext}\n{snippet}\n```"
        key_files_parts.append(part)
        total_chars += len(part)

    key_files = "\n\n".join(
        key_files_parts) if key_files_parts else "No files found."
    prompt = README_PROMPT.format(
        repo_name=repo_name,
        total_files=stats.get("total_files", 0),
        total_lines=stats.get("total_lines", 0),
        folder_tree=folder_tree,
        key_files=key_files,
    )

    llm = ChatGroq(api_key=api_key, model=model,
                   temperature=0.2, max_tokens=4096)
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content
