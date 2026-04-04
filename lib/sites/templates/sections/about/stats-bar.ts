interface AboutData {
  heading?: string;
  body?: string;
  ownerName?: string;
  ownerStory?: string;
  photoUrl?: string;
  yearsInBusiness?: number;
  rating?: number;
  reviewCount?: number;
  license?: string;
  teamMembers?: Array<{ name: string; role: string; photoUrl?: string }>;
  milestones?: Array<{ year: string; text: string }>;
  whyChoose?: Array<{ title: string; description: string }>;
  cities?: Array<{ name: string; slug: string }>;
  mapEmbedUrl?: string;
  serviceAreasHeading?: string;
  serviceAreasSubtitle?: string;
  colors: { primary: string; secondary: string };
  designStyle?: string;
}

// ─── SVG Icons (Lucide paths from original site) ────────────────────────────
const ICON_AWARD = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-award h-5 w-5 text-red-500" aria-hidden="true"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"></path><circle cx="12" cy="8" r="6"></circle></svg>`;
const ICON_SHIELD = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield h-5 w-5 text-red-500" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>`;
const ICON_ZAP = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap h-5 w-5 text-red-500" aria-hidden="true"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path></svg>`;
const ICON_USERS = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users h-5 w-5 text-red-500" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><path d="M16 3.128a4 4 0 0 1 0 7.744"></path><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><circle cx="9" cy="7" r="4"></circle></svg>`;
const ICON_STAR = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star h-5 w-5 text-red-500" aria-hidden="true"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path></svg>`;
const ICON_WRENCH = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wrench h-5 w-5 text-red-500" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"></path></svg>`;
const ICON_MAP_PIN = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin h-3.5 w-3.5 text-red-500 shrink-0" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle></svg>`;

// Default why-choose icons mapping
const WHY_CHOOSE_ICONS = [ICON_AWARD, ICON_SHIELD, ICON_ZAP, ICON_USERS, ICON_STAR, ICON_WRENCH];

export function statsBarAbout(data: AboutData): string {
  const isDark = data.designStyle === 'modern-dark';
  if (isDark) return modernDarkStats(data);
  return lightStats(data);
}

function buildStats(data: AboutData): Array<{ value: string; label: string; icon: string }> {
  const stats: Array<{ value: string; label: string; icon: string }> = [];

  stats.push({
    value: data.yearsInBusiness ? `${data.yearsInBusiness}+` : '10+',
    label: 'Years Experience',
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  });

  stats.push({
    value: '5,000+',
    label: 'Jobs Completed',
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  });

  stats.push({
    value: data.rating ? `${typeof data.rating === 'number' ? data.rating.toFixed(1) : data.rating}` : '5.0',
    label: 'Google Rating',
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  });

  stats.push({
    value: '24/7',
    label: 'Emergency Service',
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  });

  return stats.slice(0, 4);
}

function modernDarkStats(data: AboutData): string {
  const stats = buildStats(data);

  // ── Stats Bar Section ──────────────────────────────────────────────────────
  const statsHtml = `<section class="border-y border-white/10 bg-gray-900/50"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"><div class="grid grid-cols-2 md:grid-cols-4 gap-8">${stats.map(s =>
    `<div class="text-center"><div class="text-3xl sm:text-4xl font-bold text-red-500">${s.value}</div><div class="text-sm text-gray-400 mt-1">${s.label}</div></div>`
  ).join('')}</div></div></section>`;

  // ── Why Choose Us Section ──────────────────────────────────────────────────
  const whyChooseItems = data.whyChoose || [];
  const whyChooseHtml = whyChooseItems.length > 0 ? `<section class="py-20 sm:py-28 bg-gray-900/50"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="text-center mb-14"><h2 class="text-3xl sm:text-4xl font-bold text-white">${data.heading || 'Why Choose Us?'}</h2>${data.body ? `<p class="mt-3 text-gray-400 max-w-2xl mx-auto">${data.body}</p>` : ''}</div><div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">${whyChooseItems.map((item, i) =>
    `<div class="flex gap-4"><div class="h-10 w-10 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0">${WHY_CHOOSE_ICONS[i % WHY_CHOOSE_ICONS.length]}</div><div><h3 class="font-semibold text-white mb-1">${item.title}</h3><p class="text-sm text-gray-400">${item.description}</p></div></div>`
  ).join('')}</div></div></section>` : '';

  // ── Service Areas Section ──────────────────────────────────────────────────
  const cities = data.cities || [];
  const serviceAreasHtml = cities.length > 0 ? `<section class="py-20 sm:py-28 bg-gray-900/50"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="grid lg:grid-cols-2 gap-12 items-center"><div><h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">${data.serviceAreasHeading || 'Serving Your Area'}</h2><p class="text-gray-400 mb-8">${data.serviceAreasSubtitle || 'We provide expert services to homes and businesses throughout the area.'}</p><div class="grid grid-cols-2 sm:grid-cols-3 gap-3">${cities.map(c =>
    `<a class="flex items-center gap-2 text-sm text-gray-300 hover:text-red-400 transition" href="/${c.slug}">${ICON_MAP_PIN}${c.name}</a>`
  ).join('')}</div></div>${data.mapEmbedUrl ? `<div class="rounded-2xl overflow-hidden border border-white/10 h-80"><iframe src="${data.mapEmbedUrl}" width="100%" height="100%" style="border:0" allowFullScreen="" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe></div>` : ''}</div></div></section>` : '';

  return `${statsHtml}
${whyChooseHtml}
${serviceAreasHtml}`;
}

function lightStats(data: AboutData): string {
  const { primary, secondary } = data.colors;
  const stats = buildStats(data);

  const cells = stats.map((s, i) => {
    const isLast = i === 3;
    return `<div style="text-align: center; padding: 1rem 1.5rem; ${!isLast ? 'border-right: 1px solid rgba(255,255,255,0.15);' : ''}">
      <div style="display: flex; justify-content: center; margin-bottom: 0.75rem; opacity: 0.9;">${s.icon}</div>
      <div style="font-size: clamp(2rem, 4vw, 3rem); font-weight: 900; color: #ffffff; line-height: 1; letter-spacing: -0.02em; margin-bottom: 0.4rem;">${s.value}</div>
      <div style="color: rgba(255,255,255,0.75); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">${s.label}</div>
    </div>`;
  });

  return `<section id="about" style="background: linear-gradient(135deg, ${secondary} 0%, ${primary} 50%, ${secondary}cc 100%); position: relative; overflow: hidden;" aria-label="Business stats">
  <div style="position: absolute; inset: 0; opacity: 0.06; background-image: radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px); background-size: 24px 24px;" aria-hidden="true"></div>
  <div style="max-width: 1100px; margin: 0 auto; padding: 3.5rem 1.5rem; position: relative; z-index: 1;">
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;">
      ${cells.join('\n      ')}
    </div>
  </div>
</section>`;
}

export default statsBarAbout;
