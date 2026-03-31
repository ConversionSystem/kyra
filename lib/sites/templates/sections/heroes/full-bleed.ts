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

function phoneIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
}

function calendarIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
}

export function fullBleedHero(data: HeroData): string {
  const bg = data.photoUrl
    ? `background-image: url('${data.photoUrl}'); background-size: cover; background-position: center top;`
    : `background: linear-gradient(135deg, ${data.colors.secondary} 0%, ${data.colors.primary}99 60%, ${data.colors.secondary} 100%);`;

  const trustBadge = data.emergencyText
    ? `<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold tracking-wide mb-8" style="background: ${data.colors.primary}; color: #fff;">${data.emergencyText}</div>`
    : `<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8" style="background: rgba(255,255,255,0.15); color: #fff; border: 1px solid rgba(255,255,255,0.3); backdrop-filter: blur(8px);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        Trusted Local Experts
      </div>`;

  return `<section class="relative min-h-[90vh] flex items-center overflow-hidden" style="${bg}" aria-label="${data.businessName || ''} hero">
  <div class="absolute inset-0" style="background: linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.2) 100%);"></div>
  <!-- Decorative bottom fade -->
  <div class="absolute bottom-0 left-0 right-0 h-32" style="background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.3));"></div>
  <div class="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 py-24 sm:py-32 w-full">
    <div class="max-w-3xl">
      ${trustBadge}
      <h1 style="font-size: clamp(2.8rem, 6vw, 5.5rem); font-weight: 900; color: #ffffff; line-height: 1.05; letter-spacing: -0.03em; margin: 0 0 1.5rem 0; text-shadow: 0 2px 20px rgba(0,0,0,0.4);">${data.h1}</h1>
      <p style="font-size: clamp(1.1rem, 2vw, 1.35rem); color: rgba(255,255,255,0.88); line-height: 1.6; margin: 0 0 2.5rem 0; max-width: 38rem; text-shadow: 0 1px 8px rgba(0,0,0,0.3);">${data.subtitle}</p>
      <div class="flex flex-wrap gap-4 mb-10">
        ${data.phone ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="inline-flex items-center gap-3 font-bold px-8 py-4 rounded-xl text-lg shadow-2xl transition-all hover:scale-105 active:scale-100" style="background: #ffffff; color: ${data.colors.primary}; min-width: 200px; justify-content: center;">${phoneIcon()} ${data.phone}</a>` : ''}
        <a href="${data.ctaLink || data.bookingUrl || '#contact'}" class="inline-flex items-center gap-3 border-2 border-white/80 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:bg-white/15" style="backdrop-filter: blur(8px);">${calendarIcon()} ${data.ctaText || (data.bookingUrl ? 'Book Online' : 'Get Free Quote')}</a>
      </div>
      <!-- Trust strip -->
      <div class="flex flex-wrap gap-6 items-center">
        <div class="flex items-center gap-2 text-white/80 text-sm font-medium">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Licensed &amp; Insured
        </div>
        <div class="flex items-center gap-2 text-white/80 text-sm font-medium">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Free Estimates
        </div>
        <div class="flex items-center gap-2 text-white/80 text-sm font-medium">
          <svg width="18" height="18" fill="#fbbf24" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>
          5-Star Rated
        </div>
        ${data.emergencyText ? `<div class="flex items-center gap-2 text-white/80 text-sm font-medium">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"></polyline></svg>
          24/7 Available
        </div>` : ''}
      </div>
    </div>
  </div>
</section>`;
}

export default fullBleedHero;
