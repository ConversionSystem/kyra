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
  const { primary } = data.colors;
  const displayServices = data.services.slice(0, 9);

  const checkIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${primary}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  const cards = displayServices.map((s, i) => {
    const icon = getServiceIcon(s.name, s.icon);
    const description = s.description || `Professional ${s.name.toLowerCase()} services delivered with care and expertise.`;
    const isEmergency = i === displayServices.length - 1 && displayServices.length >= 3;

    // Build bullet-style description — split on sentences or commas
    const bullets = description.split(/[.!,;]+/).filter(b => b.trim().length > 5).slice(0, 4);
    // Ensure at least 1 bullet
    if (bullets.length === 0) bullets.push(description);
    const bulletList = bullets.map(b =>
      `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        ${checkIcon}
        <span style="color: #d1d5db; font-size: 0.875rem; line-height: 1.5;">${b.trim()}</span>
      </div>`
    ).join('');

    if (isEmergency) {
      // Last card: red gradient emergency card
      return `<article style="position: relative; background: linear-gradient(135deg, ${primary}, #991b1b); border-radius: 1rem; padding: 2rem; transition: transform 0.25s ease, box-shadow 0.25s ease; overflow: hidden;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 20px 40px rgba(220,38,38,0.3)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none'">
        <div style="position: absolute; top: -20px; right: -20px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%;" aria-hidden="true"></div>
        <div style="width: 56px; height: 56px; border-radius: 14px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 1.25rem;">
          ${icon}
        </div>
        <h3 style="font-size: 1.2rem; font-weight: 800; color: #ffffff; margin: 0 0 0.75rem 0; line-height: 1.3;">
          <a href="/services/${s.slug}" style="color: inherit; text-decoration: none;">${s.name}</a>
        </h3>
        <p style="color: rgba(255,255,255,0.85); font-size: 0.93rem; line-height: 1.7; margin: 0 0 1.5rem 0;">${description}</p>
        <a href="/services/${s.slug}" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; color: ${primary}; background: #ffffff; font-weight: 700; font-size: 0.9rem; text-decoration: none; padding: 10px 20px; border-radius: 10px; transition: background 0.2s; width: 100%;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='#ffffff'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Get Help Now
        </a>
      </article>`;
    }

    return `<article style="position: relative; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; padding: 2rem; transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; overflow: hidden;" onmouseover="this.style.transform='translateY(-6px)';this.style.boxShadow='0 20px 40px rgba(0,0,0,0.3)';this.style.borderColor='rgba(220,38,38,0.3)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none';this.style.borderColor='rgba(255,255,255,0.1)'">
      <div style="width: 56px; height: 56px; border-radius: 14px; background: ${primary}; display: flex; align-items: center; justify-content: center; margin-bottom: 1.25rem; box-shadow: 0 8px 20px ${primary}40;">
        ${icon}
      </div>
      <h3 style="font-size: 1.2rem; font-weight: 800; color: #f1f5f9; margin: 0 0 0.75rem 0; line-height: 1.3;">
        <a href="/services/${s.slug}" style="color: inherit; text-decoration: none;">${s.name}</a>
      </h3>
      <div style="margin-bottom: 1.25rem;">
        ${bulletList}
      </div>
      <a href="/services/${s.slug}" style="display: inline-flex; align-items: center; gap: 6px; color: ${primary}; font-weight: 700; font-size: 0.9rem; text-decoration: none; transition: gap 0.2s;" onmouseover="this.querySelector('span').style.transform='translateX(4px)'" onmouseout="this.querySelector('span').style.transform='translateX(0)'">
        Learn More <span style="transition: transform 0.2s;">→</span>
      </a>
    </article>`;
  });

  const moreLink = data.services.length > 9
    ? `<div style="text-align: center; margin-top: 2.5rem;">
        <a href="/services" style="display: inline-flex; align-items: center; gap: 8px; border: 2px solid rgba(255,255,255,0.2); color: #ffffff; font-weight: 700; font-size: 1rem; padding: 12px 28px; border-radius: 10px; text-decoration: none; transition: background 0.2s, border-color 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)';this.style.borderColor='${primary}'" onmouseout="this.style.background='transparent';this.style.borderColor='rgba(255,255,255,0.2)'">View All Services →</a>
      </div>`
    : '';

  return `<section id="services" style="padding: 5rem 1.5rem; background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);" aria-label="${heading}">
  <div style="max-width: 1200px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 3.5rem;">
      <div style="display: inline-block; background: ${primary}20; color: ${primary}; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 16px; border-radius: 100px; margin-bottom: 1rem; border: 1px solid ${primary}30;">What We Offer</div>
      <h2 style="font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 900; color: #f1f5f9; margin: 0 0 1rem 0; letter-spacing: -0.02em;">${heading}</h2>
      <p style="color: #94a3b8; font-size: 1.05rem; max-width: 480px; margin: 0 auto; line-height: 1.6;">Everything you need from a team you can trust.</p>
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;">
      ${cards.join('\n      ')}
    </div>
    ${moreLink}
  </div>
  <style>
    @media (max-width: 1024px) {
      #services > div > div:last-of-type { grid-template-columns: repeat(2, 1fr) !important; }
    }
    @media (max-width: 640px) {
      #services > div > div:last-of-type { grid-template-columns: 1fr !important; }
    }
  </style>
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
