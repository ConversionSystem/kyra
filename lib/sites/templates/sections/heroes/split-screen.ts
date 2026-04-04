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

export function splitScreenHero(data: HeroData): string {
  const rightContent = data.photoUrl
    ? `<img src="${data.photoUrl}" alt="${data.businessName || 'Our Work'}" style="width: 100%; height: 100%; object-fit: cover; object-position: center;" />`
    : `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, ${data.colors.primary}20 0%, ${data.colors.primary}40 50%, ${data.colors.secondary}30 100%); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
        <!-- Abstract geometric pattern -->
        <div style="position: absolute; inset: 0; opacity: 0.6; background-image: radial-gradient(circle at 25% 25%, ${data.colors.primary}50 0%, transparent 50%), radial-gradient(circle at 75% 75%, ${data.colors.secondary}40 0%, transparent 50%);"></div>
        <div style="position: relative; z-index: 1; text-align: center; padding: 3rem;">
          <div style="width: 120px; height: 120px; border-radius: 50%; background: ${data.colors.primary}; margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 20px 60px ${data.colors.primary}60;">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>
          <p style="color: white; font-weight: 700; font-size: 1.5rem; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">${data.businessName || 'Local Experts'}</p>
          <p style="color: rgba(255,255,255,0.75); font-size: 0.95rem; margin-top: 0.5rem;">Quality You Can Trust</p>
        </div>
      </div>`;

  const accentLine = `<div style="width: 60px; height: 5px; background: #ffffff; border-radius: 3px; margin-bottom: 1.5rem; opacity: 0.8;"></div>`;

  return `<section class="min-h-[88vh] grid grid-cols-1 lg:grid-cols-2" aria-label="${data.businessName || ''} hero">
  <!-- Left: Text panel -->
  <div style="background: linear-gradient(145deg, ${data.colors.secondary} 0%, ${data.colors.primary} 60%, ${data.colors.primary}cc 100%); display: flex; align-items: center; padding: 4rem 1.5rem; position: relative; overflow: hidden;" class="lg:p-16">
    <!-- Background texture -->
    <div style="position: absolute; inset: 0; opacity: 0.08; background-image: radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px); background-size: 30px 30px;" aria-hidden="true"></div>
    <!-- Glow effect -->
    <div style="position: absolute; bottom: -20%; right: -20%; width: 500px; height: 500px; border-radius: 50%; background: rgba(255,255,255,0.06); filter: blur(60px);" aria-hidden="true"></div>

    <div style="position: relative; z-index: 1; max-width: 560px;">
      ${data.emergencyText
        ? `<div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35); color: white; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 16px; border-radius: 100px; margin-bottom: 1.5rem; backdrop-filter: blur(8px);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ${data.emergencyText}
          </div>`
        : ''
      }
      ${accentLine}
      <h1 style="font-size: clamp(2.4rem, 5vw, 4.2rem); font-weight: 900; color: #ffffff; line-height: 1.08; letter-spacing: -0.03em; margin: 0 0 1.5rem 0; text-shadow: 0 2px 20px rgba(0,0,0,0.2);">${data.h1}</h1>
      <p style="font-size: 1.15rem; color: rgba(255,255,255,0.88); line-height: 1.65; margin: 0 0 2.5rem 0;">${data.subtitle}</p>

      <div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 2.5rem;">
        ${data.phone
          ? `<a href="${data.phoneHref || `tel:${data.phone}`}" style="display: inline-flex; align-items: center; gap: 10px; background: #ffffff; color: ${data.colors.primary}; font-weight: 800; font-size: 1.05rem; padding: 14px 28px; border-radius: 12px; text-decoration: none; box-shadow: 0 10px 30px rgba(0,0,0,0.25); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">${phoneIcon()} ${data.phone}</a>`
          : ''
        }
        ${data.ctaLink || data.bookingUrl
          ? `<a href="${data.ctaLink || data.bookingUrl}" style="display: inline-flex; align-items: center; gap: 10px; border: 2px solid rgba(255,255,255,0.7); color: #ffffff; font-weight: 700; font-size: 1.05rem; padding: 14px 28px; border-radius: 12px; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='transparent'">${data.ctaText || 'Book Free Consult'} →</a>`
          : ''
        }
      </div>

      <!-- Mini trust badges -->
      <div style="display: flex; flex-wrap: wrap; gap: 1.5rem;">
        <div style="display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.8); font-size: 0.85rem; font-weight: 600;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Licensed &amp; Insured
        </div>
        <div style="display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.8); font-size: 0.85rem; font-weight: 600;">
          <svg width="16" height="16" fill="#fbbf24" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>
          5-Star Rated
        </div>
        <div style="display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.8); font-size: 0.85rem; font-weight: 600;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Same Day Service
        </div>
      </div>
    </div>
  </div>

  <!-- Right: Visual panel -->
  <div style="position: relative; overflow: hidden;" class="min-h-64 lg:min-h-full">
    ${rightContent}
    <!-- Overlay gradient on right edge to blend -->
    <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 60px; background: linear-gradient(to right, ${data.colors.primary}60, transparent); pointer-events: none;" aria-hidden="true"></div>
  </div>
</section>`;
}

export default splitScreenHero;
