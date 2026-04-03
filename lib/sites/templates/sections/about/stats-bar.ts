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
  const stats = buildStats(data);

  const cells = stats.map(s => {
    return `<div class="text-center">
      <div class="text-3xl sm:text-4xl font-bold text-red-500">${s.value}</div>
      <div class="text-sm text-gray-400 mt-1">${s.label}</div>
    </div>`;
  });

  // "Why Choose" section
  const whyChooseItems = data.whyChoose || [];
  const whyChooseHtml = whyChooseItems.length > 0 ? `
<section class="py-20 sm:py-28 bg-gray-900/50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-14">
      <h2 class="text-3xl sm:text-4xl font-bold text-white">${data.heading || 'Why Choose Us?'}</h2>
      ${data.body ? `<p class="text-gray-400 mt-4 max-w-xl mx-auto">${data.body}</p>` : ''}
    </div>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${whyChooseItems.map(item => `<div class="flex gap-4">
        <div class="h-10 w-10 rounded-lg bg-red-600/10 flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-red-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div>
          <h3 class="font-semibold text-white mb-1">${item.title}</h3>
          <p class="text-sm text-gray-400">${item.description}</p>
        </div>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>` : '';

  // "Service Areas" section
  const cities = data.cities || [];
  const serviceAreasHtml = cities.length > 0 ? `
<section class="py-20 sm:py-28 bg-gray-900/50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="grid lg:grid-cols-2 gap-12 items-center">
      <div>
        <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">${data.serviceAreasHeading || 'Serving All of San Mateo County'}</h2>
        <p class="text-gray-400 mb-8">${data.serviceAreasSubtitle || 'We provide expert services to homes and businesses throughout the area.'}</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          ${cities.map(c => `<a class="flex items-center gap-2 text-sm text-gray-300 hover:text-red-400 transition no-underline" href="/cities/${c.slug}">📍 ${c.name}</a>`).join('\n          ')}
        </div>
      </div>
      ${data.mapEmbedUrl ? `<div class="rounded-2xl overflow-hidden border border-white/10 h-80">
        <iframe src="${data.mapEmbedUrl}" width="100%" height="100%" style="border:0" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
      </div>` : ''}
    </div>
  </div>
</section>` : '';

  return `<section id="about" class="border-y border-white/10 bg-gray-900/50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
      ${cells.join('\n      ')}
    </div>
  </div>
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
