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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
}

export function centeredBadgeHero(data: HeroData): string {
  const hasPhoto = !!data.photoUrl;
  const bg = hasPhoto
    ? `background-image: url('${data.photoUrl}'); background-size: cover; background-position: center;`
    : `background: linear-gradient(160deg, ${data.colors.secondary} 0%, ${data.colors.primary} 50%, ${data.colors.secondary}dd 100%);`;

  const badgeText = data.emergencyText || (data.businessName ? `Welcome to ${data.businessName}` : 'Now Accepting New Clients');

  return `<section class="relative min-h-[88vh] flex items-center overflow-hidden" style="${bg}" aria-label="${data.businessName || ''} hero">
  ${hasPhoto ? '<div class="absolute inset-0" style="background: linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.6) 100%);"></div>' : ''}
  <!-- Radial highlights for depth -->
  <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse 80% 60% at 50% 30%, rgba(255,255,255,0.12) 0%, transparent 70%);" aria-hidden="true"></div>
  <!-- Subtle grid pattern overlay -->
  <div class="absolute inset-0 pointer-events-none opacity-10" style="background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px); background-size: 60px 60px;" aria-hidden="true"></div>

  <div class="relative z-10 max-w-5xl mx-auto px-6 py-24 sm:py-36 text-center w-full">
    <!-- Animated badge -->
    <div class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest mb-8" style="background: rgba(255,255,255,0.15); color: #ffffff; border: 1px solid rgba(255,255,255,0.35); backdrop-filter: blur(12px);">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      ${badgeText}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    </div>

    ${data.logoUrl ? `<div class="mb-8 flex justify-center"><img src="${data.logoUrl}" alt="${data.businessName || 'Logo'}" style="height: 64px; width: auto; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));" /></div>` : ''}

    <h1 style="font-size: clamp(2.5rem, 7vw, 6rem); font-weight: 900; color: #ffffff; line-height: 1.05; letter-spacing: -0.03em; margin: 0 0 1.5rem 0; text-shadow: 0 4px 30px rgba(0,0,0,0.35);">${data.h1}</h1>

    <p style="font-size: clamp(1.1rem, 2.2vw, 1.4rem); color: rgba(255,255,255,0.88); line-height: 1.6; margin: 0 auto 2.5rem; max-width: 36rem; text-shadow: 0 1px 8px rgba(0,0,0,0.25);">${data.subtitle}</p>

    <div class="flex flex-col sm:flex-row gap-4 justify-center mb-12">
      <a href="${data.bookingUrl || '#contact'}" class="inline-flex items-center justify-center gap-2 font-bold px-10 py-4 rounded-xl text-lg shadow-2xl transition-all hover:scale-105" style="background: #ffffff; color: ${data.colors.primary};">Get Free Quote</a>
      ${data.phone ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="inline-flex items-center justify-center gap-2 border-2 border-white/80 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-all hover:bg-white/15" style="backdrop-filter: blur(8px);">${phoneIcon()} ${data.phone}</a>` : ''}
    </div>

    <!-- Trust signals row -->
    <div class="flex flex-wrap justify-center gap-8">
      <div class="flex flex-col items-center gap-1.5">
        <div class="flex gap-0.5">
          ${Array(5).fill(0).map(() => `<svg width="18" height="18" viewBox="0 0 20 20" fill="#fbbf24"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>`).join('')}
        </div>
        <span style="color: rgba(255,255,255,0.85); font-size: 0.8rem; font-weight: 600;">5-Star Rated</span>
      </div>
      <div class="flex flex-col items-center gap-1.5">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span style="color: rgba(255,255,255,0.85); font-size: 0.8rem; font-weight: 600;">Licensed &amp; Insured</span>
      </div>
      <div class="flex flex-col items-center gap-1.5">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span style="color: rgba(255,255,255,0.85); font-size: 0.8rem; font-weight: 600;">Fast Response</span>
      </div>
      <div class="flex flex-col items-center gap-1.5">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span style="color: rgba(255,255,255,0.85); font-size: 0.8rem; font-weight: 600;">Free Estimates</span>
      </div>
    </div>
  </div>
</section>`;
}

export default centeredBadgeHero;
