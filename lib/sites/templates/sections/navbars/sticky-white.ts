interface NavbarData {
  businessName: string;
  logoUrl?: string;
  phone?: string;
  phoneHref?: string;
  bookingUrl?: string;
  links?: Array<{ label: string; href: string }>;
  colors: { primary: string; secondary: string };
  designStyle?: string;
  emergencyText?: string;
}

// ─── SVG Icons (Lucide-compatible) ───────────────────────────────────────────
const ICON_THERMOMETER = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-thermometer h-6 w-6 text-white" aria-hidden="true"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path></svg>`;
const ICON_PHONE = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone h-4 w-4" aria-hidden="true"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"></path></svg>`;
const ICON_MENU = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu h-6 w-6" aria-hidden="true"><path d="M4 5h16"></path><path d="M4 12h16"></path><path d="M4 19h16"></path></svg>`;

export function stickyWhiteNavbar(data: NavbarData): string {
  const { primary } = data.colors;
  const isDark = data.designStyle === 'modern-dark';

  if (isDark) {
    return modernDarkNavbar(data, primary);
  }

  const logo = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="${data.businessName}" style="height: 36px; width: auto;">`
    : `<span style="font-size: 1.25rem; font-weight: 900; color: ${primary}; letter-spacing: -0.02em;">${data.businessName}</span>`;

  const defaultLinks = [
    { label: 'Home', href: '#top' },
    { label: 'Services', href: '#services' },
    { label: 'About', href: '#about' },
    { label: 'Reviews', href: '#testimonials' },
    { label: 'Contact', href: '#contact' },
  ];
  const links = data.links || defaultLinks;
  const navLinks = links.map(l =>
    `<a href="${l.href}" class="text-sm font-semibold transition-colors" style="color: #374151; text-decoration: none;" onmouseover="this.style.color='${primary}'" onmouseout="this.style.color='#374151'">${l.label}</a>`
  ).join('\n      ');

  const mobileLinks = links.map(l =>
    `<a href="${l.href}" class="block py-2.5 px-3 text-sm font-semibold rounded-lg transition-colors" style="color: #374151;" onmouseover="this.style.color='${primary}'" onmouseout="this.style.color='#374151'" onclick="document.getElementById('kyra-mobile-menu').classList.add('hidden')">${l.label}</a>`
  ).join('\n    ');

  const phoneCta = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="hidden sm:flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-lg whitespace-nowrap transition-opacity hover:opacity-85" style="background: ${primary}; color: #ffffff; text-decoration: none;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        ${data.phone}
      </a>`
    : '';

  return `<nav id="kyra-nav" class="sticky top-0 z-50 border-b border-slate-100 transition-shadow" style="background: rgba(255,255,255,0.96); backdrop-filter: blur(12px);" aria-label="Main navigation">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16 gap-4">
      <!-- Logo -->
      <a href="#top" class="shrink-0" style="text-decoration: none;">${logo}</a>

      <!-- Nav links (desktop only) -->
      <div class="hidden md:flex items-center gap-7 flex-1 justify-center">
        ${navLinks}
      </div>

      <!-- CTA + hamburger -->
      <div class="flex items-center gap-3 shrink-0">
        ${phoneCta}
        ${data.phone ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="flex sm:hidden items-center gap-1.5 font-bold text-sm" style="color: ${primary}; text-decoration: none;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Call
        </a>` : ''}
        <button id="kyra-menu-btn" class="md:hidden p-2 rounded-lg" style="color: #374151;" aria-label="Open menu" aria-expanded="false" aria-controls="kyra-mobile-menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </div>
  </div>

  <!-- Mobile menu -->
  <div id="kyra-mobile-menu" class="hidden border-t border-gray-100 px-4 py-3 space-y-1">
    ${mobileLinks}
    ${data.phone ? `<div class="pt-3 border-t border-gray-100 mt-2">
      <a href="${data.phoneHref || `tel:${data.phone}`}" class="flex items-center gap-2 w-full justify-center py-2.5 rounded-lg font-bold text-sm" style="background: ${primary}; color: #ffffff; text-decoration: none;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call ${data.phone}
      </a>
    </div>` : ''}
  </div>

  <script>
    (function() {
      var nav = document.getElementById('kyra-nav');
      var btn = document.getElementById('kyra-menu-btn');
      var menu = document.getElementById('kyra-mobile-menu');
      if (!nav) return;
      window.addEventListener('scroll', function() {
        nav.style.boxShadow = window.scrollY > 20 ? '0 4px 20px rgba(0,0,0,0.1)' : 'none';
      });
      if (btn && menu) {
        btn.addEventListener('click', function() {
          var isOpen = !menu.classList.contains('hidden');
          menu.classList.toggle('hidden');
          btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        });
      }
    })();
  </script>
</nav>`;
}

function modernDarkNavbar(data: NavbarData, _primary: string): string {
  const defaultLinks = [
    { label: 'Services', href: '#services' },
    { label: 'About', href: '#about' },
    { label: 'Reviews', href: '#testimonials' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' },
  ];
  const links = data.links || defaultLinks;

  const navLinks = links.map(l =>
    `<a class="text-sm text-gray-300 hover:text-white transition" href="${l.href}">${l.label}</a>`
  ).join('');

  const phoneHref = data.phoneHref || (data.phone ? `tel:${data.phone}` : '#');

  const emergencyBanner = data.emergencyText || data.phone
    ? `<div class="bg-red-600 text-white text-center py-1.5 text-sm font-medium"><a href="${phoneHref}" class="hover:underline">🔥 ${data.emergencyText || 'Emergency Service Available'}${data.phone ? ` - Call ${data.phone}` : ''}</a></div>`
    : '';

  const phoneCta = data.phone
    ? `<a href="${phoneHref}" class="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">${ICON_PHONE}${data.phone}</a>`
    : '';

  const logo = data.logoUrl
    ? `<a class="flex items-center gap-3" href="/"><img src="${data.logoUrl}" alt="${data.businessName}" class="h-10 w-auto"></a>`
    : `<a class="flex items-center gap-3" href="/"><div class="h-10 w-10 rounded-lg bg-red-600 flex items-center justify-center">${ICON_THERMOMETER}</div><div><div class="text-lg font-bold text-white leading-tight">${data.businessName}</div></div></a>`;

  return `<header class="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">${emergencyBanner}<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="flex items-center justify-between h-16">${logo}<nav class="hidden md:flex items-center gap-6">${navLinks}${phoneCta}</nav><button class="md:hidden text-white p-2">${ICON_MENU}</button></div></div></header>`;
}

export default stickyWhiteNavbar;
