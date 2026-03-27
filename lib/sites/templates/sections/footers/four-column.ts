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
}

export function fourColumnFooter(data: FooterData): string {
  const { primary } = data.colors;
  const year = new Date().getFullYear();

  const serviceLinks = (data.services || []).slice(0, 7).map(s =>
    `<li><a href="/services/${s.slug}" style="color: #9ca3af; text-decoration: none; font-size: 0.9rem; display: flex; align-items: center; gap: 6px; transition: color 0.2s;" onmouseover="this.style.color='${primary}'" onmouseout="this.style.color='#9ca3af'">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
      ${s.name}
    </a></li>`
  ).join('\n          ');

  const cityLinks = (data.cities || []).slice(0, 7).map(c =>
    `<li><a href="/cities/${c.slug}" style="color: #9ca3af; text-decoration: none; font-size: 0.9rem; display: flex; align-items: center; gap: 6px; transition: color 0.2s;" onmouseover="this.style.color='${primary}'" onmouseout="this.style.color='#9ca3af'">
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        <a href="mailto:${data.email}" style="color: #9ca3af; text-decoration: none; font-size: 0.9rem; transition: color 0.2s;" onmouseover="this.style.color='${primary}'" onmouseout="this.style.color='#9ca3af'">${data.email}</a>
      </div>`
    : '';

  const address = data.address
    ? `<div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 0.75rem;">
        <svg width="16" height="16" style="flex-shrink: 0; margin-top: 2px;" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
        <span style="color: #9ca3af; font-size: 0.9rem; line-height: 1.5;">${data.address}</span>
      </div>`
    : '';

  const hours = data.formattedHours
    ? `<div style="display: flex; align-items: flex-start; gap: 8px; margin-top: 0.25rem;">
        <svg width="16" height="16" style="flex-shrink: 0; margin-top: 2px;" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        <span style="color: #9ca3af; font-size: 0.85rem; line-height: 1.6; white-space: pre-line;">${data.formattedHours}</span>
      </div>`
    : '';

  return `<footer style="background: #0f172a; padding: 4.5rem 1.5rem 0;" aria-label="${data.businessName} footer">
  <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.2fr; gap: 3rem;">

    <!-- Col 1: Brand -->
    <div>
      <div style="margin-bottom: 1.25rem;">
        <span style="font-size: 1.5rem; font-weight: 900; color: #ffffff; letter-spacing: -0.02em;">${data.businessName}</span>
      </div>
      <p style="color: #6b7280; font-size: 0.9rem; line-height: 1.7; margin: 0 0 1.5rem 0; max-width: 240px;">Proudly serving our community with quality, integrity, and care on every job.</p>
      <!-- Social icons placeholder -->
      <div style="display: flex; gap: 10px;">
        ${['M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z', 'M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z', 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'].map(path => `<a href="#" style="width: 36px; height: 36px; background: rgba(255,255,255,0.07); border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: background 0.2s;" onmouseover="this.style.background='${primary}'" onmouseout="this.style.background='rgba(255,255,255,0.07)'"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><path d="${path}"/></svg></a>`).join('')}
      </div>
    </div>

    <!-- Col 2: Services -->
    <div>
      <h4 style="color: #ffffff; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 1.25rem 0;">Services</h4>
      <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem;">
        ${serviceLinks || '<li style="color: #6b7280; font-size: 0.9rem;">Coming soon</li>'}
      </ul>
    </div>

    <!-- Col 3: Service Areas -->
    <div>
      <h4 style="color: #ffffff; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 1.25rem 0;">Service Areas</h4>
      <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem;">
        ${cityLinks || `<li style="color: #6b7280; font-size: 0.9rem;">Local &amp; Surrounding Areas</li>`}
      </ul>
    </div>

    <!-- Col 4: Contact -->
    <div>
      <h4 style="color: #ffffff; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 1.25rem 0;">Contact Us</h4>
      ${phone}
      ${email}
      ${address}
      ${hours}
      ${data.bookingUrl ? `<div style="margin-top: 1.25rem;"><a href="${data.bookingUrl}" style="display: inline-flex; align-items: center; gap: 6px; background: ${primary}; color: white; font-weight: 700; font-size: 0.88rem; padding: 10px 20px; border-radius: 8px; text-decoration: none; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Book Appointment →</a></div>` : ''}
    </div>
  </div>

  <!-- Bottom bar -->
  <div style="max-width: 1200px; margin: 3rem auto 0; padding: 1.5rem 0; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
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
