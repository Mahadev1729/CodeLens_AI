import logging
from typing import List, Union, Any
from langchain_groq import ChatGroq
from langchain_core.messages import BaseMessage, HumanMessage

logger = logging.getLogger("codementor.llm")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

# Groq fallback priority list
FALLBACK_MODELS: List[str] = [
    "openai/gpt-oss-120b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it",
    "mixtral-8x7b-32768",
    "openai/gpt-oss-20b",
]

DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"


def get_fallback_model_list(preferred_model: str = DEFAULT_GROQ_MODEL) -> List[str]:
    """
    Returns an ordered list of models starting with the preferred model
    followed by the remaining fallback candidates.
    """
    cleaned_preferred = (preferred_model or DEFAULT_GROQ_MODEL).strip()
    ordered = [cleaned_preferred] if cleaned_preferred else [DEFAULT_GROQ_MODEL]

    for model in FALLBACK_MODELS:
        if model not in ordered:
            ordered.append(model)
    return ordered


def get_llm(
    api_key: str,
    model: str = DEFAULT_GROQ_MODEL,
    temperature: float = 0.2,
    max_tokens: int = 4096,
):
    """
    Creates a LangChain ChatGroq instance configured with automatic LangChain fallbacks
    across alternative Groq models.
    """
    models = get_fallback_model_list(model)
    primary_model = models[0]
    fallback_models = models[1:]

    primary_chat = ChatGroq(
        api_key=api_key,
        model=primary_model,
        temperature=temperature,
        max_tokens=max_tokens,
    )

    if not fallback_models:
        return primary_chat

    fallback_chats = [
        ChatGroq(
            api_key=api_key,
            model=m,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        for m in fallback_models
    ]

    return primary_chat.with_fallbacks(fallback_chats)


def invoke_with_fallback(
    api_key: str,
    prompt_or_messages: Union[str, List[BaseMessage]],
    model: str = DEFAULT_GROQ_MODEL,
    temperature: float = 0.2,
    max_tokens: int = 4096,
) -> str:
    """
    Invokes Groq with robust iterative fallback across candidate models.
    If a model fails due to rate limits, deprecation, or server downtime,
    it automatically falls back to the next available model in the sequence.
    """
    models_to_try = get_fallback_model_list(model)
    last_error: Exception = None

    if isinstance(prompt_or_messages, str):
        messages = [HumanMessage(content=prompt_or_messages)]
    else:
        messages = prompt_or_messages

    for idx, current_model in enumerate(models_to_try):
        try:
            logger.info(f"[LLM] Attempting inference with model: {current_model}")
            chat = ChatGroq(
                api_key=api_key,
                model=current_model,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            response = chat.invoke(messages)
            if idx > 0:
                logger.info(f"[LLM Fallback Success] Succeeded using fallback model: {current_model}")
            return response.content
        except Exception as e:
            last_error = e
            next_model = models_to_try[idx + 1] if idx + 1 < len(models_to_try) else None
            if next_model:
                logger.warning(
                    f"[LLM Fallback] Model '{current_model}' failed: {e}. "
                    f"Automatically falling back to '{next_model}'..."
                )
            else:
                logger.error(f"[LLM Error] All models failed. Last error: {e}")

    raise RuntimeError(f"All Groq fallback models failed. Last error: {last_error}") from last_error
