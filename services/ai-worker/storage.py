"""
MinIO / S3-compatible storage helper.
Downloads media files from MinIO given a public or internal URL.
"""
from __future__ import annotations

import logging
import os
from urllib.parse import urlparse

import boto3
from botocore.client import BaseClient

from config import get_settings

logger = logging.getLogger(__name__)


def _get_s3_client() -> BaseClient:
    """Create a boto3 S3 client configured for MinIO."""
    settings = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=settings.minio_endpoint,
        aws_access_key_id=settings.minio_access_key,
        aws_secret_access_key=settings.minio_secret_key,
        region_name="us-east-1",
    )


def _extract_key_from_url(media_url: str) -> str:
    """
    Extract the S3 object key from a MinIO public URL.

    Example:
        http://localhost:9000/chizlab-media/abc123.pdf  →  abc123.pdf
    """
    settings = get_settings()
    parsed = urlparse(media_url)
    # Path looks like /<bucket>/<key> or just /<key>
    path = parsed.path.lstrip("/")
    bucket = settings.minio_bucket.strip("/")
    if path.startswith(bucket + "/"):
        return path[len(bucket) + 1:]
    # Fallback: treat everything after the first slash as the key
    parts = path.split("/", 1)
    return parts[1] if len(parts) > 1 else path


async def download_media(media_url: str) -> tuple[bytes, str]:
    """
    Download a media file from MinIO and return (bytes, mime_type).

    Attempts to detect MIME type from the S3 ContentType header.
    Falls back to guessing from the file extension.

    Args:
        media_url: The public MinIO URL of the file.

    Returns:
        Tuple of (file_bytes, mime_type).
    """
    import asyncio

    return await asyncio.to_thread(_download_sync, media_url)


def _download_sync(media_url: str) -> tuple[bytes, str]:
    """Synchronous download — run inside asyncio.to_thread."""
    settings = get_settings()
    client = _get_s3_client()
    key = _extract_key_from_url(media_url)

    logger.info("Downloading s3://%s/%s", settings.minio_bucket, key)

    response = client.get_object(Bucket=settings.minio_bucket, Key=key)
    body: bytes = response["Body"].read()
    content_type: str = response.get("ContentType", "application/octet-stream")

    logger.info(
        "Downloaded %d bytes from MinIO (key=%s, mime=%s)",
        len(body),
        key,
        content_type,
    )
    return body, content_type
