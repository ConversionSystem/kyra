interface CtaData {
  heading?: string;
  subtitle?: string;
  phone?: string;
  phoneHref?: string;
  bookingUrl?: string;
  businessName?: string;
  emergencyText?: string;
}

export function phoneBannerCta(data: CtaData): string {
  const heading = data.heading || 'Ready to Get Started?';
  const phone = data.phone || '';
  const phoneHref = data.phoneHref || `tel:${phone}`;

  return `<section class="py-12 px-4" style="background: var(--color-primary);" aria-label="Call to action">
  <div class="max-w-4xl mx-auto text-center">
    <h2 class="text-3xl sm:text-4xl font-bold mb-4" style="color: var(--color-surface);">${heading}</h2>
    ${data.subtitle ? `<p class="text-lg mb-6" style="color: var(--color-surface); opacity: 0.9;">${data.subtitle}</p>` : ''}
    ${phone ? `<a href="${phoneHref}" class="inline-block text-3xl sm:text-4xl font-bold mb-4 transition-opacity hover:opacity-80" style="color: var(--color-surface);" aria-label="Call ${phone}">${phone}</a>` : ''}
    ${phone ? `<div><a href="${phoneHref}" class="inline-flex items-center justify-center px-8 py-3 rounded-lg text-lg font-semibold transition-opacity hover:opacity-90" style="background: var(--color-surface); color: var(--color-primary);">Call Now</a></div>` : ''}
    ${data.emergencyText ? `<p class="mt-6 text-sm font-medium" style="color: var(--color-surface); opacity: 0.85;">${data.emergencyText}</p>` : ''}
  </div>
</section>`;
}

export default phoneBannerCta;
