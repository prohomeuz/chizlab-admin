"""
Anthropic Claude provider stub.

This is a placeholder implementation.  It raises NotImplementedError with a
helpful message so developers know exactly what to do when they want to enable
Claude support.

To implement:
  1. pip install anthropic
  2. Replace the NotImplementedError body with a real Anthropic API call.
  3. Update get_provider() in worker.py if needed.
"""
from __future__ import annotations

from .base import AnalysisResult


class ClaudeProvider:
    """
    Anthropic Claude provider stub — not implemented yet.

    Switch to this provider by setting AI_PROVIDER=claude and ANTHROPIC_API_KEY.
    """

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    async def analyze(
        self,
        media_bytes: bytes,
        mime_type: str,
        prompt: str,
    ) -> AnalysisResult:
        raise NotImplementedError(
            "Anthropic Claude provider is not implemented yet.\n"
            "To enable it:\n"
            "  1. Install: pip install anthropic\n"
            "  2. Implement this method using the Anthropic Messages API with vision.\n"
            "  3. Set AI_PROVIDER=claude and ANTHROPIC_API_KEY in your .env file."
        )
