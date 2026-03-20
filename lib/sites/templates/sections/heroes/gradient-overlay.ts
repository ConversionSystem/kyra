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

export function gradientOverlayHero(data: HeroData): string {
  const phoneCta = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-lg font-semibold border-2 transition-opacity hover:opacity-90" style="border-color: var(--color-surface); color: var(--color-surface);" aria-label="Call ${data.phone}">${data.phone}</a>`
    : '';

  const bookingCta = data.bookingUrl
    ? `<a href="${data.bookingUrl}" class="inline-flex items-center justify-center px-8 py-3 rounded-lg text-lg font-semibold transition-opacity hover:opacity-90" style="background: var(--color-surface); color: var(--color-primary);" aria-label="Book now">Book Now</a>`
    : '';

  return `<section class="relative min-h-[70vh] flex items-center justify-center px-4 sm:px-6" style="background: linear-gradient(160deg, var(--color-primary) 0%, var(--color-secondary) 100%);" aria-label="${data.businessName ? `${data.businessName} hero` : 'Hero'}">
  <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(circle at 20% 50%, var(--color-surface) 1px, transparent 1px), radial-gradient(circle at 80% 50%, var(--color-surface) 1px, transparent 1px); background-size: 40px 40px;"></div>
  <div class="relative z-10 max-w-3xl mx-auto text-center py-20">
    <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-6" style="color: var(--color-surface);">${data.h1}</h1>
    <p class="text-lg sm:text-xl mb-10 max-w-2xl mx-auto" style="color: rgba(255,255,255,0.85);">${data.subtitle}</p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      ${bookingCta}
      ${phoneCta}
    </div>
  </div>
</section>`;
}

export default gradientOverlayHero;
