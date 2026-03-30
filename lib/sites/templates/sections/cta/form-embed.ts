interface CtaData {
  heading?: string;
  subtitle?: string;
  phone?: string;
  phoneHref?: string;
  bookingUrl?: string;
  businessName?: string;
  emergencyText?: string;
  clientId?: string;
  colors: { primary: string; secondary: string };
}

export function formEmbedCta(data: CtaData): string {
  const heading = data.heading || 'Get a Free Quote Today';
  const phone = data.phone || '';
  const phoneHref = data.phoneHref || `tel:${phone}`;
  const { primary, secondary } = data.colors;

  const benefits = [
    { icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`, text: 'No obligation — completely free' },
    { icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"></polyline></svg>`, text: 'We respond within 1 hour' },
    { icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`, text: 'Licensed, insured, and bonded' },
    { icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`, text: '5-star rated service, every time' },
  ];

  const inputStyle = 'style="width: 100%; box-sizing: border-box; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 0.95rem; color: #111827; background: #ffffff; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor=\'' + primary + '\'" onblur="this.style.borderColor=\'#e5e7eb\'"';

  return `<section style="padding: 5rem 1.5rem; background: #f8fafc;" aria-label="Contact form section" id="contact">
  <div style="max-width: 1100px; margin: 0 auto;">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.15);">

      <!-- Left: Benefits panel -->
      <div style="background: linear-gradient(145deg, ${secondary} 0%, ${primary} 60%, ${primary}cc 100%); padding: 3.5rem; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden;">
        <div style="position: absolute; inset: 0; opacity: 0.06; background-image: radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px); background-size: 22px 22px;" aria-hidden="true"></div>
        <div style="position: relative; z-index: 1;">
          <div style="display: inline-block; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 5px 14px; border-radius: 100px; margin-bottom: 1.25rem;">Free & No Obligation</div>
          <h2 style="font-size: clamp(1.6rem, 3vw, 2.2rem); font-weight: 900; color: #ffffff; margin: 0 0 0.75rem 0; letter-spacing: -0.02em; line-height: 1.2;">${heading}</h2>
          ${data.subtitle ? `<p style="color: rgba(255,255,255,0.88); font-size: 1rem; line-height: 1.6; margin: 0 0 2rem 0;">${data.subtitle}</p>` : '<div style="height: 1.5rem;"></div>'}
          <div style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2.5rem;">
            ${benefits.map(b => `<div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${b.icon}</div>
              <span style="color: rgba(255,255,255,0.92); font-size: 0.93rem; font-weight: 500;">${b.text}</span>
            </div>`).join('')}
          </div>
          ${phone ? `<div style="padding: 1rem 1.25rem; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); border-radius: 14px; backdrop-filter: blur(8px);">
            <p style="color: rgba(255,255,255,0.75); font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 4px 0;">Prefer to call?</p>
            <a href="${phoneHref}" style="color: #ffffff; font-weight: 900; font-size: 1.3rem; text-decoration: none; letter-spacing: -0.01em;">${phone}</a>
          </div>` : ''}
        </div>
      </div>

      <!-- Right: Form panel -->
      <div style="background: #ffffff; padding: 3.5rem;">
        <h3 style="font-size: 1.4rem; font-weight: 800; color: #111827; margin: 0 0 0.5rem 0;">Send Us a Message</h3>
        <p style="color: #6b7280; font-size: 0.9rem; margin: 0 0 2rem 0;">We'll get back to you within 1 hour.</p>
        <form id="kyra-contact-form" onsubmit="kyraSubmitForm(event)" data-client-id="${data.clientId || ''}" data-business-name="${data.businessName || ''}" style="display: flex; flex-direction: column; gap: 1.1rem;">
          <div>
            <label for="kyra-name" style="display: block; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 6px;">Full Name *</label>
            <input type="text" id="kyra-name" name="name" required placeholder="Your full name" ${inputStyle} />
          </div>
          <div>
            <label for="kyra-phone" style="display: block; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 6px;">Phone Number *</label>
            <input type="tel" id="kyra-phone" name="phone" required placeholder="(555) 123-4567" ${inputStyle} />
          </div>
          <div>
            <label for="kyra-email" style="display: block; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 6px;">Email</label>
            <input type="email" id="kyra-email" name="email" placeholder="your@email.com" ${inputStyle} />
          </div>
          <div>
            <label for="kyra-message" style="display: block; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 6px;">How Can We Help? *</label>
            <textarea id="kyra-message" name="message" rows="4" required placeholder="Tell us about your project or question..." style="width: 100%; box-sizing: border-box; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 0.95rem; color: #111827; background: #ffffff; outline: none; transition: border-color 0.2s; resize: vertical; font-family: inherit;" onfocus="this.style.borderColor='${primary}'" onblur="this.style.borderColor='#e5e7eb'"></textarea>
          </div>
          <button type="submit" style="width: 100%; padding: 14px; background: ${primary}; color: #ffffff; font-weight: 800; font-size: 1.05rem; border: none; border-radius: 12px; cursor: pointer; transition: opacity 0.2s, transform 0.2s; box-shadow: 0 6px 20px ${primary}50;" onmouseover="this.style.opacity='0.9';this.style.transform='translateY(-1px)'" onmouseout="this.style.opacity='1';this.style.transform='translateY(0)'">
            Get My Free Quote →
          </button>
          <div id="kyra-form-status" style="display:none;"></div>
          <p style="text-align: center; color: #9ca3af; font-size: 0.8rem; margin: 0;">🔒 Your information is safe with us. No spam, ever.</p>
        </form>
        <script>
        function kyraSubmitForm(e) {
          e.preventDefault();
          var form = document.getElementById("kyra-contact-form");
          var btn = form.querySelector("button[type=submit]");
          var status = document.getElementById("kyra-form-status");
          var data = {
            name: form.querySelector("[name=name]").value,
            email: form.querySelector("[name=email]").value,
            phone: form.querySelector("[name=phone]") ? form.querySelector("[name=phone]").value : "",
            message: form.querySelector("[name=message]") ? form.querySelector("[name=message]").value : "",
            clientId: form.dataset.clientId || "",
            businessName: form.dataset.businessName || "",
            source: "website_form"
          };
          btn.disabled = true;
          btn.textContent = "Sending...";
          status.style.display = "none";
          fetch("https://kyra.conversionsystem.com/api/sites/contact", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(data)
          })
          .then(function(r) { return r.json(); })
          .then(function(res) {
            if (res.ok) {
              form.style.display = "none";
              status.style.display = "block";
              status.style.color = "#16a34a";
              status.style.fontWeight = "700";
              status.style.fontSize = "1.1rem";
              status.style.padding = "2rem";
              status.style.textAlign = "center";
              status.textContent = "Message sent! We'll be in touch shortly.";
            } else {
              btn.disabled = false;
              btn.textContent = "Get My Free Quote \\u2192";
              status.style.display = "block";
              status.style.color = "#dc2626";
              status.textContent = "Something went wrong. Please call us directly.";
            }
          })
          .catch(function() {
            btn.disabled = false;
            btn.textContent = "Get My Free Quote \\u2192";
            status.style.display = "block";
            status.style.color = "#dc2626";
            status.textContent = "Network error. Please call us directly.";
          });
        }
        </script>
      </div>
    </div>
  </div>
</section>`;
}

export default formEmbedCta;
