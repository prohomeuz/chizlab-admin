"""
Cover image generator for materials.

Generates a JPEG book cover by drawing title, authors, and year
onto the cover template using Gilroy fonts.

Usage:
    cover_bytes = generate_cover("Title", ["Author One", "Author Two"], 2024, "O'zbekiston")
"""
from __future__ import annotations

import io
import logging
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

logger = logging.getLogger(__name__)

ASSETS_DIR = Path(__file__).parent / "assets"

REF_W, REF_H = 417, 587
JPEG_QUALITY = 80


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        test = (current + " " + word).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [""]


def generate_cover(
    title: str,
    authors: list[str],
    publish_year: int | None,
    country: str | None,
) -> bytes:
    """
    Generate a JPEG book cover and return its bytes.

    Args:
        title:       Book/material title drawn in large Gilroy Medium.
        authors:     Author names joined with comma in small Gilroy Light.
        publish_year: Publication year shown top-right.
        country:     Country shown before year top-right (e.g. "O'zbekiston 2024").
    """
    bg = Image.open(ASSETS_DIR / "cover-empty.jpg").convert("RGB")
    W, H = bg.size

    sx = W / REF_W
    sy = H / REF_H

    draw = ImageDraw.Draw(bg)

    font_small = ImageFont.truetype(str(ASSETS_DIR / "Gilroy-Light.ttf"), int(13 * sy))
    font_title = ImageFont.truetype(str(ASSETS_DIR / "Gilroy-Medium.ttf"), int(40 * sy))

    # Country + Year — compute width first to constrain author text
    parts = [p for p in [country, str(publish_year) if publish_year else ""] if p]
    joy_yil = " ".join(parts)
    joy_yil_w = 0
    if joy_yil:
        jy_bbox = draw.textbbox((0, 0), joy_yil, font=font_small)
        joy_yil_w = jy_bbox[2] - jy_bbox[0]

    # Authors — top-left, truncated to avoid overlap with country/year
    avtor_text = ", ".join(authors) if authors else ""
    if avtor_text:
        max_avtor_w = int(357 * sx) - joy_yil_w - int(30 * sx)
        while avtor_text:
            bbox = draw.textbbox((0, 0), avtor_text, font=font_small)
            if bbox[2] - bbox[0] <= max_avtor_w:
                break
            avtor_text = avtor_text[:-1]
            if avtor_text.endswith((' ', ',')):
                avtor_text = avtor_text[:-1] + '...'
                break
        draw.text((int(20 * sx), int(21 * sy)), avtor_text, font=font_small, fill=(255, 255, 255))

    # Country + Year — top-right (right-aligned, before logo area)
    if joy_yil:
        draw.text((int(357 * sx) - joy_yil_w, int(21 * sy)), joy_yil, font=font_small, fill=(255, 255, 255))

    # Title — large, with word-wrap
    x_title = int(20 * sx)
    y_title = int(112 * sy)
    max_w = int((357 - 20) * sx)
    line_h = int(48 * sy)

    lines = _wrap_text(draw, title, font_title, max_w)
    for i, line in enumerate(lines):
        draw.text((x_title, y_title + i * line_h), line, font=font_title, fill=(255, 255, 255))

    buf = io.BytesIO()
    bg.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return buf.getvalue()
