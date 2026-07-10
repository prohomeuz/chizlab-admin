"""
MinIO / S3-compatible storage helper.
Downloads media files from MinIO given a public or internal URL.
"""
from __future__ import annotations

import asyncio
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

    The bucket segment may appear anywhere in the path, because production
    serves MinIO behind an nginx prefix:

        http://localhost:9000/chizlab-media/abc123.pdf                     →  abc123.pdf
        https://admin.chizlab.uz/media/chizlab-media/abc123.pdf            →  abc123.pdf
        https://admin.chizlab.uz/media/chizlab-media/page-prep/j/p-1.jpg   →  page-prep/j/p-1.jpg
    """
    settings = get_settings()
    parsed = urlparse(media_url)
    path = parsed.path.lstrip("/")
    bucket = settings.minio_bucket.strip("/")
    segments = path.split("/")
    if bucket in segments:
        idx = segments.index(bucket)
        return "/".join(segments[idx + 1:])
    # Fallback: treat everything after the first slash as the key
    parts = path.split("/", 1)
    return parts[1] if len(parts) > 1 else path


async def upload_image(image_bytes: bytes, key: str, content_type: str = "image/jpeg") -> str:
    """
    Upload an image to MinIO and return its public URL.

    Args:
        image_bytes:  Raw image bytes.
        key:          Object key in the bucket (e.g. "cover-<uuid>.jpg").
        content_type: MIME type to store on the object.

    Returns:
        Public URL of the uploaded image.
    """
    return await asyncio.to_thread(_upload_sync, image_bytes, key, content_type)


async def upload_cover(image_bytes: bytes, key: str) -> str:
    """Upload a cover JPEG to MinIO and return its public URL."""
    return await upload_image(image_bytes, key, "image/jpeg")


def _upload_sync(image_bytes: bytes, key: str, content_type: str) -> str:
    """Synchronous upload — run inside asyncio.to_thread."""
    import io as _io

    settings = get_settings()
    client = _get_s3_client()

    logger.info("Uploading image to s3://%s/%s (%d bytes)", settings.minio_bucket, key, len(image_bytes))

    client.upload_fileobj(
        _io.BytesIO(image_bytes),
        settings.minio_bucket,
        key,
        ExtraArgs={"ContentType": content_type},
    )

    # MINIO_PUBLIC_URL already includes the bucket name (e.g. http://host:9100/chizlab-media)
    # so we just append the key — same pattern as the NestJS upload service.
    url = f"{settings.minio_public_url.rstrip('/')}/{key}"
    logger.info("Image uploaded: %s", url)
    return url


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
