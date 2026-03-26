interface NavbarData {
  businessName: string;
  logoUrl?: string;
  phone?: string;
  phoneHref?: string;
  bookingUrl?: string;
  links?: Array<{ label: string; href: string }>;
  colors: { primary: string; secondary: string };
}

export function stickyWhiteNavbar(data: NavbarData): string {
  const logo = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="${data.businessName}" class="h-8 w-auto">`
    : `<span class="text-xl font-bold" style="color: ${data.colors.primary};">${data.businessName}</span>`;

  const navLinks = (data.links || [])
    .map(l => `<a href="${l.href}" class="text-sm font-medium transition-opacity hover:opacity-75" style="color: #1f2937;">${l.label}</a>`)
    .join('\n      ');

  const phoneCta = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90" style="background: ${data.colors.primary}; color: #ffffff;">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/></svg>
        ${data.phone}
      </a>`
    : '';

  return `<nav class="sticky top-0 z-50 shadow-sm px-4 sm:px-6 py-3" style="background: var(--color-surface);" aria-label="Main navigation">
  <div class="max-w-6xl mx-auto flex items-center justify-between">
    <a href="/" class="shrink-0">${logo}</a>
    <div class="hidden md:flex items-center gap-6">
      ${navLinks}
    </div>
    <div class="flex items-center gap-3">
      ${phoneCta}
    </div>
  </div>
</nav>`;
}

export default stickyWhiteNavbar;
