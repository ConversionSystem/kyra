// ============================================================================
// HTML Quality Checker
// Validates AI-generated HTML for structure, accessibility, and completeness.
// ============================================================================

interface QualityResult {
  valid: boolean;
  issues: string[];
  score: number; // 0-100
}

export function validateGeneratedHTML(html: string): QualityResult {
  const issues: string[] = [];
  let score = 100;

  const lower = html.toLowerCase();

  // --- Structure checks ---

  if (!lower.includes('<!doctype html')) {
    issues.push('Missing <!DOCTYPE html> declaration');
    score -= 10;
  }

  if (!/<html[\s>]/i.test(html)) {
    issues.push('Missing <html> tag');
    score -= 10;
  }

  if (!/<head[\s>]/i.test(html)) {
    issues.push('Missing <head> tag');
    score -= 10;
  }

  if (!/<body[\s>]/i.test(html)) {
    issues.push('Missing <body> tag');
    score -= 10;
  }

  if (!/<\/html>/i.test(html)) {
    issues.push('Missing closing </html> tag');
    score -= 5;
  }

  // --- Meta checks ---

  if (!lower.includes('meta') || !lower.includes('charset')) {
    issues.push('Missing <meta charset> tag');
    score -= 5;
  }

  if (!lower.includes('viewport')) {
    issues.push('Missing <meta viewport> tag');
    score -= 5;
  }

  if (!/<title[\s>]/i.test(html)) {
    issues.push('Missing <title> tag');
    score -= 5;
  }

  // --- Tailwind CDN ---

  if (!lower.includes('cdn.tailwindcss.com')) {
    issues.push('Tailwind CDN script not found');
    score -= 15;
  }

  // --- Chat widget ---

  if (!lower.includes('widget.kyra.conversionsystem.com')) {
    issues.push('Kyra chat widget script not found');
    score -= 5;
  }

  // --- Responsive design ---

  const responsivePrefixes = ['sm:', 'md:', 'lg:'];
  const hasResponsive = responsivePrefixes.some((p) => html.includes(p));
  if (!hasResponsive) {
    issues.push('No Tailwind responsive prefixes found (sm:, md:, lg:) - may not be responsive');
    score -= 10;
  }

  // --- Schema markup ---

  if (!lower.includes('application/ld+json')) {
    issues.push('No JSON-LD schema markup found');
    score -= 5;
  }

  // --- Image accessibility ---

  const imgTags = html.match(/<img\s[^>]*>/gi) || [];
  const imgsWithoutAlt = imgTags.filter((tag) => !tag.includes('alt='));
  if (imgsWithoutAlt.length > 0) {
    issues.push(`${imgsWithoutAlt.length} image(s) missing alt text`);
    score -= Math.min(imgsWithoutAlt.length * 2, 10);
  }

  // --- Heading hierarchy ---

  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1Count === 0) {
    issues.push('No <h1> heading found');
    score -= 5;
  } else if (h1Count > 1) {
    issues.push(`Multiple <h1> headings found (${h1Count}) - should be exactly one`);
    score -= 3;
  }

  // --- XSS vectors (beyond allowed scripts) ---

  const scriptTags = html.match(/<script[\s>][^]*?<\/script>/gi) || [];
  const suspiciousScripts = scriptTags.filter((tag) => {
    const tagLower = tag.toLowerCase();
    // Allow: Tailwind CDN, Kyra widget, JSON-LD schema, Tailwind config
    if (tagLower.includes('cdn.tailwindcss.com')) return false;
    if (tagLower.includes('widget.kyra.conversionsystem.com')) return false;
    if (tagLower.includes('application/ld+json')) return false;
    if (tagLower.includes('tailwind.config')) return false;
    return true;
  });
  if (suspiciousScripts.length > 0) {
    issues.push(`${suspiciousScripts.length} unexpected <script> tag(s) found`);
    score -= suspiciousScripts.length * 5;
  }

  // --- Inline styles warning ---

  const inlineStyleCount = (html.match(/\sstyle\s*=/gi) || []).length;
  if (inlineStyleCount > 5) {
    issues.push(`${inlineStyleCount} inline styles found - prefer Tailwind classes`);
    score -= 3;
  }

  // --- File size ---

  const sizeKB = Buffer.byteLength(html, 'utf8') / 1024;
  if (sizeKB > 500) {
    issues.push(`HTML file size (${Math.round(sizeKB)}KB) exceeds 500KB limit`);
    score -= 10;
  }

  // --- Broken image references ---

  const srcMatches = html.match(/src\s*=\s*["']([^"']+)["']/gi) || [];
  for (const srcAttr of srcMatches) {
    const url = srcAttr.match(/src\s*=\s*["']([^"']+)["']/i)?.[1] || '';
    if (url && !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('/') && !url.startsWith('#')) {
      issues.push(`Potentially broken image reference: ${url.slice(0, 50)}`);
      score -= 2;
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    valid: score >= 50,
    issues,
    score,
  };
}
