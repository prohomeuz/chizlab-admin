"""
Google Gemini AI provider implementation.

Uses gemini-1.5-flash for cost-effective multimodal analysis.
Supports: PDF, DOC, DOCX, PPT, PPTX and other document formats.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import google.generativeai as genai
from google.generativeai.types import GenerateContentResponse

from .base import AnalysisResult

logger = logging.getLogger(__name__)

_MODEL_NAME = "gemini-2.0-flash"

_ANALYSIS_PROMPT = """
Analyze the provided educational material and return a JSON object with these fields:

{
  "title": "Concise, descriptive title (max 100 chars)",
  "description": "Plain-text summary of what this material covers (2-5 sentences)",
  "blurb": "Short marketing teaser that motivates a student to read this (1-2 sentences, engaging tone)",
  "tags": ["keyword1", "keyword2", "keyword3"],
  "authors": ["Author Name 1", "Author Name 2"],
  "language": "Language the document is written in (e.g. O'zbek, Rus, Ingliz)",
  "publish_year": 2023,
  "country": "Country of publication (e.g. O'zbekiston, Rossiya)",
  "page_count": 148,
  "suggested_category_name": "Best matching academic category (e.g. Matematika, Tarix, Informatika)"
}

Rules:
- All text fields (title, description, blurb, tags) must be in Uzbek language.
- tags: 5-8 lowercase Uzbek keywords relevant to the content.
- authors: extract from the document cover/header; empty array [] if not found.
- language: detect from the document's content language; use Uzbek name of language.
- publish_year: integer year (e.g. 2023) or null if not found.
- country: null if not found.
- page_count: integer or null if not determinable.
- suggested_category_name: single category name, or null if unclear.
- Return ONLY the raw JSON object — no markdown fences, no explanation.
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
        part: dict[str, Any] = {
            "inline_data": {
                "mime_type": mime_type,
                "data": media_bytes,
            }
        }

        response: GenerateContentResponse = self._model.generate_content(
            [part, prompt],
            generation_config={"temperature": 0.2, "max_output_tokens": 2048},
        )

        raw_text: str = response.text.strip()
        logger.debug("Gemini raw response: %s", raw_text[:800])

        return self._parse_response(raw_text)

    @staticmethod
    def _parse_response(raw_text: str) -> AnalysisResult:
        """Parse the JSON from the model response into AnalysisResult."""
        text = raw_text
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines)

        try:
            data: dict[str, Any] = json.loads(text)
        except json.JSONDecodeError as exc:
            logger.error(
                "Failed to parse Gemini JSON response: %s | raw: %s",
                exc,
                raw_text[:500],
            )
            raise ValueError(f"Invalid JSON from Gemini: {exc}") from exc

        publish_year = data.get("publish_year")
        if publish_year is not None:
            try:
                publish_year = int(publish_year)
                if not (1900 <= publish_year <= 2100):
                    publish_year = None
            except (TypeError, ValueError):
                publish_year = None

        page_count = data.get("page_count")
        if page_count is not None:
            try:
                page_count = int(page_count)
                if page_count < 1:
                    page_count = None
            except (TypeError, ValueError):
                page_count = None

        authors = data.get("authors") or []
        if not isinstance(authors, list):
            authors = []
        authors = [str(a) for a in authors if a]

        tags = data.get("tags") or []
        if not isinstance(tags, list):
            tags = []
        tags = [str(t) for t in tags if t]

        return AnalysisResult(
            title=data.get("title") or None,
            description=data.get("description") or None,
            blurb=data.get("blurb") or None,
            tags=tags,
            authors=authors,
            language=data.get("language") or None,
            publish_year=publish_year,
            country=data.get("country") or None,
            page_count=page_count,
            suggested_category_name=data.get("suggested_category_name") or None,
        )
