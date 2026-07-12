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

import fitz  # PyMuPDF
import redis.asyncio as aioredis

import callback
import cover_generator
import office_convert
import page_prep
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
PAGE_PREP_JOBS_KEY = "chizlab:pages:pending"
COVER_JOBS_KEY = "chizlab:cover:pending"
MAX_RETRIES = 3
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


async def _slice_to_selected_pages(
    media_bytes: bytes, mime_type: str, selected_pages: list[int]
) -> tuple[bytes, str]:
    """Reduce a document to only the given 1-indexed pages, returning (pdf_bytes, 'application/pdf')."""
    pdf_bytes = await office_convert.ensure_pdf(media_bytes, mime_type)
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    doc.select([p - 1 for p in selected_pages])
    return doc.tobytes(), office_convert.PDF_MIME


async def process_job(
    redis_client: aioredis.Redis,
    provider: AIProvider,
    material_id: str,
    media_url: str,
    selected_pages: list[int] | None = None,
) -> None:
    logger.info(
        "Processing job: material=%s url=%s selectedPages=%s",
        material_id,
        media_url,
        selected_pages,
    )

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

            # ── Step 3: Prepare AI request (restrict to selected pages, if any) ──
            if selected_pages:
                media_bytes, mime_type = await _slice_to_selected_pages(
                    media_bytes, mime_type, selected_pages
                )
                logger.info(
                    "Sliced document to %d selected page(s) for material=%s",
                    len(selected_pages),
                    material_id,
                )
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

            # ── Step 5: Generate cover image ──────────────────────────────────
            await _set_progress(redis_client, material_id, 85)
            cover_url: str | None = None
            try:
                cover_bytes = cover_generator.generate_cover(
                    title=result.title or "",
                    authors=result.authors or [],
                    publish_year=result.publish_year,
                    publish_place=result.publish_place,
                    country=result.country,
                )
                cover_url = await storage.upload_cover(
                    cover_bytes,
                    f"cover-{material_id}.jpg",
                )
                logger.info("Cover generated and uploaded: %s", cover_url)
            except Exception as cover_exc:  # noqa: BLE001
                logger.warning("Cover generation failed (non-fatal): %s", cover_exc)

            # ── Step 6: Parse & send callback ─────────────────────────────────
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
                publish_place=result.publish_place,
                country=result.country,
                page_count=result.page_count,
                suggested_category_id=None,
                cover_url=cover_url,
            )

            # ── Step 7: Done (status → ready on next poll) ────────────────────
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


async def process_cover_job(
    material_id: str,
    title: str,
    authors: list[str],
    publish_year: int | None,
    publish_place: str | None,
    country: str | None,
) -> None:
    """Regenerate a material's cover from its current (admin-edited) fields
    so the cover always matches what the form shows."""
    import time

    logger.info("Regenerating cover: material=%s title=%r", material_id, title)
    try:
        cover_bytes = cover_generator.generate_cover(
            title=title,
            authors=authors,
            publish_year=publish_year,
            publish_place=publish_place,
            country=country,
        )
        # Versioned key — a fresh URL so browsers don't keep showing the
        # cached previous cover.
        cover_url = await storage.upload_cover(
            cover_bytes,
            f"cover-{material_id}-{int(time.time())}.jpg",
        )
        await callback.post_cover_result(material_id, True, cover_url)
        logger.info("Cover regenerated: %s", cover_url)
    except Exception as exc:  # noqa: BLE001
        logger.error("Cover regeneration failed for material=%s: %s", material_id, exc)
        try:
            await callback.post_cover_result(material_id, False, None, str(exc))
        except Exception as cb_exc:  # noqa: BLE001
            logger.error("Cover-result callback also failed: %s", cb_exc)


async def _run_cover_jobs_loop(
    redis_client: aioredis.Redis, stop_event: asyncio.Event
) -> None:
    while not stop_event.is_set():
        result = await redis_client.brpop(COVER_JOBS_KEY, timeout=2)
        if result is None:
            continue

        _, raw = result
        try:
            job = json.loads(raw)
            material_id: str = job["materialId"]
            title: str = job.get("title") or ""
            authors: list[str] = job.get("authors") or []
            publish_year: int | None = job.get("publishYear")
            publish_place: str | None = job.get("publishPlace")
            country: str | None = job.get("country")
        except (json.JSONDecodeError, KeyError) as e:
            logger.error("Malformed cover job payload: %r — %s", raw, e)
            continue

        await process_cover_job(
            material_id, title, authors, publish_year, publish_place, country
        )


async def _run_ai_jobs_loop(
    redis_client: aioredis.Redis, provider: AIProvider, stop_event: asyncio.Event
) -> None:
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
            selected_pages: list[int] | None = job.get("selectedPages")
        except (json.JSONDecodeError, KeyError) as e:
            logger.error("Malformed AI job payload: %r — %s", raw, e)
            continue

        await process_job(redis_client, provider, material_id, media_url, selected_pages)


async def _run_page_prep_jobs_loop(
    redis_client: aioredis.Redis, stop_event: asyncio.Event
) -> None:
    while not stop_event.is_set():
        result = await redis_client.brpop(PAGE_PREP_JOBS_KEY, timeout=2)
        if result is None:
            continue

        _, raw = result
        try:
            job = json.loads(raw)
            job_id: str = job["jobId"]
            media_url: str = job["mediaUrl"]
        except (json.JSONDecodeError, KeyError) as e:
            logger.error("Malformed page-prep job payload: %r — %s", raw, e)
            continue

        await page_prep.process_page_prep_job(redis_client, job_id, media_url)


async def main() -> None:
    settings = get_settings()
    provider = get_provider(settings)

    redis_client = await aioredis.from_url(settings.redis_url)
    logger.info(
        "Worker started. Listening on Redis lists '%s', '%s' and '%s' …",
        AI_JOBS_KEY,
        PAGE_PREP_JOBS_KEY,
        COVER_JOBS_KEY,
    )

    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def _handle_signal():
        logger.info("Shutdown signal received.")
        stop_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _handle_signal)

    try:
        await asyncio.gather(
            _run_ai_jobs_loop(redis_client, provider, stop_event),
            _run_page_prep_jobs_loop(redis_client, stop_event),
            _run_cover_jobs_loop(redis_client, stop_event),
        )
    finally:
        await redis_client.aclose()
        logger.info("Worker stopped.")


if __name__ == "__main__":
    asyncio.run(main())
