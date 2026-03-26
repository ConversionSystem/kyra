// ============================================================================
// Design System — CSS generation for design styles and brand colors
//
// Each design style produces meaningfully different CSS:
// - modern-dark: Dark backgrounds, glassmorphism, gradient CTAs
// - clean-light: White/card-based, soft shadows, professional
// - bold: Extra-large type, high-contrast sections, aggressive CTAs
// - minimal: Generous whitespace, narrow columns, understated
// ============================================================================

import type { DesignStyle } from './types';

// ---------- Color Utilities ----------

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '99, 102, 241'; // fallback indigo
  return `${r}, ${g}, ${b}`;
}

// ---------- Color Variables ----------

export function generateColorVariables(
  colorPrimary: string,
  colorSecondary: string,
  designStyle: DesignStyle | string,
): string {
  const primaryRgb = hexToRgb(colorPrimary);
  const secondaryRgb = hexToRgb(colorSecondary);
  const isDark = designStyle === 'modern-dark';

  const surface = isDark ? '#1f2937' : '#ffffff';
  const text = isDark ? '#f9fafb' : '#111827';
  const textMuted = isDark ? '#9ca3af' : '#6b7280';
  const border = isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const accent = colorSecondary || colorPrimary;

  return `:root {
  --color-primary: ${colorPrimary};
  --color-primary-rgb: ${primaryRgb};
  --color-secondary: ${colorSecondary};
  --color-secondary-rgb: ${secondaryRgb};
  --color-surface: ${surface};
  --color-text: ${text};
  --color-text-muted: ${textMuted};
  --color-border: ${border};
  --color-accent: ${accent};
}`;
}

// ---------- Design Style CSS ----------

export function getDesignCSS(
  designStyle: DesignStyle | string,
  colorPrimary: string,
  colorSecondary: string,
): string {
  const vars = generateColorVariables(colorPrimary, colorSecondary, designStyle);

  switch (designStyle) {
    case 'modern-dark':
      return `${vars}

/* modern-dark: Dark body, glassmorphism cards, gradient CTAs */
body {
  background-color: #111827;
  color: #f9fafb;
  font-family: 'Inter', system-ui, sans-serif;
}
.hero {
  background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
  color: #f9fafb;
}
.hero h1 { color: #ffffff; font-weight: 800; }
.hero .subtitle { color: #d1d5db; }
.card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 2rem;
}
.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
  color: #ffffff;
  font-weight: 700;
  padding: 0.875rem 2rem;
  border-radius: 0.75rem;
  border: none;
  transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.9; }
section { border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
h2, h3 { color: #f3f4f6; }
p { color: #d1d5db; }
a { color: var(--color-primary); }
.trust-signal { color: var(--color-primary); font-weight: 600; }`;

    case 'clean-light':
      return `${vars}

/* clean-light: White body, card sections, soft shadows, professional */
body {
  background-color: #ffffff;
  color: #111827;
  font-family: 'Inter', system-ui, sans-serif;
}
.hero {
  background: #f9fafb;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
}
.hero h1 { color: #111827; font-weight: 700; }
.hero .subtitle { color: #4b5563; }
.card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.btn-primary {
  background: var(--color-primary);
  color: #ffffff;
  font-weight: 600;
  padding: 0.75rem 1.75rem;
  border-radius: 0.5rem;
  border: none;
  transition: background 0.2s;
}
.btn-primary:hover { filter: brightness(1.1); }
section {
  border-bottom: 1px solid #f3f4f6;
  padding: 4rem 0;
}
h2, h3 { color: #111827; }
p { color: #374151; }
a { color: var(--color-primary); }
.trust-signal { color: var(--color-primary); font-weight: 600; }`;

    case 'bold':
      return `${vars}

/* bold: Extra-large headlines, high-contrast sections, aggressive CTAs */
body {
  background-color: #ffffff;
  color: #111827;
  font-family: 'Inter', system-ui, sans-serif;
}
.hero {
  background: var(--color-primary);
  color: #ffffff;
  padding: 6rem 0;
}
.hero h1 {
  color: #ffffff;
  font-size: 3.75rem;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.025em;
}
.hero .subtitle { color: rgba(255, 255, 255, 0.9); font-size: 1.25rem; }
.card {
  background: #ffffff;
  border: 3px solid #111827;
  border-radius: 0.5rem;
  padding: 2rem;
}
.btn-primary {
  background: #111827;
  color: #ffffff;
  font-weight: 800;
  padding: 1rem 2.5rem;
  border-radius: 0.25rem;
  border: none;
  font-size: 1.125rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: transform 0.15s, background 0.2s;
}
.btn-primary:hover { transform: scale(1.03); background: var(--color-primary); }
section:nth-child(even) { background: #f9fafb; }
section:nth-child(odd) { background: #ffffff; }
section { padding: 5rem 0; }
h2 { font-size: 2.5rem; font-weight: 800; color: #111827; }
h3 { font-size: 1.5rem; font-weight: 700; color: #111827; }
p { color: #374151; font-size: 1.125rem; line-height: 1.75; }
a { color: var(--color-primary); font-weight: 700; }
.trust-signal { color: var(--color-primary); font-weight: 800; font-size: 1.25rem; }`;

    case 'minimal':
    default:
      return `${vars}

/* minimal: Generous whitespace, refined typography, full-width layout */
body {
  background-color: #ffffff;
  color: #374151;
  font-family: 'Inter', system-ui, sans-serif;
}
.hero {
  background: #ffffff;
  color: #111827;
  padding: 5rem 0;
}
.hero h1 { color: #111827; font-weight: 600; font-size: 2.5rem; letter-spacing: -0.01em; }
.hero .subtitle { color: #6b7280; font-size: 1.125rem; }
.card {
  background: #ffffff;
  border: none;
  border-top: 1px solid #e5e7eb;
  padding: 2rem;
}
.btn-primary {
  background: transparent;
  color: var(--color-primary);
  font-weight: 500;
  padding: 0.75rem 1.75rem;
  border-radius: 0.375rem;
  border: 1px solid var(--color-primary);
  transition: background 0.2s, color 0.2s;
}
.btn-primary:hover { background: var(--color-primary); color: #ffffff; }
section {
  padding: 4rem 1rem;
  border-bottom: 1px solid #f3f4f6;
}
h2 { font-size: 1.75rem; font-weight: 600; color: #111827; }
h3 { font-size: 1.25rem; font-weight: 500; color: #374151; }
p { color: #6b7280; line-height: 1.8; }
a { color: var(--color-primary); text-decoration: underline; }
.trust-signal { color: #374151; font-weight: 500; }`;
  }
}
