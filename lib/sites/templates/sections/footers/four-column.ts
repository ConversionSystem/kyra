interface FooterData {
  businessName: string;
  phone?: string;
  phoneHref?: string;
  email?: string;
  address?: string;
  hours?: Record<string, string>;
  services?: Array<{ name: string; slug: string }>;
  cities?: Array<{ name: string; slug: string }>;
  bookingUrl?: string;
}

export function fourColumnFooter(data: FooterData): string {
  const serviceLinks = (data.services || [])
    .map(s => `<li><a href="#${s.slug}" class="hover:underline" style="color: var(--color-text-muted);">${s.name}</a></li>`)
    .join('\n          ');

  const cityLinks = (data.cities || [])
    .map(c => `<li><a href="#${c.slug}" class="hover:underline" style="color: var(--color-text-muted);">${c.name}</a></li>`)
    .join('\n          ');

  const phone = data.phone
    ? `<p><a href="${data.phoneHref || `tel:${data.phone}`}" class="hover:underline" style="color: var(--color-accent);">${data.phone}</a></p>`
    : '';

  const email = data.email
    ? `<p><a href="mailto:${data.email}" class="hover:underline" style="color: var(--color-accent);">${data.email}</a></p>`
    : '';

  const address = data.address
    ? `<p style="color: var(--color-text-muted);">${data.address}</p>`
    : '';

  const bookingCta = data.bookingUrl
    ? `<a href="${data.bookingUrl}" class="inline-block mt-3 px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90" style="background: var(--color-accent); color: var(--color-surface);">Book Now</a>`
    : '';

  return `<footer class="py-12 sm:py-16 px-4 sm:px-6" style="background: var(--color-primary); color: var(--color-text-muted);" aria-label="${data.businessName} footer">
  <div class="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
    <div>
      <h3 class="text-xl font-bold mb-4" style="color: var(--color-surface);">${data.businessName}</h3>
      <p class="text-sm leading-relaxed" style="color: var(--color-text-muted);">Proudly serving our community with quality and care.</p>
      ${bookingCta}
    </div>
    <div>
      <h4 class="font-semibold mb-4" style="color: var(--color-surface);">Services</h4>
      <ul class="space-y-2 text-sm">
        ${serviceLinks || '<li style="color: var(--color-text-muted);">Coming soon</li>'}
      </ul>
    </div>
    <div>
      <h4 class="font-semibold mb-4" style="color: var(--color-surface);">Service Areas</h4>
      <ul class="space-y-2 text-sm">
        ${cityLinks || '<li style="color: var(--color-text-muted);">Coming soon</li>'}
      </ul>
    </div>
    <div>
      <h4 class="font-semibold mb-4" style="color: var(--color-surface);">Contact</h4>
      <div class="space-y-2 text-sm">
        ${phone}
        ${email}
        ${address}
      </div>
    </div>
  </div>
  <div class="max-w-6xl mx-auto mt-10 pt-6 text-center text-sm" style="border-top: 1px solid var(--color-border); color: var(--color-text-muted);">
    &copy; 2026 ${data.businessName}. All rights reserved.
  </div>
</footer>`;
}

export default fourColumnFooter;
