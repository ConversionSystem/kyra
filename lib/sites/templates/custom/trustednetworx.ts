/**
 * TrustedNetworx custom page assembler.
 *
 * Converts the original React components into static HTML that looks identical
 * to the source site. All content is driven by `site` / `page` / `allPages`
 * parameters so it remains editable through the Kyra dashboard.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Unsplash image map (real working photo IDs)
// ---------------------------------------------------------------------------
const IMG = {
  heroTech:      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80',
  circuitBoard:  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80',
  handshake:     'https://images.unsplash.com/photo-1560472355-536de3962603?w=1920&q=80',
  globalNetwork: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1920&q=80',
  serverRoom:    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1920&q=80',
  officePhones:  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&q=80',
  mobile:        'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1920&q=80',
  fleet:         'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1920&q=80',
  internetFiber: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1920&q=80',
  telecomDevice: 'https://images.unsplash.com/photo-1606765962248-7ff407b51667?w=800&q=80',
};

// ---------------------------------------------------------------------------
// Inline SVG icons (replacing Lucide React components)
// ---------------------------------------------------------------------------
const SVG = {
  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  phone: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  mail: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  mapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  arrowRight: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  menu: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`,
  x: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  // 32px variants for feature cards
  handshake32: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.68.05l2.83-1.15a1 1 0 0 1 1.21.46l1.52 2.63a1 1 0 0 1-.35 1.35l-2.38 1.39a3 3 0 0 0-1.15 1.09l-.97 1.63"/><path d="m7.5 10.5-1 3.14a1 1 0 0 0 .38 1.12l2.78 1.85a1 1 0 0 1 .31 1.33L8 21"/><path d="M2 14a2 2 0 0 1 2-2h1"/><path d="M2 18a2 2 0 0 1 2-2h1"/></svg>`,
  users32: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  zap32: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`,
  award32: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/></svg>`,
  // Inline logo SVG (simplified shield+check — replaces /logo.svg which won't exist on hosted pages)
  logo: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" class="h-8 w-8"><path d="M12 2L3 7v5c0 6.5 3.6 12.4 9 15 5.4-2.6 9-8.5 9-15V7l-9-5zm-1 15.9l-3.5-3.5 1.4-1.4L11 15.1l5.1-5.1 1.4 1.4L11 17.9z"/></svg>`,
  // Small 24px icon used in benefits lists
  icon24: (name: string) => `<i data-lucide="${name}" class="h-6 w-6 text-blue-600 flex-shrink-0"></i>`,
  // 32px for feature cards via Lucide CDN
  icon32: (name: string) => `<i data-lucide="${name}" class="h-8 w-8"></i>`,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function navHref(slug: string): string {
  if (slug === 'home' || slug === '/') return '/';
  return `/${slug}`;
}

function getAddr(site: Record<string, any>): string {
  const a = site.address;
  if (!a) return '';
  return [a.street, a.city, a.state, a.zip].filter(Boolean).join(', ');
}

// ---------------------------------------------------------------------------
// Shared fragments
// ---------------------------------------------------------------------------
function renderHead(site: Record<string, any>, page: Record<string, any>): string {
  const title = (page.title as string) || (site.business_name as string) || 'TrustedNetworx';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
    .bg-dot-pattern { position: relative; z-index: 150; }
    .bg-dot-pattern::after {
      position: absolute; content: ""; width: 30%; height: 50%;
      top: 0; right: 0;
      background-size: 18px 18px;
      background-image: radial-gradient(rgba(47,106,217,0.4) 20%, transparent 20%);
      opacity: 0.2;
    }
    .glass-morphism {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
      box-shadow: 0 8px 32px 0 rgba(31,38,135,0.07);
    }
    .glass-blur {
      background: rgba(214,234,254,0.5);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(214,234,254,0.2);
    }
  </style>
</head>
<body class="bg-gray-50 min-h-screen flex flex-col">`;
}

function renderNavbar(site: Record<string, any>, allPages: Record<string, any>[]): string {
  const name = (site.business_name as string) || 'TrustedNetworx';
  const logoUrl = site.logo_url as string | null;
  const navLinks = site.nav_links as { label: string; href: string }[] | null;

  // Build solutions dropdown items from services or allPages
  const services = (site.services || []) as { name: string; slug: string }[];
  const solutionPages = services.length
    ? services.map(s => ({ label: s.name, href: `/${s.slug}` }))
    : allPages
        .filter(p => !['home', 'about', 'contact'].includes(p.slug as string))
        .map(p => ({ label: p.title as string, href: navHref(p.slug as string) }));

  const logoHtml = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="${esc(name)} Logo" class="h-8 w-8" />`
    : SVG.logo;

  const desktopLinks = navLinks
    ? navLinks.map(l => `<a href="${esc(l.href)}" class="text-gray-700 hover:text-blue-600">${esc(l.label)}</a>`).join('\n            ')
    : `<a href="/" class="text-gray-700 hover:text-blue-600">Home</a>
            <div class="relative" id="solutions-dropdown">
              <button class="text-gray-700 hover:text-blue-600" onclick="toggleDropdown()" onmouseenter="openDropdown()">Solutions</button>
              <div id="solutions-menu" class="hidden absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 animate-fadeIn" onmouseleave="closeDropdown()">
                ${solutionPages.map(s => `<a href="${esc(s.href)}" class="block px-4 py-2 text-gray-700 hover:bg-blue-50">${esc(s.label)}</a>`).join('\n                ')}
              </div>
            </div>
            <a href="/about" class="text-gray-700 hover:text-blue-600">About</a>
            <a href="/contact" class="text-gray-700 hover:text-blue-600">Contact</a>`;

  const mobileLinks = navLinks
    ? navLinks.map(l => `<a href="${esc(l.href)}" class="block px-3 py-2 text-gray-700 hover:bg-blue-50">${esc(l.label)}</a>`).join('\n          ')
    : [
        { label: 'Home', href: '/' },
        { label: 'About', href: '/about' },
        ...solutionPages,
        { label: 'Contact', href: '/contact' },
      ].map(l => `<a href="${esc(l.href)}" class="block px-3 py-2 text-gray-700 hover:bg-blue-50">${esc(l.label)}</a>`).join('\n          ');

  return `
  <nav class="bg-white shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex">
          <a href="/" class="flex-shrink-0 flex items-center space-x-2">
            ${logoHtml}
            <span class="text-2xl font-bold text-blue-600">${esc(name)}</span>
          </a>
        </div>
        <div class="hidden md:flex md:items-center md:space-x-8">
          ${desktopLinks}
        </div>
        <div class="md:hidden flex items-center">
          <button id="mobile-menu-btn" onclick="toggleMobileMenu()" class="text-gray-700">
            <span id="menu-icon-open">${SVG.menu}</span>
            <span id="menu-icon-close" class="hidden">${SVG.x}</span>
          </button>
        </div>
      </div>
    </div>
    <div id="mobile-menu" class="md:hidden hidden">
      <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
        ${mobileLinks}
      </div>
    </div>
  </nav>`;
}

function renderFooter(site: Record<string, any>, allPages: Record<string, any>[]): string {
  const name = (site.business_name as string) || 'TrustedNetworx';
  const logoUrl = site.logo_url as string | null;
  const phone = (site.phone as string) || '';
  const email = (site.email as string) || '';
  const addr = getAddr(site);
  const services = (site.services || []) as { name: string; slug: string }[];
  const year = new Date().getFullYear();

  const logoHtml = logoUrl
    ? `<img src="${esc(logoUrl)}" alt="${esc(name)} Logo" class="h-8 w-8" />`
    : SVG.logo;

  const solutionLinks = services.length
    ? services.map(s => `<li><a href="/${esc(s.slug)}" class="text-gray-400 hover:text-white">${esc(s.name)}</a></li>`).join('\n              ')
    : allPages
        .filter(p => !['home', 'about', 'contact'].includes(p.slug as string))
        .map(p => `<li><a href="${navHref(p.slug as string)}" class="text-gray-400 hover:text-white">${esc(p.title as string)}</a></li>`)
        .join('\n              ');

  return `
  <footer class="bg-gray-900 text-white mt-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div class="flex items-center space-x-2 mb-4">
            ${logoHtml}
            <h3 class="text-xl font-bold">${esc(name)}</h3>
          </div>
          <p class="text-gray-400">${esc(site.tagline as string) || 'Your trusted partner in telecommunications solutions.'}</p>
        </div>
        <div>
          <h4 class="text-lg font-semibold mb-4">Solutions</h4>
          <ul class="space-y-2">
            ${solutionLinks}
          </ul>
        </div>
        <div>
          <h4 class="text-lg font-semibold mb-4">Company</h4>
          <ul class="space-y-2">
            <li><a href="/" class="text-gray-400 hover:text-white">Home</a></li>
            <li><a href="/about" class="text-gray-400 hover:text-white">About Us</a></li>
            <li><a href="/contact" class="text-gray-400 hover:text-white">Contact Us</a></li>
          </ul>
        </div>
        <div>
          <h4 class="text-lg font-semibold mb-4">Contact</h4>
          <ul class="space-y-2">
            ${phone ? `<li class="flex items-center text-gray-400"><span class="mr-2">${SVG.phone}</span><span>${esc(phone)}</span></li>` : ''}
            ${email ? `<li class="flex items-center text-gray-400"><span class="mr-2">${SVG.mail}</span><span>${esc(email)}</span></li>` : ''}
            ${addr ? `<li class="flex items-center text-gray-400"><span class="mr-2">${SVG.mapPin}</span><span>${esc(addr)}</span></li>` : ''}
          </ul>
        </div>
      </div>
      <div class="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400">
        <p>&copy; ${year} ${esc(name)}. All rights reserved.</p>
      </div>
    </div>
  </footer>`;
}

function renderScripts(): string {
  return `
  <script>
    // Mobile menu
    function toggleMobileMenu() {
      var menu = document.getElementById('mobile-menu');
      var open = document.getElementById('menu-icon-open');
      var close = document.getElementById('menu-icon-close');
      menu.classList.toggle('hidden');
      open.classList.toggle('hidden');
      close.classList.toggle('hidden');
    }
    // Solutions dropdown
    var dropdownTimer;
    function openDropdown() {
      clearTimeout(dropdownTimer);
      document.getElementById('solutions-menu').classList.remove('hidden');
    }
    function closeDropdown() {
      dropdownTimer = setTimeout(function() {
        document.getElementById('solutions-menu').classList.add('hidden');
      }, 150);
    }
    function toggleDropdown() {
      document.getElementById('solutions-menu').classList.toggle('hidden');
    }
    // Contact form handler
    function handleContactSubmit(e) {
      e.preventDefault();
      var f = e.target;
      var name = f.querySelector('[name=name]').value;
      var title = f.querySelector('[name=title]').value;
      var company = f.querySelector('[name=company]').value;
      var email = f.querySelector('[name=email]').value;
      var phone = f.querySelector('[name=phone]').value;
      var message = f.querySelector('[name=message]').value;
      var body = 'Dear Team,%0D%0A%0D%0AA new contact form submission has been received from ' + name + ' at ' + company + ':%0D%0A' + message + '%0D%0A%0D%0AContact Information:%0D%0A------------------%0D%0AName: ' + name + (title ? '%0D%0ATitle: ' + title : '') + '%0D%0ACompany: ' + company + '%0D%0AEmail: ' + email + (phone ? '%0D%0APhone: ' + phone : '') + '%0D%0A%0D%0ABest regards,%0D%0A' + name + '%0D%0A' + company;
      var mailto = f.getAttribute('data-mailto') || email;
      window.location.href = 'mailto:' + mailto + '?subject=New Contact Form Submission from ' + name + ' - ' + company + '&body=' + body;
    }
    // Init lucide icons
    document.addEventListener('DOMContentLoaded', function() { if (window.lucide) lucide.createIcons(); });
  </script>`;
}

function wrapPage(site: Record<string, any>, page: Record<string, any>, allPages: Record<string, any>[], bodyContent: string): string {
  return renderHead(site, page)
    + renderNavbar(site, allPages)
    + bodyContent
    + renderFooter(site, allPages)
    + renderScripts()
    + '\n</body>\n</html>';
}

// ---------------------------------------------------------------------------
// Shared section builders
// ---------------------------------------------------------------------------
function heroSection(bgImage: string, h1: string, subtitle: string, ctaText?: string | null, ctaLink?: string | null, extraHtml?: string): string {
  const minH = 'min-h-[400px]';
  const cta = ctaText
    ? `<div class="mt-8"><a href="${esc(ctaLink || '/contact')}" class="inline-flex items-center justify-center px-8 py-2 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 md:py-4 md:text-lg md:px-10">${esc(ctaText)}</a></div>`
    : '';
  return `
    <div class="relative ${minH} flex items-center">
      <div class="absolute inset-0 z-0" style="background-image:url('${bgImage}');background-position:center;background-size:cover;background-repeat:no-repeat">
        <div class="absolute inset-0 bg-gradient-to-r from-black/95 to-black/50"></div>
      </div>
      <div class="relative z-10 w-full">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="text-center">
            ${extraHtml || ''}
            <h1 class="text-4xl font-extrabold text-blue-200 sm:text-5xl md:text-6xl">${h1}</h1>
            <p class="mt-3 max-w-md mx-auto text-base text-white sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">${subtitle}</p>
            ${cta}
          </div>
        </div>
      </div>
    </div>`;
}

function decorativeBg(): string {
  return `
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
        <div class="absolute shadow-xl w-1/2 h-[1000px] bg-blue-100 -skew-x-12 -left-1/4"></div>
        <div class="absolute shadow-xl w-1/2 h-full bg-blue-100 skew-x-12 -right-1/4 top-1/4"></div>
      </div>`;
}

function ctaSection(heading: string, text: string, ctaLabel: string, ctaLink: string): string {
  return `
      <div class="relative max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto pb-16">
        <div class="space-y-16">
          <div class="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-8 shadow-xl border border-gray-200">
            <div class="text-center">
              <h3 class="text-2xl font-bold text-white mb-4">${heading}</h3>
              <p class="text-lg text-blue-100 mb-8">${text}</p>
              <a class="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 md:py-4 md:text-lg md:px-10 transition-colors duration-300" href="${esc(ctaLink)}">${esc(ctaLabel)}</a>
            </div>
          </div>
        </div>
      </div>`;
}

function getSections(page: Record<string, any>): { heading: string; body: string; bullets?: string[]; cta_text?: string; cta_link?: string }[] {
  return ((page.content_sections || []) as any[]);
}

function getFaq(page: Record<string, any>): { question: string; answer: string }[] {
  return ((page.faq || []) as any[]);
}

// ---------------------------------------------------------------------------
// Page content generators
// ---------------------------------------------------------------------------
function homeContent(site: Record<string, any>, page: Record<string, any>, allPages: Record<string, any>[]): string {
  const name = (site.business_name as string) || 'TrustedNetworx';
  let h1 = (page.hero_h1 as string) || 'Modern Solutions for Modern Business';
  // Split the original two-line hero format
  if (h1.includes('Modern Solutions for Modern Business')) {
    h1 = '<span class="block">Modern Solutions for</span><span class="block text-blue-200">Modern Business</span>';
  } else if (!h1.includes('<span')) {
    h1 = esc(h1);
  }
  const subtitle = (page.hero_subtitle as string) || `${name} Managed Solution Provider`;
  const ctaText = (page.hero_cta_text as string) || 'Learn More';
  const ctaLink = (page.hero_cta_link as string) || '/contact';
  const services = (site.services || []) as { name: string; slug: string; description?: string }[];

  const defaultServices = [
    { name: 'POTS Replacement', slug: 'pots-replacement', description: 'Modern alternatives to traditional phone lines', icon: 'phone', color: 'purple' },
    { name: 'Fleet & Fuel Management', slug: 'fleet-management', description: 'Efficient fleet and fuel tracking and management solutions', icon: 'truck', color: 'green' },
    { name: 'Internet Connectivity', slug: 'internet-connectivity', description: 'High-speed internet solutions for business', icon: 'wifi', color: 'yellow' },
    { name: 'IP PBX', slug: 'ip-pbx', description: 'Advanced business phone systems', icon: 'phone-call', color: 'pink' },
    { name: 'Mobility Solutions', slug: 'mobility-solutions', description: 'Enterprise mobility management and solutions', icon: 'smartphone', color: 'blue' },
    { name: 'Voice Solutions', slug: 'voice-solutions', description: 'Advanced voice communication systems', icon: 'mic', color: 'indigo' },
  ];

  const serviceCards = (services.length ? services.map((s, i) => ({
    name: s.name,
    slug: s.slug,
    description: s.description || '',
    icon: ['phone', 'truck', 'wifi', 'phone-call', 'smartphone', 'mic'][i % 6],
    color: ['purple', 'green', 'yellow', 'pink', 'blue', 'indigo'][i % 6],
  })) : defaultServices).map(s => `
                  <a href="/${esc(s.slug)}" class="group h-full">
                    <div class="glass-morphism p-6 rounded-xl shadow-lg border border-gray-100 hover:bg-white hover:shadow-xl transition-shadow text-center h-full flex flex-col">
                      <div class="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-${s.color}-100 mb-4">
                        <i data-lucide="${s.icon}" class="h-8 w-8 text-${s.color}-600"></i>
                      </div>
                      <h3 class="text-xl font-bold text-gray-900">${esc(s.name)}</h3>
                      <p class="mt-2 text-gray-600 flex-grow">${esc(s.description)}</p>
                      <div class="mt-4 flex items-center justify-center text-blue-600">
                        Learn more <i data-lucide="arrow-right" class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform"></i>
                      </div>
                    </div>
                  </a>`).join('');

  // Content sections from CMS or hardcoded
  const sections = getSections(page);
  const whyChooseHtml = sections.length > 0
    ? sections.map(s => `
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <h3 class="text-xl font-bold text-gray-900 mb-2">${esc(s.heading)}</h3>
                  <p class="text-gray-600">${esc(s.body)}</p>
                </div>`).join('')
    : `
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4 flex justify-center">${SVG.handshake32}</div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Proven Expertise</h3>
                  <p class="text-gray-600">With decades of experience in telecom and enterprise solutions, we understand the unique challenges businesses face in connectivity and infrastructure modernization.</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4 flex justify-center">${SVG.users32}</div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Strategic Partnerships</h3>
                  <p class="text-gray-600">We have successfully led high-profile projects with global telecom providers, government agencies, and Fortune 500 companies.</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4 flex justify-center">${SVG.zap32}</div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Innovative Solutions</h3>
                  <p class="text-gray-600">From cellular data technology to cloud-based communication systems, we offer future-proof solutions tailored to your needs.</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4 flex justify-center">${SVG.shield}</div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Reliable &amp; Scalable</h3>
                  <p class="text-gray-600">Our solutions are designed for long-term success, helping businesses reduce costs, improve efficiency, and enhance communication capabilities.</p>
                </div>`;

  return `
    <div class="bg-gray-50">
      <!-- Hero -->
      <div class="relative min-h-[600px] flex items-center">
        <div class="absolute inset-0 z-0" style="background-image:url('${IMG.heroTech}');background-position:center;background-size:cover;background-repeat:no-repeat">
          <div class="absolute inset-0 bg-gradient-to-r from-black/95 to-black/50"></div>
        </div>
        <div class="relative z-10 w-full">
          <div class="max-w-7xl mx-auto">
            <div class="relative px-4 sm:px-6 lg:px-8">
              <div class="text-center">
                <p class="text-base text-blue-200 sm:text-lg md:text-xl">${esc(name).toUpperCase()}</p>
                <h1 class="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl mt-2">
                  ${h1.includes('<') ? h1 : `<span class="block">${h1}</span>`}
                </h1>
                <div class="flex justify-center">
                  <h2 class="mt-3 text-base text-white sm:text-lg md:text-xl max-w-xl">${subtitle}</h2>
                </div>
                <div class="mt-8">
                  <a href="${esc(ctaLink)}" class="inline-flex items-center justify-center px-8 py-2 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 md:py-4 md:text-lg md:px-10">${esc(ctaText)}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="relative">
        ${decorativeBg()}

        <!-- Services -->
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="space-y-16">
            <div class="glass-morphism rounded-2xl p-8">
              <div class="text-center">
                <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl">Managed Services</h2>
                <p class="mt-4 max-w-2xl text-xl text-gray-600 lg:mx-auto">Comprehensive telecommunications solutions for your business needs</p>
              </div>
              <div class="mt-10">
                <div class="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  ${serviceCards}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Why Choose Us -->
        <div class="py-16 bg-blue-50">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="glass-morphism rounded-2xl p-8 text-center">
              <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-8">Why Choose Us?</h2>
              <div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                ${whyChooseHtml}
              </div>
            </div>
          </div>
        </div>

        <!-- Our Trusted Partners -->
        <div class="relative py-16 bg-white-50">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-6">
              <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl">Our Trusted Partners</h2>
            </div>
            <div class="w-full">
              <div class="glass-morphism rounded-2xl p-8">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
                  <div class="text-center"><span class="text-xl font-bold text-gray-700">DataRemote</span></div>
                  <div class="text-center"><span class="text-xl font-bold text-gray-700">MetTel</span></div>
                  <div class="text-center"><span class="text-xl font-bold text-gray-700">Mix Networks</span></div>
                  <div class="text-center"><span class="text-xl font-bold text-gray-700">Velocity</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CTA -->
        <div class="relative bg-blue-600">
          <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
            <h2 class="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              <span class="block">Ready to get started?</span>
              <span class="block text-blue-200">Contact us today for a consultation.</span>
            </h2>
            <div class="mt-8 flex lg:mt-0 lg:flex-shrink-0">
              <div class="inline-flex rounded-md shadow">
                <a href="/contact" class="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50">Contact Us</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

function aboutContent(site: Record<string, any>, page: Record<string, any>): string {
  const name = (site.business_name as string) || 'TrustedNetworx';
  const h1 = (page.hero_h1 as string) || `About ${name}`;
  const subtitle = (page.hero_subtitle as string) || 'Connecting Businesses with Cutting-Edge Telecommunication Services';
  const sections = getSections(page);

  const leadingFutureBody = sections[0]?.body || `With over 25 years of experience in the telecom and IoT industries, <a href="https://trustednetworx.com" class="text-blue-600 hover:text-blue-800 font-semibold"> ${esc(name)}</a> specializes in delivering advanced connectivity solutions that drive business success. Our expertise spans IoT, M2M, cloud computing, and enterprise communication solutions, enabling organizations to modernize their infrastructure, optimize operations, and stay ahead in a rapidly evolving digital landscape.`;
  const partnerBody = sections[1]?.body || `Having worked with industry leaders such as AT&amp;T, Verizon, T-Mobile, US Cellular, MetTel Fusion Connect, Xirgo Technologies, DataRemote and many more, we have a proven track record of expanding market presence, forming strategic partnerships, and delivering scalable telecom solutions. From POTS line replacement and enterprise mobility to IoT connectivity and managed services, we help businesses transition to next-generation networks with confidence.`;

  return `
    <div class="bg-gray-50">
      ${heroSection(IMG.handshake, h1, subtitle)}

      <div class="relative">
        ${decorativeBg()}

        <!-- Leading the Future -->
        <div class="relative py-16">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="glass-morphism rounded-2xl py-16 px-8">
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div class="prose prose-lg">
                  <h2 class="text-lg font-extrabold sm:text-4xl text-left">${sections[0]?.heading || 'Leading the Future of Telecom'}</h2>
                  <p class="mt-4 text-lg text-gray-600 pe-12">${leadingFutureBody}</p>
                </div>
                <div class="flex justify-center shadow-xl rounded-2xl">
                  <img src="${IMG.globalNetwork}" alt="About ${esc(name)}" class="max-w-full h-auto rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Your Trusted Telecom Partner -->
        <div class="py-16 bg-blue-50">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="glass-morphism rounded-2xl p-8 text-center">
              <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-8">${sections[1]?.heading || 'Your Trusted Telecom Partner'}</h2>
              <p class="mt-4 text-lg text-gray-600 pe-12">${partnerBody}</p>
              <div class="my-8 glass-morphism rounded-2xl p-8">
                <div class="w-full">
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
                    <div class="text-center"><span class="text-xl font-bold text-gray-700">DataRemote</span></div>
                    <div class="text-center"><span class="text-xl font-bold text-gray-700">MetTel</span></div>
                    <div class="text-center"><span class="text-xl font-bold text-gray-700">Mix Networks</span></div>
                    <div class="text-center"><span class="text-xl font-bold text-gray-700">Velocity</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Why Choose -->
        <div class="py-16">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="glass-morphism rounded-2xl p-8 text-center">
              <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-8">Why Choose ${esc(name)}?</h2>
              <div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2">
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4 flex justify-center">${SVG.award32}</div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Proven Telecom Expertise</h3>
                  <p class="text-gray-600">Leverage decades of industry experience that equips us to tackle the complex challenges of connectivity and infrastructure modernization.</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4 flex justify-center">${SVG.handshake32}</div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Strategic Global Partnerships</h3>
                  <p class="text-gray-600">Our track record includes spearheading high-profile projects with global telecom leaders, government bodies, and Fortune 500 companies.</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4 flex justify-center">${SVG.zap32}</div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Future-Ready Solutions</h3>
                  <p class="text-gray-600">We deliver cutting-edge solutions&#8212;from cellular data technology to cloud-based communication systems&#8212;customized to meet your evolving needs.</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4 flex justify-center">${SVG.shield}</div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Dependable &amp; Scalable Solutions</h3>
                  <p class="text-gray-600">Designed for long-term success, our strategies help reduce costs, enhance operational efficiency, and boost communication capabilities.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        ${ctaSection(
          'Ready to Transform Your Telecommunications?',
          `Let us help you navigate the future of telecom with expertise, reliability, and innovation. Partner with us for a seamless transition into the next generation of connectivity solutions.`,
          'Contact Us',
          '/contact',
        )}
      </div>
    </div>`;
}

function potsContent(site: Record<string, any>, page: Record<string, any>): string {
  const h1 = (page.hero_h1 as string) || 'POTS Replacement Solutions';
  const subtitle = (page.hero_subtitle as string) || 'Modern alternatives to traditional phone lines for your business';
  const ctaText = (page.hero_cta_text as string) || 'Learn More';

  const potsBoxHtml = `<div class="w-48 mx-auto mb-4 text-white font-extrabold text-2xl tracking-wider">POTS IN A BOX<sup>&reg;</sup></div>`;

  return `
    <div class="bg-white">
      ${heroSection(IMG.serverRoom, h1, subtitle, ctaText, '/contact', potsBoxHtml)}

      <div class="relative">
        ${decorativeBg()}

        <!-- Cutting the Landline -->
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="space-y-16">
            <div class="glass-morphism rounded-2xl p-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 class="text-3xl font-extrabold text-gray-900">Cutting the Landline</h2>
                <p class="mt-4 text-lg text-gray-600">As traditional Plain Old Telephone Service (POTS) lines become obsolete and carriers phase out support, businesses need reliable alternatives that offer improved functionality and cost savings.</p>
                <p class="mt-4 text-lg text-gray-600">Our POTS replacement solutions provide modern, digital alternatives that maintain compatibility with your existing equipment while adding new features and capabilities. We help you transition smoothly from legacy copper lines to IP-based solutions.</p>
              </div>
              <div class="space-y-6">
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="flex items-center"><i data-lucide="dollar-sign" class="h-8 w-8 text-blue-600 flex-shrink-0"></i><h3 class="text-xl font-bold text-gray-900 ml-4">Cost Savings</h3></div>
                  <p class="mt-4 text-gray-600">Reduce monthly telephone expenses by up to 50% while adding new capabilities</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="flex items-center"><i data-lucide="shield" class="h-8 w-8 text-blue-600 flex-shrink-0"></i><h3 class="text-xl font-bold text-gray-900 ml-4">Enhanced Reliability</h3></div>
                  <p class="mt-4 text-gray-600">Improved uptime with built-in redundancy and disaster recovery options</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="flex items-center"><i data-lucide="zap" class="h-8 w-8 text-blue-600 flex-shrink-0"></i><h3 class="text-xl font-bold text-gray-900 ml-4">Future-Proof Solution</h3></div>
                  <p class="mt-4 text-gray-600">Stay ahead of copper retirement with modern IP-based technology</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- All In One Solution -->
        <div class="relative py-16">
          <div class="absolute inset-0 z-0 bg-blue-100/50" style="filter:blur(10px)"></div>
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="glass-morphism rounded-2xl py-16 px-8">
              <h2 class="text-3xl font-extrabold text-gray-900 text-center mb-8">An All-In-One POTS Replacement Solution</h2>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div class="prose prose-lg">
                  <h3 class="text-3xl font-bold text-left">POTS IN A BOX&reg;</h3>
                  <p class="mt-4 text-lg text-gray-600"><a href="https://dataremote.com/pots-line-replacement/" target="_blank" class="text-blue-600 hover:text-blue-800 font-semibold" title="DataRemote POTS IN A BOX&reg;">POTS IN A BOX&reg;</a> is a cutting-edge POTS line replacement solution that enables seamless migration of legacy PSTN-based analog systems to modern IP and cellular data networks, supporting voice, fax, alarm signals, and emergency communications. Featuring cost-effective, plug-and-play cellular routers, it delivers versatile business continuity and reliable telecommunications for today&#8217;s evolving industry.</p>
                </div>
                <div class="flex justify-center rounded-2xl">
                  <img src="${IMG.telecomDevice}" alt="POTS IN A BOX Solution Diagram" class="max-w-full h-auto rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- PTSN Market -->
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="space-y-16">
            <div class="glass-morphism rounded-2xl p-8">
              <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl text-center">PTSN Sunset &amp; The Market Shift</h2>
              <p class="mt-4 text-lg text-gray-600 text-center">POTS technology remains the backbone of infrastructure, seamlessly integrating into every aspect of modern life. These landlines connect essential devices such as electrical transformer stations, security alarm panels, commercial HVAC systems, POS terminals, ATMs, traffic control systems, and elevator emergency phones.</p>
              <div class="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3 items-center">
                <div class="bg-white py-6 px-2 rounded-xl shadow-lg border border-gray-100 text-center">
                  <dt class="text-5xl font-extrabold text-blue-600">900M+</dt>
                  <dd class="mt-2 font-medium text-gray-500">Legacy Landlines Globally</dd>
                </div>
                <div class="bg-white py-6 px-2 rounded-xl shadow-lg border border-gray-100 text-center">
                  <dt class="text-5xl font-extrabold text-blue-600">30M+</dt>
                  <dd class="mt-2 font-medium text-gray-500">POTS Lines in the US</dd>
                </div>
                <div class="bg-white py-6 px-2 rounded-xl shadow-lg border border-gray-100 text-center">
                  <dt class="text-5xl font-extrabold text-blue-600">31.4%</dt>
                  <dd class="mt-2 font-medium text-gray-500">Increase in POTS Costs Over The Past 5 Years</dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Use Cases -->
        <div class="relative py-16">
          <div class="absolute inset-0 z-0 bg-blue-100/50" style="filter:blur(10px)"></div>
          <div class="relative z-10">
            <div class="lg:mx-32 px-4 sm:px-6 lg:px-8">
              <div class="glass-morphism rounded-2xl py-16 px-8">
                <h2 class="text-3xl font-extrabold text-gray-900 text-center mb-8">Supporting All Your POTS Replacement Needs</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-8">
                  ${[
                    ['printer','FAX'],['gauge','Meter Reading'],['bell','Burglar & Fire Alarm'],['shopping-cart','Point of Sale Terminals'],
                    ['phone-forwarded','Ring-Down (Audiodial)'],['terminal','Vending Machines'],['building-2','Elevator, Paging, Taxi'],['banknote','ATM Machines'],
                    ['building','Apartment Call Box'],['activity','Telemetry'],['door-closed','Gate Access'],['server','SMB Router/Gateway'],
                    ['router','Analog M2M'],['radio','4G/5G Internet Access'],['terminal','Legacy Modem Support'],['wifi','Wireless Wi-Fi Access'],
                  ].map(([icon, label]) => `
                    <div class="flex flex-col items-center text-center">
                      <i data-lucide="${icon}" class="w-8 h-8 text-blue-600 mb-3"></i>
                      <p class="text-sm font-medium text-gray-900">${label}</p>
                    </div>`).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Compatible Systems -->
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="space-y-16">
            <div class="glass-morphism rounded-2xl p-8">
              <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl text-center">Compatible Systems &amp; Industries</h2>
              <div class="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-center">
                  <div class="text-blue-600 mb-2 flex justify-center"><i data-lucide="store" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Retail</h3>
                  <ul class="text-gray-600 space-y-1"><li>Point of Sale Systems</li><li>Fire Alarm Panels</li><li>Security Alarms</li></ul>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-center">
                  <div class="text-blue-600 mb-2 flex justify-center"><i data-lucide="ambulance" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Healthcare</h3>
                  <ul class="text-gray-600 space-y-1"><li>Emergency Phones</li><li>Paging Systems</li><li>Fax Machines</li></ul>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-center">
                  <div class="text-blue-600 mb-2 flex justify-center"><i data-lucide="graduation-cap" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Education</h3>
                  <ul class="text-gray-600 space-y-1"><li>Campus Security Systems</li><li>Elevator Phones</li><li>Safety Phones</li></ul>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-center">
                  <div class="text-blue-600 mb-2 flex justify-center"><i data-lucide="cog" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Manufacturing</h3>
                  <ul class="text-gray-600 space-y-1"><li>Gate Entry Systems</li><li>Fire Alarm Panels</li><li>Meter Reading</li></ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        ${ctaSection(
          "Don't Let Outdated POTS Lines Slow Down Your Business",
          'Contact us today to learn how we can help you transition from legacy POTS lines to modern alternatives while maintaining compatibility with your existing systems.',
          'Get Started',
          '/contact',
        )}
      </div>
    </div>`;
}

function voiceContent(site: Record<string, any>, page: Record<string, any>): string {
  const h1 = (page.hero_h1 as string) || 'Voice Solutions';
  const subtitle = (page.hero_subtitle as string) || 'Advanced voice communication systems for modern business';

  return `
    <div class="bg-gray-50">
      ${heroSection(IMG.officePhones, h1, subtitle, 'Learn More', '/contact')}

      <div class="relative">
        ${decorativeBg()}

        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="space-y-16">
            <div class="glass-morphism rounded-2xl p-8">
              <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl text-center">Enterprise Voice Communications</h2>
              <p class="mt-4 text-xl text-gray-600 text-center">Comprehensive voice solutions that enhance business communication and collaboration</p>
              <div class="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="phone-call" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Voice Services</h3>
                  <ul class="text-gray-600 space-y-2"><li>&#8226; HD Voice Quality</li><li>&#8226; Toll-Free Numbers</li><li>&#8226; Local Numbers</li><li>&#8226; International Calling</li></ul>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="mic" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Voice Features</h3>
                  <ul class="text-gray-600 space-y-2"><li>&#8226; Voice Recognition</li><li>&#8226; Voice Analytics</li><li>&#8226; Call Recording</li><li>&#8226; Voice Transcription</li></ul>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="message-square" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Unified Communications</h3>
                  <ul class="text-gray-600 space-y-2"><li>&#8226; Voice &amp; Video</li><li>&#8226; Instant Messaging</li><li>&#8226; Presence Information</li><li>&#8226; Team Collaboration</li></ul>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="settings" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Management</h3>
                  <ul class="text-gray-600 space-y-2"><li>&#8226; Call Analytics</li><li>&#8226; Quality Monitoring</li><li>&#8226; System Administration</li><li>&#8226; User Management</li></ul>
                </div>
              </div>

              <!-- Benefits -->
              <div class="mt-8 glass-morphism rounded-2xl p-8">
                <h3 class="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 text-center">Benefits of Our Voice Solutions</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <div class="flex items-center mb-2"><i data-lucide="audio-lines" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Enhanced Quality</h4></div>
                    <p class="text-gray-600">Crystal-clear voice quality with HD audio and advanced noise cancellation. Reliable service with guaranteed uptime and redundancy.</p>
                  </div>
                  <div>
                    <div class="flex items-center mb-2"><i data-lucide="dollar-sign" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Cost Efficiency</h4></div>
                    <p class="text-gray-600">Reduce communication costs with competitive calling rates and bundled services. Eliminate hardware costs with cloud-based solutions.</p>
                  </div>
                  <div>
                    <div class="flex items-center mb-2"><i data-lucide="bar-chart" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Advanced Features</h4></div>
                    <p class="text-gray-600">Access modern features like voice analytics, transcription, and intelligent routing. Integrate with your existing business applications.</p>
                  </div>
                  <div>
                    <div class="flex items-center mb-2"><i data-lucide="expand" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Scalability</h4></div>
                    <p class="text-gray-600">Easily scale your voice services up or down based on business needs. Add new features and users without complex infrastructure changes.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        ${ctaSection('Ready to Enhance Your Voice Communications?', 'Contact us today to learn how our voice solutions can transform your business communications.', 'Get Started', '/contact')}
      </div>
    </div>`;
}

function internetContent(site: Record<string, any>, page: Record<string, any>): string {
  const name = (site.business_name as string) || 'TrustedNetworx';
  const h1 = (page.hero_h1 as string) || 'Internet Connectivity Solutions';
  const subtitle = (page.hero_subtitle as string) || 'Ensure your business remains agile, efficient, and securely connected with our comprehensive Internet Connectivity solutions';

  return `
    <div class="bg-gray-50">
      ${heroSection(IMG.internetFiber, h1, subtitle, 'Learn More', 'mailto:carter@trustednetworx.com')}

      <div class="relative">
        ${decorativeBg()}

        <!-- Enterprise-Grade + Available Solutions -->
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="space-y-16">
            <div class="glass-morphism rounded-2xl p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <h2 class="text-3xl font-extrabold text-gray-900">Enterprise-Grade Connectivity</h2>
                <p class="mt-4 text-lg text-gray-600">In today&#8217;s digital world, reliable internet connectivity is crucial for business success. Our solutions provide the speed, reliability, and security your business needs to stay competitive.</p>
                <p class="mt-4 text-lg text-gray-600">From dedicated internet access to SD-WAN solutions, we offer a comprehensive suite of connectivity options designed to meet your specific business requirements and ensure maximum uptime.</p>
                <div class="mt-8 space-y-6">
                  <div class="flex items-start"><i data-lucide="wifi" class="h-6 w-6 text-blue-600 flex-shrink-0 mt-1"></i><div class="ml-4"><h3 class="text-lg font-medium text-gray-900">Reliability</h3><p class="mt-2 text-gray-600">Experience high-quality, uninterrupted connectivity backed by our robust infrastructure and support.</p></div></div>
                  <div class="flex items-start"><i data-lucide="gauge" class="h-6 w-6 text-blue-600 flex-shrink-0 mt-1"></i><div class="ml-4"><h3 class="text-lg font-medium text-gray-900">Scalability</h3><p class="mt-2 text-gray-600">Easily adjust services to align with your business growth and evolving needs.</p></div></div>
                  <div class="flex items-start"><i data-lucide="shield" class="h-6 w-6 text-blue-600 flex-shrink-0 mt-1"></i><div class="ml-4"><h3 class="text-lg font-medium text-gray-900">Security</h3><p class="mt-2 text-gray-600">Protect your data and communications with our advanced security measures and monitoring.</p></div></div>
                  <div class="flex items-start"><i data-lucide="dollar-sign" class="h-6 w-6 text-blue-600 flex-shrink-0 mt-1"></i><div class="ml-4"><h3 class="text-lg font-medium text-gray-900">Cost Efficiency</h3><p class="mt-2 text-gray-600">Optimize your IT investments with solutions designed to provide maximum value and performance.</p></div></div>
                </div>
              </div>
              <div class="space-y-6">
                <h2 class="text-3xl font-extrabold text-gray-900 text-center mb-8">Available Solutions</h2>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="flex items-center"><i data-lucide="router" class="h-8 w-8 text-blue-600 flex-shrink-0"></i><h3 class="text-xl font-bold text-gray-900 ml-4">Managed SD-WAN Services</h3></div>
                  <p class="mt-4 text-gray-600">Our award-winning SD-WAN combines MPLS, broadband internet circuits, and 4G-LTE to deliver a resilient and high-performance network. This intelligent network dynamically manages resources, offering improved performance, reliability, and security.</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="flex items-center"><i data-lucide="globe" class="h-8 w-8 text-blue-600 flex-shrink-0"></i><h3 class="text-xl font-bold text-gray-900 ml-4">Satellite Broadband</h3></div>
                  <p class="mt-4 text-gray-600">As an authorized reseller of <a href="https://www.starlink.com" target="_blank"><b>Starlink</b></a> services and equipment, we provide high-speed, low-latency broadband internet access, even in remote locations. This ensures your business remains connected, regardless of geography.</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="flex items-center"><i data-lucide="signal" class="h-8 w-8 text-blue-600 flex-shrink-0"></i><h3 class="text-xl font-bold text-gray-900 ml-4">IoT Single SIM</h3></div>
                  <p class="mt-4 text-gray-600">Our IoT Single SIM card ensures your devices maintain connectivity at all times by intelligently roaming to find the strongest mobile signal, regardless of carrier. This global solution enhances security, reduces costs, and provides real-time data for effective device management.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Why Choose -->
        <div class="w-full bg-blue-50">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div class="space-y-16">
              <div class="glass-morphism rounded-2xl p-8 text-center">
                <h2 class="text-3xl font-extrabold text-gray-900 mb-8">Why Choose ${esc(name)} Solutions</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div class="glass-morphism p-6 rounded-xl shadow-lg border border-gray-100">
                    <div class="text-blue-600 mb-4 flex justify-center"><i data-lucide="network" class="w-8 h-8"></i></div>
                    <h3 class="text-xl font-bold text-gray-900 mb-3 text-center">Customized IT Solutions</h3>
                    <p class="text-gray-600">Our team expertly monitors and maintains your IT infrastructure, allowing you to focus on your core business operations without interruption. We provide fully managed fiber, broadband, and wireless 4G/LTE solutions, ensuring your networks are secure, efficient, and up-to-date.</p>
                  </div>
                  <div class="glass-morphism p-6 rounded-xl shadow-lg border border-gray-100">
                    <div class="text-blue-600 mb-4 flex justify-center"><i data-lucide="headphones" class="w-8 h-8"></i></div>
                    <h3 class="text-xl font-bold text-gray-900 mb-3 text-center">Comprehensive Support</h3>
                    <p class="text-gray-600">As a client, you&#8217;ll have direct access to dedicated account managers, project managers, engineers, service technicians, and a customer care team to assist with all aspects of your networking needs.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Benefits -->
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="space-y-16">
            <div class="glass-morphism rounded-2xl p-8">
              <h2 class="text-3xl font-extrabold text-gray-900 text-center mb-8">Benefits</h2>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100"><div class="text-blue-600 mb-4 flex justify-center"><i data-lucide="wifi" class="w-8 h-8"></i></div><h3 class="text-lg font-bold text-gray-900 mb-2 text-center">Reliability</h3><p class="text-gray-600 text-center text-sm">Experience uninterrupted connectivity backed by robust infrastructure.</p></div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100"><div class="text-blue-600 mb-4 flex justify-center"><i data-lucide="zap" class="w-8 h-8"></i></div><h3 class="text-lg font-bold text-gray-900 mb-2 text-center">Scalability</h3><p class="text-gray-600 text-center text-sm">Easily adjust services as your business grows.</p></div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100"><div class="text-blue-600 mb-4 flex justify-center"><i data-lucide="shield" class="w-8 h-8"></i></div><h3 class="text-lg font-bold text-gray-900 mb-2 text-center">Security</h3><p class="text-gray-600 text-center text-sm">Advanced security measures protect your data.</p></div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100"><div class="text-blue-600 mb-4 flex justify-center"><i data-lucide="dollar-sign" class="w-8 h-8"></i></div><h3 class="text-lg font-bold text-gray-900 mb-2 text-center">Cost Efficiency</h3><p class="text-gray-600 text-center text-sm">Optimize IT investments for maximum value.</p></div>
              </div>
            </div>
          </div>
        </div>

        ${ctaSection('Ready to Transform Your Connectivity?', "Partner with us to transform your communication infrastructure, ensuring your business stays connected and competitive in today's fast-paced environment.", 'Get Started', '/contact')}
      </div>
    </div>`;
}

function mobilityContent(site: Record<string, any>, page: Record<string, any>): string {
  const name = (site.business_name as string) || 'TrustedNetworx';
  const h1 = (page.hero_h1 as string) || 'Mobility Solutions';
  const subtitle = (page.hero_subtitle as string) || `Empower Your Business with ${name} Enterprise Mobility Solutions`;

  return `
    <div class="bg-gray-50">
      ${heroSection(IMG.mobile, h1, subtitle, 'Learn More', '/contact')}

      <div class="relative">
        ${decorativeBg()}

        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="space-y-16">
            <div class="glass-morphism rounded-2xl p-8">
              <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl text-center">Enterprise Mobility Management</h2>
              <p class="mt-4 text-xl text-gray-600 text-center">${esc(name)} delivers comprehensive Enterprise Mobility Solutions designed to streamline device management, enhance security, and improve operational efficiency for your mobile workforce.</p>
              <div class="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-2">
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="smartphone" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Mobile Device as a Service (MDaaS)</h3>
                  <p class="mt-4 text-lg text-gray-600">Experience a holistic approach to enterprise mobility with <b>MDaaS</b>, covering every phase of your devices&#8217; lifecycle. From procurement and configuration to deployment and ongoing support, MDaaS ensures seamless integration and management.</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="truck" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Fleet Management</h3>
                  <p class="mt-4 text-lg text-gray-600">Optimize your mobile assets with our advanced <a class="text-blue-600 font-bold" href="/fleet-management">Fleet Management Services</a>. Gain real-time insights into vehicle locations, driver behaviors, and maintenance needs to enhance efficiency and reduce operational costs.</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="signal" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">IoT Connectivity</h3>
                  <p class="mt-4 text-lg text-gray-600">Securely connect and manage your IoT devices globally. Our solutions provide robust connectivity options, ensuring your devices stay online and operational, no matter where they are.</p>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="monitor-smartphone" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Unified Endpoint Management (UEM)</h3>
                  <p class="mt-4 text-lg text-gray-600">Maintain control over all endpoints with UEM, offering centralized device management, security enforcement, and policy compliance across different operating systems and devices.</p>
                </div>
              </div>

              <!-- Benefits -->
              <div class="mt-8 glass-morphism rounded-2xl p-8">
                <h3 class="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 text-center">Benefits of Our Mobility Solutions</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div><div class="flex items-center mb-2"><i data-lucide="settings" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Simplified Management</h4></div><p class="text-gray-600">Our end-to-end services eliminate the complexities of device management, freeing your IT team to focus on strategic growth.</p></div>
                  <div><div class="flex items-center mb-2"><i data-lucide="shield" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Enhanced Security</h4></div><p class="text-gray-600">Implement advanced security protocols to safeguard sensitive data and maintain industry compliance.</p></div>
                  <div><div class="flex items-center mb-2"><i data-lucide="dollar-sign" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Cost Efficiency</h4></div><p class="text-gray-600">Benefit from cross-carrier pooling and competitive pricing models to optimize your mobility expenses.</p></div>
                  <div><div class="flex items-center mb-2"><i data-lucide="expand" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Scalability</h4></div><p class="text-gray-600">Easily scale your mobility infrastructure to align with business growth and evolving technology.</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        ${ctaSection('Ready to Mobilize Your Enterprise?', `Partner with ${esc(name)} to transform your enterprise mobility strategy\u2014ensuring your workforce stays connected, productive, and secure in today\u2019s fast-paced business environment.`, 'Get Started', '/contact')}
      </div>
    </div>`;
}

function fleetContent(site: Record<string, any>, page: Record<string, any>): string {
  const name = (site.business_name as string) || 'TrustedNetworx';
  const h1 = (page.hero_h1 as string) || 'Fleet & Fuel Management Solutions';
  const subtitle = (page.hero_subtitle as string) || 'Optimize your fleet operations with real-time tracking and comprehensive management tools';

  return `
    <div class="bg-gray-50">
      ${heroSection(IMG.fleet, h1, subtitle, 'Learn More', '/contact')}

      <div class="relative">
        ${decorativeBg()}

        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="space-y-16">
            <div class="glass-morphism rounded-2xl p-8">
              <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl text-center">Transform Your Fleet Operations</h2>
              <p class="mt-4 text-xl text-gray-600 text-center">Optimize your fleet operations with ${esc(name)}&#8217;s Fleet and Fuel Management Partner Solutions, designed to enhance efficiency, reduce costs, and ensure compliance across your entire vehicle network.</p>
              <div class="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="map-pin" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Real-Time GPS Tracking</h3>
                  <ul class="text-gray-600 space-y-2"><li>&#8226; Live Vehicle Location</li><li>&#8226; Historical Trip Data</li><li>&#8226; Geofencing Capabilities</li><li>&#8226; Real-time Notifications</li></ul>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="settings" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Maintenance Management</h3>
                  <ul class="text-gray-600 space-y-2"><li>&#8226; Service Scheduling</li><li>&#8226; Maintenance Alerts</li><li>&#8226; Vehicle Diagnostics</li><li>&#8226; Repair History</li></ul>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="fuel" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Fuel Management</h3>
                  <ul class="text-gray-600 space-y-2"><li>&#8226; Fuel Consumption Tracking</li><li>&#8226; Cost Analysis</li><li>&#8226; Fuel Card Integration</li><li>&#8226; Efficiency Reports</li></ul>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="bar-chart" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Performance Analysis</h3>
                  <ul class="text-gray-600 space-y-2"><li>&#8226; Driver Performance Monitoring</li><li>&#8226; Vehicle Utilization Metrics</li><li>&#8226; Route Optimization</li><li>&#8226; Custom Reporting</li></ul>
                </div>
              </div>

              <!-- Benefits -->
              <div class="mt-8 glass-morphism rounded-2xl p-8">
                <h3 class="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 text-center">Benefits of Our Fleet Management Solutions</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div><div class="flex items-center mb-2"><i data-lucide="zap" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Enhanced Efficiency</h4></div><p class="text-gray-600">By leveraging real-time data and analytics, streamline operations, reduce downtime, and improve overall fleet performance.</p></div>
                  <div><div class="flex items-center mb-2"><i data-lucide="dollar-sign" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Cost Reduction</h4></div><p class="text-gray-600">Identify and eliminate inefficiencies, leading to significant savings on fuel and maintenance.</p></div>
                  <div><div class="flex items-center mb-2"><i data-lucide="shield-check" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Regulatory Compliance</h4></div><p class="text-gray-600">Maintain adherence to industry standards and regulations with automated tracking and reporting features.</p></div>
                  <div><div class="flex items-center mb-2"><i data-lucide="traffic-cone" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Improved Safety</h4></div><p class="text-gray-600">Proactively address risky driving behaviors, fostering a culture of safety within your team.</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        ${ctaSection('Ready to Optimize Your Fleet?', `Partner with ${esc(name)} to transform your fleet management strategy, ensuring your operations are efficient, compliant, and primed for success in today\u2019s competitive landscape.`, 'Get Started', '/contact')}
      </div>
    </div>`;
}

function ipPbxContent(site: Record<string, any>, page: Record<string, any>): string {
  const h1 = (page.hero_h1 as string) || 'IP PBX Solutions';
  const subtitle = (page.hero_subtitle as string) || 'Advanced business phone systems for modern communication';

  return `
    <div class="bg-gray-50">
      ${heroSection(IMG.officePhones, h1, subtitle, 'Learn More', '/contact')}

      <div class="relative">
        ${decorativeBg()}

        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div class="space-y-16">
            <div class="glass-morphism rounded-2xl p-8">
              <h2 class="text-3xl font-extrabold text-gray-900 sm:text-4xl text-center">Transform Your Business Communications</h2>
              <p class="mt-4 text-xl text-gray-600 text-center">Our IP PBX solutions combine traditional telephony with modern IP technology</p>
              <div class="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="phone-call" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Advanced Features</h3>
                  <ul class="text-gray-600 space-y-2"><li>&#8226; Auto-attendant</li><li>&#8226; Call queuing</li><li>&#8226; Voice mail to email</li><li>&#8226; Call recording</li></ul>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="users" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Collaboration Tools</h3>
                  <ul class="text-gray-600 space-y-2"><li>&#8226; Video conferencing</li><li>&#8226; Instant messaging</li><li>&#8226; Presence information</li><li>&#8226; Screen sharing</li></ul>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="settings" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Easy Management</h3>
                  <ul class="text-gray-600 space-y-2"><li>&#8226; Web-based interface</li><li>&#8226; User management</li><li>&#8226; Call reporting</li><li>&#8226; System monitoring</li></ul>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                  <div class="text-blue-600 mb-4"><i data-lucide="headphones" class="w-8 h-8"></i></div>
                  <h3 class="text-xl font-bold text-gray-900 mb-2">Support</h3>
                  <ul class="text-gray-600 space-y-2"><li>&#8226; 24/7 technical support</li><li>&#8226; Remote assistance</li><li>&#8226; Regular updates</li><li>&#8226; Training available</li></ul>
                </div>
              </div>

              <!-- Why Choose -->
              <div class="mt-8 glass-morphism rounded-2xl p-8">
                <h3 class="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-8 text-center">Why Choose Our IP PBX Solution?</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div><div class="flex items-center mb-2"><i data-lucide="dollar-sign" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Cost Savings</h4></div><p class="text-gray-600">Reduce your communication costs with lower call rates and minimal hardware requirements. Eliminate the need for separate phone lines for each employee.</p></div>
                  <div><div class="flex items-center mb-2"><i data-lucide="network" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Scalability</h4></div><p class="text-gray-600">Easily add new users and features as your business grows. No need for expensive hardware upgrades or complex installations.</p></div>
                  <div><div class="flex items-center mb-2"><i data-lucide="globe" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Flexibility</h4></div><p class="text-gray-600">Work from anywhere with internet access. Support remote workers and multiple office locations with a unified system.</p></div>
                  <div><div class="flex items-center mb-2"><i data-lucide="shield" class="h-6 w-6 text-blue-600 mr-3"></i><h4 class="text-xl font-bold text-gray-900">Reliability</h4></div><p class="text-gray-600">Enterprise-grade infrastructure ensures high availability and call quality. Built-in redundancy and failover capabilities.</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        ${ctaSection('Ready to Modernize Your Business Phone System?', 'Contact us today to learn how our IP PBX solutions can transform your business communications.', 'Get Started', '/contact')}
      </div>
    </div>`;
}

function contactContent(site: Record<string, any>, page: Record<string, any>): string {
  const name = (site.business_name as string) || 'TrustedNetworx';
  const h1 = (page.hero_h1 as string) || 'Contact Us';
  const subtitle = (page.hero_subtitle as string) || 'Get in touch with our team to discuss your business needs';
  const phone = (site.phone as string) || '';
  const email = (site.email as string) || '';
  const addr = getAddr(site);

  return `
    <div class="bg-white">
      ${heroSection(IMG.circuitBoard, h1, subtitle)}

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div class="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
            <h2 class="text-3xl font-extrabold text-gray-900 text-center mb-8">Get In Touch</h2>
            <form onsubmit="handleContactSubmit(event)" data-mailto="${esc(email)}" class="space-y-6">
              <div><label for="name" class="block text-sm font-medium text-gray-700">Name *</label><input type="text" name="name" id="name" required class="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2" /></div>
              <div><label for="title" class="block text-sm font-medium text-gray-700">Title</label><input type="text" name="title" id="title" class="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2" /></div>
              <div><label for="company" class="block text-sm font-medium text-gray-700">Company *</label><input type="text" name="company" id="company" required class="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2" /></div>
              <div><label for="email" class="block text-sm font-medium text-gray-700">Email *</label><input type="email" name="email" id="email" required class="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2" /></div>
              <div><label for="phone" class="block text-sm font-medium text-gray-700">Phone</label><input type="tel" name="phone" id="phone" class="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2" /></div>
              <div><label for="message" class="block text-sm font-medium text-gray-700">Your Message *</label><textarea name="message" id="message" required rows="4" class="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"></textarea></div>
              <div><button type="submit" class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 p-2">Send Message</button></div>
            </form>
          </div>
          <div>
            <h3 class="text-xl font-bold text-gray-900 mb-4">Contact Information</h3>
            <div class="space-y-6">
              ${phone ? `<div class="flex items-center text-gray-700"><span class="text-blue-600 mr-3">${SVG.phone}</span><span>${esc(phone)}</span></div>` : ''}
              ${email ? `<div class="flex items-center text-gray-700"><span class="text-blue-600 mr-3">${SVG.mail}</span><span>${esc(email)}</span></div>` : ''}
              ${addr ? `<div class="flex items-center text-gray-700"><span class="text-blue-600 mr-3">${SVG.mapPin}</span><span>${esc(addr)}</span></div>` : ''}
            </div>
            <div class="mt-12">
              <h3 class="text-xl font-bold text-gray-900 mb-4">About Us</h3>
              <p class="text-gray-600">${esc(name)} is your partner in telecommunications solutions. We specialize in providing cutting-edge technology solutions that help businesses stay connected, efficient, and competitive in today&#8217;s digital world.</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Generic fallback for unknown slugs — renders content_sections
// ---------------------------------------------------------------------------
function genericContent(site: Record<string, any>, page: Record<string, any>): string {
  const h1 = (page.hero_h1 as string) || (page.title as string) || '';
  const subtitle = (page.hero_subtitle as string) || '';
  const sections = getSections(page);
  const faq = getFaq(page);

  const sectionsHtml = sections.map(s => `
        <div class="glass-morphism rounded-2xl p-8 mb-8">
          <h2 class="text-3xl font-extrabold text-gray-900 mb-4">${esc(s.heading)}</h2>
          <p class="text-lg text-gray-600">${s.body}</p>
          ${s.bullets?.length ? `<ul class="mt-4 space-y-2 text-gray-600">${s.bullets.map(b => `<li class="flex items-start"><span class="text-blue-600 mr-2">&#8226;</span>${esc(b)}</li>`).join('')}</ul>` : ''}
          ${s.cta_text ? `<div class="mt-6"><a href="${esc(s.cta_link || '/contact')}" class="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 md:py-4 md:text-lg md:px-10 transition-colors duration-300">${esc(s.cta_text)}</a></div>` : ''}
        </div>`).join('');

  const faqHtml = faq.length ? `
        <div class="glass-morphism rounded-2xl p-8 mb-8">
          <h2 class="text-3xl font-extrabold text-gray-900 mb-8 text-center">Frequently Asked Questions</h2>
          <div class="space-y-6">
            ${faq.map(f => `<div><h3 class="text-xl font-bold text-gray-900 mb-2">${esc(f.question)}</h3><p class="text-gray-600">${esc(f.answer)}</p></div>`).join('')}
          </div>
        </div>` : '';

  return `
    <div class="bg-gray-50">
      ${heroSection(IMG.heroTech, h1, subtitle, 'Contact Us', '/contact')}
      <div class="relative">
        ${decorativeBg()}
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          ${sectionsHtml}
          ${faqHtml}
        </div>
        ${ctaSection('Ready to Get Started?', 'Contact us today to learn more about our solutions.', 'Contact Us', '/contact')}
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export function assembleTrustedNetworxPage(
  site: Record<string, any>,
  page: Record<string, any>,
  allPages: Record<string, any>[],
): string {
  const slug = (page.slug as string) || '';
  const normalizedSlug = slug.replace(/^\/+/, '').replace(/\/+$/, '') || 'home';

  let body: string;
  switch (normalizedSlug) {
    case 'home':
    case '':
      body = homeContent(site, page, allPages);
      break;
    case 'about':
      body = aboutContent(site, page);
      break;
    case 'pots-replacement':
      body = potsContent(site, page);
      break;
    case 'voice-solutions':
      body = voiceContent(site, page);
      break;
    case 'internet-connectivity':
      body = internetContent(site, page);
      break;
    case 'mobility-solutions':
      body = mobilityContent(site, page);
      break;
    case 'fleet-management':
      body = fleetContent(site, page);
      break;
    case 'ip-pbx':
      body = ipPbxContent(site, page);
      break;
    case 'contact':
      body = contactContent(site, page);
      break;
    default:
      body = genericContent(site, page);
      break;
  }

  return wrapPage(site, page, allPages, body);
}
