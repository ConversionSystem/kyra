interface NavbarData {
  businessName: string;
  logoUrl?: string;
  phone?: string;
  phoneHref?: string;
  bookingUrl?: string;
  links?: Array<{ label: string; href: string }>;
  colors: { primary: string; secondary: string };
}

export function hamburgerNavbar(data: NavbarData): string {
  const logo = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="${data.businessName}" class="h-8 w-auto">`
    : `<span class="text-xl font-bold" style="color: ${data.colors.primary};">${data.businessName}</span>`;

  const navLinks = (data.links || [])
    .map(l => `<a href="${l.href}" class="text-sm font-medium transition-opacity hover:opacity-75" style="color: #1f2937;">${l.label}</a>`)
    .join('\n        ');

  const mobileLinks = (data.links || [])
    .map(l => `<a href="${l.href}" class="block text-2xl font-semibold py-2 transition-opacity hover:opacity-75" style="color: #ffffff;">${l.label}</a>`)
    .join('\n          ');

  const phoneCta = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="inline-block mt-6 px-6 py-3 rounded-lg text-lg font-semibold" style="background: var(--color-surface); color: ${data.colors.primary};">${data.phone}</a>`
    : '';

  const desktopCta = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="hidden lg:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90" style="background: ${data.colors.primary}; color: #ffffff;">${data.phone}</a>`
    : '';

  const toggleId = 'nav-toggle';

  return `<style>
  #${toggleId} { display: none; }
  #${toggleId}:checked ~ .nav-overlay { opacity: 1; visibility: visible; }
  #${toggleId}:checked ~ .nav-bar .hamburger-line:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
  #${toggleId}:checked ~ .nav-bar .hamburger-line:nth-child(2) { opacity: 0; }
  #${toggleId}:checked ~ .nav-bar .hamburger-line:nth-child(3) { transform: rotate(-45deg) translate(7px, -6px); }
  .nav-overlay { opacity: 0; visibility: hidden; transition: opacity 0.3s, visibility 0.3s; }
  .hamburger-line { transition: transform 0.3s, opacity 0.3s; }
  @media (min-width: 1024px) { .nav-overlay { display: none !important; } }
</style>
<nav class="relative z-50" aria-label="Main navigation">
  <input type="checkbox" id="${toggleId}" class="sr-only" aria-hidden="true">
  <div class="nav-overlay fixed inset-0 z-40 flex flex-col items-center justify-center" style="background: ${data.colors.primary};">
    <div class="text-center">
      ${mobileLinks}
      ${phoneCta}
    </div>
  </div>
  <div class="nav-bar sticky top-0 z-50 px-4 sm:px-6 py-3" style="background: var(--color-surface); border-bottom: 1px solid #e5e7eb;">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <a href="#top" class="shrink-0">${logo}</a>
      <div class="hidden lg:flex items-center gap-6">
        ${navLinks}
      </div>
      <div class="flex items-center gap-3">
        ${desktopCta}
        <label for="${toggleId}" class="lg:hidden flex flex-col gap-1.5 cursor-pointer p-2" aria-label="Toggle menu">
          <span class="hamburger-line block w-6 h-0.5 rounded" style="background: ${data.colors.primary};"></span>
          <span class="hamburger-line block w-6 h-0.5 rounded" style="background: ${data.colors.primary};"></span>
          <span class="hamburger-line block w-6 h-0.5 rounded" style="background: ${data.colors.primary};"></span>
        </label>
      </div>
    </div>
  </div>
</nav>`;
}

export default hamburgerNavbar;
