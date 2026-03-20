interface HeroData {
  h1: string;
  subtitle: string;
  phone?: string;
  phoneHref?: string;
  bookingUrl?: string;
  businessName?: string;
  emergencyText?: string;
  photoUrl?: string;
  logoUrl?: string;
}

export function splitScreenHero(data: HeroData): string {
  const imagePanel = data.photoUrl
    ? `<img src="${data.photoUrl}" alt="${data.businessName || ''}" class="w-full h-full object-cover" />`
    : `<div class="w-full h-full" style="background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));"></div>`;

  const phoneCta = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-lg font-semibold border-2 transition-opacity hover:opacity-90" style="border-color: var(--color-primary); color: var(--color-primary);" aria-label="Call ${data.phone}">${data.phone}</a>`
    : '';

  const bookingCta = data.bookingUrl
    ? `<a href="${data.bookingUrl}" class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-lg font-semibold transition-opacity hover:opacity-90" style="background: var(--color-primary); color: var(--color-surface);" aria-label="Book now">Book Now</a>`
    : '';

  return `<section class="min-h-[80vh] grid grid-cols-1 md:grid-cols-2" style="background: var(--color-surface);" aria-label="${data.businessName ? `${data.businessName} hero` : 'Hero'}">
  <div class="relative min-h-[300px] md:min-h-0 overflow-hidden">
    ${imagePanel}
  </div>
  <div class="flex items-center px-6 sm:px-10 lg:px-16 py-16 md:py-0">
    <div class="max-w-lg">
      <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4" style="color: var(--color-text);">${data.h1}</h1>
      <p class="text-lg sm:text-xl mb-8" style="color: var(--color-text-muted);">${data.subtitle}</p>
      <div class="flex flex-col sm:flex-row gap-4">
        ${bookingCta}
        ${phoneCta}
      </div>
    </div>
  </div>
</section>`;
}

export default splitScreenHero;
