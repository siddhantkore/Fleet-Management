"""Abstract base class for LLM providers.

The LLM layer is used ONLY for summary generation, analysis, and
explainability — NOT for route planning or optimization decisions.
"""

from __future__ import annotations

from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Abstract base for all LLM integrations."""

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        """Generate a response from the LLM.

        Args:
            prompt: The user prompt / data to analyze.
            system_prompt: Optional system-level instructions.

        Returns:
            Generated text response.
        """
        ...

    @abstractmethod
    def name(self) -> str:
        """Return a human-readable provider name."""
        ...
