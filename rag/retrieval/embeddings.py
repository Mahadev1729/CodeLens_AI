from functools import lru_cache
from typing import Any
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

MODEL_NAME = "BAAI/bge-small-en-v1.5"


@lru_cache(maxsize=1)
def get_embeddings() -> Any:
    """Returns the cached FastEmbed embedding model (BAAI/bge-small-en-v1.5)."""
    return FastEmbedEmbeddings(model_name=MODEL_NAME)
