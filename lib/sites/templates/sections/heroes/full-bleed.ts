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

export function fullBleedHero(data: HeroData): string {
  const bg = data.photoUrl
    ? `background-image: url('${data.photoUrl}'); background-size: cover; background-position: center;`
    : `background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));`;

  const phoneCta = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="inline-flex items-center gap-2 text-xl sm:text-2xl font-bold underline underline-offset-4" style="color: var(--color-accent);" aria-label="Call ${data.phone}">${data.phone}</a>`
    : '';

  const emergencyCta = data.emergencyText
    ? `<span class="inline-block mt-2 px-4 py-2 rounded-full text-sm font-semibold uppercase tracking-wide" style="background: var(--color-accent); color: var(--color-surface);">${data.emergencyText}</span>`
    : '';

  const bookingCta = data.bookingUrl
    ? `<a href="${data.bookingUrl}" class="inline-block px-8 py-3 rounded-lg text-lg font-semibold transition-opacity hover:opacity-90" style="background: var(--color-primary); color: var(--color-surface);" aria-label="Book now">Book Now</a>`
    : '';

  return `<section class="relative min-h-[80vh] flex items-center justify-center" style="${bg}" aria-label="${data.businessName ? `${data.businessName} hero` : 'Hero'}">
  <div class="absolute inset-0 bg-black/60"></div>
  <div class="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center py-20">
    ${emergencyCta ? `<div class="mb-6">${emergencyCta}</div>` : ''}
    <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6" style="color: #ffffff;">${data.h1}</h1>
    <p class="text-lg sm:text-xl md:text-2xl mb-8 max-w-2xl mx-auto" style="color: rgba(255,255,255,0.85);">${data.subtitle}</p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      ${phoneCta}
      ${bookingCta}
    </div>
  </div>
</section>`;
}

export default fullBleedHero;
