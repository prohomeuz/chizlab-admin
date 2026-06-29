"""
AI worker — entry point.

Reads jobs from a Redis list (chizlab:ai:pending) using BRPOP.
Each job: download media from MinIO → run AI analysis → POST result to NestJS.

Run: python worker.py
"""
from __future__ import annotations

import asyncio
import json
import logging
import signal
import sys

import redis.asyncio as aioredis

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

AI_JOBS_KEY = "chizlab:ai:pending"
MAX_RETRIES = 1
PROGRESS_TTL = 3600  # seconds


async def _set_progress(redis_client: aioredis.Redis, material_id: str, pct: int) -> None:
    await redis_client.set(f"material:{material_id}:progress", str(pct), ex=PROGRESS_TTL)


async def _progress_heartbeat(
    redis_client: aioredis.Redis,
    material_id: str,
    start: int,
    end: int,
    total_seconds: float,
) -> None:
    """Continuously increments progress from start+1 to end over total_seconds.
    Designed to run as a concurrent task during slow operations (AI call, large download).
    Cancelled externally when the real operation completes.
    """
    steps = end - start
    if steps <= 0:
        return
    delay = total_seconds / steps
    for pct in range(start + 1, end + 1):
        await asyncio.sleep(delay)
        await _set_progress(redis_client, material_id, pct)


def get_provider(settings=None) -> AIProvider:
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
        raise ValueError(f"Unknown AI_PROVIDER: '{provider_name}'")


async def process_job(
    redis_client: aioredis.Redis,
    provider: AIProvider,
    material_id: str,
    media_url: str,
) -> None:
    logger.info("Processing job: material=%s url=%s", material_id, media_url)

    # ── Step 1: Job received ────────────────────────────────────────────────
    await _set_progress(redis_client, material_id, 3)

    last_error: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            # ── Step 2: Download from MinIO (heartbeat 3→28 over 5s) ─────────
            await _set_progress(redis_client, material_id, 8)
            download_heartbeat = asyncio.create_task(
                _progress_heartbeat(redis_client, material_id, 8, 28, 5.0)
            )
            try:
                media_bytes, mime_type = await storage.download_media(media_url)
            finally:
                download_heartbeat.cancel()

            await _set_progress(redis_client, material_id, 30)
            logger.info("Downloaded %d bytes (mime=%s)", len(media_bytes), mime_type)

            # ── Step 3: Prepare AI request ────────────────────────────────────
            await _set_progress(redis_client, material_id, 35)

            # ── Step 4: AI analysis (heartbeat 35→78 over 45s) ───────────────
            # 45s is a generous estimate; heartbeat is cancelled when AI returns.
            # This gives ~1 %/sec movement so the badge always looks alive.
            ai_heartbeat = asyncio.create_task(
                _progress_heartbeat(redis_client, material_id, 35, 78, 45.0)
            )
            try:
                result: AnalysisResult = await provider.analyze(media_bytes, mime_type, "")
            finally:
                ai_heartbeat.cancel()

            await _set_progress(redis_client, material_id, 80)
            logger.info(
                "Analysis OK: material=%s title=%r tags=%s",
                material_id,
                result.title,
                result.tags,
            )

            # ── Step 5: Parse & send callback ─────────────────────────────────
            await _set_progress(redis_client, material_id, 88)

            await callback.post_success(
                material_id=material_id,
                title=result.title,
                description=result.description,
                blurb=result.blurb,
                tags=result.tags,
                authors=result.authors,
                language=result.language,
                publish_year=result.publish_year,
                country=result.country,
                page_count=result.page_count,
                suggested_category_id=None,
            )

            # ── Step 6: Done (status → ready on next poll) ────────────────────
            await _set_progress(redis_client, material_id, 96)
            return

        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning(
                "Attempt %d/%d failed for material=%s: %s",
                attempt,
                MAX_RETRIES,
                material_id,
                exc,
            )
            if attempt < MAX_RETRIES:
                await asyncio.sleep(2 ** attempt)

    error_msg = f"AI analysis failed after {MAX_RETRIES} attempts: {last_error}"
    logger.error("Terminal failure: material=%s — %s", material_id, error_msg)
    try:
        await callback.post_failure(material_id=material_id, error_message=error_msg)
    except Exception as cb_exc:  # noqa: BLE001
        logger.error("Callback post_failure also failed: %s", cb_exc)


async def main() -> None:
    settings = get_settings()
    provider = get_provider(settings)

    redis_client = await aioredis.from_url(settings.redis_url)
    logger.info("Worker started. Listening on Redis list '%s' …", AI_JOBS_KEY)

    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def _handle_signal():
        logger.info("Shutdown signal received.")
        stop_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _handle_signal)

    try:
        while not stop_event.is_set():
            # BRPOP blocks up to 2 seconds then returns None — allows checking stop_event
            result = await redis_client.brpop(AI_JOBS_KEY, timeout=2)
            if result is None:
                continue

            _, raw = result
            try:
                job = json.loads(raw)
                material_id: str = job["materialId"]
                media_url: str = job["mediaUrl"]
            except (json.JSONDecodeError, KeyError) as e:
                logger.error("Malformed job payload: %r — %s", raw, e)
                continue

            await process_job(redis_client, provider, material_id, media_url)

    finally:
        await redis_client.aclose()
        logger.info("Worker stopped.")


if __name__ == "__main__":
    asyncio.run(main())
