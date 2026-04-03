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

  if (data.yearsInBusiness) {
    stats.push({
      value: `${data.yearsInBusiness}+`,
      label: 'Years of Experience',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    });
  }
  if (data.reviewCount) {
    stats.push({
      value: `${data.reviewCount}+`,
      label: 'Happy Customers',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    });
  }
  if (data.rating) {
    stats.push({
      value: `${data.rating}`,
      label: 'Star Rating',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
    });
  }
  if (data.license) {
    stats.push({
      value: '✓',
      label: 'Licensed & Insured',
      icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    });
  }

  if (stats.length === 0) {
    stats.push(
      { value: '10+', label: 'Years in Business', icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
      { value: '4.9 ★', label: 'Average Rating', icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>` },
      { value: '500+', label: 'Happy Clients', icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>` },
      { value: '100%', label: 'Satisfaction Guaranteed', icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` },
    );
  }
  while (stats.length < 4) {
    stats.push({ value: '24/7', label: 'Availability', icon: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"></polyline></svg>` });
  }

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
</section>`;
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
