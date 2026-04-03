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
  const heading = data.heading || 'Our Services';
  const displayServices = data.services.slice(0, 9);

  const cards = displayServices.map((s, i) => {
    const icon = getServiceIcon(s.name, s.icon);
    const description = s.description || `Professional ${s.name.toLowerCase()} services delivered with care and expertise.`;
    const isEmergency = i === displayServices.length - 1 && displayServices.length >= 3;

    // Build bullet-style description
    const bullets = description.split(/[.!,;]+/).filter(b => b.trim().length > 5).slice(0, 4);
    if (bullets.length === 0) bullets.push(description);
    const bulletList = bullets.map(b =>
      `<li class="flex items-center gap-2 text-sm text-gray-300">✓ ${b.trim()}</li>`
    ).join('\n');

    if (isEmergency) {
      return `<div class="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 flex flex-col justify-center">
        <h3 class="text-lg font-semibold text-white mb-2">${s.name}</h3>
        <p class="text-sm text-red-100 mb-6">${description}</p>
        <a href="/services/${s.slug}" class="flex items-center justify-center gap-2 bg-white text-red-600 px-4 py-3 rounded-xl font-semibold hover:bg-red-50 transition no-underline">Get Help Now</a>
      </div>`;
    }

    return `<a class="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-red-500/30 hover:bg-white/[0.07] transition-all no-underline block" href="/services/${s.slug}">
      <div class="h-12 w-12 rounded-xl bg-red-600/10 flex items-center justify-center mb-4 group-hover:bg-red-600/20 transition">${icon}</div>
      <h3 class="text-lg font-semibold text-white mb-2">${s.name}</h3>
      <p class="text-sm text-gray-400 mb-4">${description}</p>
      <ul class="space-y-1.5">
        ${bulletList}
      </ul>
      <div class="flex items-center gap-1 mt-4 text-red-400 text-sm font-medium group-hover:text-red-300 transition">Learn More →</div>
    </a>`;
  });

  const moreLink = data.services.length > 9
    ? `<div class="text-center mt-10">
        <a href="/services" class="inline-flex items-center gap-2 border-2 border-white/20 text-white font-semibold px-7 py-3 rounded-xl hover:bg-white/5 transition no-underline">View All Services →</a>
      </div>`
    : '';

  return `<section id="services" class="py-20 sm:py-28" aria-label="${heading}">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-14">
      <h2 class="text-3xl sm:text-4xl font-bold text-white">${heading}</h2>
    </div>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${cards.join('\n      ')}
    </div>
    ${moreLink}
  </div>
</section>`;
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
