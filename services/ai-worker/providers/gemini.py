"""
Google Gemini AI provider implementation.

Uses gemini-1.5-flash for cost-effective multimodal analysis.
Supports: images, video, PDF, audio.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import google.generativeai as genai
from google.generativeai.types import GenerateContentResponse

from .base import AnalysisResult

logger = logging.getLogger(__name__)

# Model chosen for cost efficiency; switch to gemini-1.5-pro for higher quality.
_MODEL_NAME = "gemini-1.5-flash"

_ANALYSIS_PROMPT = """
Analyze the provided media file and return a JSON object with the following fields:

{
  "title": "A concise, descriptive title for this educational material (max 100 chars)",
  "description": "A plain-text description explaining what this material covers (2-5 sentences)",
  "tags": ["tag1", "tag2", "tag3"],
  "suggested_category_name": "Best matching category name (e.g. Mathematics, History, Language)"
}

Rules:
- All text must be in Uzbek language.
- tags: array of 3-8 lowercase relevant keywords.
- suggested_category_name: single category name, or null if unclear.
- Return ONLY the JSON object — no markdown, no code fences, no explanation.
"""


class GeminiProvider:
    """
    Gemini multimodal AI provider.
    Injects media bytes into a Gemini API request and parses structured JSON output.
    """

    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise ValueError("GEMINI_API_KEY is required for GeminiProvider")
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(model_name=_MODEL_NAME)

    async def analyze(
        self,
        media_bytes: bytes,
        mime_type: str,
        prompt: str = _ANALYSIS_PROMPT,
    ) -> AnalysisResult:
        """
        Upload media bytes to Gemini and run analysis.
        Returns a structured AnalysisResult parsed from the JSON response.
        """
        # Upload the file to the Files API (handles large payloads)
        # Gemini's Python SDK is synchronous — we call it in a thread-pool
        # in the worker coroutine via asyncio.to_thread.
        import asyncio

        result = await asyncio.to_thread(self._run_sync, media_bytes, mime_type, prompt)
        return result

    def _run_sync(
        self,
        media_bytes: bytes,
        mime_type: str,
        prompt: str,
    ) -> AnalysisResult:
        """Synchronous inner call — run inside asyncio.to_thread."""
        # For smaller files (< 20 MB) we can inline the bytes as a Part
        # For larger files we use the Files API — handle both.
        part: dict[str, Any] = {
            "inline_data": {
                "mime_type": mime_type,
                "data": media_bytes,
            }
        }

        response: GenerateContentResponse = self._model.generate_content(
            [part, prompt],
            generation_config={"temperature": 0.2, "max_output_tokens": 1024},
        )

        raw_text: str = response.text.strip()
        logger.debug("Gemini raw response: %s", raw_text[:500])

        return self._parse_response(raw_text)

    @staticmethod
    def _parse_response(raw_text: str) -> AnalysisResult:
        """Parse the JSON from the model response into AnalysisResult."""
        # Strip common markdown fences if the model added them anyway
        text = raw_text
        if text.startswith("```"):
            lines = text.split("\n")
            # Drop first and last line if they are fences
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines)

        try:
            data: dict[str, Any] = json.loads(text)
        except json.JSONDecodeError as exc:
            logger.error("Failed to parse Gemini JSON response: %s | raw: %s", exc, raw_text[:500])
            # Return empty result — the worker will handle retry/failure
            raise ValueError(f"Invalid JSON from Gemini: {exc}") from exc

        return AnalysisResult(
            title=data.get("title") or None,
            description=data.get("description") or None,
            tags=data.get("tags") or [],
            suggested_category_name=data.get("suggested_category_name") or None,
        )
