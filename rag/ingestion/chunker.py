from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter


CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200


def get_text_splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", " ", ""],
    )


def chunk_documents(documents: list[Document]) -> list[Document]:
    splitter = get_text_splitter()
    chunks = []
    for doc in documents:
        split_docs = splitter.split_documents([doc])
        for i, chunk in enumerate(split_docs):
            chunk.metadata["chunk_index"] = i
            chunk.metadata["total_chunks"] = len(split_docs)
        chunks.extend(split_docs)
    return chunks
