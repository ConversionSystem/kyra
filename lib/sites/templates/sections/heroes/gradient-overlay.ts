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

export function gradientOverlayHero(data: HeroData): string {
  return `<section class="relative min-h-[70vh] flex items-center overflow-hidden" style="background: linear-gradient(160deg, ${data.colors.primary}, ${data.colors.primary}40, #ffffff);" aria-label="${data.businessName || ''} hero">
  <!-- Decorative blobs -->
  <div class="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full" style="background: ${data.colors.primary}15; filter: blur(80px);" aria-hidden="true"></div>
  <div class="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full" style="background: ${data.colors.secondary}12; filter: blur(100px);" aria-hidden="true"></div>
  <div class="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full" style="background: ${data.colors.primary}10; filter: blur(60px);" aria-hidden="true"></div>
  <div class="relative z-10 max-w-4xl mx-auto px-6 py-20 sm:py-28 text-center">
    ${data.emergencyText ? `<span class="inline-block mb-6 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-white" style="background: ${data.colors.primary};">${data.emergencyText}</span>` : ''}
    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6" style="color: #1f2937;">${data.h1}</h1>
    <p class="text-lg sm:text-xl max-w-2xl mx-auto mb-10" style="color: #6b7280;">${data.subtitle}</p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      ${data.phone ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="inline-flex items-center gap-2 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all" style="background: ${data.colors.primary};">${phoneIcon()} ${data.phone}</a>` : ''}
      ${data.bookingUrl ? `<a href="${data.bookingUrl}" class="inline-flex items-center gap-2 font-semibold px-8 py-4 rounded-xl text-lg border-2 transition-all hover:shadow-md" style="border-color: ${data.colors.primary}; color: ${data.colors.primary};">Book Now</a>` : ''}
    </div>
  </div>
</section>`;
}

export default gradientOverlayHero;
