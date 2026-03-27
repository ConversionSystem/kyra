// ============================================================================
// Design System — CSS generation for design styles and brand colors
//
// Each design style produces meaningfully different CSS:
// - modern-dark: Dark slate body, glassmorphism cards, glowing CTAs
// - clean-light: White/gray body, sharp cards, professional service look
// - bold: High-contrast, thick borders, aggressive typography, strong color blocks
// - minimal: Maximum whitespace, light borders, refined typography
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

  const surface = isDark ? '#1e293b' : '#ffffff';
  const text = isDark ? '#f1f5f9' : '#111827';
  const textMuted = isDark ? '#94a3b8' : '#6b7280';
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

/* ===== MODERN DARK — Dark slate, glassmorphism, glowing accents ===== */
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  background-color: #0f172a;
  color: #e2e8f0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
  margin: 0;
}
/* Section alternation */
section { background-color: #0f172a; }
section:nth-child(even) { background-color: #1e293b; }
/* Glassmorphism cards */
.kyra-card, [class*="rounded-2xl"]:not(section):not(nav):not(footer) {
  background: rgba(255, 255, 255, 0.04) !important;
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.09) !important;
}
/* Headings */
h1, h2, h3, h4, h5, h6 { color: #f1f5f9; font-weight: 800; letter-spacing: -0.02em; }
h2 { font-size: clamp(1.7rem, 3.5vw, 2.5rem); }
h3 { font-size: 1.2rem; }
/* Body text */
p { color: #94a3b8; line-height: 1.75; }
/* Links */
a { color: var(--color-primary); }
/* Service section bg */
section[aria-label*="Services"], section[aria-label*="service"] { background-color: #1e293b; }
/* Testimonials bg */
section[aria-label*="Testimonial"] { background-color: #0f172a; }
/* Stats section already uses gradient */
/* Footer */
footer { background-color: #020617 !important; }
/* Override Tailwind gray text in dark mode */
[style*="color: #6b7280"], [style*="color: #374151"], [style*="color: #4b5563"] { color: #94a3b8 !important; }
[style*="color: #1f2937"], [style*="color: #111827"] { color: #f1f5f9 !important; }
/* Card backgrounds in dark mode */
[style*="background: #ffffff"], [style*="background:#ffffff"],
[style*="background: #f9fafb"], [style*="background: #f8fafc"] {
  background: #1e293b !important;
}
[style*="border: 1px solid #f0f0f0"],
[style*="border: 1px solid #e5e7eb"] {
  border-color: rgba(255,255,255,0.08) !important;
}`;

    case 'clean-light':
      return `${vars}

/* ===== CLEAN LIGHT — White body, card-based, professional ===== */
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  background-color: #ffffff;
  color: #1f2937;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
  margin: 0;
}
section { background-color: #ffffff; }
section:nth-child(even) { background-color: #f9fafb; }
/* Cards */
.kyra-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
/* Headings */
h1, h2, h3, h4, h5, h6 { color: #111827; font-weight: 700; letter-spacing: -0.015em; }
h2 { font-size: clamp(1.6rem, 3.5vw, 2.4rem); }
/* Body text */
p { color: #4b5563; line-height: 1.7; }
a { color: var(--color-primary); }
/* Section overrides */
section[aria-label*="Services"] { background-color: #f9fafb; }
section[aria-label*="Testimonial"] { background-color: #f3f4f6; }
footer { background-color: #111827 !important; }`;

    case 'bold':
      return `${vars}

/* ===== BOLD — High-contrast, big type, thick borders, strong color blocks ===== */
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  background-color: #ffffff;
  color: #111827;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
  margin: 0;
}
section { background-color: #ffffff; }
section:nth-child(even) { background-color: #f3f4f6; }
/* Bold cards */
.kyra-card {
  background: #ffffff;
  border: 3px solid #111827;
  border-radius: 8px;
  box-shadow: 6px 6px 0 #111827;
}
/* Big, heavy headings */
h1, h2, h3, h4, h5, h6 {
  color: #111827;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.05;
}
h2 { font-size: clamp(1.9rem, 4vw, 3rem); }
h3 { font-size: 1.3rem; }
/* Body text */
p { color: #374151; font-size: 1.05rem; line-height: 1.7; }
a { color: var(--color-primary); font-weight: 700; }
/* Services section */
section[aria-label*="Services"] { background-color: #f3f4f6; }
/* Testimonials */
section[aria-label*="Testimonial"] { background-color: #111827; }
section[aria-label*="Testimonial"] h2 { color: #ffffff !important; }
section[aria-label*="Testimonial"] [style*="color: #111827"] { color: #ffffff !important; }
section[aria-label*="Testimonial"] [style*="color: #374151"] { color: #d1d5db !important; }
footer { background-color: #111827 !important; }`;

    case 'minimal':
    default:
      return `${vars}

/* ===== MINIMAL — Generous whitespace, elegant type, no clutter ===== */
*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  background-color: #fafafa;
  color: #374151;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.7;
  margin: 0;
}
section { background-color: #fafafa; }
section:nth-child(even) { background-color: #ffffff; }
/* Minimal cards — borderless or hairline */
.kyra-card {
  background: #ffffff;
  border: none;
  border-top: 2px solid var(--color-primary);
  border-radius: 0;
  padding: 2.5rem;
}
/* Refined typography */
h1, h2, h3, h4, h5, h6 {
  color: #111827;
  font-weight: 700;
  letter-spacing: -0.015em;
  line-height: 1.2;
}
h2 { font-size: clamp(1.5rem, 3vw, 2.2rem); font-weight: 600; }
h3 { font-size: 1.1rem; font-weight: 600; }
/* Body */
p { color: #6b7280; line-height: 1.8; }
a { color: var(--color-primary); text-decoration: underline; text-underline-offset: 3px; }
/* Services — more whitespace */
section[aria-label*="Services"] { padding: 6rem 1.5rem; background: #ffffff; }
/* Testimonials — clean white */
section[aria-label*="Testimonial"] { background-color: #f9fafb; }
footer { background-color: #111827 !important; }`;
  }
}
