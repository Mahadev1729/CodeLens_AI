from functools import lru_cache
from typing import Any

MODEL_NAME = "BAAI/bge-small-en-v1.5"


@lru_cache(maxsize=1)
def get_embeddings() -> Any:
    try:
        from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
        return FastEmbedEmbeddings(model_name=MODEL_NAME)
    except Exception:
        # Fallback to HuggingFace embeddings if fastembed is unavailable
        import torch
        torch.set_num_threads(1)
        torch.set_grad_enabled(False)
        from langchain_huggingface import HuggingFaceEmbeddings

        return HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True, "batch_size": 16},
        )
