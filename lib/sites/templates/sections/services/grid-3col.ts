interface ServicesData {
  heading?: string;
  services: Array<{
    name: string;
    slug: string;
    description?: string;
    icon?: string;
  }>;
  businessName?: string;
  colors: { primary: string; secondary: string };
  designStyle?: string;
}

// ─── SVG Icons (Lucide from original site) ──────────────────────────────────
const ICON_WIND = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wind h-6 w-6 text-red-500" aria-hidden="true"><path d="M12.8 19.6A2 2 0 1 0 14 16H2"></path><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"></path><path d="M9.8 4.4A2 2 0 1 1 11 8H2"></path></svg>`;
const ICON_THERMOMETER = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-thermometer h-6 w-6 text-red-500" aria-hidden="true"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path></svg>`;
const ICON_SNOWFLAKE = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-snowflake h-6 w-6 text-red-500" aria-hidden="true"><path d="m10 20-1.25-2.5L6 18"></path><path d="M10 4 8.75 6.5 6 6"></path><path d="m14 20 1.25-2.5L18 18"></path><path d="m14 4 1.25 2.5L18 6"></path><path d="m17 21-3-6h-4"></path><path d="m17 3-3 6 1.5 3"></path><path d="M2 12h6.5L10 9"></path><path d="m20 10-1.5 2 1.5 2"></path><path d="M22 12h-6.5L14 15"></path><path d="m4 10 1.5 2L4 14"></path><path d="m7 21 3-6-1.5-3"></path><path d="m7 3 3 6h4"></path></svg>`;
const ICON_SETTINGS = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings h-6 w-6 text-red-500" aria-hidden="true"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const ICON_WRENCH = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wrench h-6 w-6 text-red-500" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"></path></svg>`;
const ICON_PHONE = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone h-6 w-6 text-white" aria-hidden="true"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"></path></svg>`;
const ICON_PHONE_SM = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone h-4 w-4" aria-hidden="true"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"></path></svg>`;
const ICON_CIRCLE_CHECK = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-check h-3.5 w-3.5 text-red-500 shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>`;
const ICON_CHEVRON_RIGHT = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right h-4 w-4" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>`;

// Service icon mapping by keyword
const DARK_SERVICE_ICONS: Array<{ keywords: string[]; icon: string }> = [
  { keywords: ['air', 'ac', 'cool', 'conditioning'], icon: ICON_WIND },
  { keywords: ['heat', 'furnace', 'warm'], icon: ICON_THERMOMETER },
  { keywords: ['refrig', 'cold', 'freeze', 'ice'], icon: ICON_SNOWFLAKE },
  { keywords: ['install', 'new', 'system'], icon: ICON_SETTINGS },
  { keywords: ['maintain', 'tune', 'prevent', 'service'], icon: ICON_WRENCH },
];

function getDarkServiceIcon(name: string, customIcon?: string): string {
  if (customIcon) return customIcon;
  const lower = name.toLowerCase();
  for (const entry of DARK_SERVICE_ICONS) {
    if (entry.keywords.some(k => lower.includes(k))) return entry.icon;
  }
  return ICON_WRENCH;
}

const SERVICE_ICONS: Record<string, string> = {
  default: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.049.58.025 1.193-.14 1.743" /></svg>`,
  cleaning: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>`,
  dental: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>`,
  home: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>`,
  medical: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
};

function getServiceIcon(serviceName: string, customIcon?: string): string {
  if (customIcon) return customIcon;
  const lower = serviceName.toLowerCase();
  if (lower.includes('clean')) return SERVICE_ICONS.cleaning;
  if (lower.includes('dental') || lower.includes('smile')) return SERVICE_ICONS.dental;
  if (lower.includes('home') || lower.includes('repair') || lower.includes('install')) return SERVICE_ICONS.home;
  if (lower.includes('medical') || lower.includes('care') || lower.includes('health')) return SERVICE_ICONS.medical;
  return SERVICE_ICONS.default;
}

export function grid3colServices(data: ServicesData): string {
  const isDark = data.designStyle === 'modern-dark';
  if (isDark) return modernDarkServices(data);
  return lightServices(data);
}

function modernDarkServices(data: ServicesData): string {
  const heading = data.heading || 'Our HVAC Services';
  const displayServices = data.services.slice(0, 5);

  const cards = displayServices.map(s => {
    const icon = getDarkServiceIcon(s.name, s.icon);
    const description = s.description || `Professional ${s.name.toLowerCase()} services delivered with care and expertise.`;
    const bullets = description.split(/[.!]+/).filter(b => b.trim().length > 5).slice(0, 4);
    if (bullets.length === 0) bullets.push(description);

    return `<a class="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-red-500/30 hover:bg-white/[0.07] transition-all" href="/services/${s.slug}"><div class="h-12 w-12 rounded-xl bg-red-600/10 flex items-center justify-center mb-4 group-hover:bg-red-600/20 transition">${icon}</div><h3 class="text-lg font-semibold text-white mb-2">${s.name}</h3><p class="text-sm text-gray-400 mb-4">${description}</p><ul class="space-y-1.5">${bullets.map(b => `<li class="flex items-center gap-2 text-sm text-gray-300">${ICON_CIRCLE_CHECK}${b.trim()}</li>`).join('')}</ul><div class="flex items-center gap-1 mt-4 text-red-400 text-sm font-medium group-hover:text-red-300 transition">Learn More ${ICON_CHEVRON_RIGHT}</div></a>`;
  });

  // Emergency card
  const emergencyCard = `<div class="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 flex flex-col justify-center"><div class="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">${ICON_PHONE}</div><h3 class="text-lg font-semibold text-white mb-2">Emergency Service</h3><p class="text-sm text-red-100 mb-6">HVAC emergency? We offer same-day and after-hours service. Don&#x27;t suffer - call now.</p><a href="tel:${data.businessName ? '' : ''}" class="flex items-center justify-center gap-2 bg-white text-red-600 px-4 py-3 rounded-xl font-semibold hover:bg-red-50 transition">${ICON_PHONE_SM}Call Now</a></div>`;

  return `<section id="services" class="py-20 sm:py-28"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="text-center mb-14"><h2 class="text-3xl sm:text-4xl font-bold text-white">${heading}</h2><p class="mt-3 text-gray-400 max-w-2xl mx-auto">Complete heating, cooling, and refrigeration solutions for residential and commercial properties.</p></div><div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">${cards.join('')}${emergencyCard}</div></div></section>`;
}

function lightServices(data: ServicesData): string {
  const heading = data.heading || 'Our Services';
  const { primary } = data.colors;
  const displayServices = data.services.slice(0, 9);

  const cards = displayServices.map((s, i) => {
    const icon = getServiceIcon(s.name, s.icon);
    const description = s.description || `Professional ${s.name.toLowerCase()} services delivered with care and expertise. We stand behind our work with a satisfaction guarantee.`;
    const isPopular = i === 1 || (data.services.length >= 3 && i === Math.floor(data.services.length / 2));

    return `<article style="position: relative; background: var(--color-surface, #ffffff); border: 1px solid rgba(0,0,0,0.08); border-radius: 20px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); transition: transform 0.25s ease, box-shadow 0.25s ease; overflow: hidden;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 20px 40px rgba(0,0,0,0.12)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 1px 3px rgba(0,0,0,0.06)'">
      ${isPopular ? `<div style="position: absolute; top: 16px; right: 16px; background: ${primary}; color: white; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 4px 10px; border-radius: 100px;">Popular</div>` : ''}
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: ${primary}; border-radius: 20px 20px 0 0;"></div>
      <div style="width: 60px; height: 60px; border-radius: 16px; background: ${primary}; display: flex; align-items: center; justify-content: center; margin-bottom: 1.25rem; box-shadow: 0 8px 20px ${primary}40;">
        ${icon}
      </div>
      <h3 style="font-size: 1.2rem; font-weight: 800; color: #1f2937; margin: 0 0 0.75rem 0; line-height: 1.3;">
        <a href="/services/${s.slug}" style="color: inherit; text-decoration: none;">${s.name}</a>
      </h3>
      <p style="color: #6b7280; font-size: 0.93rem; line-height: 1.7; margin: 0 0 1.5rem 0;">${description}</p>
      <a href="/services/${s.slug}" style="display: inline-flex; align-items: center; gap: 6px; color: ${primary}; font-weight: 700; font-size: 0.9rem; text-decoration: none; transition: gap 0.2s;" onmouseover="this.querySelector('span').style.transform='translateX(4px)'" onmouseout="this.querySelector('span').style.transform='translateX(0)'">
        Learn More <span style="transition: transform 0.2s;">→</span>
      </a>
    </article>`;
  });

  const moreLink = data.services.length > 9
    ? `<div style="text-align: center; margin-top: 2.5rem;">
        <a href="/services" style="display: inline-flex; align-items: center; gap: 8px; border: 2px solid ${primary}; color: ${primary}; font-weight: 700; font-size: 1rem; padding: 12px 28px; border-radius: 10px; text-decoration: none; transition: background 0.2s, color 0.2s;" onmouseover="this.style.background='${primary}';this.style.color='white'" onmouseout="this.style.background='transparent';this.style.color='${primary}'">View All Services →</a>
      </div>`
    : '';

  return `<section id="services" style="padding: 5rem 1.5rem; background: #f9fafb;" aria-label="${heading}">
  <div style="max-width: 1200px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 3.5rem;">
      <div style="display: inline-block; background: ${primary}15; color: ${primary}; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 16px; border-radius: 100px; margin-bottom: 1rem;">What We Offer</div>
      <h2 style="font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 900; color: #111827; margin: 0 0 1rem 0; letter-spacing: -0.02em;">${heading}</h2>
      <p style="color: #6b7280; font-size: 1.05rem; max-width: 480px; margin: 0 auto; line-height: 1.6;">Everything you need from a team you can trust.</p>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.75rem;">
      ${cards.join('\n      ')}
    </div>
    ${moreLink}
  </div>
</section>`;
}

export default grid3colServices;
