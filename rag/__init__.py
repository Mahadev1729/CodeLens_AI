"""RAG (Retrieval-Augmented Generation) and Codebase Intelligence Package."""

from rag.retrieval.embeddings import get_embeddings
from rag.retrieval.vectorstore import (
    build_vectorstore,
    load_vectorstore,
    vectorstore_exists,
    get_vectorstore_path,
)
from rag.llm.rag import ask_question, explain_file, retrieve_context, get_llm
from rag.ingestion.loader import load_documents, get_repository_stats, iter_source_files
from rag.ingestion.chunker import chunk_documents, get_text_splitter
from rag.ingestion.clone_repo import clone_repository, get_repo_info, is_valid_repo_path, get_repo_local_path
from rag.llm.summary import generate_summary
from rag.llm.bugfinder import find_bugs, parse_bugs
from rag.llm.architecture import (
    generate_architecture,
    extract_mermaid_diagram,
    extract_python_diagram,
    render_python_diagram,
)
from rag.llm.readme_generator import generate_readme

import rag.ingestion as ingestion
import rag.retrieval as retrieval
import rag.llm as llm

__all__ = [
    "get_embeddings",
    "build_vectorstore",
    "load_vectorstore",
    "vectorstore_exists",
    "get_vectorstore_path",
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
    "generate_summary",
    "find_bugs",
    "parse_bugs",
    "generate_architecture",
    "extract_mermaid_diagram",
    "extract_python_diagram",
    "render_python_diagram",
    "generate_readme",
    "ingestion",
    "retrieval",
    "llm",
]
