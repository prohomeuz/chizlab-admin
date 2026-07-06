"""
Page-thumbnail generation job.

Converts an uploaded document to PDF (if needed) via LibreOffice, rasterizes
each page to a small JPEG thumbnail with PyMuPDF, uploads the thumbnails to
MinIO, and reports the result back to NestJS. Used by the admin UI to let the
admin pick which pages should be included in the AI analysis.
"""
from __future__ import annotations

import logging

import fitz  # PyMuPDF
import redis.asyncio as aioredis

import callback
import office_convert
import storage

logger = logging.getLogger(__name__)

PROGRESS_TTL = 3600  # seconds
THUMBNAIL_DPI = 96


async def _set_progress(redis_client: aioredis.Redis, job_id: str, pct: int) -> None:
    await redis_client.set(f"page-prep:{job_id}:progress", str(pct), ex=PROGRESS_TTL)


async def process_page_prep_job(
    redis_client: aioredis.Redis,
    job_id: str,
    media_url: str,
) -> None:
    logger.info("Processing page-prep job: jobId=%s url=%s", job_id, media_url)

    try:
        await _set_progress(redis_client, job_id, 5)
        media_bytes, mime_type = await storage.download_media(media_url)

        await _set_progress(redis_client, job_id, 20)
        pdf_bytes = await office_convert.ensure_pdf(media_bytes, mime_type)

        await _set_progress(redis_client, job_id, 55)
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        thumbnail_urls: list[str] = []
        page_count = doc.page_count
        for i in range(page_count):
            page = doc[i]
            pixmap = page.get_pixmap(dpi=THUMBNAIL_DPI)
            jpg_bytes = pixmap.tobytes("jpeg")
            url = await storage.upload_image(
                jpg_bytes,
                f"page-prep/{job_id}/page-{i + 1}.jpg",
                "image/jpeg",
            )
            thumbnail_urls.append(url)
            await _set_progress(redis_client, job_id, 55 + int(25 * (i + 1) / page_count))

        await _set_progress(redis_client, job_id, 95)
        await callback.post_page_prep_result(
            job_id=job_id,
            success=True,
            page_count=page_count,
            thumbnail_urls=thumbnail_urls,
        )
        await _set_progress(redis_client, job_id, 100)
        logger.info("Page-prep job done: jobId=%s pages=%d", job_id, page_count)

    except Exception as exc:  # noqa: BLE001
        error_msg = f"Page-prep failed: {exc}"
        logger.error("Page-prep job failed: jobId=%s — %s", job_id, error_msg)
        try:
            await callback.post_page_prep_result(job_id=job_id, success=False, error=error_msg)
        except Exception as cb_exc:  # noqa: BLE001
            logger.error("Page-prep callback also failed: %s", cb_exc)
