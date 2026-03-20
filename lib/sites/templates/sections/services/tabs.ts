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

export function tabsServices(data: ServicesData): string {
  const heading = data.heading || 'Our Services';
  const uid = 'svc-tabs';

  const radios = data.services.map((s, i) => {
    const checked = i === 0 ? 'checked' : '';
    return `<input type="radio" name="${uid}" id="${uid}-${s.slug}" class="sr-only peer/${s.slug}" ${checked} />`;
  }).join('\n    ');

  const labels = data.services.map((s) => {
    return `<label for="${uid}-${s.slug}" class="cursor-pointer px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-medium rounded-t-lg transition-colors whitespace-nowrap ${uid}-label" style="color: var(--color-text-muted); border: 1px solid transparent; border-bottom: none;">${s.icon ? `<span class="mr-1">${s.icon}</span> ` : ''}${s.name}</label>`;
  }).join('\n        ');

  const panels = data.services.map((s) => {
    const desc = s.description
      ? `<p class="text-base leading-relaxed mt-4" style="color: var(--color-text-muted);">${s.description}</p>`
      : '';

    return `<article id="${s.slug}" class="${uid}-panel" data-tab="${s.slug}" style="display: none;">
          <h3 class="text-2xl font-bold"><a href="#${s.slug}" style="color: var(--color-text);">${s.name}</a></h3>
          ${desc}
        </article>`;
  }).join('\n        ');

  // Build CSS rules for radio-driven tab visibility
  const tabStyles = data.services.map((s) => {
    return `#${uid}-${s.slug}:checked ~ .${uid}-tabs .${uid}-label[for="${uid}-${s.slug}"] {
      color: var(--color-primary);
      border-color: var(--color-border);
      background: var(--color-surface);
      border-bottom-color: var(--color-surface);
      margin-bottom: -1px;
    }
    #${uid}-${s.slug}:checked ~ .${uid}-tabs .${uid}-panels [data-tab="${s.slug}"] {
      display: block;
    }`;
  }).join('\n    ');

  return `<section class="py-16 sm:py-20 px-4 sm:px-6" style="background: var(--color-surface);" aria-label="${heading}">
  <style>
    ${tabStyles}
  </style>
  <div class="max-w-4xl mx-auto">
    <h2 class="text-3xl sm:text-4xl font-bold text-center mb-12" style="color: var(--color-text);">${heading}</h2>
    ${radios}
    <div class="${uid}-tabs">
      <nav class="flex overflow-x-auto gap-1 mb-0" style="border-bottom: 1px solid var(--color-border);" aria-label="Service tabs">
        ${labels}
      </nav>
      <div class="${uid}-panels rounded-b-xl p-6 sm:p-8" style="border: 1px solid var(--color-border); border-top: none;">
        ${panels}
      </div>
    </div>
  </div>
</section>`;
}

export default tabsServices;
