import os
from pathlib import Path
from typing import Generator
from langchain_core.documents import Document
from utils.helper import (
    is_ignored_dir,
    is_supported_file,
    safe_read_file,
    get_language,
)


def iter_source_files(repo_path: str) -> Generator[Path, None, None]:
    root = Path(repo_path)
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [
            d for d in dirnames
            if not is_ignored_dir(d)
        ]
        for filename in filenames:
            file_path = Path(dirpath) / filename
            if is_supported_file(str(file_path)):
                yield file_path


def load_documents(repo_path: str) -> tuple[list[Document], list[str]]:
    documents = []
    skipped_files = []
    root = Path(repo_path)

    for file_path in iter_source_files(repo_path):
        relative_path = str(file_path.relative_to(root))
        content = safe_read_file(str(file_path))
        if content is None:
            skipped_files.append(relative_path)
            continue
        if not content.strip():
            continue

        metadata = {
            "source": relative_path,
            "file_path": str(file_path),
            "filename": file_path.name,
            "extension": file_path.suffix.lower(),
            "language": get_language(str(file_path)),
        }
        documents.append(Document(page_content=content, metadata=metadata))

    return documents, skipped_files


def get_repository_stats(repo_path: str) -> dict:
    total_files = 0
    total_lines = 0
    extension_counts: dict[str, int] = {}
    file_list = []
    root = Path(repo_path)

    for file_path in iter_source_files(repo_path):
        relative_path = str(file_path.relative_to(root))
        content = safe_read_file(str(file_path))
        ext = file_path.suffix.lower()

        total_files += 1
        extension_counts[ext] = extension_counts.get(ext, 0) + 1

        if content:
            lines = len(content.splitlines())
            total_lines += lines
            size = file_path.stat().st_size
            file_list.append({
                "path": relative_path,
                "filename": file_path.name,
                "extension": ext,
                "lines": lines,
                "size": size,
            })

    return {
        "total_files": total_files,
        "total_lines": total_lines,
        "extension_counts": extension_counts,
        "file_list": sorted(file_list, key=lambda x: x["path"]),
    }
