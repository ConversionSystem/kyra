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
  const { primary } = data.colors;

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

export default stickyWhiteNavbar;
