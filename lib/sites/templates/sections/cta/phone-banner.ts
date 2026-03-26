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

export function phoneBannerCta(data: CtaData): string {
  const heading = data.heading || 'Ready to Get Started?';
  const phone = data.phone || '';
  const phoneHref = data.phoneHref || `tel:${phone}`;

  return `<style>
@keyframes phoneGlow {
  0%, 100% { text-shadow: 0 0 10px rgba(255,255,255,0.3); }
  50% { text-shadow: 0 0 25px rgba(255,255,255,0.6), 0 0 50px rgba(255,255,255,0.2); }
}
</style>
<section class="py-16 sm:py-24 px-4" style="background: linear-gradient(135deg, ${data.colors.primary}, ${data.colors.secondary});" aria-label="Call to action">
  <div class="max-w-4xl mx-auto text-center">
    <h2 class="text-3xl sm:text-4xl font-bold mb-4" style="color: #ffffff;">${heading}</h2>
    ${data.subtitle ? `<p class="text-lg mb-8" style="color: #ffffff; opacity: 0.9;">${data.subtitle}</p>` : ''}
    ${phone ? `<a href="${phoneHref}" class="inline-block text-3xl sm:text-4xl font-extrabold mb-6 transition-opacity hover:opacity-80" style="color: #ffffff; animation: phoneGlow 2s ease-in-out infinite;" aria-label="Call ${phone}">${phone}</a>` : ''}
    ${data.bookingUrl ? `<div class="mt-4"><a href="${data.bookingUrl}" class="inline-flex items-center justify-center px-8 py-3 rounded-lg text-lg font-semibold transition-opacity hover:opacity-90" style="background: var(--color-surface); color: ${data.colors.primary};">Book Online</a></div>` : ''}
    ${data.emergencyText ? `<p class="mt-8 text-sm font-medium" style="color: #ffffff; opacity: 0.85;">${data.emergencyText}</p>` : ''}
  </div>
</section>`;
}

export default phoneBannerCta;
