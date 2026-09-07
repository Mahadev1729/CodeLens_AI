import os
from pathlib import Path
from typing import Optional
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from services.embeddings import get_embeddings


VECTORSTORE_DIR = Path("vectorstore")


def get_vectorstore_path(repo_name: str) -> str:
    return str(VECTORSTORE_DIR / repo_name)


def build_vectorstore(chunks: list[Document], repo_name: str) -> FAISS:
    embeddings = get_embeddings()
    store_path = get_vectorstore_path(repo_name)
    Path(store_path).mkdir(parents=True, exist_ok=True)

    vectorstore = FAISS.from_documents(chunks, embeddings)
    vectorstore.save_local(store_path)
    return vectorstore


def load_vectorstore(repo_name: str) -> Optional[FAISS]:
    store_path = get_vectorstore_path(repo_name)
    index_file = Path(store_path) / "index.faiss"
    if not index_file.exists():
        return None
    try:
        embeddings = get_embeddings()
        return FAISS.load_local(
            store_path,
            embeddings,
            allow_dangerous_deserialization=True,
        )
    except Exception:
        return None


def vectorstore_exists(repo_name: str) -> bool:
    store_path = Path(get_vectorstore_path(repo_name))
    return (store_path / "index.faiss").exists()
