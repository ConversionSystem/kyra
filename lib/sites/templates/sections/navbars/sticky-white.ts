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
  const navLinks = (data.links || defaultLinks).map(l =>
    `<a href="${l.href}" style="color: #374151; text-decoration: none; font-size: 0.9rem; font-weight: 600; padding: 6px 2px; border-bottom: 2px solid transparent; transition: color 0.2s, border-color 0.2s;" onmouseover="this.style.color='${primary}';this.style.borderBottomColor='${primary}'" onmouseout="this.style.color='#374151';this.style.borderBottomColor='transparent'">${l.label}</a>`
  ).join('\n      ');

  const phoneCta = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" style="display: none; align-items: center; gap: 8px; background: ${primary}; color: #ffffff; font-weight: 700; font-size: 0.88rem; padding: 10px 20px; border-radius: 10px; text-decoration: none; transition: opacity 0.2s; white-space: nowrap;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'" class="sm-flex">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        ${data.phone}
      </a>`
    : '';

  return `<nav id="kyra-nav" style="position: sticky; top: 0; z-index: 50; background: rgba(255,255,255,0.96); backdrop-filter: blur(12px); border-bottom: 1px solid #f1f5f9; padding: 0 1.5rem; transition: box-shadow 0.3s;" aria-label="Main navigation">
  <div style="max-width: 1200px; margin: 0 auto; height: 68px; display: flex; align-items: center; justify-content: space-between; gap: 2rem;">
    <!-- Logo -->
    <a href="#top" style="flex-shrink: 0; text-decoration: none;">${logo}</a>

    <!-- Nav links (desktop) -->
    <div style="display: flex; align-items: center; gap: 1.75rem; flex: 1; justify-content: center;">
      ${navLinks}
    </div>

    <!-- CTA -->
    <div style="display: flex; align-items: center; gap: 1rem; flex-shrink: 0;">
      ${phoneCta}
      ${data.phone ? `<a href="${data.phoneHref || `tel:${data.phone}`}" style="display: flex; align-items: center; gap: 6px; color: ${primary}; font-weight: 700; font-size: 0.9rem; text-decoration: none;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          ${data.phone}
        </a>` : ''}
    </div>
  </div>
  <script>
    (function() {
      var nav = document.getElementById('kyra-nav');
      if (!nav) return;
      window.addEventListener('scroll', function() {
        nav.style.boxShadow = window.scrollY > 20 ? '0 4px 20px rgba(0,0,0,0.1)' : 'none';
      });
    })();
  </script>
</nav>`;
}

function modernDarkNavbar(data: NavbarData, primary: string): string {
  const logo = data.logoUrl
    ? `<img src="${data.logoUrl}" alt="${data.businessName}" class="h-9 w-auto">`
    : `<a class="flex items-center gap-3" href="/">
        <div class="h-10 w-10 rounded-lg bg-red-600 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </div>
        <div><div class="text-lg font-bold text-white leading-tight">${data.businessName}</div></div>
      </a>`;

  const defaultLinks = [
    { label: 'Home', href: '#top' },
    { label: 'Services', href: '#services' },
    { label: 'About', href: '#about' },
    { label: 'Reviews', href: '#testimonials' },
    { label: 'Contact', href: '#contact' },
  ];
  const navLinks = (data.links || defaultLinks).map(l =>
    `<a href="${l.href}" class="text-gray-300 hover:text-white text-sm font-medium transition no-underline">${l.label}</a>`
  ).join('\n        ');

  const phoneCta = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition no-underline">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        ${data.phone}
      </a>`
    : '';

  const emergencyBanner = data.emergencyText
    ? `<div class="bg-red-600 text-white text-center py-1.5 text-sm font-medium">
    <a href="${data.phoneHref || (data.phone ? 'tel:' + data.phone : '#')}" class="hover:underline text-white no-underline">
      ${data.emergencyText}
    </a>
  </div>`
    : '';

  const mobileMenuId = 'kyra-mobile-menu';

  return `${emergencyBanner}
<header class="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      ${data.logoUrl ? `<a href="/" class="flex-shrink-0 no-underline">${logo}</a>` : logo}

      <!-- Nav links (desktop) -->
      <nav class="hidden md:flex items-center gap-6">
        ${navLinks}
      </nav>

      <!-- Desktop CTA + Mobile hamburger -->
      <div class="flex items-center gap-3 flex-shrink-0">
        <div class="hidden md:flex">${phoneCta}</div>
        <!-- Mobile: show phone icon link -->
        ${data.phone ? `<a href="${data.phoneHref || 'tel:' + data.phone}" class="md:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-red-600 text-white no-underline">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        </a>` : ''}
        <!-- Hamburger -->
        <button id="kyra-hamburger" onclick="document.getElementById('${mobileMenuId}').classList.toggle('hidden')" class="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition" aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
      </div>
    </div>
  </div>
  <!-- Mobile menu -->
  <div id="${mobileMenuId}" class="hidden md:hidden bg-black/95 border-t border-white/10">
    <div class="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
      ${(data.links || [{ label: 'Home', href: '#top' }, { label: 'Services', href: '#services' }, { label: 'About', href: '#about' }, { label: 'Reviews', href: '#testimonials' }, { label: 'Contact', href: '#contact' }]).map(l =>
        `<a href="${l.href}" onclick="document.getElementById('${mobileMenuId}').classList.add('hidden')" class="text-gray-300 hover:text-white py-3 px-3 rounded-lg hover:bg-white/5 text-sm font-medium transition no-underline border-b border-white/5 last:border-0">${l.label}</a>`
      ).join('\n      ')}
      ${data.phone ? `<a href="${data.phoneHref || 'tel:' + data.phone}" class="mt-2 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition no-underline">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        Call ${data.phone}
      </a>` : ''}
    </div>
  </div>
</header>`;
}

export default stickyWhiteNavbar;
