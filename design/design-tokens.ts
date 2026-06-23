/**
 * chizlab.uz Design Tokens — Tailwind CSS theme extension
 *
 * Extracted from the live chizlab.uz website CSS bundle
 * (/_next/static/chunks/1ntuioj0uad2x.css as of 2026-06-23).
 *
 * Usage in tailwind.config.ts:
 *   import { chizlabTheme } from '../../design/design-tokens';
 *   export default { theme: { extend: chizlabTheme } } satisfies Config;
 *
 * Color tokens are also available as CSS custom properties
 * via design/design-tokens.css.
 */

export const chizlabTheme = {
  colors: {
    /** Deep teal/dark green — primary brand color, nav background */
    primary: {
      DEFAULT: '#003837',
      dark:    '#002726',
      light:   '#004e4c',
      muted:   'rgba(0, 56, 55, 0.08)',
    },
    /** Warm terracotta/gold — accent, CTAs, highlights */
    accent: {
      DEFAULT: '#b8926a',
      dark:    '#9a7555',
      light:   '#d4b090',
      muted:   'rgba(184, 146, 106, 0.15)',
    },
    /** Warm off-white — page background */
    bg: {
      DEFAULT:  '#fffff6',
      elevated: '#ffffff',
      sunken:   '#f5f5e8',
    },
    /** Near-black — dark sections and footer */
    dark: {
      DEFAULT: '#131313',
      overlay: '#0a0a0a',
    },
    /** Text shades */
    text: {
      primary:    '#131313',
      secondary:  'rgba(19, 19, 19, 0.60)',
      muted:      'rgba(19, 19, 19, 0.40)',
      onPrimary:  '#fffff6',
      onDark:     '#fffff6',
      onAccent:   '#ffffff',
    },
    /** Neutral surfaces and borders */
    surface:       '#ffffff',
    surfaceHover:  '#f8f8f0',
    border: {
      DEFAULT: 'rgba(19, 19, 19, 0.12)',
      strong:  'rgba(19, 19, 19, 0.24)',
    },
    /** Overlays */
    overlay: {
      light: 'rgba(255, 255, 246, 0.30)',
      dark:  'rgba(0, 0, 0, 0.30)',
    },
    /** Status badge colors (admin-specific) */
    status: {
      active: {
        text: '#006b3c',
        bg:   '#e6f4ed',
      },
      pending: {
        text: '#92550a',
        bg:   '#fef3e2',
      },
      draft: {
        text: '#4a5568',
        bg:   '#edf2f7',
      },
      needsReview: {
        text: '#9b2c2c',
        bg:   '#fff5f5',
      },
    },
    /** Focus ring */
    focus: '#b8926a',
  },

  fontFamily: {
    /** Primary UI font — Inter variable (same as chizlab.uz body) */
    inter:      ['Inter', 'Inter Fallback', 'Arial', 'Helvetica', 'sans-serif'],
    /** Serif editorial font — PPEditorialNew (used for hero/display text) */
    editorial:  ['PPEditorialNew', 'Georgia', 'serif'],
    /** SF Pro display — used for numeric/data display */
    sf:         ['SFProDisplay', 'system-ui', 'sans-serif'],
    /** Convenience alias: sans resolves to Inter */
    sans:       ['Inter', 'Inter Fallback', 'Arial', 'Helvetica', 'sans-serif'],
  },

  fontSize: {
    /** Full type scale extracted from chizlab.uz utility classes */
    xs:   ['13px', { lineHeight: '1.5' }],
    sm:   ['14px', { lineHeight: '1.5' }],
    base: ['16px', { lineHeight: '1.5' }],
    md:   ['18px', { lineHeight: '1.4' }],
    lg:   ['20px', { lineHeight: '1.4' }],
    xl:   ['24px', { lineHeight: '1.3' }],
    '2xl': ['36px', { lineHeight: '1.2' }],
    '3xl': ['44px', { lineHeight: '1.1' }],
    '4xl': ['52px', { lineHeight: '1.1' }],
    '5xl': ['60px', { lineHeight: '1.1' }],
    '6xl': ['80px', { lineHeight: '1.0' }],
  },

  fontWeight: {
    thin:   '275',
    normal: '400',
    medium: '500',
    bold:   '700',
  },

  letterSpacing: {
    tight:   '-0.02em',
    tighter: '-0.4px',
    normal:  '0em',
    wide:    '0.04em',
    wider:   '0.06em',
  },

  lineHeight: {
    tight:   '1.1',
    snug:    '1.2',
    compact: '1.3',
    relaxed: '1.4',
    normal:  '1.5',
    loose:   '1.55',
  },

  spacing: {
    /** Inherits Tailwind 0.25rem base; these are named overrides */
    px:  '1px',
    '0': '0',
    '1': '0.25rem',
    '2': '0.5rem',
    '3': '0.75rem',
    '4': '1rem',
    '5': '1.25rem',
    '6': '1.5rem',
    '8': '2rem',
    '10': '2.5rem',
    '12': '3rem',
    '14': '3.5rem',
    '16': '4rem',
    '20': '5rem',
  },

  borderRadius: {
    none: '0',
    sm:   '0.25rem',   /* 4px  */
    DEFAULT: '0.25rem',
    md:   '0.5rem',    /* 8px  */
    lg:   '0.75rem',   /* 12px */
    xl:   '1rem',      /* 16px */
    full: '9999px',    /* pill */
  },

  boxShadow: {
    sm:    '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
    DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
    md:    '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
    lg:    '0 10px 15px -3px rgba(0, 0, 0, 0.10), 0 4px 6px -4px rgba(0, 0, 0, 0.10)',
    card:  '0 2px 12px 0 rgba(0, 56, 55, 0.07)',
    modal: '0 20px 60px -10px rgba(0, 0, 0, 0.25)',
    none:  'none',
  },

  transitionTimingFunction: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in:      'cubic-bezier(0.4, 0, 1, 1)',
    out:     'cubic-bezier(0, 0, 0.2, 1)',
  },

  transitionDuration: {
    fast:   '150ms',
    DEFAULT: '200ms',
    slow:   '300ms',
  },

  /** Layout constants */
  width: {
    sidebar: '240px',
  },
  height: {
    header: '65px',
    'table-row': '56px',
  },
  maxWidth: {
    content: '1280px',
  },

  zIndex: {
    base:    '0',
    raised:  '10',
    overlay: '50',
    modal:   '100',
    toast:   '200',
    cursor:  '9999',
  },

  /** Screen breakpoints — mobile-first, with chizlab.uz mobile breakpoint */
  screens: {
    mobile: { max: '430px' },   /* chizlab.uz uses max-width:430px for mobile */
    sm:     '640px',
    md:     '768px',
    lg:     '1024px',
    xl:     '1280px',
    '2xl':  '1536px',
  },
} as const;

export type ChizlabTheme = typeof chizlabTheme;
