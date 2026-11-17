import type { Config } from 'tailwindcss';

/**
 * QAI design tokens (docs/08-design-system.md, D79). Light and dark values live in src/index.css.
 * Values live as CSS variables in src/index.css; this file only maps them to Tailwind names.
 * Screens use these names (bg-surface, text-muted, border-border...), never raw colours or sizes.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: { DEFAULT: 'var(--surface)', muted: 'var(--surface-muted)', raised: 'var(--surface-raised)' },
        border: { DEFAULT: 'var(--border)', control: 'var(--border-control)' },
        text: { DEFAULT: 'var(--text)', muted: 'var(--text-muted)' },
        hover: 'var(--hover)',
        accent: {
          DEFAULT: 'var(--accent)',
          fill: 'var(--accent-fill)',
          'fill-hover': 'var(--accent-fill-hover)',
          soft: 'var(--accent-soft)',
          'soft-text': 'var(--accent-soft-text)',
          contrast: 'var(--accent-contrast)',
        },
        passed: {
          fill: 'var(--passed-fill)',
          border: 'var(--passed-border)',
          text: 'var(--passed-text)',
          dot: 'var(--passed-dot)',
        },
        failed: {
          fill: 'var(--failed-fill)',
          border: 'var(--failed-border)',
          text: 'var(--failed-text)',
          dot: 'var(--failed-dot)',
        },
        cc: {
          fill: 'var(--cc-fill)',
          border: 'var(--cc-border)',
          text: 'var(--cc-text)',
          dot: 'var(--cc-dot)',
        },
        notrun: 'var(--notrun)',
        chart: { passed: 'var(--chart-passed)', failed: 'var(--chart-failed)', cc: 'var(--chart-cc)' },
        inverse: { DEFAULT: 'var(--inverse)', text: 'var(--inverse-text)', accent: 'var(--inverse-accent)', hover: 'var(--inverse-hover)' },
        backdrop: 'var(--backdrop)',
      },
      backgroundImage: {
        'select-chevron': 'var(--select-chevron)',
      },
      boxShadow: {
        lift: 'var(--shadow-lift)', // secondary buttons, pressable tiles
        primary: 'var(--shadow-primary)', // primary buttons
        popover: 'var(--shadow-popover)', // menus, toasts, bulk bar
        overlay: 'var(--shadow-overlay)', // dialogs
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // System monospace (installed on every OS): test IDs, selectors, URLs, timings.
        mono: ['ui-monospace', '"Cascadia Mono"', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      fontSize: {
        label: ['12px', { lineHeight: '16px', fontWeight: '600' }],
        // compact lists and tables (Suites tree, Run results, Runs); forms and dialogs stay at base
        dense: ['13px', { lineHeight: '18px' }],
        base: ['14px', { lineHeight: '20px' }],
        h3: ['18px', { lineHeight: '26px', fontWeight: '600' }],
        h2: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        h1: ['22px', { lineHeight: '30px', fontWeight: '600' }],
        // the figure in the middle of the Overview pass-rate donut (D77)
        figure: ['28px', { lineHeight: '34px', fontWeight: '600' }],
        // AI explore new-chat greeting (screens/05-ai-explore.md, D70)
        display: ['48px', { lineHeight: '56px', fontWeight: '500' }],
        'display-sub': ['32px', { lineHeight: '40px', fontWeight: '500' }],
      },
      borderRadius: {
        control: '8px',
        card: '12px',
        pill: '999px',
      },
      spacing: {
        sidebar: '220px',
        'sidebar-collapsed': '64px', // collapsed sidebar: icon rail (D74)
        topbar: '56px',
      },
      width: {
        sidebar: '220px',
        'sidebar-collapsed': '64px', // collapsed sidebar: icon rail (D74)
      },
      height: {
        topbar: '56px',
      },
    },
  },
  plugins: [],
} satisfies Config;
