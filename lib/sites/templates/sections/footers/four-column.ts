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
  colors: { primary: string; secondary: string };
}

export function fourColumnFooter(data: FooterData): string {
  const serviceLinks = (data.services || [])
    .map(s => `<li><a href="#${s.slug}" class="hover:opacity-80" style="color: #9ca3af;">${s.name}</a></li>`)
    .join('\n          ');

  const cityLinks = (data.cities || [])
    .map(c => `<li><a href="#${c.slug}" class="hover:opacity-80" style="color: #9ca3af;">${c.name}</a></li>`)
    .join('\n          ');

  const phone = data.phone
    ? `<p><a href="${data.phoneHref || `tel:${data.phone}`}" class="hover:opacity-80" style="color: ${data.colors.primary};">${data.phone}</a></p>`
    : '';

  const email = data.email
    ? `<p><a href="mailto:${data.email}" class="hover:opacity-80" style="color: ${data.colors.primary};">${data.email}</a></p>`
    : '';

  const address = data.address
    ? `<p style="color: #9ca3af;">${data.address}</p>`
    : '';

  const hours = data.hours
    ? `<dl class="space-y-1 text-sm mt-3" style="color: #9ca3af;">
        ${Object.entries(data.hours).map(([day, time]) => `<div class="flex justify-between gap-4"><dt class="capitalize">${day}</dt><dd>${time}</dd></div>`).join('\n        ')}
      </dl>`
    : '';

  return `<footer class="py-12 sm:py-16 px-4 sm:px-6" style="background: #111827;" aria-label="${data.businessName} footer">
  <div class="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
    <div>
      <h3 class="text-xl font-bold mb-4" style="color: #ffffff;">${data.businessName}</h3>
      <p class="text-sm leading-relaxed" style="color: #9ca3af;">Proudly serving our community with quality and care.</p>
    </div>
    <div>
      <h4 class="font-semibold mb-4" style="color: #ffffff;">Services</h4>
      <ul class="space-y-2 text-sm">
        ${serviceLinks || '<li style="color: #9ca3af;">Coming soon</li>'}
      </ul>
    </div>
    <div>
      <h4 class="font-semibold mb-4" style="color: #ffffff;">Service Areas</h4>
      <ul class="space-y-2 text-sm">
        ${cityLinks || '<li style="color: #9ca3af;">Coming soon</li>'}
      </ul>
    </div>
    <div>
      <h4 class="font-semibold mb-4" style="color: #ffffff;">Contact</h4>
      <div class="space-y-2 text-sm">
        ${phone}
        ${email}
        ${address}
        ${hours}
      </div>
    </div>
  </div>
  <div class="max-w-6xl mx-auto mt-10 pt-6 text-center text-sm" style="border-top: 1px solid #374151; color: #9ca3af;">
    &copy; ${new Date().getFullYear()} ${data.businessName}. All rights reserved.
  </div>
</footer>`;
}

export default fourColumnFooter;
