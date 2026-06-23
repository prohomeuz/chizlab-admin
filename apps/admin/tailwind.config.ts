import type { Config } from 'tailwindcss';

// Inline tokens to avoid readonly/const type conflicts with Tailwind's type expectations
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#003837',
          dark:    '#002726',
          light:   '#004e4c',
          muted:   'rgba(0, 56, 55, 0.08)',
        },
        accent: {
          DEFAULT: '#b8926a',
          dark:    '#9a7555',
          light:   '#d4b090',
          muted:   'rgba(184, 146, 106, 0.15)',
        },
        bg: {
          DEFAULT:  '#fffff6',
          elevated: '#ffffff',
          sunken:   '#f5f5e8',
        },
        dark: {
          DEFAULT: '#131313',
          overlay: '#0a0a0a',
        },
        text: {
          primary:    '#131313',
          secondary:  'rgba(19, 19, 19, 0.60)',
          muted:      'rgba(19, 19, 19, 0.40)',
          onPrimary:  '#fffff6',
          onDark:     '#fffff6',
          onAccent:   '#ffffff',
        },
        surface:       '#ffffff',
        surfaceHover:  '#f8f8f0',
        border: {
          DEFAULT: 'rgba(19, 19, 19, 0.12)',
          strong:  'rgba(19, 19, 19, 0.24)',
        },
        overlay: {
          light: 'rgba(255, 255, 246, 0.30)',
          dark:  'rgba(0, 0, 0, 0.30)',
        },
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
        focus: '#b8926a',
      },
      fontFamily: {
        inter:     ['Inter', 'Inter Fallback', 'Arial', 'Helvetica', 'sans-serif'],
        editorial: ['PPEditorialNew', 'Georgia', 'serif'],
        sf:        ['SFProDisplay', 'system-ui', 'sans-serif'],
        sans:      ['Inter', 'Inter Fallback', 'Arial', 'Helvetica', 'sans-serif'],
      },
      fontSize: {
        xs:   ['13px', { lineHeight: '1.5' }],
        sm:   ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.5' }],
        md:   ['18px', { lineHeight: '1.4' }],
        lg:   ['20px', { lineHeight: '1.4' }],
        xl:   ['24px', { lineHeight: '1.3' }],
        '2xl': ['36px', { lineHeight: '1.2' }],
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
      borderRadius: {
        none: '0',
        sm:   '0.25rem',
        DEFAULT: '0.25rem',
        md:   '0.5rem',
        lg:   '0.75rem',
        xl:   '1rem',
        full: '9999px',
      },
      boxShadow: {
        sm:    '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        DEFAULT: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
        md:    '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
        lg:    '0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -4px rgba(0,0,0,0.10)',
        card:  '0 2px 12px 0 rgba(0,56,55,0.07)',
        modal: '0 20px 60px -10px rgba(0,0,0,0.25)',
        none:  'none',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
        in:      'cubic-bezier(0.4, 0, 1, 1)',
        out:     'cubic-bezier(0, 0, 0.2, 1)',
        default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        fast:   '150ms',
        DEFAULT: '200ms',
        slow:   '300ms',
      },
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
    },
  },
  plugins: [],
} satisfies Config;
