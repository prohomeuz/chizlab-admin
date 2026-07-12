"""
Cover image generator for materials.

Generates a JPEG book cover by drawing title, authors, publication
place and year onto the cover template using Gilroy fonts.

Usage:
    cover_bytes = generate_cover("Title", ["Author One"], 2024, "Toshkent", "O'zbekiston")
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

# Vertical center (in reference units) of the logo icon baked into the
# template's top-right corner — measured from cover-empty.jpg. The top text
# row (authors + place/year) is centered on this line so it lines up with
# the icon instead of sitting above it.
ICON_CENTER_Y_REF = 33.4

# Title sizing: the largest size (in reference units) that lets the wrapped
# title fit within TITLE_MAX_LINES wins — short titles render big, long
# titles shrink instead of spilling past three lines.
TITLE_MAX_SIZE = 52
TITLE_MIN_SIZE = 16
TITLE_MAX_LINES = 3
TITLE_LINE_SPACING = 1.2


def _abbreviate_author(name: str) -> str:
    """
    "Raxmonjonov Xasan Aliyevich" → "X. A. Raxmonjonov" — the same rule the
    admin form applies to author inputs, so the cover shows names exactly
    as they appear in the form. Names already containing an initial
    ("A. Tilegenov", "X.A. Raxmonjonov") pass through unchanged.
    """
    parts = name.strip().split()
    if len(parts) < 2:
        return name.strip()
    if parts[0].endswith("."):
        return " ".join(parts)
    surname, *given = parts
    initials = " ".join(p[0].upper() + "." for p in given if p)
    return f"{initials} {surname}"


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
    tokens: list[str],
    font: ImageFont.FreeTypeFont,
    first_line_width: int,
    rest_width: int,
) -> list[str]:
    """
    Wrap author tokens across as many lines as needed to fit the given
    widths, with no limit on the number of lines. Each token is one whole
    author name ("X. A. Raxmonjonov,") and is kept intact — a name moves to
    the next line as a unit instead of breaking between its initials and
    surname. Only a name wider than a full line falls back to word-splitting.
    The first line is narrower (it shares its row with the place/year text);
    later lines use the full width.
    """
    lines: list[str] = []
    current = ""

    def _fits(text: str) -> bool:
        width_limit = first_line_width if not lines else rest_width
        bbox = draw.textbbox((0, 0), text, font=font)
        return bbox[2] - bbox[0] <= width_limit

    for token in tokens:
        test = (current + " " + token).strip()
        if _fits(test):
            current = test
            continue
        if current:
            lines.append(current)
            current = ""
        if _fits(token):
            current = token
        else:
            # Single name wider than the whole line — split it by words.
            for word in token.split():
                test = (current + " " + word).strip()
                if _fits(test):
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
    tokens: list[str],
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

        lines = _wrap_authors_raw(draw, tokens, font, first_line_width, rest_width)

        if len(lines) <= max_lines or size <= min_size:
            lines = _truncate_to_max_lines(draw, lines, max_lines, font, first_line_width, rest_width)
            break

        size -= 1

    return font, lines, line_h


def _fit_title(
    draw: ImageDraw.ImageDraw,
    title: str,
    font_path: str,
    max_width: int,
    sy: float,
) -> tuple[ImageFont.FreeTypeFont, list[str], int]:
    """
    Pick the largest title font size (TITLE_MAX_SIZE → TITLE_MIN_SIZE, in
    reference units) at which the word-wrapped title fits within
    TITLE_MAX_LINES lines and no line overflows the text area. Short titles
    render large; long titles shrink instead of wrapping past three lines.
    Only when even the minimum size can't fit is the text ellipsized.

    Returns (font, lines, line_height_px).
    """
    font = ImageFont.truetype(font_path, int(TITLE_MIN_SIZE * sy))
    lines: list[str] = [""]
    for size_ref in range(TITLE_MAX_SIZE, TITLE_MIN_SIZE - 1, -1):
        font = ImageFont.truetype(font_path, int(size_ref * sy))
        lines = _wrap_text(draw, title, font, max_width)
        if len(lines) <= TITLE_MAX_LINES and all(
            draw.textbbox((0, 0), line, font=font)[2] <= max_width for line in lines
        ):
            return font, lines, int(size_ref * TITLE_LINE_SPACING * sy)

    # Even the minimum size can't fit — hard-cap at 3 lines with an ellipsis.
    lines = _truncate_to_max_lines(draw, lines, TITLE_MAX_LINES, font, max_width, max_width)
    return font, lines, int(TITLE_MIN_SIZE * TITLE_LINE_SPACING * sy)


def generate_cover(
    title: str,
    authors: list[str],
    publish_year: int | None,
    publish_place: str | None = None,
    country: str | None = None,
) -> bytes:
    """
    Generate a JPEG book cover and return its bytes.

    Args:
        title:        Book/material title in large Gilroy Medium — font size
                      adapts so the title never exceeds three lines.
        authors:      Author names, abbreviated like the admin form
                      ("X. A. Raxmonjonov"), joined with commas.
        publish_year: Publication year shown top-right.
        publish_place: City/region of publication shown before the year
                      top-right (e.g. "Toshkent 2024").
        country:      Fallback for the top-right text when the publication
                      place is unknown.
    """
    bg = Image.open(ASSETS_DIR / "cover-empty.jpg").convert("RGB")
    W, H = bg.size

    sx = W / REF_W
    sy = H / REF_H

    draw = ImageDraw.Draw(bg)

    font_small = ImageFont.truetype(str(ASSETS_DIR / "Gilroy-Light.ttf"), int(13 * sy))

    # Place + Year — compute width first to constrain author text
    joy = publish_place or country
    parts = [p for p in [joy, str(publish_year) if publish_year else ""] if p]
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

    # Top row (authors left, place/year right) is vertically centered on the
    # logo icon baked into the template so text and icon sit on one line.
    icon_cy = ICON_CENTER_Y_REF * sy
    small_ascent, small_descent = font_small.getmetrics()
    y_top_row = int(icon_cy - (small_ascent + small_descent) / 2)

    # Authors — top-left, abbreviated like the admin form and wrapped across
    # multiple lines (not squeezed onto one line) so several authors never
    # overlap the place/year text or the title. The font shrinks (down to a
    # floor) before anything gets truncated, so long author lists stay fully
    # readable instead of just getting cut off.
    abbreviated = [_abbreviate_author(a) for a in authors if a.strip()]
    # One token per author ("X. A. Raxmonjonov," …) so a name never breaks
    # across lines between its initials and surname.
    author_tokens = [
        name + ("," if i < len(abbreviated) - 1 else "") for i, name in enumerate(abbreviated)
    ]
    if author_tokens:
        first_line_w = max(int(357 * sx) - joy_yil_w - int(30 * sx), int(60 * sx))
        rest_line_w = max_w
        available_h = y_title - y_top_row - int(6 * sy)

        font_authors, author_lines, line_h_authors = _fit_authors(
            draw,
            author_tokens,
            str(ASSETS_DIR / "Gilroy-Light.ttf"),
            start_size=int(13 * sy),
            min_size=max(int(9 * sy), 8),
            first_line_width=first_line_w,
            rest_width=rest_line_w,
            available_h=available_h,
        )
        for i, line in enumerate(author_lines):
            draw.text((int(20 * sx), y_top_row + i * line_h_authors), line, font=font_authors, fill=(255, 255, 255))

    # Place + Year — top-right, right-aligned before the logo and vertically
    # centered with it ("rm" anchor = right edge, vertical middle).
    if joy_yil:
        draw.text((int(357 * sx), icon_cy), joy_yil, font=font_small, fill=(255, 255, 255), anchor="rm")

    # Title — large, word-wrapped, font size adapted to fit max 3 lines
    font_title, lines, line_h = _fit_title(
        draw, title, str(ASSETS_DIR / "Gilroy-Medium.ttf"), max_w, sy
    )
    for i, line in enumerate(lines):
        draw.text((x_title, y_title + i * line_h), line, font=font_title, fill=(255, 255, 255))

    buf = io.BytesIO()
    bg.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return buf.getvalue()
