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

export function iconListServices(data: ServicesData): string {
  const heading = data.heading || 'Our Services';
  const { primary } = data.colors;

  const wrenchSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="${primary}" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.049.58.025 1.193-.14 1.743" /></svg>`;

  const items = data.services.map((s, i) => {
    const icon = s.icon || wrenchSvg;
    const descText = s.description || `Professional ${s.name.toLowerCase()} services tailored to your needs. Contact us for a free consultation.`;
    const desc = `<p style="color: #6b7280; font-size: 0.938rem; line-height: 1.7; margin: 0.25rem 0 0 0;">${descText}</p>`;
    const borderBottom = i < data.services.length - 1
      ? `border-bottom: 1px solid #f3f4f6;`
      : '';

    return `<li class="flex items-start gap-5" style="padding: 1.5rem 0; ${borderBottom}">
        <div class="flex-shrink-0 flex items-center justify-center rounded-full" style="width: 48px; height: 48px; background: ${primary}1a; margin-top: 2px;">${icon}</div>
        <div class="flex-1">
          <h3 style="color: #1f2937; font-size: 1.125rem; font-weight: 700; margin: 0;"><a href="/services/${s.slug}" style="color: #1f2937; text-decoration: none;">${s.name}</a></h3>
          ${desc}
        </div>
      </li>`;
  }).join('\n      ');

  return `<section id="services" class="py-16 sm:py-24 px-4 sm:px-6" style="background: var(--color-surface);" aria-label="${heading}">
  <div class="max-w-3xl mx-auto">
    <h2 class="text-center" style="color: #1f2937; font-size: 2.25rem; font-weight: 800; margin: 0 0 3rem 0;">${heading}</h2>
    <ul style="list-style: none; padding: 0 1rem; margin: 0;">
      ${items}
    </ul>
  </div>
</section>`;
}

export default iconListServices;
