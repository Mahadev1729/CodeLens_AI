import os
import re
import sys
import base64
import tempfile
import subprocess
from pathlib import Path
from typing import Tuple, Dict, Any, Optional
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from utils.helper import build_folder_tree, safe_read_file
from rag.ingestion.loader import iter_source_files


MERMAID_ARCHITECTURE_PROMPT = """You are a senior software architect. Analyze this codebase and generate a detailed Mermaid architecture diagram.

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


PYTHON_DIAGRAMS_PROMPT = """You are a senior software and cloud solutions architect. Analyze this codebase and generate a Python script using the official `diagrams` library (Diagram-as-Code) to visualize this system's architecture with rich icons.

Repository: {repo_name}

Folder Structure:
{folder_tree}

Key Files and Contents:
{key_files}

Generate a complete, executable Python script using the `diagrams` library.
Rules:
1. Import Diagram, Cluster, Edge from `diagrams`
2. Import exact node icons from:
   - `diagrams.programming.framework` (e.g. React, Vue, Django, Flask, FastAPI, Spring, Nextjs)
   - `diagrams.programming.language` (e.g. Python, Nodejs, Typescript, Javascript, Go, Rust, Java)
   - `diagrams.onprem.database` (e.g. Mysql, Postgresql, Mongodb, Redis, Sqlite)
   - `diagrams.onprem.client` (e.g. User, Client)
   - `diagrams.onprem.queue` (e.g. Kafka, Rabbitmq)
   - `diagrams.onprem.container` (e.g. Docker)
   - `diagrams.onprem.vcs` (e.g. Github)
   - `diagrams.generic.blank` (Blank)
   - `diagrams.generic.storage` (Storage)
   - `diagrams.aws.*`, `diagrams.gcp.*`, `diagrams.saas.chat` (e.g. Slack), `diagrams.custom`
3. Always wrap the diagram logic inside:
   ```python
   with Diagram("{repo_name} Architecture", show=False, filename="arch_diagram", outformat="png", direction="TB"):
       ...
   ```
4. Organize into logical `with Cluster("..."):` sections (e.g., "Frontend", "Backend API", "Data Layer", "AI / LLM Layer").
5. Connect nodes using `>>` or `<<`.
6. Output ONLY the Python code in ```python ... ``` block.

After the code block, write:
**Architecture Notes:** [2-3 sentence explanation of the architecture]"""


def _prepare_code_context(repo_path: str, max_chars: int = 12000) -> Tuple[str, str, str]:
    repo_name = Path(repo_path).name
    folder_tree = build_folder_tree(repo_path, max_depth=4)

    key_files_parts = []
    total_chars = 0

    priority_extensions = {".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".rs", ".cs"}
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
    return repo_name, folder_tree, key_files


def generate_architecture(
    repo_path: str,
    api_key: str,
    model: str = "llama-3.1-8b-instant",
    diagram_type: str = "python",  # "python" or "mermaid"
) -> str:
    repo_name, folder_tree, key_files = _prepare_code_context(repo_path)

    if diagram_type == "mermaid":
        prompt_template = MERMAID_ARCHITECTURE_PROMPT
    else:
        prompt_template = PYTHON_DIAGRAMS_PROMPT

    prompt = prompt_template.format(
        repo_name=repo_name,
        folder_tree=folder_tree,
        key_files=key_files,
    )

    llm = ChatGroq(api_key=api_key, model=model, temperature=0.1, max_tokens=4096)
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content


def extract_mermaid_diagram(text: str) -> Tuple[str, str]:
    pattern = r"```(?:mermaid)?\n(.*?)```"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        diagram = match.group(1).strip()
        notes = text[match.end():].strip()
        return diagram, notes
    return "", text


def extract_python_diagram(text: str) -> Tuple[str, str]:
    pattern = r"```(?:python)?\n(.*?)```"
    match = re.search(pattern, text, re.DOTALL)
    if match:
        code = match.group(1).strip()
        notes = text[match.end():].strip()
        return code, notes
    return "", text


def render_python_diagram(code: str) -> Dict[str, Any]:
    """
    Executes Python `diagrams` code in an isolated directory and renders the PNG to Base64.
    """
    if not code or not code.strip():
        return {"success": False, "error": "No Python diagram code provided."}

    # Ensure filename is 'arch_diagram' and outformat is 'png'
    clean_code = code
    if 'filename=' not in clean_code:
        clean_code = clean_code.replace('with Diagram(', 'with Diagram(filename="arch_diagram", outformat="png", ')

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        script_file = tmp_path / "generate_diagram.py"
        script_file.write_text(clean_code, encoding="utf-8")

        try:
            res = subprocess.run(
                [sys.executable, str(script_file)],
                cwd=str(tmp_path),
                capture_output=True,
                text=True,
                timeout=15,
            )

            # Look for generated .png file
            png_files = list(tmp_path.glob("*.png"))
            if png_files:
                png_path = png_files[0]
                with open(png_path, "rb") as f:
                    b64_data = base64.b64encode(f.read()).decode("utf-8")
                return {
                    "success": True,
                    "image_base64": f"data:image/png;base64,{b64_data}",
                    "stdout": res.stdout,
                }
            else:
                err_msg = res.stderr or res.stdout or "Diagram image was not generated."
                return {
                    "success": False,
                    "error": f"Execution failed: {err_msg}",
                    "stderr": res.stderr,
                }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Diagram execution timed out after 15 seconds."}
        except Exception as e:
            return {"success": False, "error": f"Failed to execute diagram script: {str(e)}"}

