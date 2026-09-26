import os
import gc
from pathlib import Path
from typing import Optional
from langchain_core.documents import Document
from langchain_community.vectorstores import FAISS
from rag.services.embeddings import get_embeddings


try:
    from backend.config import PROJECT_DIR
    VECTORSTORE_DIR = PROJECT_DIR / "vectorstore"
except Exception:
    VECTORSTORE_DIR = Path("vectorstore")

MAX_INDEX_CHUNKS = 60
BATCH_SIZE = 10


def get_vectorstore_path(repo_name: str) -> str:
    return str(VECTORSTORE_DIR / repo_name)


def build_vectorstore(chunks: list[Document], repo_name: str) -> FAISS:
    embeddings = get_embeddings()
    store_path = get_vectorstore_path(repo_name)
    Path(store_path).mkdir(parents=True, exist_ok=True)

    target_chunks = chunks[:MAX_INDEX_CHUNKS]
    vectorstore = None
    for i in range(0, len(target_chunks), BATCH_SIZE):
        batch = target_chunks[i:i + BATCH_SIZE]
        if vectorstore is None:
            vectorstore = FAISS.from_documents(batch, embeddings)
        else:
            vectorstore.add_documents(batch)
        gc.collect()

    if vectorstore is not None:
        vectorstore.save_local(store_path)
    gc.collect()
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
