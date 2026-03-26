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
}

export function alternatingServices(data: ServicesData): string {
  const heading = data.heading || 'Our Services';
  const { primary, secondary } = data.colors;

  const rows = data.services.map((s, i) => {
    const isOdd = i % 2 === 0; // 0-indexed, so first item is "odd row"
    const bgColor = isOdd ? 'var(--color-surface)' : 'var(--color-border)';
    const descText = s.description || `Professional ${s.name.toLowerCase()} services tailored to your needs. Contact us for a free consultation.`;
    const desc = `<p style="color: #6b7280; font-size: 1rem; line-height: 1.8; margin: 0 0 1.5rem 0;">${descText}</p>`;

    const decorative = `<div class="rounded-2xl flex items-center justify-center" style="background: linear-gradient(135deg, ${primary}15, ${secondary}20); min-height: 240px; aspect-ratio: 4/3;">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="${primary}" stroke-width="1" opacity="0.4"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.049.58.025 1.193-.14 1.743" /></svg>
        </div>`;

    const textBlock = `<div class="flex flex-col justify-center">
          ${s.icon ? `<div style="font-size: 2rem; margin-bottom: 0.75rem;">${s.icon}</div>` : ''}
          <h3 style="color: #1f2937; font-size: 1.5rem; font-weight: 700; margin: 0 0 0.75rem 0;">${s.name}</h3>
          ${desc}
          <a href="/services/${s.slug}" style="color: ${primary}; font-weight: 600; font-size: 0.938rem; text-decoration: none;">Learn more &rarr;</a>
        </div>`;

    const orderClasses = isOdd ? 'md:flex-row' : 'md:flex-row-reverse';

    return `<div style="background: ${bgColor};" class="py-16 sm:py-20 px-4 sm:px-6">
      <div class="max-w-6xl mx-auto flex flex-col ${orderClasses} gap-10 md:gap-16 items-center">
        <div class="w-full md:w-1/2">${decorative}</div>
        <div class="w-full md:w-1/2">${textBlock}</div>
      </div>
    </div>`;
  }).join('\n    ');

  return `<section aria-label="${heading}">
  <div class="py-16 sm:py-24 px-4 sm:px-6" style="background: var(--color-surface);">
    <h2 class="text-center max-w-4xl mx-auto" style="color: #1f2937; font-size: 2.25rem; font-weight: 800; margin: 0;">${heading}</h2>
  </div>
    ${rows}
</section>`;
}

export default alternatingServices;
