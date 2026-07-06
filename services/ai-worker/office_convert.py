"""
Office document → PDF conversion via headless LibreOffice.

Used both by page-prep (thumbnail generation) and by the AI job (to slice a
non-PDF document down to only the admin-selected pages before analysis).
"""
from __future__ import annotations

import asyncio
import logging
import os
import tempfile
import uuid

logger = logging.getLogger(__name__)

PDF_MIME = "application/pdf"

_EXT_BY_MIME = {
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.oasis.opendocument.text": ".odt",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/vnd.oasis.opendocument.presentation": ".odp",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.oasis.opendocument.spreadsheet": ".ods",
}

CONVERT_TIMEOUT_SECONDS = 120


async def ensure_pdf(media_bytes: bytes, mime_type: str) -> bytes:
    """Return `media_bytes` as-is if already a PDF, otherwise convert via LibreOffice."""
    if mime_type == PDF_MIME:
        return media_bytes
    return await asyncio.to_thread(_convert_to_pdf_sync, media_bytes, mime_type)


def _convert_to_pdf_sync(media_bytes: bytes, mime_type: str) -> bytes:
    ext = _EXT_BY_MIME.get(mime_type, ".bin")
    job_uuid = uuid.uuid4().hex

    with tempfile.TemporaryDirectory(prefix=f"office-convert-{job_uuid}-") as tmpdir:
        input_path = os.path.join(tmpdir, f"input{ext}")
        with open(input_path, "wb") as f:
            f.write(media_bytes)

        profile_dir = os.path.join(tmpdir, "lo-profile")
        cmd = [
            "soffice",
            "--headless",
            "--norestore",
            f"-env:UserInstallation=file://{profile_dir}",
            "--convert-to",
            "pdf",
            "--outdir",
            tmpdir,
            input_path,
        ]

        logger.info("Converting %s -> PDF via LibreOffice", ext)
        completed = _run_subprocess(cmd, timeout=CONVERT_TIMEOUT_SECONDS)
        if completed.returncode != 0:
            raise RuntimeError(
                f"LibreOffice conversion failed (exit={completed.returncode}): "
                f"{completed.stderr.decode('utf-8', errors='replace')[:1000]}"
            )

        output_path = os.path.join(tmpdir, "input.pdf")
        if not os.path.exists(output_path):
            raise RuntimeError("LibreOffice did not produce an output PDF")

        with open(output_path, "rb") as f:
            return f.read()


def _run_subprocess(cmd: list[str], timeout: int):
    import subprocess

    return subprocess.run(cmd, capture_output=True, timeout=timeout, check=False)
