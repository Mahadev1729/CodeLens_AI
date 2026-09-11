import os
import re
from pathlib import Path
from typing import Optional


IGNORED_DIRS = {
    ".git", "node_modules", "dist", "build", "target",
    ".next", "venv", "__pycache__", ".idea", ".vscode",
    ".env", ".tox", "coverage", ".coverage", "htmlcov",
    "eggs", ".eggs", "wheels", ".mypy_cache", ".pytest_cache",
}

IGNORED_FILES = {
    "package-lock.json", "yarn.lock", ".DS_Store",
    "Thumbs.db", ".gitignore", ".gitattributes",
}

BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".svg", ".ico",
    ".mp4", ".avi", ".mov", ".mkv", ".mp3", ".wav", ".ogg",
    ".zip", ".tar", ".gz", ".rar", ".7z", ".exe", ".dll",
    ".so", ".dylib", ".bin", ".dat", ".db", ".sqlite",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".class", ".jar", ".war", ".pyc", ".pyo", ".pyd",
    ".lock", ".woff", ".woff2", ".ttf", ".eot", ".otf",
}

SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".cpp",
    ".c", ".cs", ".go", ".php", ".rb", ".swift", ".kt",
    ".rs", ".html", ".css", ".sql", ".json", ".yaml",
    ".yml", ".md", ".txt", ".sh", ".bash", ".zsh",
    ".toml", ".ini", ".cfg", ".env", ".xml", ".gradle",
    ".makefile", ".dockerfile", ".tf", ".vue", ".scss", ".sass",
}

LANGUAGE_MAP = {
    ".py": "python", ".js": "javascript", ".ts": "typescript",
    ".tsx": "tsx", ".jsx": "jsx", ".java": "java",
    ".cpp": "cpp", ".c": "c", ".cs": "csharp",
    ".go": "go", ".php": "php", ".rb": "ruby",
    ".swift": "swift", ".kt": "kotlin", ".rs": "rust",
    ".html": "html", ".css": "css", ".sql": "sql",
    ".json": "json", ".yaml": "yaml", ".yml": "yaml",
    ".md": "markdown", ".sh": "bash", ".bash": "bash",
    ".toml": "toml", ".xml": "xml", ".vue": "vue",
    ".scss": "scss", ".sass": "sass", ".tf": "hcl",
}


def is_ignored_dir(dir_name: str) -> bool:
    return dir_name in IGNORED_DIRS or dir_name.startswith(".")


def is_binary_file(file_path: str) -> bool:
    ext = Path(file_path).suffix.lower()
    return ext in BINARY_EXTENSIONS


def is_supported_file(file_path: str) -> bool:
    path = Path(file_path)
    if path.name in IGNORED_FILES:
        return False
    ext = path.suffix.lower()
    return ext in SUPPORTED_EXTENSIONS


def get_language(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    return LANGUAGE_MAP.get(ext, "text")


def get_file_size_str(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"


def truncate_text(text: str, max_chars: int = 3000) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + f"\n\n... [Truncated. Total length: {len(text)} characters]"


def extract_repo_name(url: str) -> str:
    url = url.rstrip("/")
    if url.endswith(".git"):
        url = url[:-4]
    parts = url.split("/")
    return parts[-1] if parts else "unknown_repo"


def build_folder_tree(root_path: str, max_depth: int = 4) -> str:
    lines = []
    root = Path(root_path)

    def recurse(current: Path, prefix: str, depth: int):
        if depth > max_depth:
            return
        try:
            entries = sorted(current.iterdir(), key=lambda e: (e.is_file(), e.name.lower()))
        except PermissionError:
            return
        entries = [
            e for e in entries
            if not (e.is_dir() and is_ignored_dir(e.name))
            and not (e.is_file() and (is_binary_file(str(e)) or e.name in IGNORED_FILES))
        ]
        for i, entry in enumerate(entries):
            connector = "└── " if i == len(entries) - 1 else "├── "
            lines.append(f"{prefix}{connector}{entry.name}")
            if entry.is_dir():
                extension = "    " if i == len(entries) - 1 else "│   "
                recurse(entry, prefix + extension, depth + 1)

    lines.append(root.name)
    recurse(root, "", 1)
    return "\n".join(lines)


def sanitize_filename(name: str) -> str:
    return re.sub(r'[^\w\-_\. ]', '_', name)


def count_lines(text: str) -> int:
    return len(text.splitlines())


def safe_read_file(file_path: str, max_size_mb: float = 2.0) -> Optional[str]:
    try:
        size = os.path.getsize(file_path)
        if size > max_size_mb * 1024 * 1024:
            return None
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception:
        return None


def load_css(css_path: Optional[Path | str] = None) -> None:
    """Loads and injects the global stylesheet from static/style.css."""
    import streamlit as st
    if css_path is None:
        css_path = Path(__file__).resolve().parents[1] / "static" / "style.css"
    path = Path(css_path)
    if path.exists():
        with path.open("r", encoding="utf-8") as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

