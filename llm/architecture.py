from pathlib import Path
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from utils.helper import build_folder_tree, safe_read_file
from services.loader import iter_source_files


ARCHITECTURE_PROMPT = """You are a senior software architect. Analyze this codebase and generate a detailed Mermaid architecture diagram.

Repository: {repo_name}

Folder Structure:
{folder_tree}

Key Files and Contents:
{key_files}

Generate a comprehensive Mermaid diagram that shows:
1. The overall system architecture
2. Key modules and their relationships
3. Data flow between components
4. External dependencies (databases, APIs, services)
5. User-facing interfaces

Rules for the diagram:
- Use appropriate Mermaid diagram type (flowchart, C4, etc.)
- Use flowchart TD (top-down) for most cases
- Keep node labels concise but descriptive
- Show directional relationships with arrows
- Group related components using subgraphs
- Include styling for different node types

Output ONLY the Mermaid diagram code block, nothing else. Start with ```mermaid and end with ```.

After the diagram, provide a brief explanation (2-3 sentences) of the architecture.

Example format:
```mermaid
flowchart TD
    ...
```

**Architecture Notes:** [Your brief explanation]"""


def generate_architecture(
    repo_path: str,
    api_key: str,
    model: str = "openai/gpt-oss-20b",
) -> str:
    repo_name = Path(repo_path).name
    folder_tree = build_folder_tree(repo_path, max_depth=4)

    key_files_parts = []
    total_chars = 0
    max_chars = 12000

    priority_extensions = {".py", ".js", ".ts", ".java", ".go", ".rs", ".cs"}
    all_files = list(iter_source_files(repo_path))
    priority_files = [f for f in all_files if f.suffix.lower() in priority_extensions]
    other_files = [f for f in all_files if f.suffix.lower() not in priority_extensions]
    ordered_files = priority_files + other_files

    for file_path in ordered_files:
        if total_chars >= max_chars:
            break
        content = safe_read_file(str(file_path))
        if not content or not content.strip():
            continue
        rel_path = str(file_path.relative_to(Path(repo_path)))
        ext = file_path.suffix.lstrip(".")
        snippet = content[:1000] if len(content) > 1000 else content
        part = f"### {rel_path}\n```{ext}\n{snippet}\n```"
        key_files_parts.append(part)
        total_chars += len(part)

    key_files = "\n\n".join(key_files_parts) if key_files_parts else "No files found."
    prompt = ARCHITECTURE_PROMPT.format(
        repo_name=repo_name,
        folder_tree=folder_tree,
        key_files=key_files,
    )

    llm = ChatGroq(api_key=api_key, model=model, temperature=0.1, max_tokens=4096)
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content


def extract_mermaid_diagram(text: str) -> tuple[str, str]:
    import re
    pattern = r"```mermaid\n(.*?)```"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        diagram = match.group(1).strip()
        notes = text[match.end():].strip()
        return diagram, notes
    return "", text
