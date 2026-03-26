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

export function tabsServices(data: ServicesData): string {
  const heading = data.heading || 'Our Services';
  const { primary } = data.colors;
  const uid = 'svc-tabs';

  const radios = data.services.map((s, i) => {
    const checked = i === 0 ? 'checked' : '';
    return `<input type="radio" name="${uid}" id="${uid}-${s.slug}" class="sr-only" ${checked} />`;
  }).join('\n    ');

  const labels = data.services.map((s) => {
    return `<label for="${uid}-${s.slug}" class="${uid}-label" style="cursor: pointer; display: inline-block; padding: 0.625rem 1.5rem; font-size: 0.938rem; font-weight: 600; border-radius: 9999px; background: #f3f4f6; color: #6b7280; transition: background 0.2s ease, color 0.2s ease; white-space: nowrap;">${s.icon ? `<span style="margin-right: 0.375rem;">${s.icon}</span>` : ''}${s.name}</label>`;
  }).join('\n        ');

  const panels = data.services.map((s) => {
    const descText = s.description || `Professional ${s.name.toLowerCase()} services tailored to your needs. Contact us for a free consultation.`;
    const desc = `<p style="color: #6b7280; font-size: 1rem; line-height: 1.8; margin: 1rem 0 0 0;">${descText}</p>`;

    return `<article class="${uid}-panel" data-tab="${s.slug}" style="display: none;">
          <h3 style="color: #1f2937; font-size: 1.5rem; font-weight: 700; margin: 0;"><a href="/services/${s.slug}" style="color: #1f2937; text-decoration: none;">${s.name}</a></h3>
          ${desc}
        </article>`;
  }).join('\n        ');

  const tabStyles = data.services.map((s) => {
    return `#${uid}-${s.slug}:checked ~ .${uid}-wrap .${uid}-label[for="${uid}-${s.slug}"] {
      background: ${primary};
      color: #ffffff;
    }
    #${uid}-${s.slug}:checked ~ .${uid}-wrap .${uid}-panels [data-tab="${s.slug}"] {
      display: block;
    }`;
  }).join('\n    ');

  return `<section class="py-16 sm:py-24 px-4 sm:px-6" style="background: var(--color-surface);" aria-label="${heading}">
  <style>
    ${tabStyles}
  </style>
  <div class="max-w-4xl mx-auto">
    <h2 class="text-center" style="color: #1f2937; font-size: 2.25rem; font-weight: 800; margin: 0 0 3rem 0;">${heading}</h2>
    ${radios}
    <div class="${uid}-wrap">
      <nav class="flex flex-wrap gap-2 justify-center" style="margin-bottom: 2rem;" aria-label="Service tabs">
        ${labels}
      </nav>
      <div class="${uid}-panels rounded-2xl shadow-lg" style="background: var(--color-surface); border: 1px solid #e5e7eb; padding: 2rem 2.5rem;">
        ${panels}
      </div>
    </div>
  </div>
</section>`;
}

export default tabsServices;
