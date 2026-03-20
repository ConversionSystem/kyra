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

export function alternatingServices(data: ServicesData): string {
  const heading = data.heading || 'Our Services';

  const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" /></svg>`;

  const rows = data.services.map((s, i) => {
    const isEven = i % 2 === 0;
    const icon = s.icon || '';
    const desc = s.description
      ? `<p class="text-base leading-relaxed" style="color: var(--color-text-muted);">${s.description}</p>`
      : '';

    const imagePlaceholder = `<div class="flex items-center justify-center rounded-xl aspect-video" style="background: var(--color-border); color: var(--color-text-muted);">
          ${placeholderSvg}
        </div>`;

    const textBlock = `<div class="flex flex-col justify-center">
          ${icon ? `<div class="text-4xl mb-3">${icon}</div>` : ''}
          <h3 class="text-2xl font-bold mb-3"><a href="#${s.slug}" style="color: var(--color-text);">${s.name}</a></h3>
          ${desc}
        </div>`;

    const orderClasses = isEven
      ? 'md:flex-row'
      : 'md:flex-row-reverse';

    return `<div class="flex flex-col ${orderClasses} gap-8 md:gap-12 items-center">
        <div class="w-full md:w-1/2">${imagePlaceholder}</div>
        <div class="w-full md:w-1/2">${textBlock}</div>
      </div>`;
  }).join('\n      ');

  return `<section class="py-16 sm:py-20 px-4 sm:px-6" style="background: var(--color-surface);" aria-label="${heading}">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl sm:text-4xl font-bold text-center mb-16" style="color: var(--color-text);">${heading}</h2>
    <div class="flex flex-col gap-16 sm:gap-20">
      ${rows}
    </div>
  </div>
</section>`;
}

export default alternatingServices;
