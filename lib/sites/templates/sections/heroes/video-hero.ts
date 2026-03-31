// video-hero.ts
// Animated gradient hero with a premium dark cinematic feel.
// TODO (future): Accept a `videoUrl` prop and swap the CSS animation background
//   for a real <video autoplay muted loop playsinline> element.
//   For now, the animated gradient looks great and prevents the gray placeholder.

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
  ctaText?: string;
  ctaLink?: string;
}

export function videoHero(data: HeroData): string {
  const phoneCta = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="inline-flex items-center justify-center px-6 py-3 rounded-lg text-lg font-semibold border-2 border-white/80 text-white hover:bg-white hover:text-gray-900 transition-all duration-200" aria-label="Call ${data.phone}">${data.phone}</a>`
    : '';

  const bookingCta = data.ctaLink || data.bookingUrl
    ? `<a href="${data.ctaLink || data.bookingUrl}" class="inline-flex items-center justify-center px-8 py-3 rounded-lg text-lg font-semibold text-white transition-all duration-200 hover:opacity-90" style="background: var(--color-primary);" aria-label="${data.ctaText || 'Book now'}">${data.ctaText || 'Book Now'}</a>`
    : '';

  return `<section class="relative min-h-[85vh] flex items-center justify-center overflow-hidden" aria-label="${data.businessName ? `${data.businessName} hero` : 'Hero'}">
  <!-- Animated cinematic gradient background — swap for <video> when videoUrl is available -->
  <div class="absolute inset-0 video-hero-bg" aria-hidden="true"></div>
  <!-- Overlay -->
  <div class="absolute inset-0 bg-black/40"></div>
  <!-- Content -->
  <div class="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center py-24">
    <h1 class="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight" style="color: #ffffff; text-shadow: 0 2px 20px rgba(0,0,0,0.5);">${data.h1}</h1>
    <p class="text-xl sm:text-2xl mb-10 max-w-2xl mx-auto font-light" style="color: rgba(255,255,255,0.90); text-shadow: 0 1px 8px rgba(0,0,0,0.4);">${data.subtitle}</p>
    <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
      ${bookingCta}
      ${phoneCta}
    </div>
  </div>
  <!-- Animated gradient CSS (injected once, harmless if duplicated) -->
  <style>
    .video-hero-bg {
      background: linear-gradient(
        135deg,
        var(--color-secondary, #0f0f1a) 0%,
        var(--color-primary, #4f46e5) 40%,
        #1e1b4b 70%,
        var(--color-secondary, #0f0f1a) 100%
      );
      background-size: 300% 300%;
      animation: video-hero-shift 12s ease infinite;
    }
    @keyframes video-hero-shift {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  </style>
</section>`;
}

export default videoHero;
