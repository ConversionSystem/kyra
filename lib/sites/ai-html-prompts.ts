// ============================================================================
// AI HTML Generation Prompts
// Specialized prompts that instruct the LLM to generate complete HTML pages
// with Tailwind CSS, responsive design, and brand-specific styling.
// ============================================================================

import type { ClientSite, ContentSection, FaqItem, SitePhoto } from './types';

// ---------- Design style tokens ----------

const DESIGN_TOKENS: Record<string, string> = {
  'modern-dark': `Dark backgrounds (#0f172a, #1e293b) with vibrant accent colors. White text on dark sections. Card elements with subtle borders and glass-morphism effects. Dark hero with large typography.`,
  'clean-light': `White and light gray backgrounds. Subtle shadows and rounded corners. Clean typography with good line spacing. Soft accent color usage. Airy, spacious feel.`,
  'bold': `Strong, saturated colors used liberally. Large bold headings. High contrast sections. Thick borders or color blocks. Energetic and confident feel.`,
  'minimal': `Lots of whitespace. Thin typography. Subtle interactions. Understated elegance. Content breathes. Accent color used sparingly for emphasis only.`,
};

// ---------- Shared instructions ----------

const BASE_INSTRUCTIONS = `You are an elite web designer who creates $5,000+ custom websites.
You output ONLY valid HTML. No markdown, no explanations, no code fences.

TECHNICAL REQUIREMENTS:
- Output a complete document from <!DOCTYPE html> to </html>
- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Mobile-first responsive design (use sm:, md:, lg:, xl: prefixes)
- Semantic HTML5 elements (header, nav, main, section, footer)
- ARIA attributes for accessibility (aria-label, role, alt text on all images)
- Proper heading hierarchy (one h1 per page, then h2, h3)
- Fast loading: NO heavy JavaScript, NO animations libraries, NO jQuery
- Include <meta charset="UTF-8"> and <meta name="viewport" content="width=device-width, initial-scale=1.0">

ANTI-PATTERNS (NEVER do these):
- No Bootstrap, no jQuery, no external CSS frameworks beyond Tailwind CDN
- No lorem ipsum or placeholder text
- No generic stock descriptions ("We are a leading provider...")
- No inline styles that fight Tailwind (use Tailwind classes exclusively)
- No "pride ourselves", "don't hesitate", "state-of-the-art", "second to none"
- No "look no further", "in today's fast-paced world", "one-stop shop"
- No em dashes
- No empty href="#" links without purpose

DESIGN PRINCIPLES:
- Every layout decision should feel intentional for THIS specific business
- Use the brand colors consistently: primary for CTAs and highlights, secondary for text/backgrounds
- Images use placeholder URLs from picsum.photos with relevant sizing
- Phone numbers must be clickable: <a href="tel:+1XXXXXXXXXX">
- Include a sticky/fixed header with navigation
- Footer with business info, quick links, and copyright`;

// ---------- Color instruction builder ----------

function colorInstructions(primary: string, secondary: string): string {
  return `BRAND COLORS:
- Primary: ${primary} — use for buttons, CTAs, links, highlights, accents
- Secondary: ${secondary} — use for dark backgrounds, text on light backgrounds, footer
- Configure Tailwind with these colors using a <script> block:
<script>
tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: '${primary}',
        dark: '${secondary}',
      }
    }
  }
}
</script>
Then use classes like bg-brand, text-brand, bg-dark, text-dark throughout.`;
}

// ---------- Widget + schema instructions ----------

function widgetScript(clientId: string | null): string {
  if (!clientId) return '';
  return `Include this chat widget script just before </body>:
<script src="https://widget.kyra.conversionsystem.com/widget.js" data-client-id="${clientId}"></script>`;
}

function schemaInstruction(schemaMarkup: unknown): string {
  if (!schemaMarkup) return '';
  return `Include this JSON-LD schema markup in the <head>:
<script type="application/ld+json">
${JSON.stringify(schemaMarkup, null, 2)}
</script>`;
}

// ---------- Photo instructions ----------

function photoInstructions(photos: SitePhoto[]): string {
  if (!photos?.length) {
    return `Use picsum.photos placeholder images with appropriate dimensions (e.g., https://picsum.photos/800/600 for hero, https://picsum.photos/400/300 for cards).`;
  }
  const photoList = photos.map((p, i) => `- Photo ${i + 1}: ${p.url}${p.alt ? ` (${p.alt})` : ''}`).join('\n');
  return `Use these real business photos:\n${photoList}\nFill any remaining image slots with picsum.photos placeholders.`;
}

// ---------- Content formatter ----------

function formatSections(sections: ContentSection[]): string {
  if (!sections?.length) return '';
  return sections.map((s) => {
    let text = `### ${s.heading}\n${s.body}`;
    if (s.bullets?.length) {
      text += '\n' + s.bullets.map((b) => `- ${b}`).join('\n');
    }
    return text;
  }).join('\n\n');
}

function formatFaq(faq: FaqItem[]): string {
  if (!faq?.length) return '';
  return faq.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
}

// ============================================================================
// PAGE-TYPE PROMPTS
// ============================================================================

export function homepageHTMLPrompt(opts: {
  site: ClientSite;
  hero_h1: string;
  hero_subtitle: string;
  content_sections: ContentSection[];
  faq: FaqItem[];
  schema_markup: unknown;
  designStyle: string;
  colorPrimary: string;
  colorSecondary: string;
  photos: SitePhoto[];
}): string {
  const { site, hero_h1, hero_subtitle, content_sections, faq, schema_markup, designStyle, colorPrimary, colorSecondary, photos } = opts;
  const style = DESIGN_TOKENS[designStyle] || DESIGN_TOKENS['modern-dark'];

  return `${BASE_INSTRUCTIONS}

DESIGN STYLE: ${designStyle}
${style}

${colorInstructions(colorPrimary, colorSecondary)}

${photoInstructions(photos)}

${schemaInstruction(schema_markup)}
${widgetScript(site.client_id)}

PAGE TYPE: Homepage
BUSINESS: ${site.business_name}
INDUSTRY: ${site.industry}
LOCATION: ${site.address?.city || 'Local'}, ${site.address?.state || ''}
PHONE: ${site.phone || ''}
RATING: ${site.rating || 5}/5 (${site.review_count || 0} reviews)

PAGE CONTENT TO USE:
Title: ${site.business_name} | ${site.industry}

HERO:
H1: ${hero_h1}
Subtitle: ${hero_subtitle}

SECTIONS:
${formatSections(content_sections)}

${faq?.length ? `FAQ:\n${formatFaq(faq)}` : ''}

LAYOUT REQUIREMENTS:
- Full-width hero section with a compelling background (gradient or image overlay)
- Navigation bar with business name/logo, page links (About, Services, Contact), and phone CTA button
- Services section as a grid of cards (2 cols mobile, 3-4 cols desktop)
- "Why Choose Us" section with icons or visual elements
- Social proof/reviews section
- Service area mention
- Strong CTA section before footer
- Footer with address, phone, hours, and copyright

Generate the complete HTML document now.`;
}

export function servicePageHTMLPrompt(opts: {
  site: ClientSite;
  title: string;
  hero_h1: string;
  hero_subtitle: string;
  content_sections: ContentSection[];
  faq: FaqItem[];
  schema_markup: unknown;
  designStyle: string;
  colorPrimary: string;
  colorSecondary: string;
  photos: SitePhoto[];
}): string {
  const { site, title, hero_h1, hero_subtitle, content_sections, faq, schema_markup, designStyle, colorPrimary, colorSecondary, photos } = opts;
  const style = DESIGN_TOKENS[designStyle] || DESIGN_TOKENS['modern-dark'];

  return `${BASE_INSTRUCTIONS}

DESIGN STYLE: ${designStyle}
${style}

${colorInstructions(colorPrimary, colorSecondary)}

${photoInstructions(photos)}

${schemaInstruction(schema_markup)}
${widgetScript(site.client_id)}

PAGE TYPE: Service Page
BUSINESS: ${site.business_name}
PHONE: ${site.phone || ''}
PAGE TITLE: ${title}

HERO:
H1: ${hero_h1}
Subtitle: ${hero_subtitle}

SECTIONS:
${formatSections(content_sections)}

${faq?.length ? `FAQ (render as expandable accordion):\n${formatFaq(faq)}` : ''}

LAYOUT REQUIREMENTS:
- Navigation bar matching site-wide style
- Compact hero with service name and subtitle
- Content sections with clear visual hierarchy
- If FAQ present, use an accordion/toggle pattern (CSS-only, no JS library)
- CTA section with phone number
- Breadcrumb: Home > Services > This Service
- Footer matching site-wide style

Generate the complete HTML document now.`;
}

export function cityPageHTMLPrompt(opts: {
  site: ClientSite;
  title: string;
  hero_h1: string;
  hero_subtitle: string;
  content_sections: ContentSection[];
  faq: FaqItem[];
  schema_markup: unknown;
  designStyle: string;
  colorPrimary: string;
  colorSecondary: string;
  photos: SitePhoto[];
}): string {
  const { site, title, hero_h1, hero_subtitle, content_sections, faq, schema_markup, designStyle, colorPrimary, colorSecondary, photos } = opts;
  const style = DESIGN_TOKENS[designStyle] || DESIGN_TOKENS['modern-dark'];

  return `${BASE_INSTRUCTIONS}

DESIGN STYLE: ${designStyle}
${style}

${colorInstructions(colorPrimary, colorSecondary)}

${photoInstructions(photos)}

${schemaInstruction(schema_markup)}
${widgetScript(site.client_id)}

PAGE TYPE: City/Location Page
BUSINESS: ${site.business_name}
PHONE: ${site.phone || ''}
PAGE TITLE: ${title}

HERO:
H1: ${hero_h1}
Subtitle: ${hero_subtitle}

SECTIONS:
${formatSections(content_sections)}

${faq?.length ? `FAQ:\n${formatFaq(faq)}` : ''}

LAYOUT REQUIREMENTS:
- Navigation bar matching site-wide style
- Hero emphasizing the city name
- Services available in this area (card grid or list)
- Trust signals (rating, license, years)
- CTA with phone number
- Breadcrumb: Home > City Name
- Footer matching site-wide style

Generate the complete HTML document now.`;
}

export function aboutPageHTMLPrompt(opts: {
  site: ClientSite;
  title: string;
  hero_h1: string;
  hero_subtitle: string;
  content_sections: ContentSection[];
  schema_markup: unknown;
  designStyle: string;
  colorPrimary: string;
  colorSecondary: string;
  photos: SitePhoto[];
}): string {
  const { site, title, hero_h1, hero_subtitle, content_sections, schema_markup, designStyle, colorPrimary, colorSecondary, photos } = opts;
  const style = DESIGN_TOKENS[designStyle] || DESIGN_TOKENS['modern-dark'];

  return `${BASE_INSTRUCTIONS}

DESIGN STYLE: ${designStyle}
${style}

${colorInstructions(colorPrimary, colorSecondary)}

${photoInstructions(photos)}

${schemaInstruction(schema_markup)}
${widgetScript(site.client_id)}

PAGE TYPE: About Page
BUSINESS: ${site.business_name}
OWNER: ${site.owner_name || 'the owner'}
YEARS: ${site.years_in_business || 'Established'}
PAGE TITLE: ${title}

HERO:
H1: ${hero_h1}
Subtitle: ${hero_subtitle}

SECTIONS:
${formatSections(content_sections)}

LAYOUT REQUIREMENTS:
- Navigation bar matching site-wide style
- Hero with business story feel (warm, personal)
- "Our Story" section with a personal narrative layout (text + image side by side)
- Values section (icon cards or visual list)
- Credentials/trust badges section
- Team section (if content mentions team)
- CTA to contact
- Footer matching site-wide style

Generate the complete HTML document now.`;
}

export function contactPageHTMLPrompt(opts: {
  site: ClientSite;
  title: string;
  hero_h1: string;
  hero_subtitle: string;
  content_sections: ContentSection[];
  schema_markup: unknown;
  designStyle: string;
  colorPrimary: string;
  colorSecondary: string;
}): string {
  const { site, title, hero_h1, hero_subtitle, content_sections, schema_markup, designStyle, colorPrimary, colorSecondary } = opts;
  const style = DESIGN_TOKENS[designStyle] || DESIGN_TOKENS['modern-dark'];

  return `${BASE_INSTRUCTIONS}

DESIGN STYLE: ${designStyle}
${style}

${colorInstructions(colorPrimary, colorSecondary)}

${schemaInstruction(schema_markup)}
${widgetScript(site.client_id)}

PAGE TYPE: Contact Page
BUSINESS: ${site.business_name}
PHONE: ${site.phone || ''}
ADDRESS: ${site.address ? [site.address.street, site.address.city, site.address.state, site.address.zip].filter(Boolean).join(', ') : ''}
PAGE TITLE: ${title}

HERO:
H1: ${hero_h1}
Subtitle: ${hero_subtitle}

SECTIONS:
${formatSections(content_sections)}

LAYOUT REQUIREMENTS:
- Navigation bar matching site-wide style
- Clean hero with contact heading
- Contact info cards (phone, address, hours) in a grid
- A simple contact form (name, email, phone, message) styled with Tailwind
  - Form action="#" (placeholder, no backend)
- Map placeholder or service area section
- CTA with phone number prominently displayed
- Footer matching site-wide style

Generate the complete HTML document now.`;
}

export function faqPageHTMLPrompt(opts: {
  site: ClientSite;
  title: string;
  hero_h1: string;
  hero_subtitle: string;
  faq: FaqItem[];
  schema_markup: unknown;
  designStyle: string;
  colorPrimary: string;
  colorSecondary: string;
}): string {
  const { site, title, hero_h1, hero_subtitle, faq, schema_markup, designStyle, colorPrimary, colorSecondary } = opts;
  const style = DESIGN_TOKENS[designStyle] || DESIGN_TOKENS['modern-dark'];

  return `${BASE_INSTRUCTIONS}

DESIGN STYLE: ${designStyle}
${style}

${colorInstructions(colorPrimary, colorSecondary)}

${schemaInstruction(schema_markup)}
${widgetScript(site.client_id)}

PAGE TYPE: FAQ Page
BUSINESS: ${site.business_name}
PHONE: ${site.phone || ''}
PAGE TITLE: ${title}

HERO:
H1: ${hero_h1}
Subtitle: ${hero_subtitle}

FAQ ITEMS (render ALL of these):
${formatFaq(faq)}

LAYOUT REQUIREMENTS:
- Navigation bar matching site-wide style
- Clean hero section
- FAQ items as an accordion using CSS-only <details>/<summary> elements
  - Style the summary with brand colors and a plus/minus indicator
  - Smooth appearance, well-spaced
- Group FAQs visually if there are many (use subtle dividers)
- CTA section at bottom: "Still have questions? Call us"
- Footer matching site-wide style

Generate the complete HTML document now.`;
}

export function blogPostHTMLPrompt(opts: {
  site: ClientSite;
  title: string;
  hero_h1: string;
  hero_subtitle: string;
  content_sections: ContentSection[];
  faq: FaqItem[];
  schema_markup: unknown;
  designStyle: string;
  colorPrimary: string;
  colorSecondary: string;
}): string {
  const { site, title, hero_h1, hero_subtitle, content_sections, faq, schema_markup, designStyle, colorPrimary, colorSecondary } = opts;
  const style = DESIGN_TOKENS[designStyle] || DESIGN_TOKENS['modern-dark'];

  return `${BASE_INSTRUCTIONS}

DESIGN STYLE: ${designStyle}
${style}

${colorInstructions(colorPrimary, colorSecondary)}

${schemaInstruction(schema_markup)}
${widgetScript(site.client_id)}

PAGE TYPE: Blog Post
BUSINESS: ${site.business_name}
PAGE TITLE: ${title}

HERO:
H1: ${hero_h1}
Subtitle: ${hero_subtitle}

ARTICLE CONTENT:
${formatSections(content_sections)}

${faq?.length ? `RELATED FAQ:\n${formatFaq(faq)}` : ''}

LAYOUT REQUIREMENTS:
- Navigation bar matching site-wide style
- Article-style layout with a max-width content column (prose-like: max-w-3xl mx-auto)
- Hero with article title and subtitle
- Well-formatted article body with proper typography (headings, paragraphs, lists)
- If FAQ present, show at end of article as a simple list or accordion
- Related CTA: "Need help? Contact ${site.business_name}"
- Footer matching site-wide style

Generate the complete HTML document now.`;
}

// ---------- Prompt router ----------

export function getHTMLPromptForPageType(pageType: string, opts: {
  site: ClientSite;
  title: string;
  hero_h1: string;
  hero_subtitle: string;
  content_sections: ContentSection[];
  faq: FaqItem[];
  schema_markup: unknown;
  designStyle: string;
  colorPrimary: string;
  colorSecondary: string;
  photos: SitePhoto[];
}): string {
  switch (pageType) {
    case 'homepage':
      return homepageHTMLPrompt(opts);
    case 'service':
    case 'city_service':
      return servicePageHTMLPrompt(opts);
    case 'city':
      return cityPageHTMLPrompt(opts);
    case 'blog':
      return blogPostHTMLPrompt(opts);
    default: {
      // Utility pages: about, contact, faq, reviews
      const slug = opts.title.toLowerCase();
      if (slug.includes('about') || slug.includes('story') || slug.includes('team')) {
        return aboutPageHTMLPrompt(opts);
      }
      if (slug.includes('contact')) {
        return contactPageHTMLPrompt(opts);
      }
      if (slug.includes('faq') || slug.includes('question')) {
        return faqPageHTMLPrompt(opts);
      }
      // Default: service-like layout
      return servicePageHTMLPrompt(opts);
    }
  }
}
