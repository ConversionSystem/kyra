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

export function mapContactFooter(data: FooterData): string {
  const phone = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="flex items-center gap-2 hover:underline" style="color: var(--color-accent);">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/></svg>
        ${data.phone}
      </a>`
    : '';

  const email = data.email
    ? `<a href="mailto:${data.email}" class="flex items-center gap-2 hover:underline" style="color: var(--color-accent);">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
        ${data.email}
      </a>`
    : '';

  const address = data.address
    ? `<p class="flex items-start gap-2" style="color: var(--color-text-muted);">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
        ${data.address}
      </p>`
    : '';

  const hours = data.hours
    ? `<div class="mt-4">
        <h4 class="font-semibold mb-2" style="color: var(--color-accent);">Hours</h4>
        <dl class="space-y-1 text-sm" style="color: var(--color-text-muted);">
          ${Object.entries(data.hours).map(([day, time]) => `<div class="flex justify-between gap-4"><dt>${day}</dt><dd>${time}</dd></div>`).join('\n          ')}
        </dl>
      </div>`
    : '';

  const bookingCta = data.bookingUrl
    ? `<a href="${data.bookingUrl}" class="inline-block mt-4 px-6 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90" style="background: var(--color-primary); color: var(--color-surface);">Book Now</a>`
    : '';

  return `<footer class="py-12 sm:py-16 px-4 sm:px-6" style="background: var(--color-primary); color: var(--color-text-muted);" aria-label="${data.businessName} footer">
  <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div class="rounded-xl overflow-hidden min-h-[250px]" style="border: 1px solid var(--color-border);">
      <iframe src="#" width="100%" height="100%" style="border:0; min-height:250px;" allowfullscreen loading="lazy" title="Map location for ${data.businessName}"></iframe>
    </div>
    <div class="space-y-3">
      <h3 class="text-xl font-bold" style="color: var(--color-surface);">Contact</h3>
      ${phone}
      ${email}
      ${address}
      ${bookingCta}
    </div>
    <div>
      <h3 class="text-xl font-bold mb-3" style="color: var(--color-surface);">${data.businessName}</h3>
      ${hours}
    </div>
  </div>
  <div class="max-w-6xl mx-auto mt-10 pt-6 text-center text-sm" style="border-top: 1px solid var(--color-border); color: var(--color-text-muted);">
    &copy; 2026 ${data.businessName}. All rights reserved.
  </div>
</footer>`;
}

export default mapContactFooter;
