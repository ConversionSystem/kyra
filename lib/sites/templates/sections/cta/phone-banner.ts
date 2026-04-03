interface CtaData {
  heading?: string;
  subtitle?: string;
  phone?: string;
  phoneHref?: string;
  bookingUrl?: string;
  businessName?: string;
  emergencyText?: string;
  clientId?: string;
  colors: { primary: string; secondary: string };
  designStyle?: string;
}

export function phoneBannerCta(data: CtaData): string {
  const isDark = data.designStyle === 'modern-dark';
  if (isDark) return modernDarkCta(data);
  return lightCta(data);
}

function modernDarkCta(data: CtaData): string {
  const heading = data.heading || 'Ready to Get Started?';
  const phone = data.phone || '';
  const phoneHref = data.phoneHref || `tel:${phone}`;
  const { primary } = data.colors;
  const urgencyText = data.emergencyText || 'Call or Text — We Respond Fast';

  return `<section id="contact" style="background: linear-gradient(135deg, #dc2626, #991b1b); position: relative; overflow: hidden; padding: 5rem 1.5rem;" aria-label="Call to action">
  <!-- Subtle pattern -->
  <div style="position: absolute; inset: 0; opacity: 0.06; background-image: linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px); background-size: 40px 40px;" aria-hidden="true"></div>
  <!-- Radial glow -->
  <div style="position: absolute; top: -50%; left: 50%; transform: translateX(-50%); width: 800px; height: 800px; background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%); pointer-events: none;" aria-hidden="true"></div>

  <div style="max-width: 900px; margin: 0 auto; text-align: center; position: relative; z-index: 1;">
    <!-- Urgency badge -->
    <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); color: white; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 18px; border-radius: 100px; margin-bottom: 1.5rem; backdrop-filter: blur(8px);">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"></polyline></svg>
      ${urgencyText}
    </div>

    <h2 style="font-size: clamp(1.8rem, 4vw, 3rem); font-weight: 900; color: #ffffff; margin: 0 0 1rem 0; letter-spacing: -0.02em;">${heading}</h2>
    ${data.subtitle ? `<p style="font-size: 1.1rem; color: rgba(255,255,255,0.9); margin: 0 0 2rem 0; max-width: 500px; margin-left: auto; margin-right: auto; line-height: 1.6;">${data.subtitle}</p>` : '<div style="margin-bottom: 2rem;"></div>'}

    ${phone ? `<a href="${phoneHref}" style="display: inline-flex; align-items: center; justify-content: center; gap: 12px; background: #ffffff; color: #111827; font-weight: 900; font-size: clamp(1.4rem, 3vw, 2rem); padding: 18px 40px; border-radius: 16px; text-decoration: none; box-shadow: 0 10px 40px rgba(0,0,0,0.2); margin-bottom: 1.5rem; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'" aria-label="Call ${phone}">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        ${phone}
      </a>` : ''}

    ${data.bookingUrl ? `<div style="margin-top: 0.5rem;">
      <a href="${data.bookingUrl}" style="display: inline-flex; align-items: center; gap: 8px; border: 2px solid rgba(255,255,255,0.5); color: #ffffff; font-weight: 700; font-size: 1rem; padding: 12px 28px; border-radius: 12px; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='transparent'">
        Or Book Online →
      </a>
    </div>` : ''}

    <!-- Trust row -->
    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem; margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.2);">
      <div style="display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.9); font-size: 0.88rem; font-weight: 600;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Licensed &amp; Insured
      </div>
      <div style="display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.9); font-size: 0.88rem; font-weight: 600;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Satisfaction Guaranteed
      </div>
      <div style="display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.9); font-size: 0.88rem; font-weight: 600;">
        <svg width="16" height="16" fill="#fbbf24" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>
        5-Star Rated
      </div>
      <div style="display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.9); font-size: 0.88rem; font-weight: 600;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"></polyline></svg>
        Fast Response Time
      </div>
    </div>
  </div>
</section>`;
}

function lightCta(data: CtaData): string {
  const heading = data.heading || 'Ready to Get Started?';
  const phone = data.phone || '';
  const phoneHref = data.phoneHref || `tel:${phone}`;
  const { primary, secondary } = data.colors;
  const urgencyText = data.emergencyText || 'Call or Text — We Respond Fast';

  return `<section id="contact" style="background: linear-gradient(130deg, ${secondary} 0%, ${primary} 45%, ${primary}dd 100%); position: relative; overflow: hidden; padding: 4.5rem 1.5rem;" aria-label="Call to action">
  <div style="position: absolute; inset: 0; background: radial-gradient(ellipse 80% 80% at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%);" aria-hidden="true"></div>
  <div style="position: absolute; inset: 0; opacity: 0.06; background-image: linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px); background-size: 40px 40px;" aria-hidden="true"></div>

  <div style="max-width: 900px; margin: 0 auto; text-align: center; position: relative; z-index: 1;">
    <div style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: white; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 6px 18px; border-radius: 100px; margin-bottom: 1.5rem; backdrop-filter: blur(8px);">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"></polyline></svg>
      ${urgencyText}
    </div>

    <h2 style="font-size: clamp(1.8rem, 4vw, 3rem); font-weight: 900; color: #ffffff; margin: 0 0 1rem 0; letter-spacing: -0.02em;">${heading}</h2>
    ${data.subtitle ? `<p style="font-size: 1.1rem; color: rgba(255,255,255,0.85); margin: 0 0 2rem 0; max-width: 500px; margin-left: auto; margin-right: auto; line-height: 1.6;">${data.subtitle}</p>` : '<div style="margin-bottom: 2rem;"></div>'}

    ${phone ? `<a href="${phoneHref}" style="display: inline-flex; align-items: center; justify-content: center; gap: 12px; background: #ffffff; color: ${primary}; font-weight: 900; font-size: clamp(1.4rem, 3vw, 2rem); padding: 18px 40px; border-radius: 16px; text-decoration: none; box-shadow: 0 10px 40px rgba(0,0,0,0.25); margin-bottom: 1.5rem; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'" aria-label="Call ${phone}">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        ${phone}
      </a>` : ''}

    ${data.bookingUrl ? `<div style="margin-top: 0.5rem;">
      <a href="${data.bookingUrl}" style="display: inline-flex; align-items: center; gap: 8px; border: 2px solid rgba(255,255,255,0.6); color: #ffffff; font-weight: 700; font-size: 1rem; padding: 12px 28px; border-radius: 12px; text-decoration: none; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='transparent'">
        Or Book Online →
      </a>
    </div>` : ''}

    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 2rem; margin-top: 2.5rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.2);">
      <div style="display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.85); font-size: 0.88rem; font-weight: 600;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        Licensed &amp; Insured
      </div>
      <div style="display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.85); font-size: 0.88rem; font-weight: 600;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Satisfaction Guaranteed
      </div>
      <div style="display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.85); font-size: 0.88rem; font-weight: 600;">
        <svg width="16" height="16" fill="#fbbf24" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>
        5-Star Rated
      </div>
      <div style="display: flex; align-items: center; gap: 6px; color: rgba(255,255,255,0.85); font-size: 0.88rem; font-weight: 600;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"></polyline></svg>
        Fast Response Time
      </div>
    </div>
  </div>
</section>`;
}

export default phoneBannerCta;
