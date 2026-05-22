"""LLM provider factory — reads LLM_PROVIDER from .env and returns the appropriate backend."""

from __future__ import annotations

import logging
import os

from app.llm.base import LLMProvider

logger = logging.getLogger(__name__)

_cached_provider: LLMProvider | None = None


def get_llm_provider() -> LLMProvider:
    """Create and return the configured LLM provider.

    Reads LLM_PROVIDER from environment:
      - "groq"   → Groq cloud API
      - "ollama" → Local Ollama instance

    Returns:
        An instance of LLMProvider.
    """
    global _cached_provider
    if _cached_provider is not None:
        return _cached_provider

    provider_name = os.getenv("LLM_PROVIDER", "groq").lower().strip()

    if provider_name == "groq":
        from app.llm.groq_provider import GroqProvider
        _cached_provider = GroqProvider()
    elif provider_name == "ollama":
        from app.llm.ollama_provider import OllamaProvider
        _cached_provider = OllamaProvider()
    else:
        logger.warning(f"Unknown LLM_PROVIDER '{provider_name}', falling back to Groq")
        from app.llm.groq_provider import GroqProvider
        _cached_provider = GroqProvider()

    logger.info(f"LLM provider initialized: {_cached_provider.name()}")
    return _cached_provider
