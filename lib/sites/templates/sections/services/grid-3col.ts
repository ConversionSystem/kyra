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

export function grid3colServices(data: ServicesData): string {
  const heading = data.heading || 'Our Services';
  const { primary } = data.colors;

  const wrenchSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#ffffff" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.049.58.025 1.193-.14 1.743" /></svg>`;

  const cards = data.services.map((s) => {
    const icon = s.icon || wrenchSvg;
    const descText = s.description || `Professional ${s.name.toLowerCase()} services tailored to your needs. Contact us for a free consultation.`;
    const desc = `<p style="color: #6b7280; font-size: 0.938rem; line-height: 1.7; margin: 0;">${descText}</p>`;

    return `<article class="rounded-2xl shadow-lg" style="background: var(--color-surface); border-top: 4px solid ${primary}; transition: transform 0.25s ease, box-shadow 0.25s ease;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 20px 25px -5px rgba(0,0,0,0.1),0 8px 10px -6px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow=''">
      <div class="p-8">
        <div class="flex items-center justify-center rounded-full" style="width: 56px; height: 56px; background: ${primary}; margin-bottom: 1.25rem;">${icon}</div>
        <h3 style="color: #1f2937; font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem 0;"><a href="/services/${s.slug}" style="color: #1f2937; text-decoration: none;">${s.name}</a></h3>
        ${desc}
      </div>
    </article>`;
  }).join('\n    ');

  return `<section class="py-16 sm:py-24 px-4 sm:px-6" style="background: var(--color-surface);" aria-label="${heading}">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-center" style="color: #1f2937; font-size: 2.25rem; font-weight: 800; margin: 0 0 3rem 0;">${heading}</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
    ${cards}
    </div>
  </div>
</section>`;
}

export default grid3colServices;
