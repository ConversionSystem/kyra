interface CtaData {
  heading?: string;
  subtitle?: string;
  phone?: string;
  phoneHref?: string;
  bookingUrl?: string;
  businessName?: string;
  emergencyText?: string;
}

export function splitOfferCta(data: CtaData): string {
  const heading = data.heading || 'Let\u2019s Work Together';
  const inputClasses = 'w-full px-4 py-3 rounded-lg text-base outline-none';

  return `<section class="py-16 px-4" style="background: var(--color-surface);" aria-label="Contact us">
  <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
    <div>
      <h2 class="text-3xl sm:text-4xl font-bold mb-4" style="color: var(--color-text);">${heading}</h2>
      ${data.subtitle ? `<p class="text-lg mb-6" style="color: var(--color-text-muted);">${data.subtitle}</p>` : ''}
      ${data.phone ? `<p class="text-lg mb-2" style="color: var(--color-text);">Call us: <a href="${data.phoneHref || `tel:${data.phone}`}" class="font-semibold transition-opacity hover:opacity-80" style="color: var(--color-primary);">${data.phone}</a></p>` : ''}
      ${data.bookingUrl ? `<a href="${data.bookingUrl}" class="inline-flex items-center justify-center px-6 py-3 mt-4 rounded-lg font-semibold transition-opacity hover:opacity-90" style="background: var(--color-primary); color: var(--color-surface);">Book Online</a>` : ''}
      ${data.emergencyText ? `<p class="mt-6 text-sm font-medium" style="color: var(--color-accent);">${data.emergencyText}</p>` : ''}
    </div>
    <div class="rounded-xl p-6 sm:p-8" style="background: var(--color-surface); border: 1px solid var(--color-border);">
      <h3 class="text-xl font-semibold mb-6" style="color: var(--color-text);">Send Us a Message</h3>
      <form action="#" method="POST" class="space-y-4">
        <input type="text" name="name" required placeholder="Your name" class="${inputClasses}" style="background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text);" />
        <input type="email" name="email" required placeholder="your@email.com" class="${inputClasses}" style="background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text);" />
        <input type="tel" name="phone" placeholder="(555) 123-4567" class="${inputClasses}" style="background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text);" />
        <textarea name="message" rows="3" required placeholder="How can we help?" class="${inputClasses} resize-y" style="background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text);"></textarea>
        <button type="submit" class="w-full py-3 rounded-lg text-lg font-semibold transition-opacity hover:opacity-90" style="background: var(--color-primary); color: var(--color-surface);">Send Message</button>
      </form>
    </div>
  </div>
</section>`;
}

export default splitOfferCta;
