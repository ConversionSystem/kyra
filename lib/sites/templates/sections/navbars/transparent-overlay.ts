interface NavbarData {
  businessName: string;
  logoUrl?: string;
  phone?: string;
  phoneHref?: string;
  bookingUrl?: string;
  links?: Array<{ label: string; href: string }>;
  colors: { primary: string; secondary: string };
}

export function transparentOverlayNavbar(data: NavbarData): string {
  const logo = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="${data.businessName}" class="h-8 w-auto">`
    : `<span class="text-xl font-bold" style="color: #ffffff;">${data.businessName}</span>`;

  const navLinks = (data.links || [])
    .map(l => `<a href="${l.href}" class="text-sm font-medium transition-opacity hover:opacity-75" style="color: rgba(255,255,255,0.9);">${l.label}</a>`)
    .join('\n      ');

  const cta = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90" style="background: var(--color-surface); color: #1f2937;">${data.phone}</a>`
    : '';

  return `<nav class="absolute top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4" aria-label="Main navigation">
  <div class="max-w-6xl mx-auto flex items-center justify-between">
    <a href="/" class="shrink-0">${logo}</a>
    <div class="hidden md:flex items-center gap-6">
      ${navLinks}
    </div>
    <div class="flex items-center gap-3">
      ${cta}
    </div>
  </div>
</nav>`;
}

export default transparentOverlayNavbar;
