import os
from langchain_groq import ChatGroq
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser


TOP_K = 5

RAG_PROMPT_TEMPLATE = """You are an expert software engineer and code reviewer analyzing a codebase.

You have been provided with relevant code snippets from the repository. Use them to answer the question thoroughly.

Relevant Code Context:
{context}

Question: {question}

Provide a comprehensive answer with the following structure:

**Explanation:**
[Detailed explanation of what was asked]

**Referenced Files:**
[List the specific files referenced in your answer]

**Reasoning:**
[Your step-by-step reasoning process]

**Confidence Level:** [High / Medium / Low]
[Brief justification for confidence level]

Answer:"""


def get_llm(api_key: str, model: str = "openai/gpt-oss-20b") -> ChatGroq:
    return ChatGroq(
        api_key=api_key,
        model=model,
        temperature=0.2,
        max_tokens=4096,
    )


def retrieve_context(vectorstore: FAISS, query: str, top_k: int = TOP_K) -> tuple[str, list[str]]:
    results = vectorstore.similarity_search(query, k=top_k)
    source_files = list({doc.metadata.get("source", "unknown") for doc in results})
    context_parts = []
    for doc in results:
        source = doc.metadata.get("source", "unknown")
        language = doc.metadata.get("language", "text")
        context_parts.append(f"File: {source}\n```{language}\n{doc.page_content}\n```")
    context = "\n\n---\n\n".join(context_parts)
    return context, source_files


def ask_question(
    vectorstore: FAISS,
    question: str,
    api_key: str,
    chat_history: list[dict] = None,
    model: str = "openai/gpt-oss-20b",
) -> tuple[str, list[str]]:
    llm = get_llm(api_key, model)
    context, source_files = retrieve_context(vectorstore, question)

    history_text = ""
    if chat_history:
        recent = chat_history[-6:]
        history_lines = []
        for msg in recent:
            role = msg.get("role", "user")
            content = msg.get("content", "")[:500]
            history_lines.append(f"{role.capitalize()}: {content}")
        if history_lines:
            history_text = "\n\nChat History (recent):\n" + "\n".join(history_lines)

    prompt_text = RAG_PROMPT_TEMPLATE + history_text
    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=prompt_text,
    )
    chain = prompt | llm | StrOutputParser()
    response = chain.invoke({"context": context, "question": question})
    return response, source_files


def explain_file(
    file_path: str,
    file_content: str,
    api_key: str,
    model: str = "openai/gpt-oss-20b",
) -> str:
    llm = get_llm(api_key, model)
    language = file_path.split(".")[-1] if "." in file_path else "text"
    truncated = file_content[:6000] if len(file_content) > 6000 else file_content

    prompt = f"""You are an expert software engineer. Analyze the following source file and provide a comprehensive explanation.

File: {file_path}

```{language}
{truncated}
```

Provide:
1. **Purpose**: What this file does
2. **Key Components**: Classes, functions, or structures defined
3. **Dependencies**: What it imports or depends on
4. **Role in Project**: How it fits into the overall architecture
5. **Notable Patterns**: Design patterns or interesting implementation details"""

    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content
