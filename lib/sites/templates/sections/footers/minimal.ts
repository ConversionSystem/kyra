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

export function minimalFooter(data: FooterData): string {
  const phone = data.phone
    ? `<span class="mx-2" style="color: #374151;">|</span><a href="${data.phoneHref || `tel:${data.phone}`}" class="hover:opacity-80" style="color: ${data.colors.primary};">${data.phone}</a>`
    : '';

  const email = data.email
    ? `<span class="mx-2" style="color: #374151;">|</span><a href="mailto:${data.email}" class="hover:opacity-80" style="color: ${data.colors.primary};">${data.email}</a>`
    : '';

  return `<footer class="py-6 px-4 sm:px-6" style="background: #111827;" aria-label="${data.businessName} footer">
  <div class="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-y-2 text-sm" style="color: #9ca3af;">
    <span>&copy; ${new Date().getFullYear()} ${data.businessName}</span>
    ${phone}
    ${email}
  </div>
</footer>`;
}

export default minimalFooter;
