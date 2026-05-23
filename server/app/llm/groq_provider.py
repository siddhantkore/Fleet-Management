"""Groq LLM provider implementation."""

from __future__ import annotations

import json
import logging
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.llm.base import LLMProvider

logger = logging.getLogger(__name__)


class GroqProvider(LLMProvider):
    """LLM provider using the Groq API (cloud-hosted)."""

    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self.timeout = 30

    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        if not self.api_key:
            return "[Groq API key not configured]"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = json.dumps({
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 1500,
        }).encode("utf-8")

        req = Request(
            self.base_url,
            data=payload,
            method="POST",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
        )

        try:
            with urlopen(req, timeout=self.timeout) as response:
                data = json.loads(response.read().decode("utf-8"))
                return data["choices"][0]["message"]["content"]
        except HTTPError as exc:
            err_body = exc.read().decode("utf-8")
            logger.error(f"Groq API HTTPError {exc.code}: {err_body}")
            return f"[AI summary unavailable: HTTP Error {exc.code}: {exc.reason}]"
        except (URLError, TimeoutError, KeyError, json.JSONDecodeError) as exc:
            logger.error(f"Groq API error: {exc}")
            return f"[AI summary unavailable: {exc}]"

    def name(self) -> str:
        return f"Groq ({self.model})"
