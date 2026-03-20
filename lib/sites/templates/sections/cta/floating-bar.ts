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

  const phoneCta = phone
    ? `<a href="${phoneHref}" class="inline-flex items-center justify-center px-5 py-2 rounded-lg font-bold text-sm transition-opacity hover:opacity-90" style="color: #ffffff;" aria-label="Call ${phone}">Call ${phone}</a>`
    : '';

  const bookingCta = data.bookingUrl
    ? `<a href="${data.bookingUrl}" class="inline-flex items-center justify-center px-5 py-2 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90" style="background: #ffffff; color: ${data.colors.primary};">Book Now</a>`
    : '';

  return `<div class="fixed bottom-0 left-0 right-0 z-50 py-3 px-4 shadow-2xl" style="background: ${data.colors.primary};" role="complementary" aria-label="Quick contact bar">
  <div class="max-w-4xl mx-auto flex items-center justify-center gap-4 flex-wrap">
    ${data.heading ? `<span class="font-semibold text-sm hidden sm:inline" style="color: #ffffff;">${data.heading}</span>` : ''}
    ${phoneCta}
    ${bookingCta}
  </div>
</div>`;
}

export default floatingBarCta;
