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
  rating?: number;
  reviewCount?: number;
  yearsInBusiness?: number;
  ctaText?: string;
  ctaLink?: string;
}

function phoneIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
}

export function gradientOverlayHero(data: HeroData): string {
  const hasPhoto = !!data.photoUrl;
  const bgStyle = hasPhoto
    ? `background-image: url('${data.photoUrl}'); background-size: cover; background-position: center;`
    : `background: linear-gradient(145deg, ${data.colors.secondary} 0%, ${data.colors.primary}cc 40%, ${data.colors.secondary}aa 100%);`;

  const rating = (data as { rating?: number }).rating || 4.9;
  const reviewCount = (data as { reviewCount?: number }).reviewCount;
  const yearsInBusiness = (data as { yearsInBusiness?: number }).yearsInBusiness;

  // Floating stats bar — shows below the CTA if we have data
  const statsItems = [];
  if (rating) statsItems.push({ value: `${rating} ★`, label: 'Avg Rating' });
  if (yearsInBusiness) statsItems.push({ value: `${yearsInBusiness}+`, label: 'Years Experience' });
  if (reviewCount) statsItems.push({ value: `${reviewCount}+`, label: 'Happy Clients' });
  statsItems.push({ value: '24/7', label: 'Available' });

  const statsBar = `<div class="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
    ${statsItems.slice(0, 4).map(s => `
    <div style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); border-radius: 16px; padding: 14px 12px; text-align: center; backdrop-filter: blur(12px);">
      <div style="color: #ffffff; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; line-height: 1;">${s.value}</div>
      <div style="color: rgba(255,255,255,0.75); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 4px;">${s.label}</div>
    </div>`).join('')}
  </div>`;

  return `<section class="relative overflow-hidden flex items-center" style="min-height: 88vh; ${bgStyle}" aria-label="${data.businessName || ''} hero">
  <!-- Multi-layer overlay for depth -->
  ${hasPhoto
    ? `<div class="absolute inset-0" style="background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.7) 100%);"></div>
       <div class="absolute inset-0" style="background: linear-gradient(to right, ${data.colors.primary}40 0%, transparent 60%);"></div>`
    : `<div class="absolute inset-0" style="background: radial-gradient(ellipse 80% 70% at 50% 40%, rgba(255,255,255,0.08) 0%, transparent 70%);"></div>`
  }

  <!-- Dot pattern overlay -->
  <div class="absolute inset-0 pointer-events-none" style="opacity: 0.12; background-image: radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px); background-size: 28px 28px;" aria-hidden="true"></div>

  <div class="relative z-10 max-w-5xl mx-auto px-6 py-24 sm:py-32 text-center w-full">
    ${data.emergencyText
      ? `<div style="display: inline-flex; align-items: center; gap: 8px; background: ${data.colors.primary}; color: white; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 8px 20px; border-radius: 100px; margin-bottom: 2rem; box-shadow: 0 4px 20px ${data.colors.primary}60;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"></polyline></svg>
          ${data.emergencyText}
        </div>`
      : `<div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: white; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.06em; padding: 8px 20px; border-radius: 100px; margin-bottom: 2rem; backdrop-filter: blur(10px);">
          Your Trusted Local Experts
        </div>`
    }

    <h1 style="font-size: clamp(2.8rem, 6.5vw, 5.5rem); font-weight: 900; color: #ffffff; line-height: 1.05; letter-spacing: -0.03em; margin: 0 0 1.5rem 0; text-shadow: 0 4px 30px rgba(0,0,0,0.4);">${data.h1}</h1>

    <p style="font-size: clamp(1.1rem, 2vw, 1.3rem); color: rgba(255,255,255,0.88); line-height: 1.65; margin: 0 auto 2.5rem; max-width: 38rem; text-shadow: 0 1px 8px rgba(0,0,0,0.3);">${data.subtitle}</p>

    <div class="flex flex-col sm:flex-row flex-wrap gap-4 justify-center mb-2">
      ${data.phone
        ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="inline-flex items-center justify-center gap-2.5 font-extrabold text-lg px-8 py-4 rounded-2xl transition-transform hover:scale-105" style="background: #ffffff; color: ${data.colors.primary}; text-decoration: none; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">${phoneIcon()} ${data.phone}</a>`
        : ''
      }
      ${data.ctaLink || data.bookingUrl
        ? `<a href="${data.ctaLink || data.bookingUrl}" class="inline-flex items-center justify-center gap-2.5 font-bold text-lg px-8 py-4 rounded-2xl transition-transform hover:scale-105" style="background: ${data.colors.primary}; color: #ffffff; text-decoration: none; box-shadow: 0 10px 30px ${data.colors.primary}60;">${data.ctaText || 'Get Free Estimate'} →</a>`
        : ''
      }
    </div>

    ${statsBar}
  </div>
</section>`;
}

export default gradientOverlayHero;
