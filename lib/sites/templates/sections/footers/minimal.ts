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

export function minimalFooter(data: FooterData): string {
  const phone = data.phone
    ? `<span class="mx-2" style="color: var(--color-border);">|</span><a href="${data.phoneHref || `tel:${data.phone}`}" class="hover:underline" style="color: var(--color-text-muted);">${data.phone}</a>`
    : '';

  const email = data.email
    ? `<span class="mx-2" style="color: var(--color-border);">|</span><a href="mailto:${data.email}" class="hover:underline" style="color: var(--color-text-muted);">${data.email}</a>`
    : '';

  return `<footer class="py-6 px-4 sm:px-6" style="background: var(--color-surface); border-top: 1px solid var(--color-border);" aria-label="${data.businessName} footer">
  <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-y-2 text-sm" style="color: var(--color-text-muted);">
    <span>&copy; 2026 ${data.businessName}</span>
    ${phone}
    ${email}
  </div>
</footer>`;
}

export default minimalFooter;
