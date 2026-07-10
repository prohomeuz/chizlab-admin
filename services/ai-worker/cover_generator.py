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


def _wrap_authors_raw(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont,
    first_line_width: int,
    rest_width: int,
) -> list[str]:
    """
    Word-wrap author text across as many lines as needed to fit the given
    widths, with no limit on the number of lines. The first line is narrower
    (it shares its row with the country/year text); later lines use the full
    width.
    """
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        width_limit = first_line_width if not lines else rest_width
        test = (current + " " + word).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] <= width_limit:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [""]


def _truncate_to_max_lines(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    max_lines: int,
    font: ImageFont.FreeTypeFont,
    first_line_width: int,
    rest_width: int,
) -> list[str]:
    """Cut a wrapped line list down to max_lines, ellipsizing the last line
    so it never exceeds its row's width."""
    if len(lines) <= max_lines:
        return lines
    lines = lines[:max_lines]
    width_limit = first_line_width if max_lines == 1 else rest_width
    last = lines[-1]
    while last:
        bbox = draw.textbbox((0, 0), last + "...", font=font)
        if bbox[2] - bbox[0] <= width_limit:
            break
        last = last[:-1]
    lines[-1] = (last.rstrip(", ") + "...") if last else "..."
    return lines


def _fit_authors(
    draw: ImageDraw.ImageDraw,
    text: str,
    font_path: str,
    start_size: int,
    min_size: int,
    first_line_width: int,
    rest_width: int,
    available_h: int,
) -> tuple[ImageFont.FreeTypeFont, list[str], int]:
    """
    Word-wrap author text to fit within available_h, shrinking the font size
    (down to min_size) before ever truncating text with an ellipsis. This
    keeps long author lists (which cause the most overlap risk) readable
    instead of just getting cut off, while guaranteeing the wrapped block's
    real rendered height never collides with whatever is drawn below it.

    Line height is derived from the font's real ascent+descent metrics
    rather than a fixed multiplier of the font size, since a flat multiplier
    can under-estimate the actual glyph height (diacritics, tall letters)
    and let lines sit closer together — or closer to the title — than
    intended.
    """
    size = start_size
    font = ImageFont.truetype(font_path, size)
    lines: list[str] = [""]
    line_h = 1

    while True:
        font = ImageFont.truetype(font_path, size)
        ascent, descent = font.getmetrics()
        line_h = max(ascent + descent, 1)
        max_lines = max(1, available_h // line_h)

        lines = _wrap_authors_raw(draw, text, font, first_line_width, rest_width)

        if len(lines) <= max_lines or size <= min_size:
            lines = _truncate_to_max_lines(draw, lines, max_lines, font, first_line_width, rest_width)
            break

        size -= 1

    return font, lines, line_h


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

    # Title position — computed up front so the author block knows how much
    # vertical space it has available before it would collide with the title.
    x_title = int(20 * sx)
    y_title = int(112 * sy)
    max_w = int((357 - 20) * sx)
    line_h = int(48 * sy)

    # Authors — top-left, wrapped across multiple lines (not squeezed onto
    # one line) so long author lists don't overlap the title or run off-cover.
    # The font shrinks (down to a floor) before anything gets truncated, so
    # long author lists stay fully readable instead of just getting cut off.
    avtor_text = ", ".join(authors) if authors else ""
    y_authors = int(21 * sy)
    if avtor_text:
        first_line_w = max(int(357 * sx) - joy_yil_w - int(30 * sx), int(60 * sx))
        rest_line_w = max_w
        available_h = y_title - y_authors - int(6 * sy)

        font_authors, author_lines, line_h_authors = _fit_authors(
            draw,
            avtor_text,
            str(ASSETS_DIR / "Gilroy-Light.ttf"),
            start_size=int(13 * sy),
            min_size=max(int(9 * sy), 8),
            first_line_width=first_line_w,
            rest_width=rest_line_w,
            available_h=available_h,
        )
        for i, line in enumerate(author_lines):
            draw.text((int(20 * sx), y_authors + i * line_h_authors), line, font=font_authors, fill=(255, 255, 255))

    # Country + Year — top-right (right-aligned, before logo area)
    if joy_yil:
        draw.text((int(357 * sx) - joy_yil_w, y_authors), joy_yil, font=font_small, fill=(255, 255, 255))

    # Title — large, with word-wrap

    lines = _wrap_text(draw, title, font_title, max_w)
    for i, line in enumerate(lines):
        draw.text((x_title, y_title + i * line_h), line, font=font_title, fill=(255, 255, 255))

    buf = io.BytesIO()
    bg.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return buf.getvalue()
