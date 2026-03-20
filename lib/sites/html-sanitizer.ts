// ============================================================================
// HTML Sanitizer for AI-Generated HTML
// Removes XSS vectors while preserving Tailwind classes and allowed scripts.
// ============================================================================

const TRUSTED_SCRIPT_DOMAINS = [
  'cdn.tailwindcss.com',
  'widget.kyra.conversionsystem.com',
];

const TRUSTED_IFRAME_DOMAINS = [
  'google.com/maps',
  'maps.google.com',
  'youtube.com',
  'youtube-nocookie.com',
];

export function sanitizeGeneratedHTML(
  html: string,
  allowedScripts: string[] = [],
): string {
  let result = html;

  // 1. Remove <script> tags except whitelisted ones
  result = result.replace(/<script[\s>][^]*?<\/script>/gi, (match) => {
    const matchLower = match.toLowerCase();

    // Allow JSON-LD schema markup
    if (matchLower.includes('application/ld+json')) return match;

    // Allow Tailwind config blocks
    if (matchLower.includes('tailwind.config')) return match;

    // Allow trusted domains
    for (const domain of TRUSTED_SCRIPT_DOMAINS) {
      if (matchLower.includes(domain)) return match;
    }

    // Allow explicitly allowed scripts
    for (const allowed of allowedScripts) {
      if (matchLower.includes(allowed.toLowerCase())) return match;
    }

    // Remove everything else
    return '<!-- removed script -->';
  });

  // 2. Remove on* event handlers (onclick, onerror, onload, etc.)
  result = result.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // 3. Remove javascript: URLs
  result = result.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
  result = result.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');
  result = result.replace(/action\s*=\s*["']javascript:[^"']*["']/gi, 'action="#"');

  // 4. Remove iframes from untrusted domains
  result = result.replace(/<iframe[\s>][^]*?<\/iframe>/gi, (match) => {
    const matchLower = match.toLowerCase();
    for (const domain of TRUSTED_IFRAME_DOMAINS) {
      if (matchLower.includes(domain)) return match;
    }
    return '<!-- removed iframe -->';
  });

  // Also handle self-closing iframes
  result = result.replace(/<iframe\s[^>]*\/>/gi, (match) => {
    const matchLower = match.toLowerCase();
    for (const domain of TRUSTED_IFRAME_DOMAINS) {
      if (matchLower.includes(domain)) return match;
    }
    return '<!-- removed iframe -->';
  });

  // 5. Remove form actions pointing to external domains
  result = result.replace(
    /(<form\s[^>]*?)action\s*=\s*["'](https?:\/\/[^"']+)["']/gi,
    (_match, prefix, url) => {
      try {
        const parsed = new URL(url);
        const hostname = parsed.hostname;
        // Allow same-domain and common trusted form processors
        if (
          hostname.includes('kyra.conversionsystem.com') ||
          hostname === 'localhost'
        ) {
          return `${prefix}action="${url}"`;
        }
      } catch {
        // Invalid URL, remove it
      }
      return `${prefix}action="#"`;
    },
  );

  // 6. Remove data attributes that could be XSS vectors
  // Keep data-client-id (widget) and data-testid, remove suspicious ones
  result = result.replace(
    /\s+data-(?!client-id|testid|page|section)[a-z-]+\s*=\s*["']javascript:[^"']*["']/gi,
    '',
  );

  // 7. Remove <base> tags that could redirect resources
  result = result.replace(/<base\s[^>]*>/gi, '<!-- removed base -->');

  // 8. Remove <meta http-equiv="refresh"> redirects
  result = result.replace(/<meta\s+http-equiv\s*=\s*["']refresh["'][^>]*>/gi, '<!-- removed meta refresh -->');

  // 9. Remove <object>, <embed>, <applet> tags
  result = result.replace(/<(?:object|embed|applet)[\s>][^]*?<\/(?:object|embed|applet)>/gi, '<!-- removed -->');
  result = result.replace(/<(?:object|embed|applet)\s[^>]*\/>/gi, '<!-- removed -->');

  return result;
}
