import os
from langchain_groq import ChatGroq
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser


TOP_K = 5

RAG_PROMPT_TEMPLATE = """You are an expert AI code mentor and technical assistant analyzing a codebase.

Your goal is to answer the user's question accurately, clearly, and in a format that is immediately easy to read and understand.

Relevant Code Snippets from the Repository:
{context}

Recent Chat History:
{chat_history}

User Question: {question}

Guidelines for your response:
1. **Direct & Clear Summary**: Begin with a 1-2 sentence direct answer or high-level summary.
2. **Key Breakdown / Explanation**: Use clear bullet points or numbered steps to explain the concept, workflow, or logic simply.
3. **Code Examples / Snippets** (if applicable): Provide concise, syntax-highlighted code blocks showing relevant functions or patterns.
4. **Relevant Files**: Mention which specific files in the repository handle this functionality so the user can easily locate them.
5. **Practical Notes**: Add tips, best practices, or potential edge cases if helpful.

Format cleanly using Markdown (headers `###`, bullet points, bold key terms, and code blocks). Avoid unnecessary jargon or robotic filler.

Answer:"""


from rag.llm.llm_client import get_llm, invoke_with_fallback, DEFAULT_GROQ_MODEL


def retrieve_context(vectorstore: FAISS, query: str, top_k: int = TOP_K) -> tuple[str, list[str]]:
    results = vectorstore.similarity_search(query, k=top_k)
    source_files = list({doc.metadata.get("source", "unknown")
                        for doc in results})
    context_parts = []
    for doc in results:
        source = doc.metadata.get("source", "unknown")
        language = doc.metadata.get("language", "text")
        context_parts.append(
            f"File: {source}\n```{language}\n{doc.page_content}\n```")
    context = "\n\n---\n\n".join(context_parts)
    return context, source_files


def ask_question(
    vectorstore: FAISS,
    question: str,
    api_key: str,
    chat_history: list[dict] = None,
    model: str = DEFAULT_GROQ_MODEL,
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
            history_text = "\n\nChat History (recent):\n" + \
                "\n".join(history_lines)

    prompt = PromptTemplate(
        input_variables=["context", "question", "chat_history"],
        template=RAG_PROMPT_TEMPLATE,
    )
    chain = prompt | llm | StrOutputParser()
    response = chain.invoke({
        "context": context,
        "question": question,
        "chat_history": history_text or "No previous chat history.",
    })
    return response, source_files


def explain_file(
    file_path: str,
    file_content: str,
    api_key: str,
    model: str = DEFAULT_GROQ_MODEL,
) -> str:
    language = file_path.split(".")[-1] if "." in file_path else "text"
    truncated = file_content[:6000] if len(
        file_content) > 6000 else file_content

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

    return invoke_with_fallback(
        api_key=api_key,
        prompt_or_messages=prompt,
        model=model,
        temperature=0.2,
        max_tokens=4096,
    )
