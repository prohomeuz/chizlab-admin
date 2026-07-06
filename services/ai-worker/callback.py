"""
NestJS internal callback client.
POSTs AI analysis results to POST /internal/ai-result.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from config import get_settings

logger = logging.getLogger(__name__)


async def post_success(
    material_id: str,
    title: str | None,
    description: str | None,
    blurb: str | None,
    tags: list[str],
    authors: list[str],
    language: str | None,
    publish_year: int | None,
    country: str | None,
    page_count: int | None,
    suggested_category_id: str | None,
    cover_url: str | None = None,
) -> None:
    """
    Notify the NestJS API that AI analysis succeeded.

    On success, NestJS sets status=ready, isReady=true and stores AI fields.
    """
    payload: dict[str, Any] = {
        "materialId": material_id,
        "success": True,
        "title": title,
        "description": description,
        "blurb": blurb,
        "tags": tags,
        "authors": authors,
        "language": language,
        "publishYear": publish_year,
        "country": country,
        "pageCount": page_count,
        "suggestedCategoryId": suggested_category_id,
        "coverUrl": cover_url,
    }
    await _send(payload)


async def post_failure(material_id: str, error_message: str) -> None:
    """
    Notify the NestJS API that AI analysis failed (terminal failure after retries).

    On failure, NestJS sets status=draft, isReady=false.
    """
    payload: dict[str, Any] = {
        "materialId": material_id,
        "success": False,
        "error": error_message,
    }
    await _send(payload)


async def post_page_prep_result(
    job_id: str,
    success: bool,
    page_count: int | None = None,
    thumbnail_urls: list[str] | None = None,
    error: str | None = None,
) -> None:
    """Notify the NestJS API that page-thumbnail preparation finished (or failed)."""
    payload: dict[str, Any] = {
        "jobId": job_id,
        "success": success,
        "pageCount": page_count,
        "thumbnailUrls": thumbnail_urls,
        "error": error,
    }
    await _send(payload, url=get_settings().internal_page_prep_callback_url)


async def _send(payload: dict[str, Any], url: str | None = None) -> None:
    """Send the callback payload to the internal NestJS endpoint."""
    settings = get_settings()
    url = url or settings.internal_callback_url
    headers = {
        "Content-Type": "application/json",
        "X-Internal-Secret": settings.internal_callback_secret,
    }

    logger.info(
        "Posting result to %s (materialId=%s, jobId=%s, success=%s)",
        url,
        payload.get("materialId"),
        payload.get("jobId"),
        payload.get("success"),
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        if response.status_code not in (200, 201):
            raise RuntimeError(
                f"Callback failed: HTTP {response.status_code} — {response.text[:500]}"
            )
        logger.info("Callback accepted (HTTP %d)", response.status_code)
