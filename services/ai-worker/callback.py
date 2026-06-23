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
    tags: list[str],
    suggested_category_id: str | None,
) -> None:
    """
    Notify the NestJS API that AI analysis succeeded.

    On success, NestJS sets status=active, isReady=true and stores AI fields.
    """
    settings = get_settings()
    payload: dict[str, Any] = {
        "materialId": material_id,
        "success": True,
        "title": title,
        "description": description,
        "tags": tags,
        "suggestedCategoryId": suggested_category_id,
    }
    await _send(payload)


async def post_failure(material_id: str, error_message: str) -> None:
    """
    Notify the NestJS API that AI analysis failed (terminal failure after retries).

    On failure, NestJS sets status=needs_review, isReady=false.
    """
    payload: dict[str, Any] = {
        "materialId": material_id,
        "success": False,
        "error": error_message,
    }
    await _send(payload)


async def _send(payload: dict[str, Any]) -> None:
    """Send the callback payload to the internal NestJS endpoint."""
    settings = get_settings()
    url = settings.internal_callback_url
    headers = {
        "Content-Type": "application/json",
        "X-Internal-Secret": settings.internal_callback_secret,
    }

    logger.info(
        "Posting AI result to %s (materialId=%s, success=%s)",
        url,
        payload.get("materialId"),
        payload.get("success"),
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        if response.status_code not in (200, 201):
            raise RuntimeError(
                f"Callback failed: HTTP {response.status_code} — {response.text[:500]}"
            )
        logger.info("Callback accepted (HTTP %d)", response.status_code)
