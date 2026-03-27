interface CtaData {
  heading?: string;
  subtitle?: string;
  phone?: string;
  phoneHref?: string;
  bookingUrl?: string;
  businessName?: string;
  emergencyText?: string;
  colors: { primary: string; secondary: string };
}

export function floatingBarCta(data: CtaData): string {
  const phone = data.phone || '';
  const phoneHref = data.phoneHref || `tel:${phone}`;
  const { primary } = data.colors;
  const businessLabel = data.businessName || 'We\'re Here';

  return `<div id="kyra-floating-bar" style="position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; background: ${primary}; box-shadow: 0 -4px 24px rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.15);" role="complementary" aria-label="Quick contact bar">
  <div style="max-width: 1100px; margin: 0 auto; padding: 12px 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
    <!-- Left: business status -->
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="width: 10px; height: 10px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 8px #4ade80; flex-shrink: 0; animation: pulse-green 2s infinite;"></div>
      <span style="color: rgba(255,255,255,0.92); font-size: 0.88rem; font-weight: 600;">${businessLabel} — Available Now</span>
    </div>
    <!-- Center: CTAs -->
    <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
      ${phone ? `<a href="${phoneHref}" style="display: inline-flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.18); border: 1.5px solid rgba(255,255,255,0.4); color: #ffffff; font-weight: 800; font-size: 1.05rem; padding: 8px 20px; border-radius: 100px; text-decoration: none; transition: background 0.2s; white-space: nowrap;" onmouseover="this.style.background='rgba(255,255,255,0.28)'" onmouseout="this.style.background='rgba(255,255,255,0.18)'" aria-label="Call ${phone}">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          ${phone}
        </a>` : ''}
      ${data.bookingUrl ? `<a href="${data.bookingUrl}" style="display: inline-flex; align-items: center; gap: 6px; background: #ffffff; color: ${primary}; font-weight: 800; font-size: 0.95rem; padding: 8px 20px; border-radius: 100px; text-decoration: none; transition: opacity 0.2s; white-space: nowrap; box-shadow: 0 2px 10px rgba(0,0,0,0.15);" onmouseover="this.style.opacity='0.88'" onmouseout="this.style.opacity='1'">
          Book Now →
        </a>` : ''}
    </div>
    <!-- Right: dismiss -->
    <button onclick="document.getElementById('kyra-floating-bar').style.display='none'" style="background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; padding: 4px 8px; font-size: 1.4rem; line-height: 1; transition: color 0.2s; flex-shrink: 0;" onmouseover="this.style.color='white'" onmouseout="this.style.color='rgba(255,255,255,0.6)'" aria-label="Dismiss">✕</button>
  </div>
  <style>
    @keyframes pulse-green {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.3); }
    }
  </style>
</div>`;
}

export default floatingBarCta;
