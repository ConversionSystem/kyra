/**
 * Internal Linker Writer
 *
 * Injects hub-and-spoke internal links and breadcrumbs into assembled HTML pages.
 *
 * Called after all pages are assembled by build-helpers.ts.
 * Adds a "Related Pages" section before the footer with contextual links.
 */

interface AssembledPage {
  slug: string;
  type: string;
  html: string;
}

interface InternalLink {
  anchor: string;
  url: string;
}

/**
 * Add internal links to all assembled pages.
 *
 * For each page, finds related pages using text similarity,
 * then injects a "Related Pages" section with contextual links.
 * Also adds breadcrumb navigation.
 */
export function addInternalLinks(pages: AssembledPage[]): AssembledPage[] {
  if (pages.length < 2) return pages;

  return pages.map((page) => {
    // Build links from page type relationships (hub-and-spoke model)
    const links = buildStructuralLinks(page, pages);

    if (links.length === 0) return page;

    // Inject the related links section before </body> or before the footer
    const linksHtml = buildRelatedLinksSection(links, page.slug);
    const breadcrumb = buildBreadcrumbHtml(page, pages);

    let html = page.html;

    // Inject breadcrumb after opening <main> or first <section>
    if (breadcrumb) {
      const mainMatch = html.match(/<main[^>]*>/i);
      if (mainMatch) {
        const insertPos = (mainMatch.index || 0) + mainMatch[0].length;
        html = html.slice(0, insertPos) + breadcrumb + html.slice(insertPos);
      }
    }

    // Inject related links before </body> or before last </footer>
    const footerIdx = html.lastIndexOf('</footer>');
    if (footerIdx > -1) {
      html = html.slice(0, footerIdx) + linksHtml + html.slice(footerIdx);
    } else {
      const bodyIdx = html.lastIndexOf('</body>');
      if (bodyIdx > -1) {
        html = html.slice(0, bodyIdx) + linksHtml + html.slice(bodyIdx);
      }
    }

    return { ...page, html };
  });
}

/**
 * Build structural internal links based on page type relationships.
 * Hub-and-spoke model:
 * - Service pages link to city×service combos
 * - City pages link to services in that city
 * - City×service pages link to parent service + sibling cities
 */
function buildStructuralLinks(
  page: AssembledPage,
  allPages: AssembledPage[],
): InternalLink[] {
  const links: InternalLink[] = [];
  const slug = page.slug;

  // Always link to homepage
  if (slug !== '/') {
    links.push({ anchor: 'Home', url: '/' });
  }

  if (page.type === 'service') {
    // Service page → link to city×service combos
    const servicePart = slug.split('/').pop() || '';
    const cityServicePages = allPages.filter(
      (p) => p.type === 'city_service' && p.slug.endsWith(`/${servicePart}`),
    );
    for (const cs of cityServicePages.slice(0, 5)) {
      links.push({ anchor: extractTitle(cs.html) || cs.slug, url: cs.slug });
    }
  } else if (page.type === 'city') {
    // City page → link to services in this city
    const citySlugPart = slug.replace(/^\//, '');
    const servicesInCity = allPages.filter(
      (p) => p.type === 'city_service' && p.slug.startsWith(`/${citySlugPart}/`),
    );
    for (const s of servicesInCity.slice(0, 5)) {
      links.push({ anchor: extractTitle(s.html) || s.slug, url: s.slug });
    }
    // Also link to other city pages (siblings)
    const otherCities = allPages.filter(
      (p) => p.type === 'city' && p.slug !== slug,
    );
    for (const c of otherCities.slice(0, 3)) {
      links.push({ anchor: extractTitle(c.html) || c.slug, url: c.slug });
    }
  } else if (page.type === 'city_service') {
    // City×Service → link to parent service page + sibling city×service
    const parts = slug.replace(/^\//, '').split('/');
    if (parts.length >= 2) {
      const cityPart = parts[0];
      const servicePart = parts[1];

      // Parent service
      const parentService = allPages.find(
        (p) => p.type === 'service' && p.slug === `/services/${servicePart}`,
      );
      if (parentService) {
        links.push({ anchor: extractTitle(parentService.html) || 'Our Service', url: parentService.slug });
      }

      // Parent city
      const parentCity = allPages.find(
        (p) => p.type === 'city' && p.slug === `/${cityPart}`,
      );
      if (parentCity) {
        links.push({ anchor: extractTitle(parentCity.html) || cityPart, url: parentCity.slug });
      }

      // Siblings (same service, different cities)
      const siblings = allPages.filter(
        (p) => p.type === 'city_service' && p.slug !== slug && p.slug.endsWith(`/${servicePart}`),
      );
      for (const s of siblings.slice(0, 3)) {
        links.push({ anchor: extractTitle(s.html) || s.slug, url: s.slug });
      }
    }
  } else if (page.type === 'homepage') {
    // Homepage → link to main service pages
    const servicePages = allPages.filter((p) => p.type === 'service');
    for (const s of servicePages.slice(0, 5)) {
      links.push({ anchor: extractTitle(s.html) || s.slug, url: s.slug });
    }
    // Link to city pages
    const cityPages = allPages.filter((p) => p.type === 'city');
    for (const c of cityPages.slice(0, 3)) {
      links.push({ anchor: extractTitle(c.html) || c.slug, url: c.slug });
    }
  }

  return links.slice(0, 12); // Max 12 internal links per page
}

function buildRelatedLinksSection(links: InternalLink[], currentSlug: string): string {
  if (links.length === 0) return '';

  const linkItems = links
    .filter((l) => l.url !== currentSlug)
    .map((l) => `<li><a href="${l.url}" style="color:var(--color-primary,#6366f1);text-decoration:none;">${escapeHtml(l.anchor)}</a></li>`)
    .join('\n        ');

  return `
    <section style="padding:2rem 1rem;border-top:1px solid var(--color-border,#e5e7eb);">
      <div style="max-width:1200px;margin:0 auto;">
        <h3 style="font-size:1.1rem;margin-bottom:1rem;color:var(--color-text-muted,#6b7280);">Related Pages</h3>
        <ul style="list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:0.5rem 1.5rem;">
        ${linkItems}
        </ul>
      </div>
    </section>
  `;
}

function buildBreadcrumbHtml(page: AssembledPage, allPages: AssembledPage[]): string | null {
  if (page.slug === '/') return null;

  const crumbs: Array<{ label: string; url: string }> = [{ label: 'Home', url: '/' }];

  if (page.type === 'service') {
    crumbs.push({ label: 'Services', url: '#' });
    crumbs.push({ label: extractTitle(page.html) || 'Service', url: page.slug });
  } else if (page.type === 'city') {
    crumbs.push({ label: 'Service Areas', url: '#' });
    crumbs.push({ label: extractTitle(page.html) || 'City', url: page.slug });
  } else if (page.type === 'city_service') {
    const parts = page.slug.replace(/^\//, '').split('/');
    if (parts.length >= 2) {
      const cityPage = allPages.find((p) => p.type === 'city' && p.slug === `/${parts[0]}`);
      const servicePage = allPages.find((p) => p.type === 'service' && p.slug === `/services/${parts[1]}`);
      if (servicePage) crumbs.push({ label: extractTitle(servicePage.html) || 'Service', url: servicePage.slug });
      if (cityPage) crumbs.push({ label: extractTitle(cityPage.html) || parts[0], url: cityPage.slug });
    }
    crumbs.push({ label: extractTitle(page.html) || 'Service', url: page.slug });
  } else {
    crumbs.push({ label: extractTitle(page.html) || page.slug.replace(/^\//, ''), url: page.slug });
  }

  const crumbItems = crumbs
    .map((c, i) =>
      i === crumbs.length - 1
        ? `<span style="color:var(--color-text-muted,#6b7280);">${escapeHtml(c.label)}</span>`
        : `<a href="${c.url}" style="color:var(--color-primary,#6366f1);text-decoration:none;">${escapeHtml(c.label)}</a>`,
    )
    .join(' <span style="color:var(--color-text-muted,#6b7280);margin:0 0.25rem;">›</span> ');

  return `
    <nav aria-label="Breadcrumb" style="padding:0.75rem 1rem;font-size:0.875rem;max-width:1200px;margin:0 auto;">
      ${crumbItems}
    </nav>
  `;
}

// ── Utilities ────────────────────────────────────────────────────────────

function extractTitle(html: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (match) return stripTags(match[1]).trim();

  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (titleMatch) return stripTags(titleMatch[1]).trim();

  return '';
}

function extractTextContent(html: string): string {
  return stripTags(html).replace(/\s+/g, ' ').trim().slice(0, 5000);
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
