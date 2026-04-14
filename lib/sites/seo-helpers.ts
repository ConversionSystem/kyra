// ============================================================================
// SEO Helpers — Generate sitemap.xml, robots.txt, llms.txt for client sites
//
// These are generated during the build process and served as static files.
// ============================================================================

/**
 * Generate a proper XML sitemap for a client site.
 */
export function generateSitemapXml(
  domain: string,
  pages: Array<{ slug: string; updated_at?: string | null; page_type?: string | null }>
): string {
  const baseUrl = `https://${domain}`;
  const today = new Date().toISOString().split('T')[0];

  // Filter out /index (duplicate of homepage) and normalize
  const filtered = pages.filter(p => {
    const s = p.slug.replace(/^\/+/, '').replace(/\/+$/, '');
    return s !== 'index'; // /index is a duplicate of homepage
  });

  const urls = filtered.map((p) => {
    const normalSlug = p.slug.replace(/^\/+/, '').replace(/\/+$/, '');
    const isHome = normalSlug === '' || normalSlug === '/' || normalSlug === 'home';
    const loc = isHome ? `${baseUrl}/` : `${baseUrl}/${normalSlug}`;
    const lastmod = p.updated_at
      ? new Date(p.updated_at).toISOString().split('T')[0]
      : today;

    // Priority by page type and slug pattern
    let priority: string;
    let changefreq: string;
    if (isHome) {
      priority = '1.0';
      changefreq = 'weekly';
    } else if (normalSlug.startsWith('services/')) {
      priority = '0.9';
      changefreq = 'monthly';
    } else if (['about', 'faq', 'reviews', 'contact'].includes(normalSlug)) {
      priority = '0.8';
      changefreq = 'monthly';
    } else if (p.page_type === 'city_service' || normalSlug.includes('/')) {
      // City×service pages (e.g., san-mateo/ac-repair)
      priority = '0.6';
      changefreq = 'monthly';
    } else if (p.page_type === 'city') {
      priority = '0.7';
      changefreq = 'monthly';
    } else {
      priority = '0.5';
      changefreq = 'monthly';
    }

    return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

/**
 * Generate robots.txt with sitemap reference.
 */
export function generateRobotsTxt(domain: string): string {
  // Allow all crawlers including AI bots (GPTBot, ClaudeBot, etc.).
  // We WANT AI crawlers to index our pages for Generative Engine Optimization
  // (GEO) so the business appears in AI search citations.
  // Training opt-out is handled separately via the "ai-train=no" Content-Signal
  // header, which prevents model training without blocking retrieval.
  // Note: The live robots.txt may be managed by Cloudflare; this generated
  // version documents our intended policy for the build output.
  return `User-agent: *
Allow: /

# Explicitly allow AI crawlers for GEO (AI search citation).
# Training opt-out is handled via ai-train=no Content-Signal, not robots.txt.
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: https://${domain}/sitemap.xml
`;
}

/**
 * Generate llms.txt for AI/LLM discoverability (Generative Engine Optimization).
 * Follows the llms.txt spec — structured markdown that LLMs can parse.
 */
export function generateLlmsTxt(site: {
  business_name: string;
  domain: string;
  tagline?: string | null;
  industry?: string;
  services?: Array<{ name: string; slug: string; description?: string }> | null;
  cities?: Array<{ name: string; slug: string; state?: string }> | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  hours?: Record<string, string> | null;
  rating?: number | null;
  review_count?: number | null;
  years_in_business?: number | null;
  license?: string | null;
  lat?: number | null;
  lng?: number | null;
}): string {
  const lines: string[] = [];

  lines.push(`# ${site.business_name}`);
  if (site.tagline) {
    lines.push(`> ${site.tagline}`);
  }
  lines.push('');

  // Business overview
  if (site.industry || site.city) {
    lines.push('## About');
    const parts: string[] = [];
    if (site.industry && site.city && site.state) {
      parts.push(`${site.business_name} is a ${site.industry} business serving ${site.city}, ${site.state} and surrounding areas.`);
    } else if (site.industry) {
      parts.push(`${site.business_name} provides ${site.industry} services.`);
    }
    if (site.years_in_business) {
      parts.push(`${site.years_in_business}+ years of experience.`);
    }
    if (site.rating && site.review_count) {
      parts.push(`Rated ${site.rating}/5 from ${site.review_count} reviews.`);
    }
    lines.push(parts.join(' '));
    lines.push('');
  }

  // Services
  if (site.services?.length) {
    lines.push('## Services');
    for (const svc of site.services) {
      const desc = svc.description ? `: ${svc.description}` : '';
      lines.push(`- [${svc.name}](https://${site.domain}/services/${svc.slug})${desc}`);
    }
    lines.push('');
  }

  // Service areas
  if (site.cities?.length) {
    lines.push('## Service Areas');
    for (const city of site.cities) {
      const state = city.state || site.state || '';
      lines.push(`- ${city.name}${state ? `, ${state}` : ''}`);
    }
    lines.push('');
  }

  // Contact
  lines.push('## Contact');
  if (site.phone) lines.push(`- Phone: ${site.phone}`);
  if (site.email) lines.push(`- Email: ${site.email}`);
  if (site.address) lines.push(`- Address: ${site.address}`);
  lines.push(`- Website: https://${site.domain}`);
  lines.push('');

  // Expertise
  if (site.services?.length) {
    lines.push('## Expertise');
    const serviceNames = site.services.map(s => s.name).join(' · ');
    lines.push(`${serviceNames} — serving ${site.city || ''}, ${site.state || ''}.`);
    lines.push('');
  }

  // Trust Signals
  const trustLines: string[] = [];
  if (site.rating && site.review_count) trustLines.push(`- ${site.rating}/5 stars from ${site.review_count} reviews`);
  if (site.years_in_business) trustLines.push(`- ${site.years_in_business}+ years in business`);
  if (site.license) trustLines.push(`- Licensed: ${site.license}`);
  if (trustLines.length > 0) {
    lines.push('## Trust Signals');
    lines.push(...trustLines);
    lines.push('');
  }

  // Hours
  if (site.hours && Object.keys(site.hours).length > 0) {
    lines.push('## Hours');
    const dayOrder = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const dayNames: Record<string, string> = {
      mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
      fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
    };
    for (const day of dayOrder) {
      if (site.hours[day]) {
        lines.push(`- ${dayNames[day]}: ${site.hours[day]}`);
      }
    }
    lines.push('');
  }

  // Location
  if (site.address || site.city) {
    lines.push('## Location');
    const fullAddress = [site.address, site.city, site.state].filter(Boolean).join(', ');
    if (fullAddress) lines.push(fullAddress);
    if (site.lat && site.lng) lines.push(`Google Maps: https://www.google.com/maps?q=${site.lat},${site.lng}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Auto-generate keywords from business data for the meta keywords tag.
 */
export function generateKeywords(site: {
  business_name: string;
  industry?: string;
  city?: string | null;
  state?: string | null;
  services?: Array<{ name: string }> | null;
}): string {
  const keywords: string[] = [];

  keywords.push(site.business_name);
  if (site.industry) keywords.push(site.industry);
  if (site.city) keywords.push(site.city);
  if (site.state) keywords.push(site.state);

  // Add service names
  if (site.services?.length) {
    for (const svc of site.services) {
      keywords.push(svc.name);
      // Add "service + city" combo for local SEO
      if (site.city) {
        keywords.push(`${svc.name} ${site.city}`);
      }
    }
  }

  // Add industry + city combo
  if (site.industry && site.city) {
    keywords.push(`${site.industry} ${site.city}`);
    keywords.push(`${site.industry} near me`);
  }

  // Deduplicate
  return [...new Set(keywords)].join(', ');
}

// ---------- Utility ----------

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
