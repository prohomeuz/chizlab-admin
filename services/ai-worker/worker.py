"""
AI worker — entry point.

Uses arq (async Redis queue) to consume jobs from the 'ai-analysis' queue.
Each job: download media from MinIO → run AI analysis → POST result to NestJS.

Retry policy: 3 attempts, exponential backoff (1s, 2s, 4s).
On terminal failure: calls post_failure() to set status=needs_review.

Run: python -m arq worker.WorkerSettings
"""
from __future__ import annotations

import logging
import sys

from arq import cron
from arq.connections import RedisSettings

import callback
import storage
from config import get_settings
from providers.base import AIProvider, AnalysisResult
from providers.claude_stub import ClaudeProvider
from providers.gemini import GeminiProvider
from providers.openai_stub import OpenAIProvider

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Provider factory
# ---------------------------------------------------------------------------

def get_provider(settings=None) -> AIProvider:
    """
    Return the configured AI provider.

    Controlled by AI_PROVIDER env var:
      - "gemini"  → GeminiProvider (default, requires GEMINI_API_KEY)
      - "openai"  → OpenAIProvider stub (raises NotImplementedError)
      - "claude"  → ClaudeProvider stub (raises NotImplementedError)
    """
    if settings is None:
        settings = get_settings()

    provider_name = settings.ai_provider.lower()

    if provider_name == "gemini":
        return GeminiProvider(api_key=settings.gemini_api_key)
    elif provider_name == "openai":
        return OpenAIProvider(api_key=settings.openai_api_key)
    elif provider_name == "claude":
        return ClaudeProvider(api_key=settings.anthropic_api_key)
    else:
        raise ValueError(
            f"Unknown AI_PROVIDER: '{provider_name}'. "
            f"Valid options: gemini, openai, claude"
        )


# ---------------------------------------------------------------------------
# Job function
# ---------------------------------------------------------------------------

async def analyze_material(
    ctx: dict,
    *,
    material_id: str,
    media_url: str,
) -> None:
    """
    Main arq job function.

    Steps:
      1. Download media bytes from MinIO.
      2. Call the configured AI provider.
      3. POST result (success or failure) to NestJS internal callback.

    Retry is handled by arq via WorkerSettings.max_jobs / job_timeout,
    and additionally by tenacity inside this function for transient errors.

    On terminal failure (all retries exhausted), calls post_failure().
    """
    from tenacity import (
        retry,
        stop_after_attempt,
        wait_exponential,
        retry_if_exception_type,
        RetryError,
    )

    settings = get_settings()
    provider: AIProvider = get_provider(settings)

    logger.info("Starting analysis for material=%s url=%s", material_id, media_url)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=4),
        retry=retry_if_exception_type(Exception),
        reraise=True,
    )
    async def _analyze_with_retry() -> AnalysisResult:
        media_bytes, mime_type = await storage.download_media(media_url)
        return await provider.analyze(media_bytes, mime_type, "")

    try:
        result: AnalysisResult = await _analyze_with_retry()

        logger.info(
            "Analysis succeeded for material=%s title=%r tags=%s",
            material_id,
            result.title,
            result.tags,
        )

        await callback.post_success(
            material_id=material_id,
            title=result.title,
            description=result.description,
            tags=result.tags,
            # NOTE: The worker returns a category NAME, not a UUID.
            # NestJS does not accept a name — only suggestedCategoryId (UUID).
            # Category name → UUID resolution is intentionally left for a future
            # enhancement (e.g. fuzzy match categories table).
            # For now we pass None so NestJS skips category assignment.
            suggested_category_id=None,
        )

    except Exception as exc:  # noqa: BLE001
        error_msg = f"AI analysis failed after retries: {exc}"
        logger.error("Terminal failure for material=%s: %s", material_id, error_msg)

        try:
            await callback.post_failure(material_id=material_id, error_message=error_msg)
        except Exception as cb_exc:  # noqa: BLE001
            logger.error(
                "Failed to send failure callback for material=%s: %s",
                material_id,
                cb_exc,
            )


# ---------------------------------------------------------------------------
# arq WorkerSettings
# ---------------------------------------------------------------------------

class WorkerSettings:
    """
    arq WorkerSettings class.
    arq discovers this by convention when you run: python -m arq worker.WorkerSettings
    """

    functions = [analyze_material]

    @classmethod
    def get_redis_settings(cls) -> RedisSettings:
        settings = get_settings()
        # Parse redis://host:port
        url = settings.redis_url
        if url.startswith("redis://"):
            url = url[len("redis://"):]
        host, _, port_str = url.partition(":")
        port = int(port_str) if port_str else 6379
        return RedisSettings(host=host, port=port)

    # Queue name must match what NestJS enqueues to.
    # BullMQ uses "{queue}:{job_type}" as queue key — arq uses a simple key.
    # NestJS BullMQ queue name: "ai-analysis"
    queue_name = "ai-analysis"

    max_jobs = 10
    job_timeout = 300  # 5 minutes per job


# arq reads redis_settings as a class attribute at import time — not via an instance.
# A Python property() descriptor accessed on the class (not an instance) returns
# the property object itself, not the computed value, causing:
#   AttributeError: 'property' object has no attribute 'host'
# Assigning after the class body produces a plain RedisSettings object arq can introspect.
WorkerSettings.redis_settings = WorkerSettings.get_redis_settings()
