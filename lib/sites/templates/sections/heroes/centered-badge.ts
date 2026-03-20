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

export function centeredBadgeHero(data: HeroData): string {
  const logoBadge = data.logoUrl
    ? `<div class="mb-8 flex justify-center"><img src="${data.logoUrl}" alt="${data.businessName || 'Logo'}" class="h-16 sm:h-20 w-auto rounded-xl shadow-lg" style="border: 2px solid var(--color-border);" /></div>`
    : '';

  const phoneCta = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-lg font-semibold border-2 transition-opacity hover:opacity-90" style="border-color: var(--color-primary); color: var(--color-primary);" aria-label="Call ${data.phone}">${data.phone}</a>`
    : '';

  const bookingCta = data.bookingUrl
    ? `<a href="${data.bookingUrl}" class="inline-flex items-center justify-center px-8 py-3 rounded-lg text-lg font-semibold transition-opacity hover:opacity-90" style="background: var(--color-primary); color: var(--color-surface);" aria-label="Book now">Book Now</a>`
    : '';

  return `<section class="py-20 sm:py-28 px-4 sm:px-6" style="background: var(--color-surface);" aria-label="${data.businessName ? `${data.businessName} hero` : 'Hero'}">
  <div class="max-w-3xl mx-auto text-center">
    ${logoBadge}
    <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4" style="color: var(--color-text);">${data.h1}</h1>
    <p class="text-lg sm:text-xl mb-10 max-w-2xl mx-auto" style="color: var(--color-text-muted);">${data.subtitle}</p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      ${bookingCta}
      ${phoneCta}
    </div>
  </div>
</section>`;
}

export default centeredBadgeHero;
