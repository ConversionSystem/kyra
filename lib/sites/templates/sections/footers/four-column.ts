interface FooterData {
  businessName: string;
  phone?: string;
  phoneHref?: string;
  email?: string;
  address?: string;
  formattedHours?: string;
  services?: Array<{ name: string; slug: string }>;
  cities?: Array<{ name: string; slug: string }>;
  bookingUrl?: string;
  colors: { primary: string; secondary: string };
  footerTagline?: string;
  socialLinks?: Record<string, string>;
  designStyle?: string;
}

// Lucide SVGs from original site
const ICON_THERMOMETER_FOOTER = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-thermometer h-5 w-5 text-white" aria-hidden="true"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"></path></svg>`;
const ICON_PHONE_FOOTER = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone h-4 w-4 text-red-500" aria-hidden="true"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"></path></svg>`;
const ICON_MAIL = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mail h-4 w-4 text-red-500" aria-hidden="true"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path><rect x="2" y="4" width="20" height="16" rx="2"></rect></svg>`;
const ICON_MAP_PIN_FOOTER = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin h-4 w-4 text-red-500" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle></svg>`;
const ICON_CLOCK = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock h-4 w-4 text-red-500" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>`;

const SOCIAL_ICONS: Record<string, string> = {
  facebook: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
  twitter: 'M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z',
  linkedin: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  instagram: 'M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z',
  yelp: 'M21.714 18.571L18.857 15.714M12 21.429V12M2.286 5.571L5.143 8.429M12 2.571V12M21.714 5.571L18.857 8.429M2.286 18.571L5.143 15.714',
};

function buildSocialIcons(data: FooterData, primary: string, isDark: boolean): string {
  const hoverBg = isDark ? primary : primary;
  const defaultBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.07)';

  const platforms = data.socialLinks
    ? Object.entries(data.socialLinks).filter(([, url]) => url)
    : [['facebook', '#'], ['twitter', '#'], ['linkedin', '#']].map(([p, u]) => [p, u]);

  return platforms.map(([platform, url]) => {
    const iconPath = SOCIAL_ICONS[platform as string] || SOCIAL_ICONS.facebook;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="width: 36px; height: 36px; background: ${defaultBg}; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='${hoverBg}'" onmouseout="this.style.background='${defaultBg}'"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${isDark ? '#64748b' : '#9ca3af'}" stroke-width="2"><path d="${iconPath}"/></svg></a>`;
  }).join('');
}

export function fourColumnFooter(data: FooterData): string {
  const isDark = data.designStyle === 'modern-dark';
  const { primary } = data.colors;
  const year = new Date().getFullYear();

  if (isDark) return modernDarkFooter(data, primary, year);
  return lightFooter(data, primary, year);
}

function modernDarkFooter(data: FooterData, _primary: string, year: number): string {
  const serviceLinks = (data.services || []).slice(0, 7).map(s =>
    `<a class="block text-sm text-gray-400 hover:text-white transition" href="/services/${s.slug}">${s.name}</a>`
  ).join('');

  const cityLinks = (data.cities || []).slice(0, 7).map(c =>
    `<a class="block text-sm text-gray-400 hover:text-white transition" href="/${c.slug}">${c.name}</a>`
  ).join('');

  const phone = data.phone
    ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">${ICON_PHONE_FOOTER} ${data.phone}</a>`
    : '';

  const email = data.email
    ? `<a href="mailto:${data.email}" class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">${ICON_MAIL} ${data.email}</a>`
    : '';

  const address = data.address
    ? `<div class="flex items-center gap-2 text-sm text-gray-400">${ICON_MAP_PIN_FOOTER} ${data.address}</div>`
    : '';

  const hours = data.formattedHours
    ? `<div class="flex items-center gap-2 text-sm text-gray-400">${ICON_CLOCK} ${data.formattedHours}</div>`
    : '';

  return `<footer class="border-t border-white/10 bg-gray-900/50"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"><div class="grid md:grid-cols-4 gap-8"><div><div class="flex items-center gap-2 mb-3"><div class="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center">${ICON_THERMOMETER_FOOTER}</div><span class="font-bold text-white">${data.businessName}</span></div><p class="text-sm text-gray-400 mb-3">${data.footerTagline || 'Proudly serving our community.'}</p><p class="text-sm text-gray-400">Serving the area with quality and care.</p></div><div><h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-3">Services</h4><div class="space-y-2">${serviceLinks || '<span class="text-sm text-gray-500">Coming soon</span>'}</div></div><div><h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-3">Service Areas</h4><div class="space-y-2">${cityLinks || '<span class="text-sm text-gray-500">Local &amp; Surrounding Areas</span>'}</div></div><div><h4 class="text-sm font-semibold text-white uppercase tracking-wider mb-3">Contact</h4><div class="space-y-3">${phone}${email}${address}${hours}</div></div></div><div class="border-t border-white/10 mt-10 pt-6 text-center text-xs text-gray-500">&copy; ${year} ${data.businessName}. All rights reserved.</div></div></footer>`;
}

function lightFooter(data: FooterData, primary: string, year: number): string {
  const linkColor = '#9ca3af';
  const borderColor = 'rgba(255,255,255,0.08)';

  const serviceLinks = (data.services || []).slice(0, 7).map(s =>
    `<li><a href="/services/${s.slug}" style="color: ${linkColor}; text-decoration: none; font-size: 0.9rem; display: flex; align-items: center; gap: 6px; transition: color 0.2s;" onmouseover="this.style.color='${primary}'" onmouseout="this.style.color='${linkColor}'">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
      ${s.name}
    </a></li>`
  ).join('\n          ');

  const cityLinks = (data.cities || []).slice(0, 7).map(c =>
    `<li><a href="/cities/${c.slug}" style="color: ${linkColor}; text-decoration: none; font-size: 0.9rem; display: flex; align-items: center; gap: 6px; transition: color 0.2s;" onmouseover="this.style.color='${primary}'" onmouseout="this.style.color='${linkColor}'">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.4 7.05 11.5 7.35 11.76a1 1 0 0 0 1.3 0C12.95 21.5 20 15.4 20 10a8 8 0 0 0-8-8z"/></svg>
      ${c.name}
    </a></li>`
  ).join('\n          ');

  const phone = data.phone
    ? `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.75rem;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${primary}" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
        <a href="${data.phoneHref || `tel:${data.phone}`}" style="color: ${primary}; text-decoration: none; font-weight: 700; font-size: 1rem; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">${data.phone}</a>
      </div>`
    : '';

  const email = data.email
    ? `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 0.75rem;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${linkColor}" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        <a href="mailto:${data.email}" style="color: ${linkColor}; text-decoration: none; font-size: 0.9rem; transition: color 0.2s;" onmouseover="this.style.color='${primary}'" onmouseout="this.style.color='${linkColor}'">${data.email}</a>
      </div>`
    : '';

  const address = data.address
    ? `<div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 0.75rem;">
        <svg width="16" height="16" style="flex-shrink: 0; margin-top: 2px;" viewBox="0 0 24 24" fill="none" stroke="${linkColor}" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        <span style="color: ${linkColor}; font-size: 0.9rem; line-height: 1.5;">${data.address}</span>
      </div>`
    : '';

  const hours = data.formattedHours
    ? `<div style="display: flex; align-items: flex-start; gap: 8px; margin-top: 0.25rem;">
        <svg width="16" height="16" style="flex-shrink: 0; margin-top: 2px;" viewBox="0 0 24 24" fill="none" stroke="${linkColor}" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span style="color: ${linkColor}; font-size: 0.85rem; line-height: 1.6; white-space: pre-line;">${data.formattedHours}</span>
      </div>`
    : '';

  return `<footer style="background: #0f172a; padding: 4.5rem 1.5rem 0;" aria-label="${data.businessName} footer">
  <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.2fr; gap: 3rem;">
    <div>
      <div style="margin-bottom: 1.25rem;">
        <span style="font-size: 1.5rem; font-weight: 900; color: #ffffff; letter-spacing: -0.02em;">${data.businessName}</span>
      </div>
      <p style="color: #6b7280; font-size: 0.9rem; line-height: 1.7; margin: 0 0 1.5rem 0; max-width: 240px;">${data.footerTagline || 'Proudly serving our community with quality, integrity, and care on every job.'}</p>
      <div style="display: flex; gap: 10px;">
        ${buildSocialIcons(data, primary, false)}
      </div>
    </div>
    <div>
      <h4 style="color: #ffffff; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 1.25rem 0;">Services</h4>
      <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem;">
        ${serviceLinks || '<li style="color: #6b7280; font-size: 0.9rem;">Coming soon</li>'}
      </ul>
    </div>
    <div>
      <h4 style="color: #ffffff; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 1.25rem 0;">Service Areas</h4>
      <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem;">
        ${cityLinks || '<li style="color: #6b7280; font-size: 0.9rem;">Local &amp; Surrounding Areas</li>'}
      </ul>
    </div>
    <div>
      <h4 style="color: #ffffff; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 1.25rem 0;">Contact Us</h4>
      ${phone}
      ${email}
      ${address}
      ${hours}
      ${data.bookingUrl ? `<div style="margin-top: 1.25rem;"><a href="${data.bookingUrl}" style="display: inline-flex; align-items: center; gap: 6px; background: ${primary}; color: white; font-weight: 700; font-size: 0.88rem; padding: 10px 20px; border-radius: 8px; text-decoration: none; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Book Appointment →</a></div>` : ''}
    </div>
  </div>
  <div style="max-width: 1200px; margin: 3rem auto 0; padding: 1.5rem 0; border-top: 1px solid ${borderColor}; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
    <p style="color: #4b5563; font-size: 0.85rem; margin: 0;">&copy; ${year} ${data.businessName}. All rights reserved.</p>
    <div style="display: flex; gap: 1.5rem;">
      <a href="/privacy" style="color: #4b5563; font-size: 0.85rem; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#9ca3af'" onmouseout="this.style.color='#4b5563'">Privacy Policy</a>
      <a href="/terms" style="color: #4b5563; font-size: 0.85rem; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='#9ca3af'" onmouseout="this.style.color='#4b5563'">Terms of Service</a>
      <span style="color: #374151; font-size: 0.85rem;">Powered by <a href="https://kyra.conversionsystem.com" target="_blank" style="color: ${primary}; text-decoration: none; font-weight: 600;">Kyra AI</a></span>
    </div>
  </div>
</footer>`;
}

export default fourColumnFooter;
