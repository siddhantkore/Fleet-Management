"""Ollama LLM provider implementation (local)."""

from __future__ import annotations

import json
import logging
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.llm.base import LLMProvider

logger = logging.getLogger(__name__)


class OllamaProvider(LLMProvider):
    """LLM provider using a local Ollama instance."""

    def __init__(self):
        self.host = os.getenv("OLLAMA_HOST", "http://localhost:11434")
        self.model = os.getenv("OLLAMA_MODEL", "qwen2:7b")
        self.timeout = 120  # local models can be slower

    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        url = f"{self.host}/api/generate"

        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"

        payload = json.dumps({
            "model": self.model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "num_predict": 1500,
            },
        }).encode("utf-8")

        req = Request(
            url,
            data=payload,
            method="POST",
            headers={"Content-Type": "application/json"},
        )

        try:
            with urlopen(req, timeout=self.timeout) as response:
                data = json.loads(response.read().decode("utf-8"))
                return data.get("response", "[No response from Ollama]")
        except (HTTPError, URLError, TimeoutError, KeyError, json.JSONDecodeError) as exc:
            logger.error(f"Ollama API error: {exc}")
            return f"[AI summary unavailable - Ollama: {exc}]"

    def name(self) -> str:
        return f"Ollama ({self.model})"
