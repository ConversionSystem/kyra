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

export function formEmbedCta(data: CtaData): string {
  const heading = data.heading || 'Get in Touch';
  const phone = data.phone || '';
  const phoneHref = data.phoneHref || `tel:${phone}`;
  const inputClasses = 'w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all focus:ring-2';

  return `<section class="py-16 sm:py-24 px-4" style="background: var(--color-surface);" aria-label="Contact form">
  <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-2xl">
    <div class="p-10 sm:p-14 flex flex-col justify-center" style="background: linear-gradient(135deg, ${data.colors.primary}, ${data.colors.secondary});">
      <h2 class="text-3xl sm:text-4xl font-bold mb-4" style="color: #ffffff;">${heading}</h2>
      ${data.subtitle ? `<p class="text-lg mb-6" style="color: #ffffff; opacity: 0.9;">${data.subtitle}</p>` : ''}
      ${phone ? `<p class="text-lg mb-2" style="color: #ffffff;">Call us: <a href="${phoneHref}" class="font-semibold underline transition-opacity hover:opacity-80" style="color: #ffffff;">${phone}</a></p>` : ''}
      ${data.emergencyText ? `<p class="mt-6 text-sm font-medium" style="color: #ffffff; opacity: 0.85;">${data.emergencyText}</p>` : ''}
    </div>
    <div class="p-10 sm:p-14" style="background: var(--color-surface);">
      <h3 class="text-xl font-semibold mb-6" style="color: #1f2937;">Send Us a Message</h3>
      <form action="#" method="POST" class="space-y-4">
        <div>
          <label for="contact-name" class="block text-sm font-medium mb-1" style="color: #1f2937;">Name</label>
          <input type="text" id="contact-name" name="name" required class="${inputClasses}" style="background: var(--color-surface); border: 2px solid #e5e7eb; color: #1f2937;" placeholder="Your name" />
        </div>
        <div>
          <label for="contact-email" class="block text-sm font-medium mb-1" style="color: #1f2937;">Email</label>
          <input type="email" id="contact-email" name="email" required class="${inputClasses}" style="background: var(--color-surface); border: 2px solid #e5e7eb; color: #1f2937;" placeholder="your@email.com" />
        </div>
        <div>
          <label for="contact-phone" class="block text-sm font-medium mb-1" style="color: #1f2937;">Phone</label>
          <input type="tel" id="contact-phone" name="phone" class="${inputClasses}" style="background: var(--color-surface); border: 2px solid #e5e7eb; color: #1f2937;" placeholder="(555) 123-4567" />
        </div>
        <div>
          <label for="contact-message" class="block text-sm font-medium mb-1" style="color: #1f2937;">Message</label>
          <textarea id="contact-message" name="message" rows="4" required class="${inputClasses} resize-y" style="background: var(--color-surface); border: 2px solid #e5e7eb; color: #1f2937;" placeholder="How can we help?"></textarea>
        </div>
        <button type="submit" class="w-full py-3.5 rounded-xl text-lg font-semibold shadow-lg transition-all hover:shadow-xl hover:opacity-90" style="background: ${data.colors.primary}; color: #ffffff;">Send Message</button>
      </form>
    </div>
  </div>
</section>`;
}

export default formEmbedCta;
