/**
 * HVAC San Mateo custom page assembler.
 *
 * Converts the original Next.js + Tailwind dark-theme HVAC site into static HTML
 * that looks identical to the source at hvac-san-mateo.vercel.app.
 * All content is driven by `site` / `page` / `allPages` parameters so it
 * remains editable through the Kyra dashboard.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Inline SVG icons (Lucide equivalents used in the original site)
// ---------------------------------------------------------------------------
const SVG = {
  phone: (cls = 'h-4 w-4') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  mail: (cls = 'h-4 w-4 text-red-500') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  mapPin: (cls = 'h-4 w-4 text-red-500') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  clock: (cls = 'h-4 w-4 text-red-500') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  shield: (cls = 'h-4 w-4 text-red-500') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`,
  shieldCheck: (cls = 'h-4 w-4') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`,
  star: (cls = 'h-4 w-4 text-yellow-500', fill = true) => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" ${fill ? 'fill="currentColor"' : 'fill="none"'} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  chevronRight: (cls = 'h-4 w-4') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  arrowRight: (cls = 'h-5 w-5') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  thermometer: (cls = 'h-6 w-6 text-white') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>`,
  wind: (cls = 'h-6 w-6 text-red-500') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/></svg>`,
  snowflake: (cls = 'h-6 w-6 text-red-500') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/></svg>`,
  settings: (cls = 'h-6 w-6 text-red-500') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  wrench: (cls = 'h-6 w-6 text-red-500') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  checkCircle2: (cls = 'h-3.5 w-3.5 text-red-500 shrink-0') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`,
  award: (cls = 'h-4 w-4 text-red-500') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/></svg>`,
  zap: (cls = 'h-4 w-4 text-amber-500') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`,
  users: (cls = 'h-5 w-5 text-red-500') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  messageSquare: (cls = 'h-5 w-5') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  menu: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`,
  x: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  externalLink: (cls = 'h-4 w-4') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`,
  gauge: (cls = 'h-5 w-5 text-red-400') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>`,
  thermometerSun: (cls = 'h-5 w-5 text-red-400') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9a4 4 0 0 0-2 7.5"/><path d="M12 3v2"/><path d="m6.6 18.4-1.4 1.4"/><path d="M20 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/><path d="M4 13H2"/><path d="M6.34 7.34 4.93 5.93"/></svg>`,
  badgeCheck: (cls = 'h-4 w-4 text-red-400') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>`,
  clock3: (cls = 'h-4 w-4 text-red-400') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 9 15"/></svg>`,
  heartHandshake: (cls = 'h-5 w-5 text-red-500') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/><path d="m18 15-2-2"/><path d="m15 18-2-2"/></svg>`,
  flame: (cls = 'h-5 w-5 text-red-500') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  circleDollarSign: (cls = 'h-5 w-5 text-red-500') => `<svg xmlns="http://www.w3.org/2000/svg" class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>`,
};

// Map icon name strings to SVG render functions
const ICON_MAP: Record<string, (cls?: string) => string> = {
  Wind: SVG.wind,
  Thermometer: (cls?: string) => SVG.thermometer(cls || 'h-6 w-6 text-red-500'),
  Snowflake: SVG.snowflake,
  Settings: SVG.settings,
  Wrench: SVG.wrench,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function esc(s: string | number | null | undefined): string {
  if (s == null || s === '') return '';
  const str = String(s);
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function phoneHref(phone: string): string {
  if (!phone) return '';
  return 'tel:+1' + phone.replace(/\D/g, '');
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Rich service data matching the original site's constants.ts
const DEFAULT_SERVICES = [
  { name: 'Air Conditioning', slug: 'ac-repair', description: 'Expert AC repair, installation & maintenance for homes and businesses across San Mateo County.', icon: 'Wind', features: ['Same-day AC repair', 'New system installation', 'Seasonal tune-ups', 'Ductwork inspection'] },
  { name: 'Heating', slug: 'heating-repair', description: 'Furnace repair, heat pump installation, and heating system maintenance to keep you warm all winter.', icon: 'Thermometer', features: ['Furnace repair & replacement', 'Heat pump systems', 'Radiant heating', 'Emergency service'] },
  { name: 'Refrigeration', slug: 'refrigeration', description: 'Commercial and residential refrigeration repair - walk-in coolers, reach-in units, and more.', icon: 'Snowflake', features: ['Walk-in coolers', 'Reach-in coolers', 'Commercial refrigeration', 'Preventive maintenance'] },
  { name: 'Installation', slug: 'installation', description: 'New HVAC system design and installation. High-efficiency and green-friendly packages available.', icon: 'Settings', features: ['System design & sizing', 'High-efficiency units', 'Ductwork installation', 'Permit handling'] },
  { name: 'Maintenance', slug: 'maintenance', description: 'Preventive maintenance packages that save you money. 90% of costly repairs are preventable.', icon: 'Wrench', features: ['Annual tune-ups', 'Filter replacement', 'Coil cleaning', 'Performance testing'] },
];

// Rich testimonials matching the original site
const DEFAULT_REVIEWS = [
  { name: 'Kyle Francis', text: 'Thank you very much for the prompt response. The service provider was efficient, knowledgeable and kind. I am very satisfied.', rating: 5 },
  { name: 'Claude Pompo', text: '4 PTAC units were professionally inspected/diagnosed.', rating: 5 },
  { name: 'Rudolph Davis', text: 'Good work, just the price could be a little more negotiable but its inflation times.', rating: 5 },
  { name: 'Pamela M.', text: 'Great service. Luis has been helping with repairs at our temple and home for years. So professional and pleasant. He explained how we can save energy when on vacation.', rating: 5 },
];

function getServices(site: Record<string, any>): { name: string; slug: string; description?: string; icon?: string; features?: string[] }[] {
  const raw = (site.services || []) as any[];
  // If DB services lack descriptions, merge with defaults
  return raw.map(s => {
    const def = DEFAULT_SERVICES.find(d => d.slug === s.slug);
    return { ...s, description: s.description || def?.description || '', icon: s.icon || def?.icon || 'Wind', features: s.features || def?.features || [] };
  });
}

function getCities(site: Record<string, any>): { name: string; slug: string; description?: string; zip?: string; county?: string; population?: string }[] {
  return (site.cities || []) as any[];
}

function getReviews(site: Record<string, any>): { name: string; text: string; rating: number; source?: string }[] {
  const raw = (site.reviews || []) as any[];
  return raw.length > 0 ? raw : DEFAULT_REVIEWS;
}

function getAddr(site: Record<string, any>): { street?: string; city?: string; state?: string; zip?: string; country?: string; full?: string } {
  return (site.address || {}) as any;
}

function starsHtml(count: number): string {
  return Array.from({ length: count }).map(() => SVG.star('h-4 w-4 text-yellow-500', true)).join('');
}

// ---------------------------------------------------------------------------
// SEO helpers
// ---------------------------------------------------------------------------
function buildKeywords(slug: string, page: Record<string, any>, addr: Record<string, any>): string {
  const city = addr.city || 'San Mateo';
  const base = ['HVAC', city, 'air conditioning', 'heating', 'AC repair', 'furnace repair', 'Air Temp Co', 'HVAC contractor', city + ' County'];
  const pageType = page.page_type || '';
  if (pageType === 'service' || slug?.startsWith('services/')) {
    const svcName = (page.title as string) || '';
    base.push(svcName + ' ' + city, svcName + ' near me', svcName + ' San Mateo County');
  } else if (pageType === 'city') {
    const cityName = (page.hero_h1 as string)?.replace(/^HVAC Services in /, '').replace(/, CA.*/, '') || '';
    if (cityName) base.push('HVAC ' + cityName, 'AC repair ' + cityName, 'heating ' + cityName, cityName + ' HVAC contractor');
  } else if (pageType === 'city_service') {
    const title = (page.title as string) || '';
    base.push(title, title + ' near me');
  }
  return base.join(', ');
}

// ---------------------------------------------------------------------------
// Shared head / footer / scripts
// ---------------------------------------------------------------------------
function renderHead(site: Record<string, any>, page: Record<string, any>, schemaJson?: string): string {
  const businessName = site.business_name || 'HVAC San Mateo';
  const title = esc((page.meta_title as string) || (page.title as string) || businessName);
  const description = esc((page.meta_description as string) || (page.hero_subtitle as string) || '');
  const domain = site.domain || 'hvacsanmateo.com';
  const slug = (page.slug as string) || '';
  const url = slug === 'home' || slug === '/' || slug === '' || slug === 'index' ? `https://${domain}` : `https://${domain}/${slug}`;
  const ogImage = site.og_image || `https://${domain}/og-image.jpg`;
  const addr = getAddr(site);
  const keywords = buildKeywords(slug, page, addr);
  const geoLat = site.address?.lat || 37.5547894;
  const geoLng = site.address?.lng || -122.2946411;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  ${description ? `<meta name="description" content="${description}" />` : ''}
  ${keywords ? `<meta name="keywords" content="${esc(keywords)}" />` : ''}
  <meta property="og:title" content="${title}" />
  ${description ? `<meta property="og:description" content="${description}" />` : ''}
  <meta property="og:url" content="${esc(url)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(businessName)}" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title}" />
  ${description ? `<meta name="twitter:description" content="${description}" />` : ''}
  <link rel="canonical" href="${esc(url)}" />
  <meta name="geo.region" content="US-CA" />
  <meta name="geo.placename" content="${esc(addr.city || 'San Mateo')}" />
  <meta name="geo.position" content="${geoLat};${geoLng}" />
  <meta name="ICBM" content="${geoLat}, ${geoLng}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
        }
      }
    }
  </script>
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; }
    select option { background: #111827; color: #fff; }
  </style>
  ${schemaJson ? `<script type="application/ld+json">${schemaJson}</script>` : ''}
</head>
<body class="bg-black text-white min-h-screen">`;
}

function renderEmergencyBanner(site: Record<string, any>): string {
  const phone = site.phone || '(650) 525-1180';
  const href = phoneHref(phone);
  return `
  <div class="bg-red-600 text-white text-center py-1.5 text-sm font-medium">
    <a href="${href}" class="hover:underline">&#x1F525; Emergency HVAC Service Available - Call ${esc(phone)}</a>
  </div>`;
}

function renderNavbar(site: Record<string, any>): string {
  const businessName = site.business_name || 'HVAC San Mateo';
  const dba = site.dba || businessName;
  const license = site.license || '';
  const phone = site.phone || '';
  const href = phoneHref(phone);
  const ownerCompany = site.owner_company || 'Air Temp Co';

  return `
  <header class="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
    ${renderEmergencyBanner(site)}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <a href="/" class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-lg bg-red-600 flex items-center justify-center">
            ${SVG.thermometer('h-6 w-6 text-white')}
          </div>
          <div>
            <div class="text-lg font-bold text-white leading-tight">HVAC San Mateo</div>
            <div class="text-[10px] text-gray-400 uppercase tracking-wider">Air Temp Co &middot; CA Lic. #889684</div>
          </div>
        </a>

        <nav class="hidden md:flex items-center gap-6">
          <a href="/services/ac-repair" class="text-sm text-gray-300 hover:text-white transition">Services</a>
          <a href="/about" class="text-sm text-gray-300 hover:text-white transition">About</a>
          <a href="/reviews" class="text-sm text-gray-300 hover:text-white transition">Reviews</a>
          <a href="/faq" class="text-sm text-gray-300 hover:text-white transition">FAQ</a>
          <a href="/contact" class="text-sm text-gray-300 hover:text-white transition">Contact</a>
          <a href="${href}" class="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
            ${SVG.phone('h-4 w-4')}
            ${esc(phone)}
          </a>
        </nav>

        <button id="mobile-menu-btn" onclick="toggleMobileMenu()" class="md:hidden text-white p-2" aria-label="Toggle menu">
          <span id="menu-icon-open">${SVG.menu}</span>
          <span id="menu-icon-close" class="hidden">${SVG.x}</span>
        </button>
      </div>
    </div>

    <div id="mobile-menu" class="md:hidden hidden bg-gray-900 border-t border-white/10 px-4 pb-4 space-y-2">
      <a href="/services/ac-repair" class="block py-2 text-gray-300 hover:text-white">Services</a>
      <a href="/about" class="block py-2 text-gray-300 hover:text-white">About</a>
      <a href="/reviews" class="block py-2 text-gray-300 hover:text-white">Reviews</a>
      <a href="/faq" class="block py-2 text-gray-300 hover:text-white">FAQ</a>
      <a href="/contact" class="block py-2 text-gray-300 hover:text-white">Contact</a>
      <a href="${href}" class="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg font-semibold mt-2">
        ${SVG.phone('h-4 w-4')}
        Call ${esc(phone)}
      </a>
    </div>
  </header>`;
}

function renderFooter(site: Record<string, any>): string {
  const dba = site.dba || site.business_name || 'HVAC San Mateo';
  const ownerCompany = site.owner_company || 'Air Temp Co';
  const license = site.license || '';
  const phone = site.phone || '';
  const email = site.email || '';
  const addr = getAddr(site);
  const hours = site.hours_display || 'Mon-Sat: 7am-7pm';
  const yearFounded = site.year_founded || 1990;
  const services = getServices(site);
  const cities = getCities(site);
  const year = new Date().getFullYear();

  return `
  <footer class="border-t border-white/10 bg-gray-900/50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid md:grid-cols-4 gap-8">
        <div>
          <div class="flex items-center gap-2 mb-3">
            <div class="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center">
              ${SVG.thermometer('h-5 w-5 text-white')}
            </div>
            <span class="font-bold text-white">${esc(dba)}</span>
          </div>
          <p class="text-sm text-gray-400 mb-3">${esc(ownerCompany)} - ${esc(license)}</p>
          <p class="text-sm text-gray-400">Serving San Mateo County since ${yearFounded}.</p>
        </div>

        <div>
          <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-3">Services</h4>
          <div class="space-y-2">
            ${services.map(s => `<a href="/services/${esc(s.slug)}" class="block text-sm text-gray-400 hover:text-white transition">${esc(s.name)}</a>`).join('\n            ')}
          </div>
        </div>

        <div>
          <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-3">Service Areas</h4>
          <div class="space-y-2">
            ${cities.slice(0, 6).map(c => `<a href="/${esc(c.slug)}" class="block text-sm text-gray-400 hover:text-white transition">${esc(c.name)}</a>`).join('\n            ')}
          </div>
        </div>

        <div>
          <h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-3">Contact</h4>
          <div class="space-y-3">
            ${phone ? `<a href="${phoneHref(phone)}" class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">${SVG.phone('h-4 w-4 text-red-500')} ${esc(phone)}</a>` : ''}
            ${email ? `<a href="mailto:${esc(email)}" class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">${SVG.mail('h-4 w-4 text-red-500')} ${esc(email)}</a>` : ''}
            ${addr.full ? `<div class="flex items-center gap-2 text-sm text-gray-400">${SVG.mapPin('h-4 w-4 text-red-500')} ${esc(addr.full)}</div>` : ''}
            <div class="flex items-center gap-2 text-sm text-gray-400">${SVG.clock('h-4 w-4 text-red-500')} ${esc(hours)}</div>
          </div>
        </div>
      </div>

      <!-- Brands banner -->
      <div class="border-t border-white/10 mt-8 pt-6">
        <p class="text-center text-sm font-semibold text-white tracking-wide uppercase mb-2">We Service and Repair All Major Brands</p>
        <p class="text-center text-xs text-gray-500">Carrier &middot; Lennox &middot; Trane &middot; Daikin &middot; Goodman &middot; Rheem &middot; Bryant &middot; Mitsubishi &middot; Ruud &middot; York &middot; Amana &middot; and more</p>
      </div>

      <div class="border-t border-white/10 mt-6 pt-6 text-center text-xs text-gray-500">
        &copy; ${year} ${esc(ownerCompany)}. All rights reserved. ${esc(license)} (Electrical, HVAC, Refrigeration)
      </div>
    </div>
  </footer>`;
}

function renderCTASection(site: Record<string, any>, ctaSection?: { heading?: string; body?: string; cta_text?: string; cta_link?: string }): string {
  const phone = site.phone || '';
  const heading = ctaSection?.heading || 'Ready to Get Comfortable?';
  const body = ctaSection?.body || "Whether it's a repair, installation, or maintenance - we're here to help. Free quotes with every repair or installation.";
  const ctaText = ctaSection?.cta_text || 'Free Quote with Repair or Installation';
  const ctaLink = ctaSection?.cta_link || '/#quote';
  return `
  <section class="py-20 sm:py-28">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <div class="bg-gradient-to-br from-red-600 to-red-800 rounded-3xl p-8 sm:p-14">
        <h2 class="text-3xl sm:text-4xl font-bold text-white mb-3">${esc(heading)}</h2>
        <p class="text-red-100 max-w-lg mx-auto mb-8">
          ${esc(body)}
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="${phoneHref(phone)}" class="flex items-center justify-center gap-2 bg-white text-red-600 px-6 py-3.5 rounded-xl text-lg font-semibold hover:bg-red-50 transition">
            ${SVG.phone('h-5 w-5')}
            Call ${esc(phone)}
          </a>
          <a href="${esc(ctaLink)}" class="flex items-center justify-center gap-2 border-2 border-white/30 text-white px-6 py-3.5 rounded-xl text-lg font-medium hover:bg-white/10 transition">
            ${SVG.messageSquare('h-5 w-5')}
            ${esc(ctaText)}
          </a>
        </div>
      </div>
    </div>
  </section>`;
}

function renderScripts(site: Record<string, any>): string {
  const widgetClientId = site.widget_client_id || site.client_id || '';
  const widgetScript = widgetClientId
    ? `<script src="https://kyra.conversionsystem.com/api/widget/${widgetClientId}/script?v=2" defer></script>`
    : '';

  return `
  <script>
    // Mobile menu toggle
    function toggleMobileMenu() {
      var menu = document.getElementById('mobile-menu');
      var open = document.getElementById('menu-icon-open');
      var close = document.getElementById('menu-icon-close');
      if (menu) menu.classList.toggle('hidden');
      if (open) open.classList.toggle('hidden');
      if (close) close.classList.toggle('hidden');
    }

    // Quote form submission
    function handleQuoteSubmit(e) {
      e.preventDefault();
      var form = e.target;
      var btn = form.querySelector('button[type=submit]');
      var origText = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;

      var data = {
        name: form.querySelector('[name=name]').value,
        phone: form.querySelector('[name=phone]').value,
        email: form.querySelector('[name=email]').value,
        service: form.querySelector('[name=service]').value,
        message: (form.querySelector('[name=service]').value ? '[' + form.querySelector('[name=service]').value + '] ' : '') + (form.querySelector('[name=message]').value || ''),
        clientId: '${esc(site.widget_client_id || '')}',
        businessName: '${esc(site.business_name || 'HVAC San Mateo')}',
        source: 'website_form'
      };

      fetch('https://kyra.conversionsystem.com/api/sites/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(function(res) {
        if (res.ok) {
          form.innerHTML = '<div class="text-center"><div class="text-4xl mb-3">&#x2705;</div><h2 class="text-xl font-bold text-white mb-2">Quote Request Received!</h2><p class="text-sm text-gray-400 mb-4">We\\'ll get back to you within 1 hour during business hours.</p></div>';
        } else {
          btn.textContent = origText;
          btn.disabled = false;
          alert('Something went wrong. Please call us directly.');
        }
      }).catch(function() {
        btn.textContent = origText;
        btn.disabled = false;
        alert('Something went wrong. Please call us directly.');
      });
    }
  </script>
  ${widgetScript}`;
}

/* NOTE: The quote form HTML is NOT editable through the page builder.
 * Form fields, validation, and submission logic live here in the assembler.
 * To change form fields, edit this function directly. */
function renderQuoteForm(site: Record<string, any>): string {
  const services = getServices(site);
  return `
      <div id="quote" class="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 sm:p-8">
        <h2 class="text-xl font-bold text-white mb-1">Free Quote with Repair or Installation</h2>
        <p class="text-sm text-gray-400 mb-6">We'll respond within 1 hour during business hours</p>
        <form onsubmit="handleQuoteSubmit(event)" class="space-y-4">
          <div class="grid sm:grid-cols-2 gap-4">
            <input type="text" name="name" placeholder="Your Name *" required class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm" />
            <input type="tel" name="phone" placeholder="Phone Number *" required class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm" />
          </div>
          <input type="email" name="email" placeholder="Email Address" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm" />
          <select name="service" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm appearance-none">
            <option value="">Select Service Needed</option>
            ${services.map(s => `<option value="${esc(s.slug)}">${esc(s.name)}</option>`).join('\n            ')}
            <option value="emergency">Emergency Service</option>
          </select>
          <textarea name="message" placeholder="Describe your issue..." rows="3" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm resize-none"></textarea>
          <button type="submit" class="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold text-lg transition shadow-lg shadow-red-600/25">Get Your Free Quote</button>
          <p class="text-xs text-gray-500 text-center">No spam, no obligation. We respect your privacy.</p>
        </form>
      </div>`;
}

// ---------------------------------------------------------------------------
// Page assemblers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Helpers to parse content_sections bullets into structured data
// ---------------------------------------------------------------------------

/** Parse stats from Section 0 bullets. Format: "36+ Years Experience" */
function parseStatsBullets(bullets: string[]): { value: string; label: string }[] {
  try {
    return bullets.map(b => {
      // Try to split on first space-separated boundary between value and label
      // e.g. "36+ Years Experience" → value="36+", label="Years Experience"
      // e.g. "5,000+ Jobs Completed" → value="5,000+", label="Jobs Completed"
      // e.g. "5.0 Google Rating" → value="5.0", label="Google Rating"
      // e.g. "24/7 Emergency Service" → value="24/7", label="Emergency Service"
      const match = b.match(/^([\d,.+/]+)\s+(.+)$/);
      if (match) return { value: match[1], label: match[2] };
      return { value: b, label: '' };
    });
  } catch {
    return [];
  }
}

/** Parse service bullets from Section 1. Format: "Service Name — Description. Feature1, Feature2." */
function parseServiceBullets(bullets: string[]): { name: string; slug: string; description: string; icon: string; features: string[] }[] {
  try {
    const parsed = bullets.map(b => {
      const dashIdx = b.indexOf(' — ');
      if (dashIdx === -1) return null;
      const name = b.substring(0, dashIdx).trim();
      const rest = b.substring(dashIdx + 3).trim();
      // Split at first period followed by space to separate description from features
      const dotIdx = rest.indexOf('. ');
      let description: string;
      let features: string[] = [];
      if (dotIdx !== -1) {
        description = rest.substring(0, dotIdx + 1);
        const featureStr = rest.substring(dotIdx + 2).replace(/\.$/, '');
        features = featureStr.split(',').map(f => f.trim()).filter(Boolean);
      } else {
        description = rest;
      }
      const slug = slugify(name);
      // Try to match icon from DEFAULT_SERVICES
      const def = DEFAULT_SERVICES.find(d => d.name.toLowerCase() === name.toLowerCase());
      return { name, slug, description, icon: def?.icon || 'Wind', features };
    }).filter(Boolean) as { name: string; slug: string; description: string; icon: string; features: string[] }[];
    return parsed.length > 0 ? parsed : [];
  } catch {
    return [];
  }
}

/** Parse Why Choose bullets from Section 2. Format: "Title — Description" */
function parseReasonBullets(bullets: string[]): { title: string; desc: string }[] {
  try {
    const iconPool = [
      SVG.award('h-5 w-5 text-red-500'),
      SVG.shield('h-5 w-5 text-red-500'),
      SVG.zap('h-5 w-5 text-red-500'),
      SVG.users('h-5 w-5 text-red-500'),
      SVG.star('h-5 w-5 text-red-500', false),
      SVG.wrench('h-5 w-5 text-red-500'),
    ];
    const parsed = bullets.map((b, i) => {
      const dashIdx = b.indexOf(' — ');
      if (dashIdx === -1) return null;
      return {
        icon: iconPool[i % iconPool.length],
        title: b.substring(0, dashIdx).trim(),
        desc: b.substring(dashIdx + 3).trim(),
      };
    }).filter(Boolean) as { icon: string; title: string; desc: string }[];
    return parsed.length > 0 ? parsed : [];
  } catch {
    return [];
  }
}

/** Parse review bullets from Section 3. Format: 'Name: "review text"' */
function parseReviewBullets(bullets: string[]): { name: string; text: string; rating: number }[] {
  try {
    const parsed = bullets.map(b => {
      // Match: Name: "review text" or Name: review text
      const match = b.match(/^(.+?):\s*"?(.+?)"?$/);
      if (!match) return null;
      return { name: match[1].trim(), text: match[2].trim(), rating: 5 };
    }).filter(Boolean) as { name: string; text: string; rating: number }[];
    return parsed.length > 0 ? parsed : [];
  } catch {
    return [];
  }
}

function homeContent(site: Record<string, any>, page: Record<string, any>): string {
  const dba = site.dba || site.business_name || 'HVAC San Mateo';
  const phone = site.phone || '';
  const license = site.license || '';
  const rating = Number(site.rating || 5).toFixed(1);
  const rawYears = site.yearsInBusiness || 36;
  const yearsExp = `${rawYears}+`;
  const jobsCompleted = site.jobs_completed || '5,000+';
  const services = getServices(site);
  const cities = getCities(site);
  const reviews = getReviews(site);
  const addr = getAddr(site);

  // --- Read content_sections from page (DB-driven) ---
  const contentSections = (page.content_sections || []) as { heading: string; body: string; bullets?: string[]; cta_text?: string; cta_link?: string }[];

  // Section 0: Stats ("By The Numbers")
  const statsSection = contentSections[0];
  const parsedStats = statsSection?.bullets ? parseStatsBullets(statsSection.bullets) : [];

  // Section 1: Services ("Our HVAC Services")
  const servicesSection = contentSections[1];
  const parsedServices = servicesSection?.bullets ? parseServiceBullets(servicesSection.bullets) : [];

  // Section 2: Why Choose ("Why Choose Air Temp Co?")
  const whyChooseSection = contentSections[2];
  const parsedReasons = whyChooseSection?.bullets ? parseReasonBullets(whyChooseSection.bullets) : [];

  // Section 3: Reviews ("What Our Customers Say")
  const reviewsSection = contentSections[3];
  const parsedReviews = reviewsSection?.bullets ? parseReviewBullets(reviewsSection.bullets) : [];

  // Section 4: Service Areas ("Serving All of San Mateo County")
  const serviceAreasSection = contentSections[4];

  // Section 5: CTA ("Ready to Get Comfortable?")
  const ctaSection = contentSections[5] || contentSections.find(s => s.heading?.toLowerCase().includes('ready')) || contentSections[contentSections.length - 1];

  // For the homepage hero, always apply the red accent to "HVAC Experts"
  const rawH1 = (page.hero_h1 as string) || "San Mateo's Most Trusted HVAC Experts";
  const h1 = rawH1.includes('HVAC Experts')
    ? rawH1.replace('HVAC Experts', '<span class="text-red-500"> HVAC Experts</span>')
    : `${esc(rawH1)}`;
  const subtitle = (page.hero_subtitle as string) || `${yearsExp} years of expert heating, air conditioning, and refrigeration services for homes and businesses. Same-day service available.`;

  // Hero CTA button text/link from DB
  const heroCTAText = (page.hero_cta_text as string) || 'Free Quote with Repair or Installation';
  const heroCTALink = (page.hero_cta_link as string) || '#quote';

  // Stats — use parsed from content_sections, fall back to computed defaults
  const defaultStats = [
    { value: `${yearsExp}`, label: 'Years Experience' },
    { value: jobsCompleted, label: 'Jobs Completed' },
    { value: rating, label: 'Google Rating' },
    { value: '24/7', label: 'Emergency Service' },
  ];
  const stats = parsedStats.length > 0 ? parsedStats : defaultStats;

  // Why Choose reasons — use parsed from content_sections, fall back to hardcoded defaults
  const defaultReasons = [
    { icon: SVG.award('h-5 w-5 text-red-500'), title: `${yearsExp} Years Experience`, desc: `Serving San Mateo County since ${site.year_founded || 1990}. We know the local climate and building codes.` },
    { icon: SVG.shield('h-5 w-5 text-red-500'), title: 'Licensed &amp; Insured', desc: `CA License - C10, C20, C38, B. Full workers comp and liability coverage.` },
    { icon: SVG.zap('h-5 w-5 text-red-500'), title: 'Same-Day Service', desc: 'Most repairs completed the same day. Emergency service available after hours.' },
    { icon: SVG.users('h-5 w-5 text-red-500'), title: 'Family-Owned', desc: `Led by ${site.ownerName || 'Luis'} - you deal with the owner, not a call center. Personal attention on every job.` },
    { icon: SVG.star('h-5 w-5 text-red-500', false), title: 'Top-Rated', desc: `${rating} stars on Google. Trusted by homeowners and businesses alike.` },
    { icon: SVG.wrench('h-5 w-5 text-red-500'), title: 'All Brands &amp; Systems', desc: 'We repair and install all major HVAC brands - Carrier, Lennox, Trane, Daikin, and more.' },
  ];
  const iconPool = [
    SVG.award('h-5 w-5 text-red-500'),
    SVG.shield('h-5 w-5 text-red-500'),
    SVG.zap('h-5 w-5 text-red-500'),
    SVG.users('h-5 w-5 text-red-500'),
    SVG.star('h-5 w-5 text-red-500', false),
    SVG.wrench('h-5 w-5 text-red-500'),
  ];
  const reasons = parsedReasons.length > 0
    ? parsedReasons.map((r, i) => ({ icon: iconPool[i % iconPool.length], title: r.title, desc: r.desc }))
    : defaultReasons;

  // Reviews — use parsed from content_sections, fall back to site reviews / DEFAULT_REVIEWS
  const displayReviews = parsedReviews.length > 0 ? parsedReviews : reviews;

  // Service cards — use parsed from content_sections if available, else site services
  const displayServices = parsedServices.length > 0 ? parsedServices : services;

  // Service areas heading/body from content_sections
  const serviceAreasHeading = serviceAreasSection?.heading || 'Serving All of San Mateo County';
  const serviceAreasBody = serviceAreasSection?.body || 'From Daly City to Redwood City, we provide expert HVAC services to homes and businesses throughout the Peninsula.';

  // Why Choose heading/body from content_sections
  const whyChooseHeading = whyChooseSection?.heading || `Why Choose ${esc(site.owner_company || 'Air Temp Co')}?`;
  const whyChooseBody = whyChooseSection?.body || 'More than just HVAC contractors - we\'re your neighbors, committed to keeping San Mateo comfortable.';

  // Services heading/body from content_sections
  const servicesHeading = servicesSection?.heading || 'Our HVAC Services';
  const servicesBody = servicesSection?.body || 'Complete heating, cooling, and refrigeration solutions for residential and commercial properties in San Mateo County.';

  // Reviews heading/body from content_sections
  const reviewsHeading = reviewsSection?.heading || 'What Our Customers Say';
  const reviewsBody = reviewsSection?.body || 'Real reviews from real San Mateo residents';

  // Map embed
  const geo = site.geo || {};
  const mapSrc = geo.lat
    ? `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3164.5!2d${geo.lng}!3d${geo.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2s${encodeURIComponent(dba)}!5e0!3m2!1sen!2sus`
    : 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3164.5!2d-122.2946411!3d37.5547894!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808f9eef27011f57%3A0xb3ad27f5ea0ac8fd!2shvacsanmateo!5e0!3m2!1sen!2sus!4v1710300000000';

  return `
  <main>
    <!-- Hero -->
    <section class="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(220,38,38,0.15),transparent_60%)]"></div>
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div class="flex items-center gap-2 mb-4">
              ${SVG.shield('h-4 w-4 text-red-500')}
              <span class="text-sm text-red-400 font-medium">Licensed &amp; Insured &middot; ${esc(license.split(' - ')[0])}</span>
            </div>
            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              ${h1}
            </h1>
            <p class="mt-4 text-lg text-gray-400 max-w-xl">${esc(subtitle)}</p>
            <div class="flex flex-wrap items-center gap-4 mt-6">
              <div class="flex items-center gap-1.5 text-sm text-gray-300">
                ${SVG.star('h-4 w-4 text-yellow-500', true)}
                <span class="font-semibold">${esc(rating)}</span> Google Rating
              </div>
              <div class="flex items-center gap-1.5 text-sm text-gray-300">
                ${SVG.award('h-4 w-4 text-red-500')}
                ${esc(yearsExp)} Years Experience
              </div>
              <div class="flex items-center gap-1.5 text-sm text-gray-300">
                ${SVG.zap('h-4 w-4 text-amber-500')}
                Same-Day Service
              </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-3 mt-8">
              <a href="${phoneHref(phone)}" class="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl text-lg font-semibold transition shadow-lg shadow-red-600/25">
                ${SVG.phone('h-5 w-5')}
                Call Now - ${esc(phone)}
              </a>
              <a href="${esc(heroCTALink)}" class="flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white px-6 py-3.5 rounded-xl text-lg font-medium transition">
                ${esc(heroCTAText)}
                ${SVG.arrowRight('h-5 w-5')}
              </a>
            </div>
          </div>
          ${renderQuoteForm(site)}
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="border-y border-white/10 bg-gray-900/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          ${stats.map(s => `
          <div class="text-center">
            <div class="text-3xl sm:text-4xl font-bold text-red-500">${esc(s.value)}</div>
            <div class="text-sm text-gray-400 mt-1">${esc(s.label)}</div>
          </div>`).join('')}
        </div>
      </div>
    </section>

    <!-- Services -->
    <section class="py-20 sm:py-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-14">
          <h2 class="text-3xl sm:text-4xl font-bold text-white">${esc(servicesHeading)}</h2>
          <p class="mt-3 text-gray-400 max-w-2xl mx-auto">${esc(servicesBody)}</p>
        </div>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${displayServices.map(svc => {
            const iconFn = ICON_MAP[svc.icon || 'Wind'] || SVG.wind;
            const features = (svc.features || []).slice(0, 4);
            return `
          <a href="/services/${esc(svc.slug)}" class="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-red-500/30 hover:bg-white/[0.07] transition-all">
            <div class="h-12 w-12 rounded-xl bg-red-600/10 flex items-center justify-center mb-4 group-hover:bg-red-600/20 transition">
              ${iconFn('h-6 w-6 text-red-500')}
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">${esc(svc.name)}</h3>
            <p class="text-sm text-gray-400 mb-4">${esc(svc.description || '')}</p>
            <ul class="space-y-1.5">
              ${features.map(f => `<li class="flex items-center gap-2 text-sm text-gray-300">${SVG.checkCircle2()} ${esc(f)}</li>`).join('\n              ')}
            </ul>
            <div class="flex items-center gap-1 mt-4 text-red-400 text-sm font-medium group-hover:text-red-300 transition">
              Learn More ${SVG.chevronRight('h-4 w-4')}
            </div>
          </a>`;
          }).join('')}

          <!-- Emergency CTA card -->
          <div class="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 flex flex-col justify-center">
            <div class="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
              ${SVG.phone('h-6 w-6 text-white')}
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Emergency Service</h3>
            <p class="text-sm text-red-100 mb-6">HVAC emergency? We offer same-day and after-hours service. Don't suffer - call now.</p>
            <a href="${phoneHref(phone)}" class="flex items-center justify-center gap-2 bg-white text-red-600 px-4 py-3 rounded-xl font-semibold hover:bg-red-50 transition">
              ${SVG.phone('h-4 w-4')}
              ${esc(phone)}
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Choose -->
    <section class="py-20 sm:py-28 bg-gray-900/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-14">
          <h2 class="text-3xl sm:text-4xl font-bold text-white">${esc(whyChooseHeading)}</h2>
          <p class="mt-3 text-gray-400 max-w-2xl mx-auto">${esc(whyChooseBody)}</p>
        </div>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${reasons.map(r => `
          <div class="flex gap-4">
            <div class="h-10 w-10 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0">
              ${r.icon}
            </div>
            <div>
              <h3 class="font-semibold text-white mb-1">${r.title}</h3>
              <p class="text-sm text-gray-400">${r.desc}</p>
            </div>
          </div>`).join('')}
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="py-20 sm:py-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-14">
          <h2 class="text-3xl sm:text-4xl font-bold text-white">${esc(reviewsHeading)}</h2>
          <p class="mt-3 text-gray-400">${esc(reviewsBody)}</p>
        </div>
        <div class="grid md:grid-cols-2 gap-6">
          ${displayReviews.slice(0, 4).map(t => `
          <div class="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div class="flex gap-0.5 mb-3">${starsHtml(t.rating || 5)}</div>
            <p class="text-gray-300 text-sm leading-relaxed mb-4">&ldquo;${esc(t.text)}&rdquo;</p>
            <div class="text-sm font-medium text-white">${esc(t.name)}</div>
          </div>`).join('')}
        </div>
        <div class="text-center mt-10">
          <a href="/reviews" class="inline-flex items-center gap-2 text-red-400 hover:text-red-300 font-medium transition">
            See All Reviews ${SVG.chevronRight('h-4 w-4')}
          </a>
        </div>
      </div>
    </section>

    <!-- Service Areas -->
    <section class="py-20 sm:py-28 bg-gray-900/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">${esc(serviceAreasHeading)}</h2>
            <p class="text-gray-400 mb-8">${esc(serviceAreasBody)}</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              ${cities.map(c => `
              <a href="/${esc(c.slug)}" class="flex items-center gap-2 text-sm text-gray-300 hover:text-red-400 transition">
                ${SVG.mapPin('h-3.5 w-3.5 text-red-500 shrink-0')}
                ${esc(c.name)}
              </a>`).join('')}
            </div>
          </div>
          <div class="rounded-2xl overflow-hidden border border-white/10 h-80">
            <iframe src="${mapSrc}" width="100%" height="100%" style="border:0" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
        </div>
      </div>
    </section>

    ${renderCTASection(site, ctaSection)}
  </main>`;
}

function serviceContent(site: Record<string, any>, page: Record<string, any>): string {
  const phone = site.phone || '';
  const license = site.license || '';
  const rating = site.rating || '5.0';
  const reviewCount = site.reviewCount || 11;
  const addr = getAddr(site);
  const city = addr.city || 'San Mateo';

  const h1 = (page.hero_h1 as string) || (page.title as string) || 'HVAC Service';
  const subtitle = (page.hero_subtitle as string) || '';
  const sections = (page.content_sections || []) as { heading: string; body: string; bullets?: string[]; cta_text?: string; cta_link?: string }[];
  const faq = (page.faq || []) as { question: string; answer: string }[];

  // Features from content_sections or fallback
  const featuresSection = sections.find(s => s.bullets && s.bullets.length > 0);
  const features = featuresSection?.bullets || [];

  return `
  <main class="bg-black text-white">
    <!-- Hero -->
    <section class="pt-32 pb-20 sm:pt-40 sm:pb-28 border-b border-white/10 bg-gradient-to-br from-black via-gray-950 to-gray-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 bg-red-600/10 border border-red-500/30 text-red-300 px-4 py-2 rounded-full text-sm font-medium">
            ${SVG.shieldCheck('h-4 w-4')}
            Licensed and insured HVAC specialists
          </div>
          <h1 class="mt-6 text-4xl sm:text-5xl font-bold leading-tight">${esc(h1)}</h1>
          ${subtitle ? `<p class="mt-5 text-lg text-gray-300 max-w-2xl">${esc(subtitle)}</p>` : ''}
          <div class="mt-6 flex flex-wrap gap-3 text-sm">
            <span class="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-gray-200">
              ${SVG.star('h-4 w-4 text-yellow-500', true)}
              ${esc(rating)} stars (${reviewCount} Google reviews)
            </span>
            <span class="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-gray-200">
              ${SVG.clock3('h-4 w-4 text-red-400')}
              Same-day diagnostics
            </span>
            <span class="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-gray-200">
              ${SVG.badgeCheck('h-4 w-4 text-red-400')}
              ${esc(license)}
            </span>
          </div>
          <div class="mt-8 flex flex-col sm:flex-row gap-4">
            <a href="${phoneHref(phone)}" class="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl font-semibold transition">
              ${SVG.phone('h-5 w-5')}
              Call for Service - ${esc(phone)}
            </a>
            <a href="/contact" class="inline-flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white px-6 py-3.5 rounded-xl font-medium transition">
              Free Quote with Repair or Installation
            </a>
          </div>
        </div>

        <div class="mt-10 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 sm:p-8 max-w-3xl">
          <p class="text-red-100 text-sm uppercase tracking-wide font-semibold">Need urgent help?</p>
          <p class="mt-2 text-white text-lg font-semibold">No cooling, no heat, or system tripping breakers. Talk to a technician now.</p>
          <a href="${phoneHref(phone)}" class="mt-5 inline-flex items-center gap-2 bg-white text-red-700 px-5 py-3 rounded-xl font-semibold hover:bg-red-50 transition">
            ${SVG.phone('h-4 w-4')}
            Call Now
          </a>
        </div>
      </div>
    </section>

    <!-- Content sections -->
    ${sections.map(s => `
    <section class="py-20 sm:py-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="max-w-2xl mb-12">
          <h2 class="text-3xl sm:text-4xl font-bold">${esc(s.heading)}</h2>
          ${s.body ? `<p class="mt-3 text-gray-400">${esc(s.body)}</p>` : ''}
        </div>
        ${s.bullets && s.bullets.length ? `
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${s.bullets.map(b => `
          <article class="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div class="h-11 w-11 rounded-xl bg-red-600/10 flex items-center justify-center mb-4">
              ${SVG.checkCircle2('h-5 w-5 text-red-400')}
            </div>
            <p class="text-sm text-gray-300 leading-relaxed">${esc(b)}</p>
          </article>`).join('')}
        </div>` : ''}
      </div>
    </section>`).join('')}

    ${faq.length ? `
    <!-- FAQ -->
    <section class="py-20 sm:py-28">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl sm:text-4xl font-bold">Frequently Asked Questions</h2>
        <p class="mt-3 text-gray-400">Straight answers so you can make the right decision for your property.</p>
        <div class="mt-8 space-y-4">
          ${faq.map(f => `
          <details class="bg-white/5 border border-white/10 rounded-2xl p-5 group">
            <summary class="cursor-pointer list-none font-semibold text-white flex items-start gap-3">
              <span class="mt-1 h-2 w-2 rounded-full bg-red-500 shrink-0"></span>
              ${esc(f.question)}
            </summary>
            <p class="mt-3 text-gray-300 leading-relaxed">${esc(f.answer)}</p>
          </details>`).join('')}
        </div>
      </div>
    </section>` : ''}

    ${renderCTASection(site)}
  </main>`;
}

function cityContent(site: Record<string, any>, page: Record<string, any>): string {
  const phone = site.phone || '';
  const rating = site.rating || '5.0';
  const yearsExp = site.yearsInBusiness || '36+';
  const services = getServices(site);

  const cityName = (page.city_name as string) || (page.title as string)?.replace(/^HVAC Services in /, '').replace(/, CA.*$/, '') || '';
  const h1 = (page.hero_h1 as string) || `HVAC Services in <span class="text-red-500">${esc(cityName)}, CA</span>`;
  const subtitle = (page.hero_subtitle as string) || `Air Temp Co provides expert heating, air conditioning, and refrigeration services to homes and businesses in ${cityName}.`;

  return `
  <main>
    <!-- Hero -->
    <section class="relative pt-32 pb-16 sm:pt-40 sm:pb-24 overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(220,38,38,0.15),transparent_60%)]"></div>
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center gap-2 mb-4">
          ${SVG.mapPin('h-4 w-4 text-red-500')}
          <span class="text-sm text-red-400 font-medium">Serving ${esc(cityName)}</span>
        </div>
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">${h1}</h1>
        <p class="mt-4 text-lg text-gray-400 max-w-2xl">${esc(subtitle)}</p>
        <div class="flex flex-wrap items-center gap-4 mt-6">
          <div class="flex items-center gap-1.5 text-sm text-gray-300">
            ${SVG.star('h-4 w-4 text-yellow-500', true)}
            <span class="font-semibold">${esc(rating)}</span> Google Rating
          </div>
          <div class="flex items-center gap-1.5 text-sm text-gray-300">
            ${SVG.award('h-4 w-4 text-red-500')}
            ${esc(yearsExp)} Years Experience
          </div>
          <div class="flex items-center gap-1.5 text-sm text-gray-300">
            ${SVG.zap('h-4 w-4 text-amber-500')}
            Same-Day Service
          </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 mt-8">
          <a href="${phoneHref(phone)}" class="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl text-lg font-semibold transition shadow-lg shadow-red-600/25">
            ${SVG.phone('h-5 w-5')}
            Call ${esc(phone)}
          </a>
          <a href="/#quote" class="flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white px-6 py-3.5 rounded-xl text-lg font-medium transition">
            Free Quote with Repair or Installation
          </a>
        </div>
      </div>
    </section>

    <!-- Services Grid -->
    <section class="py-20 sm:py-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-14">
          <h2 class="text-3xl sm:text-4xl font-bold text-white">Our Services in ${esc(cityName)}</h2>
          <p class="mt-3 text-gray-400 max-w-2xl mx-auto">Complete HVAC solutions for ${esc(cityName)} homes and businesses. From emergency repairs to new installations, we handle it all.</p>
        </div>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${services.map(svc => {
            const iconFn = ICON_MAP[svc.icon || 'Wind'] || SVG.wind;
            const citySlug = slugify(cityName);
            const features = (svc.features || []).slice(0, 4);
            return `
          <a href="/${esc(citySlug)}/${esc(svc.slug)}" class="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-red-500/30 hover:bg-white/[0.07] transition-all">
            <div class="h-12 w-12 rounded-xl bg-red-600/10 flex items-center justify-center mb-4 group-hover:bg-red-600/20 transition">
              ${iconFn('h-6 w-6 text-red-500')}
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">${esc(svc.name)}</h3>
            <p class="text-sm text-gray-400 mb-4">${esc(svc.description || '')}</p>
            <ul class="space-y-1.5">
              ${features.map(f => `<li class="flex items-center gap-2 text-sm text-gray-300">${SVG.checkCircle2()} ${esc(f)}</li>`).join('\n              ')}
            </ul>
            <div class="flex items-center gap-1 mt-4 text-red-400 text-sm font-medium group-hover:text-red-300 transition">
              Learn More ${SVG.chevronRight('h-4 w-4')}
            </div>
          </a>`;
          }).join('')}

          <!-- Emergency CTA -->
          <div class="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 flex flex-col justify-center">
            <div class="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
              ${SVG.phone('h-6 w-6 text-white')}
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Emergency HVAC in ${esc(cityName)}</h3>
            <p class="text-sm text-red-100 mb-6">Need urgent HVAC help in ${esc(cityName)}? We offer same-day and after-hours service.</p>
            <a href="${phoneHref(phone)}" class="flex items-center justify-center gap-2 bg-white text-red-600 px-4 py-3 rounded-xl font-semibold hover:bg-red-50 transition">
              ${SVG.phone('h-4 w-4')}
              ${esc(phone)}
            </a>
          </div>
        </div>
      </div>
    </section>

    ${renderCTASection(site)}
  </main>`;
}

function cityServiceContent(site: Record<string, any>, page: Record<string, any>): string {
  const phone = site.phone || '';
  const rating = site.rating || '5.0';
  const yearsExp = site.yearsInBusiness || '36+';
  const addr = getAddr(site);

  const cityName = (page.city_name as string) || '';
  const serviceName = (page.service_name as string) || '';
  const h1 = (page.hero_h1 as string) || `${serviceName} in ${cityName}, CA`;
  const subtitle = (page.hero_subtitle as string) || '';
  const sections = (page.content_sections || []) as { heading: string; body: string; bullets?: string[] }[];
  const faq = (page.faq || []) as { question: string; answer: string }[];
  const citySlug = slugify(cityName);
  const mapQuery = encodeURIComponent(`${cityName}, California`);

  return `
  <main class="pt-28 sm:pt-32">
    <!-- Hero -->
    <section class="py-20 sm:py-28 bg-gradient-to-b from-gray-900 to-black border-b border-white/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="max-w-4xl">
          <p class="text-sm text-red-400 font-medium mb-4">
            <a href="/${esc(citySlug)}" class="hover:text-red-300">${esc(cityName)} HVAC Services</a> / ${esc(serviceName)}
          </p>
          <h1 class="text-4xl sm:text-5xl font-bold text-white leading-tight">${esc(h1)}</h1>
          ${subtitle ? `<p class="mt-5 text-lg text-gray-300 max-w-3xl">${esc(subtitle)}</p>` : ''}
          <div class="flex flex-col sm:flex-row gap-4 mt-8">
            <a href="${phoneHref(phone)}" class="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl font-semibold">
              ${SVG.phone('h-5 w-5')}
              Call ${esc(phone)}
            </a>
            <a href="/${esc(citySlug)}" class="inline-flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white px-6 py-3.5 rounded-xl font-medium">
              ${SVG.mapPin('h-5 w-5')}
              Explore ${esc(cityName)} Services
            </a>
          </div>
        </div>
        <div class="grid md:grid-cols-3 gap-4 mt-10">
          <div class="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-3">
            ${SVG.star('h-5 w-5 text-yellow-400', true)}
            <div class="text-sm text-gray-200"><span class="font-semibold text-white">${esc(rating)} rating</span> on Google</div>
          </div>
          <div class="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-3">
            ${SVG.award('h-5 w-5 text-red-500')}
            <div class="text-sm text-gray-200"><span class="font-semibold text-white">${esc(yearsExp)} years</span> of HVAC experience</div>
          </div>
          <div class="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-3">
            ${SVG.zap('h-5 w-5 text-amber-400')}
            <div class="text-sm text-gray-200"><span class="font-semibold text-white">Same-day service</span> when available</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Choose -->
    <section class="py-20 sm:py-28 bg-black">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-12">
          <h2 class="text-3xl sm:text-4xl font-bold text-white">Why ${esc(cityName)} Residents Choose Us</h2>
          <p class="mt-4 text-gray-400 max-w-3xl">From quick diagnostics to code-compliant installations, we tailor every visit to the homes, businesses, and neighborhoods that define ${esc(cityName)}.</p>
        </div>
        <div class="grid md:grid-cols-3 gap-6">
          <article class="bg-white/5 border border-white/10 rounded-2xl p-6">
            ${SVG.shield('h-6 w-6 text-red-500 mb-4')}
            <h3 class="text-lg font-semibold text-white">Licensed Local Team</h3>
            <p class="text-sm text-gray-400 mt-3">Our licensed crew handles residential and commercial HVAC projects across ${esc(cityName)} with clean installs and clear communication.</p>
          </article>
          <article class="bg-white/5 border border-white/10 rounded-2xl p-6">
            ${SVG.mapPin('h-6 w-6 text-red-500 mb-4')}
            <h3 class="text-lg font-semibold text-white">Local Expertise</h3>
            <p class="text-sm text-gray-400 mt-3">We work in ${esc(cityName)} and nearby communities daily, so your appointments are efficient and your comfort plans match local conditions.</p>
          </article>
          <article class="bg-white/5 border border-white/10 rounded-2xl p-6">
            ${SVG.phone('h-6 w-6 text-red-500 mb-4')}
            <h3 class="text-lg font-semibold text-white">Fast Scheduling</h3>
            <p class="text-sm text-gray-400 mt-3">Need help quickly? We prioritize same-day openings whenever possible and keep you updated from the first call to the completed repair.</p>
          </article>
        </div>
      </div>
    </section>

    ${sections.length ? sections.map(s => `
    <!-- Content Section -->
    <section class="py-20 sm:py-28 bg-gray-900/60 border-y border-white/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-12">
          <h2 class="text-3xl sm:text-4xl font-bold text-white">${esc(s.heading)}</h2>
          ${s.body ? `<p class="mt-4 text-gray-400 max-w-3xl">${esc(s.body)}</p>` : ''}
        </div>
        ${s.bullets && s.bullets.length ? `
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${s.bullets.map(b => `
          <div class="bg-white/5 border border-white/10 rounded-2xl p-5 flex gap-3">
            <div class="h-8 w-8 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0 mt-0.5">
              ${SVG.checkCircle2('h-4 w-4 text-red-500')}
            </div>
            <p class="text-sm text-gray-200">${esc(b)}</p>
          </div>`).join('')}
        </div>` : ''}
      </div>
    </section>`).join('') : ''}

    <!-- Map section -->
    <section class="py-20 sm:py-28 bg-black">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 class="text-3xl sm:text-4xl font-bold text-white">Serving ${esc(cityName)} and surrounding areas</h2>
            <p class="text-gray-400 mt-4 max-w-2xl">We provide on-time ${esc(serviceName.toLowerCase())} appointments across ${esc(cityName)}. Call for same-day availability.</p>
            <div class="mt-8 flex flex-col sm:flex-row gap-4">
              <a href="${phoneHref(phone)}" class="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl font-semibold">
                ${SVG.phone('h-5 w-5')}
                Speak with a Technician
              </a>
              <a href="/${esc(citySlug)}" class="inline-flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white px-6 py-3.5 rounded-xl font-medium">
                View All ${esc(cityName)} Services
              </a>
            </div>
          </div>
          <div class="rounded-2xl overflow-hidden border border-white/10 h-80 bg-gray-900">
            <iframe src="https://www.google.com/maps?q=${mapQuery}&output=embed" width="100%" height="100%" style="border:0" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" title="Map of ${esc(cityName)}, California"></iframe>
          </div>
        </div>
      </div>
    </section>

    ${renderCTASection(site)}
  </main>`;
}

function aboutContent(site: Record<string, any>, page: Record<string, any>): string {
  const phone = site.phone || '';
  const license = site.license || '';
  const licenseTypes = site.license_types || 'C10, C20, C38, B';
  const ownerName = site.ownerName || 'Luis';
  const ownerCompany = site.owner_company || 'Air Temp Co';
  const yearFounded = site.year_founded || 1990;
  const yearsExp = site.yearsInBusiness || '36+';
  const cities = getCities(site);

  const h1 = (page.hero_h1 as string) || `About ${ownerCompany} - San Mateo's Trusted HVAC Experts`;
  const mapSrc = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3164.5!2d-122.2946411!3d37.5547894!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808f9eef27011f57%3A0xb3ad27f5ea0ac8fd!2shvacsanmateo!5e0!3m2!1sen!2sus!4v1710300000000';

  const values = [
    { icon: SVG.shieldCheck('h-5 w-5 text-red-500'), title: 'Reliability', desc: 'We show up on time, communicate clearly, and finish the work right.' },
    { icon: SVG.heartHandshake('h-5 w-5 text-red-500'), title: 'Honesty', desc: 'You get straightforward recommendations and transparent pricing every time.' },
    { icon: SVG.award('h-5 w-5 text-red-500'), title: 'Expertise', desc: `${yearsExp} years of hands-on HVAC and refrigeration experience across all major systems.` },
    { icon: SVG.users('h-5 w-5 text-red-500'), title: 'Community', desc: 'As a local family business, we care for our neighbors and local businesses like family.' },
  ];

  return `
  <main class="bg-black text-white">
    <!-- Hero -->
    <section class="pt-32 pb-16 sm:pt-40 sm:pb-20 border-b border-white/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p class="text-red-400 text-sm font-semibold uppercase tracking-wider mb-4">About ${esc(ownerCompany)}</p>
        <h1 class="text-4xl sm:text-5xl font-bold leading-tight">${esc(h1)}</h1>
        <p class="mt-5 text-lg text-gray-300 max-w-3xl">
          Founded in ${yearFounded}, ${esc(ownerCompany)} has helped homeowners and businesses stay comfortable in every season.
          We are proud to be a family-owned company led by ${esc(ownerName)}, with ${esc(yearsExp)} years of real field experience.
        </p>
        <div class="mt-8 flex flex-col sm:flex-row gap-3">
          <a href="${phoneHref(phone)}" class="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition">
            ${SVG.phone('h-5 w-5')}
            Call ${esc(phone)}
          </a>
          <a href="/contact" class="inline-flex items-center justify-center border border-white/20 hover:bg-white/5 text-white px-6 py-3 rounded-xl font-semibold transition">
            Request Service
          </a>
        </div>
      </div>
    </section>

    <!-- Owner + Mission -->
    <section class="py-20 sm:py-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8">
        <div class="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h2 class="text-2xl font-bold mb-4">Owner Story</h2>
          <p class="text-gray-300 leading-relaxed">
            ${esc(ownerName)} started ${esc(ownerCompany)} in ${yearFounded} with one mission: provide dependable HVAC service with honest advice. Today, after ${esc(yearsExp)} years in the trade, he still leads a family-owned team focused on quality work, fair pricing, and long-term customer relationships.
          </p>
        </div>
        <div class="bg-white/5 border border-white/10 rounded-2xl p-8">
          <h2 class="text-2xl font-bold mb-4">Our Mission</h2>
          <p class="text-gray-300 leading-relaxed mb-5">Our mission is simple: keep San Mateo County comfortable with responsive service, skilled workmanship, and solutions that last.</p>
          <div class="rounded-xl bg-red-600/10 border border-red-500/20 p-4">
            <p class="font-semibold text-red-300">Licensed and qualified</p>
            <p class="text-sm text-gray-300 mt-1">${esc(license)} - Classifications ${esc(licenseTypes)}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Service Area -->
    <section class="py-20 sm:py-28 bg-gray-900/50 border-y border-white/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="mb-10">
          <h2 class="text-3xl sm:text-4xl font-bold">Service Area Across San Mateo County</h2>
          <p class="mt-3 text-gray-300">We proudly serve ${cities.length} Peninsula communities with fast, reliable heating, cooling, and refrigeration support.</p>
        </div>
        <div class="grid lg:grid-cols-2 gap-8 items-start">
          <div class="grid sm:grid-cols-2 gap-3">
            ${cities.map(c => `
            <div class="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-2">
              ${SVG.mapPin('h-4 w-4 text-red-500')}
              <span class="text-sm text-gray-200">${esc(c.name)}</span>
            </div>`).join('')}
          </div>
          <div class="rounded-2xl overflow-hidden border border-white/10 h-96 bg-white/5">
            <iframe src="${mapSrc}" width="100%" height="100%" style="border:0" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Air Temp Co service area map"></iframe>
          </div>
        </div>
      </div>
    </section>

    <!-- Values -->
    <section class="py-20 sm:py-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl sm:text-4xl font-bold mb-10">Our Team Values</h2>
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          ${values.map(v => `
          <div class="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div class="h-11 w-11 rounded-xl bg-red-600/10 flex items-center justify-center mb-4">${v.icon}</div>
            <h3 class="text-lg font-semibold mb-2">${v.title}</h3>
            <p class="text-sm text-gray-300 leading-relaxed">${v.desc}</p>
          </div>`).join('')}
        </div>
      </div>
    </section>

    ${renderCTASection(site)}
  </main>`;
}

function reviewsContent(site: Record<string, any>, page: Record<string, any>): string {
  const phone = site.phone || '';
  const rating = site.rating || '5.0';
  const reviewCount = site.reviewCount || 11;
  const reviews = getReviews(site);

  return `
  <main class="bg-black text-white">
    <section class="pt-32 pb-16 sm:pt-40 sm:pb-20 border-b border-white/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 class="text-4xl sm:text-5xl font-bold">${esc((page.hero_h1 as string) || 'Customer Reviews - HVAC San Mateo')}</h1>
        <p class="mt-4 text-lg text-gray-300 max-w-3xl">Homeowners and business owners across San Mateo County trust our team for reliable HVAC service.</p>
        <div class="mt-8 flex flex-col sm:flex-row gap-3">
          <a href="${phoneHref(phone)}" class="inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 py-3 font-semibold transition">
            ${SVG.phone('h-5 w-5')}
            Call ${esc(phone)}
          </a>
          <a href="https://search.google.com/local/writereview?placeid=ChIJVx8BJw-ej4AR_ciqsV4nrb8" target="_blank" rel="noreferrer" class="inline-flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white rounded-xl px-6 py-3 font-semibold transition">
            Leave a Review
            ${SVG.externalLink('h-4 w-4')}
          </a>
        </div>
      </div>
    </section>

    <section class="py-20 sm:py-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 mb-8">
          <p class="text-sm uppercase tracking-wider text-red-400 font-semibold">Overall Rating</p>
          <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mt-3">
            <div>
              <p class="text-5xl font-bold">${esc(rating)} stars</p>
              <p class="text-gray-300 mt-1">Based on ${reviewCount} Google reviews</p>
            </div>
            <a href="https://search.google.com/local/writereview?placeid=ChIJVx8BJw-ej4AR_ciqsV4nrb8" target="_blank" rel="noreferrer" class="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl px-5 py-3 font-semibold transition">
              Leave a Review ${SVG.externalLink('h-4 w-4')}
            </a>
          </div>
        </div>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${reviews.map(t => `
          <article class="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div class="flex items-center gap-1 mb-4">${starsHtml(t.rating || 5)}</div>
            <p class="text-gray-300 leading-relaxed">&ldquo;${esc(t.text)}&rdquo;</p>
            <div class="mt-5 pt-4 border-t border-white/10">
              <p class="font-semibold text-white">${esc(t.name)}</p>
              ${t.source ? `<p class="text-sm text-gray-400">${esc(t.source)} Review</p>` : ''}
            </div>
          </article>`).join('')}
        </div>
      </div>
    </section>

    ${renderCTASection(site)}
  </main>`;
}

function faqContent(site: Record<string, any>, page: Record<string, any>): string {
  const phone = site.phone || '';
  const faq = (page.faq || []) as { question: string; answer: string; category?: string }[];
  const h1 = (page.hero_h1 as string) || 'Frequently Asked HVAC Questions';

  // Group by category if available, else single group
  const grouped = new Map<string, { question: string; answer: string }[]>();
  for (const item of faq) {
    const cat = item.category || 'General HVAC Questions';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  const categoryIcons: Record<string, string> = {
    'General HVAC Questions': SVG.wrench('h-5 w-5 text-red-500'),
    'Air Conditioning Questions': SVG.snowflake('h-5 w-5 text-red-500'),
    'Heating Questions': SVG.flame('h-5 w-5 text-red-500'),
    'Cost and Savings Questions': SVG.circleDollarSign('h-5 w-5 text-red-500'),
  };

  return `
  <main class="bg-black text-white">
    <section class="pt-32 pb-16 sm:pt-40 sm:pb-20 border-b border-white/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 class="text-4xl sm:text-5xl font-bold">${esc(h1)}</h1>
        <p class="mt-4 text-lg text-gray-300 max-w-3xl">Helpful answers for homeowners and businesses in San Mateo County. If you need immediate help, call our team now.</p>
        <a href="${phoneHref(phone)}" class="mt-7 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 py-3 font-semibold transition">
          ${SVG.phone('h-5 w-5')}
          Call ${esc(phone)}
        </a>
      </div>
    </section>

    <section class="py-20 sm:py-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        ${Array.from(grouped.entries()).map(([cat, items]) => `
        <section class="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
          <div class="flex items-center gap-3 mb-6">
            <span class="h-10 w-10 rounded-xl bg-red-600/10 flex items-center justify-center">
              ${categoryIcons[cat] || SVG.wrench('h-5 w-5 text-red-500')}
            </span>
            <h2 class="text-2xl font-bold">${esc(cat)}</h2>
          </div>
          <div class="space-y-3">
            ${items.map(item => `
            <details class="group bg-black/30 border border-white/10 rounded-xl p-4">
              <summary class="cursor-pointer font-semibold text-white list-none flex items-start justify-between gap-4">
                <span>${esc(item.question)}</span>
                <span class="text-red-400 text-lg leading-none group-open:rotate-45 transition">+</span>
              </summary>
              <p class="mt-3 text-gray-300 leading-relaxed">${esc(item.answer)}</p>
            </details>`).join('')}
          </div>
        </section>`).join('')}
      </div>
    </section>

    ${renderCTASection(site)}
  </main>`;
}

function contactContent(site: Record<string, any>, page: Record<string, any>): string {
  const phone = site.phone || '';
  const email = site.email || '';
  const addr = getAddr(site);
  const hours = site.hours_display || 'Mon-Sat: 7am-7pm';
  const h1 = (page.hero_h1 as string) || 'Contact HVAC San Mateo';

  const mapSrc = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3164.5!2d-122.2946411!3d37.5547894!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808f9eef27011f57%3A0xb3ad27f5ea0ac8fd!2shvacsanmateo!5e0!3m2!1sen!2sus!4v1710300000000';

  return `
  <main class="bg-black text-white">
    <section class="pt-32 pb-12 sm:pt-40 sm:pb-16 border-b border-white/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 class="text-4xl sm:text-5xl font-bold">${esc(h1)}</h1>
        <p class="mt-4 text-lg text-gray-300 max-w-3xl">Reach out for repairs, maintenance, and new HVAC installations. We serve homes and businesses across San Mateo County.</p>
      </div>
    </section>

    <section class="py-10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p class="text-white font-semibold text-lg">Need emergency service? Call us now</p>
          <a href="${phoneHref(phone)}" class="inline-flex items-center justify-center gap-2 bg-white text-red-600 rounded-xl px-5 py-3 font-semibold hover:bg-red-50 transition">
            ${SVG.phone('h-5 w-5')}
            ${esc(phone)}
          </a>
        </div>
      </div>
    </section>

    <section class="py-12 sm:py-16">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8">
        <div class="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
          <h2 class="text-2xl font-bold mb-6">Contact Info</h2>
          <div class="space-y-5">
            ${phone ? `
            <a href="${phoneHref(phone)}" class="flex items-start gap-3 text-gray-200 hover:text-white transition">
              <span class="h-10 w-10 rounded-xl bg-red-600/10 flex items-center justify-center mt-0.5">${SVG.phone('h-5 w-5 text-red-500')}</span>
              <span><span class="block text-sm text-gray-400">Phone</span><span class="font-semibold">${esc(phone)}</span></span>
            </a>` : ''}
            ${email ? `
            <a href="mailto:${esc(email)}" class="flex items-start gap-3 text-gray-200 hover:text-white transition">
              <span class="h-10 w-10 rounded-xl bg-red-600/10 flex items-center justify-center mt-0.5">${SVG.mail('h-5 w-5 text-red-500')}</span>
              <span><span class="block text-sm text-gray-400">Email</span><span class="font-semibold">${esc(email)}</span></span>
            </a>` : ''}
            ${addr.full ? `
            <div class="flex items-start gap-3 text-gray-200">
              <span class="h-10 w-10 rounded-xl bg-red-600/10 flex items-center justify-center mt-0.5">${SVG.mapPin('h-5 w-5 text-red-500')}</span>
              <span><span class="block text-sm text-gray-400">Address</span><span class="font-semibold">${esc(addr.full)}</span></span>
            </div>` : ''}
            <div class="flex items-start gap-3 text-gray-200">
              <span class="h-10 w-10 rounded-xl bg-red-600/10 flex items-center justify-center mt-0.5">${SVG.clock('h-5 w-5 text-red-500')}</span>
              <span><span class="block text-sm text-gray-400">Hours</span><span class="font-semibold">${esc(hours)}</span></span>
            </div>
          </div>
        </div>

        <div class="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
          <h2 class="text-2xl font-bold mb-2">Send Us a Message</h2>
          <p class="text-gray-400 mb-6">Fill out the form and we will get back to you quickly.</p>
          <form onsubmit="handleQuoteSubmit(event)" class="space-y-4">
            <input type="text" name="name" placeholder="Your Name *" required class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm" />
            <input type="tel" name="phone" placeholder="Phone Number *" required class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm" />
            <input type="email" name="email" placeholder="Email Address" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm" />
            <select name="service" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm appearance-none">
              <option value="">Select Service Needed</option>
              <option value="repair">Repair</option>
              <option value="installation">Installation</option>
              <option value="maintenance">Maintenance</option>
              <option value="emergency">Emergency</option>
            </select>
            <textarea name="message" placeholder="How can we help?" rows="4" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm resize-none"></textarea>
            <button type="submit" class="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition">Send Message</button>
          </form>
        </div>
      </div>
    </section>

    <section class="pb-20 sm:pb-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="rounded-2xl overflow-hidden border border-white/10 h-96 bg-white/5">
          <iframe src="${mapSrc}" width="100%" height="100%" style="border:0" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map to HVAC San Mateo"></iframe>
        </div>
      </div>
    </section>

    ${renderCTASection(site)}
  </main>`;
}

function genericContent(site: Record<string, any>, page: Record<string, any>): string {
  const h1 = (page.hero_h1 as string) || (page.title as string) || '';
  const subtitle = (page.hero_subtitle as string) || '';
  const sections = (page.content_sections || []) as { heading: string; body: string; bullets?: string[] }[];
  const faq = (page.faq || []) as { question: string; answer: string }[];
  const phone = site.phone || '';

  return `
  <main class="bg-black text-white">
    <section class="pt-32 pb-16 sm:pt-40 sm:pb-20 border-b border-white/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 class="text-4xl sm:text-5xl font-bold">${esc(h1)}</h1>
        ${subtitle ? `<p class="mt-4 text-lg text-gray-300 max-w-3xl">${esc(subtitle)}</p>` : ''}
        <a href="${phoneHref(phone)}" class="mt-7 inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 py-3 font-semibold transition">
          ${SVG.phone('h-5 w-5')}
          Call ${esc(phone)}
        </a>
      </div>
    </section>

    ${sections.map(s => `
    <section class="py-20 sm:py-28">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl sm:text-4xl font-bold mb-4">${esc(s.heading)}</h2>
        ${s.body ? `<p class="text-gray-400 max-w-3xl mb-6">${esc(s.body)}</p>` : ''}
        ${s.bullets && s.bullets.length ? `
        <ul class="space-y-2">
          ${s.bullets.map(b => `<li class="flex items-center gap-2 text-gray-300">${SVG.checkCircle2()} ${esc(b)}</li>`).join('\n          ')}
        </ul>` : ''}
      </div>
    </section>`).join('')}

    ${faq.length ? `
    <section class="py-20 sm:py-28 bg-gray-900/50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl sm:text-4xl font-bold mb-8">Frequently Asked Questions</h2>
        <div class="space-y-4">
          ${faq.map(f => `
          <details class="bg-white/5 border border-white/10 rounded-2xl p-5 group">
            <summary class="cursor-pointer list-none font-semibold text-white flex items-start gap-3">
              <span class="mt-1 h-2 w-2 rounded-full bg-red-500 shrink-0"></span>
              ${esc(f.question)}
            </summary>
            <p class="mt-3 text-gray-300 leading-relaxed">${esc(f.answer)}</p>
          </details>`).join('')}
        </div>
      </div>
    </section>` : ''}

    ${renderCTASection(site)}
  </main>`;
}

// ---------------------------------------------------------------------------
// JSON-LD Schema generators
// ---------------------------------------------------------------------------
function buildHomeSchema(site: Record<string, any>): string {
  const addr = getAddr(site);
  const cities = getCities(site);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HVACBusiness',
    name: `${site.owner_company || 'Air Temp Co'} - ${site.dba || site.business_name || 'HVAC San Mateo'}`,
    image: `https://${site.domain || 'hvacsanmateo.com'}/logo.png`,
    url: `https://${site.domain || 'hvacsanmateo.com'}`,
    telephone: phoneHref(site.phone || '').replace('tel:', ''),
    address: {
      '@type': 'PostalAddress',
      streetAddress: addr.street || '',
      addressLocality: addr.city || 'San Mateo',
      addressRegion: addr.state || 'CA',
      postalCode: addr.zip || '',
      addressCountry: addr.country || 'US',
    },
    areaServed: cities.map(c => c.name),
    priceRange: '$$',
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '07:00',
      closes: '19:00',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: site.address?.lat || 37.5547894,
      longitude: site.address?.lng || -122.2946411,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: Number(site.rating || 5).toFixed(1),
      reviewCount: site.reviewCount || 11,
    },
    sameAs: [`https://www.google.com/search?kgmid=/g/11y3dpwxt_`],
  };
  return JSON.stringify(schema);
}

function buildServiceSchema(site: Record<string, any>, page: Record<string, any>): string {
  const addr = getAddr(site);
  const faq = (page.faq || []) as { question: string; answer: string }[];
  const schemas: any[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: (page.title as string) || '',
      name: `${(page.title as string) || ''} - ${addr.city || 'San Mateo'}`,
      areaServed: { '@type': 'City', name: addr.city || 'San Mateo' },
      provider: {
        '@type': 'HVACBusiness',
        name: site.owner_company || 'Air Temp Co',
        telephone: phoneHref(site.phone || '').replace('tel:', ''),
      },
    },
  ];
  if (faq.length) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    });
  }
  return schemas.map(s => JSON.stringify(s)).join('</script>\n<script type="application/ld+json">');
}

function buildReviewSchema(site: Record<string, any>): string {
  const reviews = getReviews(site);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: site.owner_company || 'Air Temp Co',
    alternateName: site.dba || site.business_name || 'HVAC San Mateo',
    url: `https://${site.domain || 'hvacsanmateo.com'}`,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: site.rating || '5.0',
      reviewCount: site.reviewCount || reviews.length,
      bestRating: '5',
      worstRating: '1',
    },
    review: reviews.map(r => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.name },
      reviewBody: r.text,
      reviewRating: { '@type': 'Rating', ratingValue: String(r.rating || 5), bestRating: '5' },
      ...(r.source ? { publisher: { '@type': 'Organization', name: r.source } } : {}),
    })),
  };
  return JSON.stringify(schema);
}

function buildFaqSchema(faq: { question: string; answer: string }[]): string {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
  return JSON.stringify(schema);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function assembleHvacSanMateoPage(
  site: Record<string, any>,
  page: Record<string, any>,
  allPages: Record<string, any>[],
): string {
  const slug = (page.slug as string) || '';
  const pageType = (page.page_type as string) || '';
  const normalizedSlug = slug.replace(/^\/+/, '').replace(/\/+$/, '') || 'home';

  // Determine page type from slug or page_type field
  let body: string;
  let schemaJson: string | undefined;

  if (normalizedSlug === 'home' || normalizedSlug === '' || normalizedSlug === 'index' || pageType === 'home' || pageType === 'homepage') {
    body = homeContent(site, page);
    schemaJson = buildHomeSchema(site);
  } else if (normalizedSlug === 'about' || pageType === 'about') {
    body = aboutContent(site, page);
    schemaJson = buildHomeSchema(site); // LocalBusiness schema on about
  } else if (normalizedSlug === 'reviews' || pageType === 'reviews') {
    body = reviewsContent(site, page);
    schemaJson = buildReviewSchema(site);
  } else if (normalizedSlug === 'faq' || pageType === 'faq') {
    const faq = (page.faq || []) as { question: string; answer: string }[];
    body = faqContent(site, page);
    schemaJson = faq.length ? buildFaqSchema(faq) : undefined;
  } else if (normalizedSlug === 'contact' || pageType === 'contact') {
    body = contactContent(site, page);
    schemaJson = buildHomeSchema(site);
  } else if (pageType === 'city_service') {
    body = cityServiceContent(site, page);
    schemaJson = buildServiceSchema(site, page);
  } else if (pageType === 'city') {
    body = cityContent(site, page);
    schemaJson = buildHomeSchema(site);
  } else if (pageType === 'service' || normalizedSlug.startsWith('services/')) {
    body = serviceContent(site, page);
    schemaJson = buildServiceSchema(site, page);
  } else {
    // Generic fallback
    body = genericContent(site, page);
  }

  return renderHead(site, page, schemaJson)
    + renderNavbar(site)
    + body
    + renderFooter(site)
    + renderScripts(site)
    + '\n</body>\n</html>';
}