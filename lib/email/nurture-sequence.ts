// ============================================================================
// Kyra Nurture Email Sequence — 7 emails over 21 days
//
// Triggered on agency signup. Processed by /api/cron/email-sequence.
//
// Day 0  — Welcome + quick win (deploy first AI worker)
// Day 2  — Revenue math ($5K MRR model)
// Day 4  — GHL connection guide
// Day 7  — Social proof / case study
// Day 10 — Feature spotlight (website builder)
// Day 14 — Trial ending / upgrade nudge
// Day 21 — Win-back
// ============================================================================

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com').replace(/\/$/, '');
const FROM = 'Steve from Kyra <steve@kyra.conversionsystem.com>';

export { FROM as NURTURE_FROM };

// ── HTML helpers ─────────────────────────────────────────────────────────────

function wrap(body: string, email: string): string {
  const unsubUrl = `${APP_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" style="background:#fff;border-radius:12px;padding:40px;max-width:100%;border:1px solid #e5e7eb;">
        <tr><td>
          <div style="margin-bottom:24px;">
            <span style="font-size:20px;font-weight:700;color:#6366f1;">Kyra</span>
          </div>
          ${body}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 20px;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">
            Kyra AI · <a href="${APP_URL}" style="color:#9ca3af;">kyra.conversionsystem.com</a>
            · <a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function btn(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;margin:12px 0;">${text}</a>`;
}

function p(text: string, small = false): string {
  const size = small ? '13px' : '15px';
  return `<p style="color:#374151;font-size:${size};line-height:1.7;margin:0 0 16px;">${text}</p>`;
}

function h2(text: string): string {
  return `<h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 16px;">${text}</h2>`;
}

// ── Email 1 — Day 0: Welcome + Quick Win ─────────────────────────────────────

function email1(email: string): { subject: string; preview: string; html: string } {
  const body = `${h2('Your AI worker is ready. Let\'s deploy it.')}
    ${p('Welcome to Kyra. You just got access to something that can change your business.')}
    ${p('Here\'s your 5-minute quick win — deploy your first AI worker:')}
    <ol style="color:#374151;font-size:15px;line-height:2.2;padding-left:20px;margin:0 0 20px;">
      <li>Open your agency dashboard</li>
      <li>Click <strong>"Add Client"</strong></li>
      <li>Pick an industry template (dental, HVAC, real estate + 17 more)</li>
      <li>The AI personality is pre-built — review it, tweak if you want</li>
      <li>Hit <strong>Deploy</strong> — your AI worker goes live</li>
    </ol>
    ${p('That\'s it. Five steps. Your AI is now ready to handle conversations.')}
    ${btn('Deploy My First AI Worker →', `${APP_URL}/agency`)}
    ${p('Most agencies have their first AI worker live within 10 minutes of signing up.', true)}`;

  return {
    subject: 'Your AI worker is ready. Let\'s deploy it.',
    preview: 'Deploy your first AI worker in 5 minutes.',
    html: wrap(body, email),
  };
}

// ── Email 2 — Day 2: The Revenue Math ────────────────────────────────────────

function email2(email: string): { subject: string; preview: string; html: string } {
  const body = `${h2('The math that makes this work')}
    ${p('Let\'s talk numbers. This is the model that makes Kyra agencies profitable fast.')}
    ${p('<strong>Your cost:</strong> $99–$499/mo depending on plan.')}
    ${p('<strong>What you charge clients:</strong> $500–$2,000/mo per AI worker.')}
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#f9fafb;border-radius:8px;">
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px;color:#6b7280;font-size:13px;font-weight:600;">Clients</td>
        <td style="padding:12px;color:#6b7280;font-size:13px;font-weight:600;">Revenue</td>
        <td style="padding:12px;color:#6b7280;font-size:13px;font-weight:600;">Profit</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px;color:#374151;font-size:14px;">2 clients</td>
        <td style="padding:12px;color:#374151;font-size:14px;">$1,000–$4,000/mo</td>
        <td style="padding:12px;color:#059669;font-size:14px;font-weight:600;">Covers your cost</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px;color:#374151;font-size:14px;">5 clients</td>
        <td style="padding:12px;color:#374151;font-size:14px;">$2,500–$10,000/mo</td>
        <td style="padding:12px;color:#059669;font-size:14px;font-weight:600;">Pure profit</td>
      </tr>
      <tr>
        <td style="padding:12px;color:#374151;font-size:14px;font-weight:600;">10 clients</td>
        <td style="padding:12px;color:#6366f1;font-size:14px;font-weight:700;">$5,000–$20,000/mo</td>
        <td style="padding:12px;color:#059669;font-size:14px;font-weight:700;">$5K+ MRR 🔥</td>
      </tr>
    </table>
    ${p('Client 1 and 2 cover your cost. Client 3 is pure profit. Every client after that is leverage.')}
    ${btn('See Your Revenue Potential →', `${APP_URL}/agency/revenue`)}`;

  return {
    subject: 'How to turn Kyra into $5K/mo (the math)',
    preview: '2 clients covers your cost. Client 3 is pure profit.',
    html: wrap(body, email),
  };
}

// ── Email 3 — Day 4: GHL Connection Guide ────────────────────────────────────

function email3(email: string): { subject: string; preview: string; html: string } {
  const body = `${h2('Connect GoHighLevel — 5 minutes to live leads')}
    ${p('Once you connect GHL, your AI worker starts responding to every inbound SMS and missed call automatically. Under 30 seconds. Every time.')}
    ${p('<strong>Here\'s how:</strong>')}
    <ol style="color:#374151;font-size:15px;line-height:2.2;padding-left:20px;margin:0 0 20px;">
      <li>Go to your client\'s settings in Kyra</li>
      <li>Click the <strong>GHL</strong> tab</li>
      <li>Paste your Private Integration token from GoHighLevel</li>
      <li>Select the sub-account (location) to connect</li>
      <li>Done — your AI is now receiving real leads</li>
    </ol>
    ${p('<strong>What happens next:</strong>')}
    ${p('Every new SMS, missed call, or form submission in GHL triggers your AI. It responds instantly, qualifies the lead, and books appointments — all while your client sleeps.')}
    ${btn('Connect GHL Now →', `${APP_URL}/agency/ghl-setup`)}
    ${p('No GHL yet? No problem — the web chat widget works standalone. But GHL is where the real magic happens.', true)}`;

  return {
    subject: 'Connect GHL and your AI starts responding to leads automatically',
    preview: 'Your AI worker is waiting for real leads.',
    html: wrap(body, email),
  };
}

// ── Email 4 — Day 7: Social Proof / Case Study ──────────────────────────────

function email4(email: string): { subject: string; preview: string; html: string } {
  const body = `${h2('What happened when we gave an HVAC company an AI worker')}
    ${p('Quick story.')}
    ${p('An HVAC company in Texas was missing 40% of their inbound calls. Most came after hours — emergency AC repairs, furnace breakdowns, water heater failures. Every missed call was a $200–$800 job walking to a competitor.')}
    ${p('They connected Kyra to their GHL.')}
    ${p('<strong>Here\'s what changed:</strong>')}
    <ul style="color:#374151;font-size:15px;line-height:2;padding-left:20px;margin:0 0 20px;">
      <li>AI responded to every missed call within 15 seconds — even at 2am</li>
      <li>Qualified the emergency, captured the address, dispatched to the on-call tech</li>
      <li>Booked non-urgent jobs into the calendar automatically</li>
      <li><strong>Result: $8,200/mo in recovered revenue</strong> from previously missed leads</li>
    </ul>
    ${p('The agency that set this up charges the HVAC company $1,500/mo. The HVAC company is happy because they\'re making an extra $8K. Everyone wins.')}
    ${btn('See Results for Your Industry →', `${APP_URL}/use-cases`)}
    ${p('Dental, real estate, home services, legal, med spa — every industry has its own version of this story.', true)}`;

  return {
    subject: '43 new patients in 30 days (dental practice case study)',
    preview: 'The HVAC company that recovered $8K/mo in missed leads.',
    html: wrap(body, email),
  };
}

// ── Email 5 — Day 10: Feature Spotlight (Website Builder) ────────────────────

function email5(email: string): { subject: string; preview: string; html: string } {
  const body = `${h2('The feature 80% of users haven\'t discovered yet')}
    ${p('Did you know Kyra can build a full SEO website for your client in 10 minutes?')}
    ${p('Not a landing page. A real 15–25 page website with:')}
    <ul style="color:#374151;font-size:15px;line-height:2;padding-left:20px;margin:0 0 20px;">
      <li>Service pages optimized for local SEO</li>
      <li>About, contact, FAQ, testimonials pages</li>
      <li>AI chat widget embedded and ready</li>
      <li>Mobile-responsive, fast-loading</li>
      <li><strong>Growth Engine</strong> — keeps adding new pages automatically for long-tail keywords</li>
    </ul>
    ${p('Here\'s why this matters:')}
    ${p('<strong>Website + AI worker = a complete business.</strong> Your client gets a website that ranks, captures leads, and has an AI that responds instantly. You charge $1,000–$2,000/mo for the bundle. They\'d pay $3,000+ for that separately.')}
    ${btn('Build Your First Client Website →', `${APP_URL}/agency`)}
    ${p('The Growth Engine alone is worth the subscription — it publishes SEO content on autopilot.', true)}`;

  return {
    subject: 'Build a 20-page SEO website for your client in 10 minutes',
    preview: 'Most Kyra users don\'t know about this.',
    html: wrap(body, email),
  };
}

// ── Email 6 — Day 14: Trial Ending / Upgrade Nudge ──────────────────────────

function email6(email: string): { subject: string; preview: string; html: string } {
  const body = `${h2('Your trial has been running 2 weeks. Here\'s what\'s next.')}
    ${p('You\'ve had 14 days to explore Kyra. Let me recap what you have access to right now:')}
    <ul style="color:#374151;font-size:15px;line-height:2;padding-left:20px;margin:0 0 20px;">
      <li>AI workers that respond to leads in under 30 seconds</li>
      <li>GHL integration for SMS, calls, and forms</li>
      <li>Website builder with Growth Engine</li>
      <li>Web chat widget for any website</li>
    </ul>
    ${p('<strong>Here\'s what you unlock when you upgrade:</strong>')}
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#f9fafb;border-radius:8px;">
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px;color:#6b7280;font-size:13px;font-weight:600;">Plan</td>
        <td style="padding:12px;color:#6b7280;font-size:13px;font-weight:600;">Clients</td>
        <td style="padding:12px;color:#6b7280;font-size:13px;font-weight:600;">Key Benefit</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px;color:#374151;font-size:14px;font-weight:600;">Pro — $249/mo</td>
        <td style="padding:12px;color:#374151;font-size:14px;">Up to 10 clients</td>
        <td style="padding:12px;color:#374151;font-size:14px;">White-label + custom branding</td>
      </tr>
      <tr>
        <td style="padding:12px;color:#374151;font-size:14px;font-weight:600;">Scale — $499/mo</td>
        <td style="padding:12px;color:#374151;font-size:14px;">Up to 20 clients</td>
        <td style="padding:12px;color:#6366f1;font-size:14px;font-weight:600;">$10K+ MRR potential</td>
      </tr>
    </table>
    ${p('White-label means your clients see <em>your</em> brand, not Kyra. That\'s how you build a real agency — not a reseller.')}
    ${btn('Upgrade Your Plan →', `${APP_URL}/agency/billing`)}
    ${p('Questions? Reply to this email — I read every one.', true)}`;

  return {
    subject: 'Your trial has been running 2 weeks. Here\'s what\'s next.',
    preview: 'Add white-label, more clients, and higher revenue.',
    html: wrap(body, email),
  };
}

// ── Email 7 — Day 21: Win-Back ───────────────────────────────────────────────

function email7(email: string): { subject: string; preview: string; html: string } {
  const body = `${h2('Still here? I want to help.')}
    ${p('Hey — it\'s Steve from Kyra.')}
    ${p('I noticed you haven\'t deployed a client yet. Or maybe you have and something didn\'t click. Either way, I want to understand what\'s holding you back.')}
    ${p('Is it:')}
    <ul style="color:#374151;font-size:15px;line-height:2;padding-left:20px;margin:0 0 20px;">
      <li>Not sure how to get started?</li>
      <li>Don\'t have a client to test with yet?</li>
      <li>Technical issue with GHL or setup?</li>
      <li>Not the right time?</li>
    </ul>
    ${p('Whatever it is — <strong>reply to this email and tell me.</strong> I read every response personally. No bot, no support ticket. Just me.')}
    ${p('If you want, I\'ll hop on a 15-minute call and walk you through setup. No pitch, just help.')}
    <a href="mailto:steve@kyra.conversionsystem.com?subject=Need%20help%20with%20Kyra" style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;margin:12px 0;">Reply and Tell Me →</a>
    ${p('— Steve', true)}`;

  return {
    subject: 'Haven\'t seen you in a while — what\'s holding you back?',
    preview: 'One question for you.',
    html: wrap(body, email),
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export const NURTURE_STEPS = [1, 2, 3, 4, 5, 6, 7] as const;
export type NurtureStep = (typeof NURTURE_STEPS)[number];

export function getNurtureEmail(step: NurtureStep, email: string): { subject: string; preview: string; html: string } | null {
  switch (step) {
    case 1: return email1(email);
    case 2: return email2(email);
    case 3: return email3(email);
    case 4: return email4(email);
    case 5: return email5(email);
    case 6: return email6(email);
    case 7: return email7(email);
    default: return null;
  }
}
