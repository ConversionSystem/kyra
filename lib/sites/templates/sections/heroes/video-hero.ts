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

export function videoHero(data: HeroData): string {
  const phoneCta = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-lg font-semibold border-2 transition-opacity hover:opacity-90" style="border-color: #ffffff; color: #ffffff;" aria-label="Call ${data.phone}">${data.phone}</a>`
    : '';

  const bookingCta = data.bookingUrl
    ? `<a href="${data.bookingUrl}" class="inline-flex items-center justify-center px-8 py-3 rounded-lg text-lg font-semibold transition-opacity hover:opacity-90" style="background: var(--color-primary); color: var(--color-surface);" aria-label="Book now">Book Now</a>`
    : '';

  return `<section class="relative min-h-[80vh] flex items-center justify-center overflow-hidden" aria-label="${data.businessName ? `${data.businessName} hero` : 'Hero'}">
  <div class="absolute inset-0 bg-gray-800" aria-hidden="true">
    <!-- Video placeholder: replace this div with a <video> element -->
    <div class="w-full h-full flex items-center justify-center" style="background: linear-gradient(135deg, #374151 0%, #1f2937 100%);">
      <span class="text-gray-500 text-sm uppercase tracking-widest select-none">Video Background</span>
    </div>
  </div>
  <div class="absolute inset-0 bg-black/50"></div>
  <div class="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center py-20">
    <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6" style="color: #ffffff;">${data.h1}</h1>
    <p class="text-lg sm:text-xl md:text-2xl mb-8 max-w-2xl mx-auto" style="color: rgba(255,255,255,0.85);">${data.subtitle}</p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      ${bookingCta}
      ${phoneCta}
    </div>
  </div>
</section>`;
}

export default videoHero;
