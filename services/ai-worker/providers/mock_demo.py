"""
Mock AI provider for local development and demos.

Returns realistic canned metadata (title extracted from the document's
first page when possible) after a short delay, so the full admin flow —
progress badge, field skeletons, cover generation — can be exercised
without any external AI API key. Select with AI_PROVIDER=mock_demo.
"""
from __future__ import annotations

import asyncio
import logging

from .base import AnalysisResult

logger = logging.getLogger(__name__)

_DELAY_SECONDS = 8


def _extract_title(media_bytes: bytes, mime_type: str) -> str | None:
    """Best-effort title: the largest text span on the first PDF page."""
    if mime_type != "application/pdf":
        return None
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(stream=media_bytes, filetype="pdf")
        if doc.page_count == 0:
            return None
        spans: list[tuple[float, str]] = []
        for block in doc[0].get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    if len(text) >= 4:
                        spans.append((span.get("size", 0), text))
        if not spans:
            return None
        biggest_size = max(s for s, _ in spans)
        title_parts = [t for s, t in spans if s >= biggest_size * 0.9]
        return " ".join(title_parts)[:200] or None
    except Exception as exc:  # noqa: BLE001
        logger.warning("Mock title extraction failed: %s", exc)
        return None


class MockDemoProvider:
    """Offline demo provider — no API key required."""

    async def analyze(
        self,
        media_bytes: bytes,
        mime_type: str,
        prompt: str,
    ) -> AnalysisResult:
        await asyncio.sleep(_DELAY_SECONDS)
        title = _extract_title(media_bytes, mime_type) or "Muhandislik grafikasi asoslari"
        logger.info("MockDemoProvider returning canned result (title=%r)", title)
        return AnalysisResult(
            title=title,
            description=(
                "Bu material lokal demo rejimida tahlil qilindi. Haqiqiy AI provayder "
                "ulanmagan, shuning uchun maydonlar namunaviy ma'lumotlar bilan to'ldirildi."
            ),
            blurb="Chizmachilikni chinakam tushunib o'rganmoqchi bo'lganlar uchun qo'llanma.",
            tags=["chizmachilik", "muhandislik grafikasi", "loyihalash", "standartlar"],
            authors=["Raxmonjonov Xasan Aliyevich", "Tilegenov Aybek Baxtiyorovich"],
            language="O'zbek",
            publish_year=2023,
            publish_place="Toshkent",
            country="O'zbekiston",
            page_count=None,
            suggested_category_name=None,
        )
