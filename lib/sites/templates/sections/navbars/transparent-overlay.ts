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
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="hidden sm:inline-flex px-5 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90" style="background: var(--color-surface); color: #1f2937;">${data.phone}</a>`
    : '';

  const mobileLinks = (data.links || []).map(l =>
    `<a href="${l.href}" class="block py-2.5 px-3 text-sm font-medium rounded-lg" style="color: rgba(255,255,255,0.9);" onclick="document.getElementById('kyra-overlay-mobile-menu').classList.add('hidden')">${l.label}</a>`
  ).join('\n    ');

  return `<nav class="absolute top-0 left-0 right-0 z-50" aria-label="Main navigation">
  <div class="px-4 sm:px-6 py-4">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <a href="#top" class="shrink-0">${logo}</a>
      <div class="hidden md:flex items-center gap-6">
        ${navLinks}
      </div>
      <div class="flex items-center gap-3">
        ${cta}
        <button id="kyra-overlay-menu-btn" class="md:hidden p-2 rounded-lg" style="color: rgba(255,255,255,0.9);" aria-label="Open menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </div>
  </div>
  <!-- Mobile menu -->
  <div id="kyra-overlay-mobile-menu" class="hidden px-4 pb-4 space-y-1" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(12px);">
    ${mobileLinks}
    ${data.phone ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="block mt-2 py-2.5 px-3 rounded-lg text-sm font-semibold text-center" style="background: var(--color-surface); color: #1f2937;">${data.phone}</a>` : ''}
  </div>
  <script>
    (function() {
      var btn = document.getElementById('kyra-overlay-menu-btn');
      var menu = document.getElementById('kyra-overlay-mobile-menu');
      if (btn && menu) btn.addEventListener('click', function() { menu.classList.toggle('hidden'); });
    })();
  </script>
</nav>`;
}

export default transparentOverlayNavbar;
