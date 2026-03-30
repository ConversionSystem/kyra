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

export function splitOfferCta(data: CtaData): string {
  const heading = data.heading || 'Let\u2019s Work Together';
  const inputClasses = 'w-full px-4 py-3 rounded-lg text-base outline-none';

  const benefits = [
    'Fast, reliable service you can count on',
    'Licensed and insured professionals',
    'Transparent pricing with no hidden fees',
    'Satisfaction guaranteed on every job',
  ];

  const checkmarks = benefits.map(b => `
    <li class="flex items-start gap-3">
      <svg class="flex-shrink-0 mt-1" style="width:20px;height:20px;fill:${data.colors.primary};" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
      <span style="color: #1f2937;">${b}</span>
    </li>`).join('');

  return `<section id="contact" class="py-16 sm:py-24 px-4" style="background: var(--color-surface);" aria-label="Contact us">
  <div class="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
    <div>
      <h2 class="text-3xl sm:text-4xl font-bold mb-4" style="color: #1f2937;">${heading}</h2>
      ${data.subtitle ? `<p class="text-lg mb-8" style="color: #6b7280;">${data.subtitle}</p>` : ''}
      <ul class="space-y-4 mb-8">${checkmarks}</ul>
      ${data.phone ? `<p class="text-lg" style="color: #1f2937;">Call us: <a href="${data.phoneHref || `tel:${data.phone}`}" class="font-semibold transition-opacity hover:opacity-80" style="color: ${data.colors.primary};">${data.phone}</a></p>` : ''}
      ${data.emergencyText ? `<p class="mt-4 text-sm font-medium" style="color: ${data.colors.primary};">${data.emergencyText}</p>` : ''}
    </div>
    <div class="rounded-2xl p-8 shadow-xl" style="background: var(--color-surface);">
      <h3 class="text-xl font-semibold mb-6" style="color: #1f2937;">Send Us a Message</h3>
      <form id="kyra-contact-form" onsubmit="kyraSubmitForm(event)" data-client-id="${data.clientId || ''}" data-business-name="${data.businessName || ''}" class="space-y-4">
        <input type="text" name="name" required placeholder="Your name" class="${inputClasses}" style="background: #ffffff; border: 1px solid #e5e7eb; color: #1f2937;" />
        <input type="email" name="email" required placeholder="your@email.com" class="${inputClasses}" style="background: #ffffff; border: 1px solid #e5e7eb; color: #1f2937;" />
        <input type="tel" name="phone" placeholder="(555) 123-4567" class="${inputClasses}" style="background: #ffffff; border: 1px solid #e5e7eb; color: #1f2937;" />
        <textarea name="message" rows="3" required placeholder="How can we help?" class="${inputClasses} resize-y" style="background: #ffffff; border: 1px solid #e5e7eb; color: #1f2937;"></textarea>
        <button type="submit" class="w-full py-3 rounded-lg text-lg font-semibold transition-opacity hover:opacity-90" style="background: ${data.colors.primary}; color: #ffffff;">Send Message</button>
        <div id="kyra-form-status" style="display:none;"></div>
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
            btn.textContent = "Send Message";
            status.style.display = "block";
            status.style.color = "#dc2626";
            status.textContent = "Something went wrong. Please call us directly.";
          }
        })
        .catch(function() {
          btn.disabled = false;
          btn.textContent = "Send Message";
          status.style.display = "block";
          status.style.color = "#dc2626";
          status.textContent = "Network error. Please call us directly.";
        });
      }
      </script>
    </div>
  </div>
</section>`;
}

export default splitOfferCta;
