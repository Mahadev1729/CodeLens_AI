"""Services module providing core analysis, ingestion, retrieval, and LLM services."""

from rag.services.rag import ask_question, explain_file, retrieve_context, get_llm
from rag.services.loader import load_documents, get_repository_stats, iter_source_files
from rag.services.chunker import chunk_documents, get_text_splitter
from rag.services.clone_repo import clone_repository, get_repo_info, is_valid_repo_path, get_repo_local_path
from rag.services.embeddings import get_embeddings
from rag.services.vectorstore import (
    build_vectorstore,
    load_vectorstore,
    vectorstore_exists,
    get_vectorstore_path,
)
from rag.services.summary import generate_summary
from rag.services.bugfinder import find_bugs, parse_bugs
from rag.services.architecture import generate_architecture
from rag.services.readme_generator import generate_readme

__all__ = [
    "ask_question",
    "explain_file",
    "retrieve_context",
    "get_llm",
    "load_documents",
    "get_repository_stats",
    "iter_source_files",
    "chunk_documents",
    "get_text_splitter",
    "clone_repository",
    "get_repo_info",
    "is_valid_repo_path",
    "get_repo_local_path",
    "get_embeddings",
    "build_vectorstore",
    "load_vectorstore",
    "vectorstore_exists",
    "get_vectorstore_path",
    "generate_summary",
    "find_bugs",
    "parse_bugs",
    "generate_architecture",
    "generate_readme",
]
