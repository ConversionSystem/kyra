interface HeroData {
  h1: string;
  subtitle: string;
  phone?: string;
  phoneHref?: string;
  bookingUrl?: string;
  businessName?: string;
  clientId?: string;
  emergencyText?: string;
  photoUrl?: string;
  logoUrl?: string;
  colors: { primary: string; secondary: string };
  ctaText?: string;
  ctaLink?: string;
  designStyle?: string;
}

// ─── SVG Icons (Lucide paths from original site) ────────────────────────────
const ICON_SHIELD = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield h-4 w-4 text-red-500" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path></svg>`;
const ICON_STAR = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star h-4 w-4 text-yellow-500 fill-yellow-500" aria-hidden="true"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path></svg>`;
const ICON_AWARD = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-award h-4 w-4 text-red-500" aria-hidden="true"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"></path><circle cx="12" cy="8" r="6"></circle></svg>`;
const ICON_ZAP = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap h-4 w-4 text-amber-500" aria-hidden="true"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path></svg>`;
const ICON_PHONE_H5 = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone h-5 w-5" aria-hidden="true"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"></path></svg>`;
const ICON_ARROW_RIGHT = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right h-5 w-5" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;

function phoneIcon(size = 22): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
}

function calendarIcon(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`;
}

export function fullBleedHero(data: HeroData): string {
  const isDark = data.designStyle === 'modern-dark';
  if (isDark) return modernDarkHero(data);
  return lightHero(data);
}

function modernDarkHero(data: HeroData): string {
  const phoneHref = data.phoneHref || (data.phone ? `tel:${data.phone}` : '#');
  const inputClasses = 'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm';

  return `<section class="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden"><div class="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div><div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(220,38,38,0.15),transparent_60%)]"></div><div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="grid lg:grid-cols-2 gap-12 items-center"><div>${data.emergencyText ? `<div class="flex items-center gap-2 mb-4">${ICON_SHIELD}<span class="text-sm text-red-400 font-medium">${data.emergencyText}</span></div>` : ''}<h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">${data.h1}</h1><p class="mt-4 text-lg text-gray-400 max-w-xl">${data.subtitle}</p><div class="flex flex-wrap items-center gap-4 mt-6"><div class="flex items-center gap-1.5 text-sm text-gray-300">${ICON_STAR}<span class="font-semibold">5.0</span> Google Rating</div><div class="flex items-center gap-1.5 text-sm text-gray-300">${ICON_AWARD}36+ Years Experience</div><div class="flex items-center gap-1.5 text-sm text-gray-300">${ICON_ZAP}Same-Day Service</div></div><div class="flex flex-col sm:flex-row gap-3 mt-8">${data.phone ? `<a href="${phoneHref}" class="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3.5 rounded-xl text-lg font-semibold transition shadow-lg shadow-red-600/25">${ICON_PHONE_H5}Call Now - ${data.phone}</a>` : ''}<a href="#quote" class="flex items-center justify-center gap-2 border border-white/20 hover:bg-white/5 text-white px-6 py-3.5 rounded-xl text-lg font-medium transition">Get Free Quote${ICON_ARROW_RIGHT}</a></div></div><div id="quote" class="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 sm:p-8"><h2 class="text-xl font-bold text-white mb-1">Get a Free Quote</h2><p class="text-sm text-gray-400 mb-6">We&#x27;ll respond within 1 hour during business hours</p><form id="kyra-contact-form" onsubmit="kyraSubmitForm(event)" data-client-id="${data.clientId || ''}" data-business-name="${data.businessName || ''}" class="space-y-4"><div class="grid sm:grid-cols-2 gap-4"><input type="text" name="name" placeholder="Your Name *" required="" class="${inputClasses}" value=""/><input type="tel" name="phone" placeholder="Phone Number *" required="" class="${inputClasses}" value=""/></div><input type="email" name="email" placeholder="Email Address" class="${inputClasses}" value=""/><select name="service" class="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm appearance-none"><option value="" selected="">Select Service Needed</option><option value="ac-repair">AC Repair</option><option value="heating">Heating Repair</option><option value="refrigeration">Refrigeration</option><option value="installation">New Installation</option><option value="maintenance">Maintenance</option><option value="emergency">Emergency Service</option></select><textarea name="message" placeholder="Describe your issue..." rows="3" class="${inputClasses} resize-none"></textarea><button type="submit" class="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-semibold text-lg transition shadow-lg shadow-red-600/25">Request Free Quote</button><div id="kyra-form-status" style="display:none;"></div><p class="text-xs text-gray-500 text-center">No spam, no obligation. We respect your privacy.</p></form><script>function kyraSubmitForm(e){e.preventDefault();var form=document.getElementById("kyra-contact-form");var btn=form.querySelector("button[type=submit]");var status=document.getElementById("kyra-form-status");var data={name:form.querySelector("[name=name]").value,email:form.querySelector("[name=email]")?form.querySelector("[name=email]").value:"",phone:form.querySelector("[name=phone]")?form.querySelector("[name=phone]").value:"",message:form.querySelector("[name=message]")?form.querySelector("[name=message]").value:"",clientId:form.dataset.clientId||"",businessName:form.dataset.businessName||"",source:"website_form"};btn.disabled=true;btn.textContent="Sending...";status.style.display="none";fetch("https://kyra.conversionsystem.com/api/sites/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}).then(function(r){return r.json()}).then(function(res){if(res.ok){form.style.display="none";status.style.display="block";status.style.color="#16a34a";status.style.fontWeight="700";status.style.fontSize="1rem";status.style.textAlign="center";status.textContent="Message sent! We\u2019ll be in touch shortly."}else{btn.disabled=false;btn.textContent="Request Free Quote";status.style.display="block";status.style.color="#dc2626";status.textContent="Something went wrong. Please call us directly."}}).catch(function(){btn.disabled=false;btn.textContent="Request Free Quote";status.style.display="block";status.style.color="#dc2626";status.textContent="Network error. Please call us directly."})}</script></div></div></div></section>`;
}

function lightHero(data: HeroData): string {
  const bg = data.photoUrl
    ? `background-image: url('${data.photoUrl}'); background-size: cover; background-position: center top;`
    : `background: linear-gradient(135deg, ${data.colors.secondary} 0%, ${data.colors.primary}99 60%, ${data.colors.secondary} 100%);`;

  const trustBadge = data.emergencyText
    ? `<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold tracking-wide mb-8" style="background: ${data.colors.primary}; color: #fff;">${data.emergencyText}</div>`
    : `<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-8" style="background: rgba(255,255,255,0.15); color: #fff; border: 1px solid rgba(255,255,255,0.3); backdrop-filter: blur(8px);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        Trusted Local Experts
      </div>`;

  return `<section class="relative min-h-[90vh] flex items-center overflow-hidden" style="${bg}" aria-label="${data.businessName || ''} hero">
  <div class="absolute inset-0" style="background: linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.2) 100%);"></div>
  <div class="absolute bottom-0 left-0 right-0 h-32" style="background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.3));"></div>
  <div class="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 py-24 sm:py-32 w-full">
    <div class="max-w-3xl">
      ${trustBadge}
      <h1 style="font-size: clamp(2.8rem, 6vw, 5.5rem); font-weight: 900; color: #ffffff; line-height: 1.05; letter-spacing: -0.03em; margin: 0 0 1.5rem 0; text-shadow: 0 2px 20px rgba(0,0,0,0.4);">${data.h1}</h1>
      <p style="font-size: clamp(1.1rem, 2vw, 1.35rem); color: rgba(255,255,255,0.88); line-height: 1.6; margin: 0 0 2.5rem 0; max-width: 38rem; text-shadow: 0 1px 8px rgba(0,0,0,0.3);">${data.subtitle}</p>
      <div class="flex flex-wrap gap-4 mb-10">
        ${data.phone ? `<a href="${data.phoneHref || `tel:${data.phone}`}" class="inline-flex items-center gap-3 font-bold px-8 py-4 rounded-xl text-lg shadow-2xl transition-all hover:scale-105 active:scale-100" style="background: #ffffff; color: ${data.colors.primary}; min-width: 200px; justify-content: center;">${phoneIcon()} ${data.phone}</a>` : ''}
        <a href="${data.ctaLink || data.bookingUrl || '#contact'}" class="inline-flex items-center gap-3 border-2 border-white/80 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all hover:bg-white/15" style="backdrop-filter: blur(8px);">${calendarIcon()} ${data.ctaText || (data.bookingUrl ? 'Book Online' : 'Get Free Quote')}</a>
      </div>
      <div class="flex flex-wrap gap-6 items-center">
        <div class="flex items-center gap-2 text-white/80 text-sm font-medium">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Licensed &amp; Insured
        </div>
        <div class="flex items-center gap-2 text-white/80 text-sm font-medium">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Free Estimates
        </div>
        <div class="flex items-center gap-2 text-white/80 text-sm font-medium">
          <svg width="18" height="18" fill="#fbbf24" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>
          5-Star Rated
        </div>
        ${data.emergencyText ? `<div class="flex items-center gap-2 text-white/80 text-sm font-medium">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"></polyline></svg>
          24/7 Available
        </div>` : ''}
      </div>
    </div>
  </div>
</section>`;
}

export default fullBleedHero;
