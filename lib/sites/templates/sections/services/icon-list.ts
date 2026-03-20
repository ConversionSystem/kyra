interface ServicesData {
  heading?: string;
  services: Array<{
    name: string;
    slug: string;
    description?: string;
    icon?: string;
  }>;
  businessName?: string;
}

export function iconListServices(data: ServicesData): string {
  const heading = data.heading || 'Our Services';

  const wrenchSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.049.58.025 1.193-.14 1.743" /></svg>`;

  const items = data.services.map((s, i) => {
    const icon = s.icon || wrenchSvg;
    const desc = s.description
      ? `<p class="text-sm leading-relaxed mt-1" style="color: var(--color-text-muted);">${s.description}</p>`
      : '';
    const divider = i < data.services.length - 1
      ? `<hr class="my-0" style="border-color: var(--color-border);" />`
      : '';

    return `<li class="flex items-start gap-5 py-5">
        <div class="flex-shrink-0 mt-1 rounded-lg p-2" style="background: var(--color-primary); color: var(--color-surface);">${icon}</div>
        <div class="flex-1">
          <h3 class="text-lg font-semibold"><a href="#${s.slug}" style="color: var(--color-text);">${s.name}</a></h3>
          ${desc}
        </div>
      </li>${divider}`;
  }).join('\n      ');

  return `<section class="py-16 sm:py-20 px-4 sm:px-6" style="background: var(--color-surface);" aria-label="${heading}">
  <div class="max-w-3xl mx-auto">
    <h2 class="text-3xl sm:text-4xl font-bold text-center mb-12" style="color: var(--color-text);">${heading}</h2>
    <ul class="list-none p-0 m-0" style="border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border);">
      ${items}
    </ul>
  </div>
</section>`;
}

export default iconListServices;
