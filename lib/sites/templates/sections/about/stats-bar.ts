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

export function statsBarAbout(data: AboutData): string {
  const isDark = data.designStyle === 'modern-dark';
  if (isDark) return modernDarkStats(data);
  return lightStats(data);
}

function buildStats(data: AboutData): Array<{ value: string; label: string; icon: string }> {
  const stats: Array<{ value: string; label: string; icon: string }> = [];

  // Stat 1: Years
  stats.push({
    value: data.yearsInBusiness ? `${data.yearsInBusiness}+` : '10+',
    label: 'Years Experience',
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  });

  // Stat 2: Jobs Completed
  stats.push({
    value: '5,000+',
    label: 'Jobs Completed',
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  });

  // Stat 3: Rating
  stats.push({
    value: data.rating ? `${typeof data.rating === 'number' ? data.rating.toFixed(1) : data.rating}` : '5.0',
    label: 'Google Rating',
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  });

  // Stat 4: 24/7 Emergency Service
  stats.push({
    value: '24/7',
    label: 'Emergency Service',
    icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  });

  return stats.slice(0, 4);
}

function modernDarkStats(data: AboutData): string {
  const { primary } = data.colors;
  const stats = buildStats(data);

  const cells = stats.map((s, i) => {
    const isLast = i === 3;
    return `<div style="text-align: center; padding: 2rem 1.5rem; ${!isLast ? 'border-right: 1px solid rgba(255,255,255,0.08);' : ''}">
      <div style="font-size: clamp(2.5rem, 5vw, 3.5rem); font-weight: 900; color: ${primary}; line-height: 1; letter-spacing: -0.02em; margin-bottom: 0.5rem;">${s.value}</div>
      <div style="color: #94a3b8; font-size: 0.82rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em;">${s.label}</div>
    </div>`;
  });

  // "Why Choose" section — 6-item feature grid
  const whyChooseItems = data.whyChoose || [];
  const whyChooseHtml = whyChooseItems.length > 0 ? `
<section style="padding: 5rem 1.5rem; background: rgba(17,24,39,0.5);" aria-label="Why choose us">
  <div style="max-width: 1200px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 3.5rem;">
      <h2 style="font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 900; color: #f1f5f9; margin: 0 0 0.75rem 0; letter-spacing: -0.02em;">${data.heading || 'Why Choose Us?'}</h2>
      ${data.body ? `<p style="color: #94a3b8; font-size: 1.05rem; max-width: 560px; margin: 0 auto; line-height: 1.6;">${data.body}</p>` : ''}
    </div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;">
      ${whyChooseItems.map(item => `<div style="display: flex; gap: 1rem;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: ${primary}15; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${primary}" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div>
          <h3 style="font-size: 1rem; font-weight: 700; color: #ffffff; margin: 0 0 0.25rem 0;">${item.title}</h3>
          <p style="color: #94a3b8; font-size: 0.875rem; margin: 0; line-height: 1.6;">${item.description}</p>
        </div>
      </div>`).join('\n      ')}
    </div>
  </div>
  <style>
    @media (max-width: 768px) {
      section[aria-label="Why choose us"] > div > div:last-child { grid-template-columns: 1fr !important; }
    }
    @media (min-width: 769px) and (max-width: 1024px) {
      section[aria-label="Why choose us"] > div > div:last-child { grid-template-columns: repeat(2, 1fr) !important; }
    }
  </style>
</section>` : '';

  // "Service Areas" section — city links + map embed
  const cities = data.cities || [];
  const serviceAreasHtml = cities.length > 0 ? `
<section style="padding: 5rem 1.5rem; background: rgba(17,24,39,0.5);" aria-label="Service areas">
  <div style="max-width: 1200px; margin: 0 auto;">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: start;">
      <div>
        <h2 style="font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 900; color: #f1f5f9; margin: 0 0 0.75rem 0; letter-spacing: -0.02em;">${data.serviceAreasHeading || 'Serving All of San Mateo County'}</h2>
        <p style="color: #94a3b8; font-size: 1rem; margin: 0 0 2rem 0; line-height: 1.6;">${data.serviceAreasSubtitle || 'We provide expert services to homes and businesses throughout the area.'}</p>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem;">
          ${cities.map(c => `<a href="/cities/${c.slug}" style="display: flex; align-items: center; gap: 6px; color: #d1d5db; font-size: 0.875rem; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='${primary}'" onmouseout="this.style.color='#d1d5db'">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${primary}" stroke-width="2"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${c.name}
          </a>`).join('\n          ')}
        </div>
      </div>
      ${data.mapEmbedUrl ? `<div style="border-radius: 1rem; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); height: 320px;">
        <iframe src="${data.mapEmbedUrl}" width="100%" height="100%" style="border:0" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      </div>` : ''}
    </div>
  </div>
  <style>
    @media (max-width: 768px) {
      section[aria-label="Service areas"] > div > div { grid-template-columns: 1fr !important; }
      section[aria-label="Service areas"] > div > div > div:first-child > div:last-child { grid-template-columns: repeat(2, 1fr) !important; }
    }
  </style>
</section>` : '';

  return `<section id="about" style="background: #0f172a; border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); position: relative; overflow: hidden;" aria-label="Business stats">
  <div style="position: absolute; inset: 0; opacity: 0.03; background-image: radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px); background-size: 24px 24px;" aria-hidden="true"></div>
  <div style="max-width: 1100px; margin: 0 auto; padding: 3.5rem 1.5rem; position: relative; z-index: 1;">
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0;">
      ${cells.join('\n      ')}
    </div>
  </div>
  <style>
    @media (max-width: 640px) {
      #about > div > div { grid-template-columns: repeat(2, 1fr) !important; }
      #about > div > div > div { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.08); }
      #about > div > div > div:nth-child(odd) { border-right: 1px solid rgba(255,255,255,0.08) !important; }
    }
  </style>
</section>
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
