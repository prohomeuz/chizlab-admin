"""
Base AIProvider protocol and shared types.
All AI provider implementations must conform to this protocol.
"""
from __future__ import annotations

from typing import Protocol, runtime_checkable

from pydantic import BaseModel


class AnalysisResult(BaseModel):
    """Structured result returned by AI analysis."""

    title: str | None = None
    description: str | None = None
    blurb: str | None = None
    tags: list[str] = []
    authors: list[str] = []
    language: str | None = None
    publish_year: int | None = None
    publish_place: str | None = None
    country: str | None = None
    page_count: int | None = None
    suggested_category_name: str | None = None


@runtime_checkable
class AIProvider(Protocol):
    """
    Protocol that every AI provider adapter must implement.

    The analyze method receives raw media bytes plus MIME type and a
    prompt string.  It returns a structured AnalysisResult.

    To add a new provider:
      1. Create a new file in this package (e.g. my_provider.py).
      2. Implement a class that satisfies this protocol.
      3. Register it in worker.py::get_provider().
    """

    async def analyze(
        self,
        media_bytes: bytes,
        mime_type: str,
        prompt: str,
    ) -> AnalysisResult:
        """
        Analyze media and return structured metadata.

        Args:
            media_bytes: Raw bytes of the media file.
            mime_type:   MIME type string (e.g. 'application/pdf').
            prompt:      Instruction prompt for the AI model.

        Returns:
            AnalysisResult with AI-generated fields.
        """
        ...
