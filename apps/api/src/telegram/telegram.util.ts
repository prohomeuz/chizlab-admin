import { Material, MaterialType } from '../materials/material.entity';

/** Uzbek labels for material types — mirrors the admin UI select options. */
export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  [MaterialType.TEXTBOOK_ELECTRONIC]: "Elektron o'quv qo'llanma",
  [MaterialType.THESIS]: 'Tezis',
  [MaterialType.ARTICLE]: 'Maqola',
  [MaterialType.TEXTBOOK]: 'Darslik',
  [MaterialType.MONOGRAPH]: 'Monografiya',
  [MaterialType.PRESENTATION]: 'Taqdimot',
};

/** Telegram caption hard limit (UTF-16 code units of the visible text). */
const CAPTION_LIMIT = 1024;

/** Escape the five characters Telegram's HTML parse mode treats specially. */
export function htmlEscape(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Turn a category name into a URL slug for the "Batafsil" link.
 * The chizlab.uz route resolves by the trailing UUID, so the slug is
 * cosmetic — we still produce a clean, transliterated one.
 * e.g. "Chizmachilik" -> "chizmachilik", "Muhandislik grafikasi" -> "muhandislik-grafikasi"
 */
export function slugifyCategory(name: string | null | undefined): string {
  if (!name) return 'material';
  const slug = name
    .toLowerCase()
    .replace(/[oO][ʻʼ‘’'`]/g, 'o') // o' -> o
    .replace(/[gG][ʻʼ‘’'`]/g, 'g') // g' -> g
    .replace(/[ʻʼ‘’'`]/g, '') // stray apostrophes
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'material';
}

/** Approximate visible length of an HTML-parse-mode caption (tags stripped). */
function visibleLength(html: string): number {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').length;
}

/**
 * Build the channel post caption in Telegram HTML, matching the reference
 * layout: bold title, bold-label/italic-value author & keyword lines, a
 * fenced meta block, a blockquote blurb, and a "Batafsil" link.
 * Empty fields are omitted. The blurb is trimmed if the caption would
 * exceed Telegram's limit.
 */
export function buildCaption(material: Material, categoryName: string | null, url: string): string {
  const render = (blurb: string | null): string => {
    const lines: string[] = [];
    lines.push(`<b>${htmlEscape(material.title || 'Nomsiz material')}</b>`);

    if (material.authors?.length) {
      lines.push('', `<b>Mualliflar:</b> <i>${htmlEscape(material.authors.join(', '))}</i>`);
    }
    if (material.tags?.length) {
      lines.push('', `<b>Kalit so'zlar:</b> <i>${htmlEscape(material.tags.join(', '))}</i>`);
    }

    const meta: string[] = [];
    if (material.materialType) {
      meta.push(`<b>Tur:</b> ${htmlEscape(MATERIAL_TYPE_LABELS[material.materialType])}`);
    }
    if (categoryName) meta.push(`<b>Kategoriya:</b> ${htmlEscape(categoryName)}`);
    if (material.pageCount) meta.push(`<b>Sahifa:</b> ${material.pageCount} ta`);
    if (material.language) meta.push(`<b>Til:</b> ${htmlEscape(material.language)}`);
    if (material.publishYear) meta.push(`<b>Nashr yili:</b> ${material.publishYear}`);
    if (material.country) meta.push(`<b>Davlat:</b> ${htmlEscape(material.country)}`);
    if (meta.length) {
      lines.push('', '=====', ...meta, '=====');
    }

    if (blurb) {
      lines.push('', `<blockquote>${htmlEscape(blurb)}</blockquote>`);
    }

    lines.push('', '=====', `🔗 <a href="${htmlEscape(url)}">Batafsil</a>`);
    return lines.join('\n');
  };

  let caption = render(material.blurb);
  if (visibleLength(caption) > CAPTION_LIMIT && material.blurb) {
    // Trim the blurb just enough to fit, leaving room for an ellipsis.
    const overflow = visibleLength(caption) - CAPTION_LIMIT;
    const trimmed = material.blurb.slice(0, Math.max(0, material.blurb.length - overflow - 2)).trimEnd();
    caption = render(trimmed ? `${trimmed}…` : null);
  }
  return caption;
}
