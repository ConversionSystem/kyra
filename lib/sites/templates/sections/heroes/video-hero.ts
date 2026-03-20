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

function playIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="12" cy="12" r="12" fill="currentColor" opacity="0.3"/><polygon points="10,8 16,12 10,16" fill="white"/></svg>`;
}

export function videoHero(data: HeroData): string {
  const bgStyle = data.photoUrl
    ? `background-image: url('${data.photoUrl}'); background-size: cover; background-position: center;`
    : `background: #111827;`;

  return `<section class="relative min-h-[70vh] flex items-center overflow-hidden" style="${bgStyle}" aria-label="${data.businessName || ''} hero">
  <!-- Cinematic dark gradient background -->
  <div class="absolute inset-0" style="background: linear-gradient(135deg, #111827 0%, #1f2937 30%, #111827 60%, ${data.colors.primary}20 100%);${data.photoUrl ? ' opacity: 0.7;' : ''}" aria-hidden="true"></div>
  <div class="absolute inset-0" style="background: radial-gradient(ellipse at 50% 50%, ${data.colors.primary}10, transparent 70%);" aria-hidden="true"></div>
  <!-- Film grain overlay -->
  <div class="absolute inset-0 opacity-5" style="background-image: url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E');" aria-hidden="true"></div>
  <!-- Decorative play button watermark -->
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none" aria-hidden="true">
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="white" stroke="none"><circle cx="12" cy="12" r="11" fill="none" stroke="white" stroke-width="1"/><polygon points="10,8 16,12 10,16"/></svg>
  </div>
  <div class="absolute inset-0 bg-black/40"></div>
  <div class="relative z-10 max-w-5xl mx-auto px-6 py-20 sm:py-28 text-center">
    ${data.emergencyText ? `<span class="inline-block mb-6 px-5 py-2 rounded-full text-sm font-bold uppercase tracking-wider text-white" style="background: ${data.colors.primary}; box-shadow: 0 0 20px ${data.colors.primary}60;">${data.emergencyText}</span>` : ''}
    <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">${data.h1}</h1>
    <p class="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto mb-10">${data.subtitle}</p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      ${data.phone ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="inline-flex items-center gap-2 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg hover:shadow-xl transition-all" style="background: ${data.colors.primary};">${phoneIcon()} ${data.phone}</a>` : ''}
      ${data.bookingUrl ? `<a href="${data.bookingUrl}" class="inline-flex items-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-4 rounded-xl text-lg hover:bg-white/10 transition-all backdrop-blur-sm">Book Now</a>` : ''}
    </div>
  </div>
</section>`;
}

export default videoHero;
