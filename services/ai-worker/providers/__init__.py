"""
AI provider implementations.
Switch the active provider via the AI_PROVIDER env variable.
"""
from .base import AIProvider, AnalysisResult
from .gemini import GeminiProvider
from .openai_stub import OpenAIProvider
from .claude_stub import ClaudeProvider

__all__ = [
    "AIProvider",
    "AnalysisResult",
    "GeminiProvider",
    "OpenAIProvider",
    "ClaudeProvider",
]
