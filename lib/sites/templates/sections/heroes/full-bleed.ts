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
  designStyle?: string;
}

function phoneIcon(size = 22): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
}

function calendarIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
}

export function fullBleedHero(data: HeroData): string {
  const isDark = data.designStyle === 'modern-dark';
  if (isDark) return modernDarkHero(data);
  return lightHero(data);
}

function modernDarkHero(data: HeroData): string {
  const { primary } = data.colors;

  const trustBadges = `<div style="display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1.5rem;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <svg width="16" height="16" fill="#fbbf24" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>
        <span style="color: #d1d5db; font-size: 0.875rem;"><strong style="color: #ffffff;">5.0</strong> Google Rating</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${primary}" stroke-width="2"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"></path><circle cx="12" cy="8" r="6"></circle></svg>
        <span style="color: #d1d5db; font-size: 0.875rem;">36+ Years Experience</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path></svg>
        <span style="color: #d1d5db; font-size: 0.875rem;">Same-Day Service</span>
      </div>
    </div>`;

  const inputStyle = `background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px 16px; color: #ffffff; font-size: 0.9rem; outline: none; transition: border-color 0.2s; width: 100%; box-sizing: border-box;`;
  const focusHandler = `onfocus="this.style.borderColor='${primary}'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'"`;  

  const quoteForm = `<div id="quote" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.25rem; padding: 2rem; backdrop-filter: blur(16px);">
      <h3 style="color: #ffffff; font-size: 1.25rem; font-weight: 800; margin: 0 0 0.25rem 0;">Get a Free Quote</h3>
      <p style="color: #94a3b8; font-size: 0.85rem; margin: 0 0 1.5rem 0;">We'll respond within 1 hour during business hours</p>
      <form style="display: flex; flex-direction: column; gap: 0.75rem;" onsubmit="return false;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
          <input type="text" placeholder="Your Name *" required style="${inputStyle}" ${focusHandler}>
          <input type="tel" placeholder="Phone Number *" required style="${inputStyle}" ${focusHandler}>
        </div>
        <input type="email" placeholder="Email Address" style="${inputStyle}" ${focusHandler}>
        <select style="${inputStyle} color: #94a3b8; appearance: none; cursor: pointer;" ${focusHandler}>
          <option value="" selected>Select Service Needed</option>
          <option value="ac-repair">AC Repair</option>
          <option value="heating">Heating Repair</option>
          <option value="refrigeration">Refrigeration</option>
          <option value="installation">New Installation</option>
          <option value="maintenance">Maintenance</option>
          <option value="emergency">Emergency Service</option>
        </select>
        <textarea placeholder="Describe your issue..." rows="3" style="${inputStyle} resize: none; font-family: inherit;" ${focusHandler}></textarea>
        <button type="submit" style="width: 100%; background: ${primary}; color: #ffffff; font-weight: 700; font-size: 1rem; padding: 14px 24px; border: none; border-radius: 10px; cursor: pointer; transition: all 0.2s; box-shadow: 0 8px 25px rgba(220,38,38,0.3);" onmouseover="this.style.opacity='0.9';this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1';this.style.transform='translateY(0)'">
          Request Free Quote
        </button>
        <p style="color: #64748b; font-size: 0.75rem; text-align: center; margin: 0;">No spam, no obligation. We respect your privacy.</p>
      </form>
    </div>`;

  return `<section class="relative overflow-hidden" style="background: linear-gradient(135deg, #111827 0%, #000000 50%, #111827 100%); min-height: 90vh; display: flex; align-items: center;" aria-label="${data.businessName || ''} hero">
  <!-- Red radial accent -->
  <div style="position: absolute; top: -20%; right: -10%; width: 600px; height: 600px; background: radial-gradient(circle, ${primary}20 0%, transparent 70%); pointer-events: none;" aria-hidden="true"></div>
  <div style="position: absolute; bottom: -30%; left: -10%; width: 500px; height: 500px; background: radial-gradient(circle, ${primary}10 0%, transparent 70%); pointer-events: none;" aria-hidden="true"></div>

  <div style="max-width: 1200px; margin: 0 auto; padding: 4rem 1.5rem; width: 100%; position: relative; z-index: 1;">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; align-items: center;">
      <!-- Left: Content -->
      <div>
        ${data.emergencyText ? `<div style="display: inline-flex; align-items: center; gap: 8px; color: ${primary}; font-size: 0.875rem; font-weight: 500; margin-bottom: 1rem;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${primary}" stroke-width="2"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>
          <span style="color: ${primary};">${data.emergencyText}</span>
        </div>` : ''}
        <h1 style="font-size: clamp(2.5rem, 5vw, 4.5rem); font-weight: 900; color: #ffffff; line-height: 1.08; letter-spacing: -0.03em; margin: 0 0 1.25rem 0;">${data.h1}</h1>
        <p style="font-size: clamp(1rem, 1.8vw, 1.2rem); color: #94a3b8; line-height: 1.7; margin: 0 0 2rem 0; max-width: 500px;">${data.subtitle}</p>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; max-width: 380px;">
          ${data.phone ? `<a href="${data.phoneHref || `tel:${data.phone}`}" style="display: inline-flex; align-items: center; justify-content: center; gap: 10px; font-weight: 700; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-size: 1.1rem; background: ${primary}; color: #ffffff; box-shadow: 0 8px 20px rgba(220,38,38,0.25); transition: all 0.2s;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 12px 25px rgba(220,38,38,0.35)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 8px 20px rgba(220,38,38,0.25)'">${phoneIcon(20)} Call Now - ${data.phone}</a>` : ''}
          <a href="${data.ctaLink || data.bookingUrl || '#quote'}" style="display: inline-flex; align-items: center; justify-content: center; gap: 10px; border: 1px solid rgba(255,255,255,0.2); color: #ffffff; font-weight: 600; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-size: 1.05rem; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">Get Free Quote <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg></a>
        </div>
        ${trustBadges}
      </div>
      <!-- Right: Quote Form -->
      <div>
        ${quoteForm}
      </div>
    </div>
  </div>
  <style>
    @media (max-width: 768px) {
      section[aria-label*="hero"] > div > div { grid-template-columns: 1fr !important; }
    }
  </style>
</section>`;
}

function lightHero(data: HeroData): string {
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
