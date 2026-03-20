interface CtaData {
  heading?: string;
  subtitle?: string;
  phone?: string;
  phoneHref?: string;
  bookingUrl?: string;
  businessName?: string;
  emergencyText?: string;
}

export function formEmbedCta(data: CtaData): string {
  const heading = data.heading || 'Get in Touch';
  const inputClasses = 'w-full px-4 py-3 rounded-lg text-base outline-none transition-colors';

  return `<section class="py-16 px-4" style="background: var(--color-surface);" aria-label="Contact form">
  <div class="max-w-xl mx-auto">
    <h2 class="text-3xl font-bold text-center mb-3" style="color: var(--color-text);">${heading}</h2>
    ${data.subtitle ? `<p class="text-center text-lg mb-8" style="color: var(--color-text-muted);">${data.subtitle}</p>` : '<div class="mb-8"></div>'}
    <form action="#" method="POST" class="space-y-4">
      <div>
        <label for="contact-name" class="block text-sm font-medium mb-1" style="color: var(--color-text);">Name</label>
        <input type="text" id="contact-name" name="name" required class="${inputClasses}" style="background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text);" placeholder="Your name" />
      </div>
      <div>
        <label for="contact-email" class="block text-sm font-medium mb-1" style="color: var(--color-text);">Email</label>
        <input type="email" id="contact-email" name="email" required class="${inputClasses}" style="background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text);" placeholder="your@email.com" />
      </div>
      <div>
        <label for="contact-phone" class="block text-sm font-medium mb-1" style="color: var(--color-text);">Phone</label>
        <input type="tel" id="contact-phone" name="phone" class="${inputClasses}" style="background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text);" placeholder="(555) 123-4567" />
      </div>
      <div>
        <label for="contact-message" class="block text-sm font-medium mb-1" style="color: var(--color-text);">Message</label>
        <textarea id="contact-message" name="message" rows="4" required class="${inputClasses} resize-y" style="background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text);" placeholder="How can we help?"></textarea>
      </div>
      <button type="submit" class="w-full py-3 rounded-lg text-lg font-semibold transition-opacity hover:opacity-90" style="background: var(--color-primary); color: var(--color-surface);">Send Message</button>
    </form>
  </div>
</section>`;
}

export default formEmbedCta;
