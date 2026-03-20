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

export function splitScreenHero(data: HeroData): string {
  const rightPanel = data.photoUrl
    ? `<img src="${data.photoUrl}" alt="${data.businessName || ''}" class="w-full h-full object-cover" />`
    : `<div class="w-full h-full" style="background: repeating-linear-gradient(45deg, ${data.colors.secondary}15, ${data.colors.secondary}15 10px, transparent 10px, transparent 20px);"></div>`;

  return `<section class="min-h-[70vh] grid grid-cols-1 md:grid-cols-2" aria-label="${data.businessName || ''} hero">
  <div class="flex items-center px-8 sm:px-12 lg:px-20 py-16 sm:py-24" style="background: linear-gradient(160deg, ${data.colors.primary}, ${data.colors.secondary});">
    <div class="max-w-xl">
      ${data.emergencyText ? `<span class="inline-block mb-6 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-sm">${data.emergencyText}</span>` : ''}
      <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">${data.h1}</h1>
      <p class="text-lg sm:text-xl text-white/80 mb-10 max-w-lg">${data.subtitle}</p>
      <div class="flex flex-col sm:flex-row gap-4">
        ${data.phone ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="inline-flex items-center gap-2 bg-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all" style="color: ${data.colors.primary};">${phoneIcon()} ${data.phone}</a>` : ''}
        ${data.bookingUrl ? `<a href="${data.bookingUrl}" class="inline-flex items-center gap-2 border-2 border-white text-white font-semibold px-8 py-4 rounded-xl text-lg hover:bg-white/10 transition-all">Book Now</a>` : ''}
      </div>
    </div>
  </div>
  <div class="relative min-h-[350px] md:min-h-0 overflow-hidden bg-gray-100">
    ${rightPanel}
  </div>
</section>`;
}

export default splitScreenHero;
