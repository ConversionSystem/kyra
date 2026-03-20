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
  colors: { primary: string; secondary: string };
}

function phoneIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
}

export function centeredBadgeHero(data: HeroData): string {
  return `<section class="relative min-h-[70vh] flex items-center overflow-hidden" style="background: linear-gradient(135deg, ${data.colors.primary}, ${data.colors.secondary});" aria-label="${data.businessName || ''} hero">
  <div class="absolute inset-0" style="background: radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255,255,255,0.1) 0%, transparent 50%);" aria-hidden="true"></div>
  <div class="relative z-10 max-w-4xl mx-auto px-6 py-20 sm:py-28 text-center">
    ${data.businessName ? `<span class="inline-block mb-6 px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest bg-white/20 text-white backdrop-blur-sm border border-white/30">${data.businessName}</span>` : ''}
    ${data.logoUrl ? `<div class="mb-8 flex justify-center"><img src="${data.logoUrl}" alt="${data.businessName || 'Logo'}" class="h-16 sm:h-20 w-auto rounded-xl shadow-lg" /></div>` : ''}
    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">${data.h1}</h1>
    <p class="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10">${data.subtitle}</p>
    ${data.emergencyText ? `<p class="mb-8 text-sm font-semibold uppercase tracking-wider text-white/90">${data.emergencyText}</p>` : ''}
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      ${data.phone ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="inline-flex items-center gap-2 bg-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all" style="color: ${data.colors.primary};">${phoneIcon()} ${data.phone}</a>` : ''}
      ${data.bookingUrl ? `<a href="${data.bookingUrl}" class="inline-flex items-center gap-2 border-2 border-white text-white font-semibold px-8 py-4 rounded-xl text-lg hover:bg-white/10 transition-all">Book Now</a>` : ''}
    </div>
  </div>
</section>`;
}

export default centeredBadgeHero;
