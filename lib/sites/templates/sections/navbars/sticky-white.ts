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
    ? `<img src="${data.logoUrl}" alt="${data.businessName}" style="height: 36px; width: auto;">`
    : `<span style="display: flex; align-items: center; gap: 10px; font-size: 1.25rem; font-weight: 900; color: #ffffff; letter-spacing: -0.02em;">
        <span style="width: 36px; height: 36px; background: ${primary}; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        </span>
        ${data.businessName}
      </span>`;

  const defaultLinks = [
    { label: 'Home', href: '#top' },
    { label: 'Services', href: '#services' },
    { label: 'About', href: '#about' },
    { label: 'Reviews', href: '#testimonials' },
    { label: 'Contact', href: '#contact' },
  ];
  const navLinks = (data.links || defaultLinks).map(l =>
    `<a href="${l.href}" style="color: #d1d5db; text-decoration: none; font-size: 0.9rem; font-weight: 500; padding: 6px 2px; transition: color 0.2s;" onmouseover="this.style.color='#ffffff'" onmouseout="this.style.color='#d1d5db'">${l.label}</a>`
  ).join('\n        ');

  const phoneCta = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" style="display: flex; align-items: center; gap: 8px; background: ${primary}; color: #ffffff; font-weight: 700; font-size: 0.88rem; padding: 10px 22px; border-radius: 10px; text-decoration: none; transition: all 0.2s; box-shadow: 0 4px 15px rgba(220,38,38,0.3); white-space: nowrap;" onmouseover="this.style.opacity='0.9';this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1';this.style.transform='translateY(0)'">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        ${data.phone}
      </a>`
    : '';

  const emergencyBanner = data.emergencyText
    ? `<div style="background: ${primary}; color: #ffffff; text-align: center; padding: 8px 1rem; font-size: 0.82rem; font-weight: 600; letter-spacing: 0.02em;">
    <a href="${data.phoneHref || (data.phone ? 'tel:' + data.phone : '#')}" style="color: #ffffff; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
      ${data.emergencyText}
    </a>
  </div>`
    : '';

  return `${emergencyBanner}
<nav id="kyra-nav" style="position: sticky; top: 0; z-index: 50; background: rgba(0,0,0,0.90); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 0 1.5rem; transition: box-shadow 0.3s;" aria-label="Main navigation">
  <div style="max-width: 1200px; margin: 0 auto; height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 2rem;">
    <!-- Logo -->
    <a href="#top" style="flex-shrink: 0; text-decoration: none;">${logo}</a>

    <!-- Nav links (desktop) -->
    <div style="display: none; align-items: center; gap: 1.75rem; flex: 1; justify-content: center;" class="md-flex">
      ${navLinks}
    </div>

    <!-- CTA -->
    <div style="display: flex; align-items: center; gap: 1rem; flex-shrink: 0;">
      ${phoneCta}
    </div>
  </div>
  <style>
    @media (min-width: 768px) { .md-flex { display: flex !important; } }
  </style>
  <script>
    (function() {
      var nav = document.getElementById('kyra-nav');
      if (!nav) return;
      window.addEventListener('scroll', function() {
        nav.style.boxShadow = window.scrollY > 20 ? '0 4px 30px rgba(0,0,0,0.4)' : 'none';
      });
    })();
  </script>
</nav>`;
}

export default stickyWhiteNavbar;
