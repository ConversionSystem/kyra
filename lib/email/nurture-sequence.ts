// ============================================================================
// Kyra Unified Onboarding Sequence — 7 emails over 21 days
//
// Triggered on agency signup via enrollInNurtureSequence().
// Processed by /api/cron/email-sequence (nurture queue section).
//
// Step 1 — Day 0  : Welcome + deploy first AI worker
// Step 2 — Day 1  : Did you connect? Check-in
// Step 3 — Day 3  : Social proof — HVAC case study
// Step 4 — Day 5  : Feature spotlight — website builder + Growth Engine
// Step 5 — Day 7  : Connect GHL guide
// Step 6 — Day 14 : Trial recap + upgrade nudge
// Step 7 — Day 21 : Win-back (personal, from Angel)
// ============================================================================

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com').replace(/\/$/, '');
const FROM = 'Angel from Kyra <hello@updates.conversionsystem.com>';

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
            <span style="font-size:20px;font-weight:700;color:#4f46e5;">Kyra</span>
          </div>
          ${body}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 20px;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">
            Kyra · Conversion System · 30 N Gould St Ste R, Sheridan, WY 82801<br>
            <a href="${APP_URL}" style="color:#9ca3af;">kyra.conversionsystem.com</a>
            &nbsp;·&nbsp;<a href="${unsubUrl}" style="color:#9ca3af;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function btn(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;margin:12px 0;">${text}</a>`;
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
    ${p('Welcome to Kyra. You just got access to something that can change your agency.')}
    ${p('Here\'s your 5-minute quick win — deploy your first AI worker:')}
    <ol style="color:#374151;font-size:15px;line-height:2.2;padding-left:20px;margin:0 0 20px;">
      <li>Open your agency dashboard</li>
      <li>Click <strong>"Add Client"</strong></li>
      <li>Pick an industry template (dental, HVAC, real estate + 17 more)</li>
      <li>Review the pre-built AI personality — tweak if you like</li>
      <li>Hit <strong>Deploy</strong> — your AI worker goes live</li>
    </ol>
    ${p('Five steps. Most agencies have their first AI worker live within 10 minutes of signing up.')}
    ${btn('Deploy My First AI Worker →', `${APP_URL}/agency`)}
    ${p('Reply to this email if you hit a snag — I read every one.', true)}`;

  return {
    subject: 'Your AI worker is ready. Let\'s deploy it.',
    preview: 'Deploy your first AI worker in 5 minutes.',
    html: wrap(body, email),
  };
}

// ── Email 2 — Day 1: Did You Connect? Check-in ───────────────────────────────

function email2(email: string): { subject: string; preview: string; html: string } {
  const body = `${h2('Quick check-in — did you add your first client?')}
    ${p('You signed up for Kyra yesterday. Agencies who add their first client within 24 hours are almost always live and handling real conversations within a week.')}
    ${p('If you haven\'t started yet, it takes about 5 minutes:')}
    <ol style="color:#374151;font-size:15px;line-height:2.2;padding-left:20px;margin:0 0 20px;">
      <li>Go to your dashboard → click <strong>"Add Client"</strong></li>
      <li>Enter their business name and pick an industry</li>
      <li>The AI personality is pre-built — just review and deploy</li>
    </ol>
    ${p('If you\'re already set up — nice work. Tomorrow\'s email has a real-world case study you\'ll want to see.')}
    ${btn('Add Your First Client →', `${APP_URL}/agency/clients/new`)}
    ${p('Stuck or have questions? Just reply here — I\'ll help you get unstuck.', true)}`;

  return {
    subject: 'Quick question — did you add your first client?',
    preview: 'Takes 5 minutes. Most agencies are live within a week.',
    html: wrap(body, email),
  };
}

// ── Email 3 — Day 3: Social Proof / HVAC Case Study ─────────────────────────

function email3(email: string): { subject: string; preview: string; html: string } {
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
    ${p('The agency that set this up charges the HVAC company $1,500/mo. The HVAC company is thrilled — they\'re making an extra $8K. Everyone wins.')}
    ${btn('See Results for Your Industry →', `${APP_URL}/use-cases`)}
    ${p('Dental, real estate, home services, legal, med spa — every industry has its own version of this story.', true)}`;

  return {
    subject: 'The HVAC company that recovered $8,200/mo in missed leads',
    preview: 'What happens when an AI worker never misses a call.',
    html: wrap(body, email),
  };
}

// ── Email 4 — Day 5: Feature Spotlight — Website Builder + Growth Engine ─────

function email4(email: string): { subject: string; preview: string; html: string } {
  const body = `${h2('The feature 80% of users haven\'t discovered yet')}
    ${p('Did you know Kyra can build a full SEO website for your client in 10 minutes?')}
    ${p('Not a landing page. A real 15–25 page website with:')}
    <ul style="color:#374151;font-size:15px;line-height:2;padding-left:20px;margin:0 0 20px;">
      <li>Service pages optimized for local SEO</li>
      <li>About, contact, FAQ, and testimonials pages</li>
      <li>AI chat widget embedded and ready to go</li>
      <li>Mobile-responsive, fast-loading</li>
      <li><strong>Growth Engine</strong> — keeps adding new SEO pages automatically for long-tail keywords</li>
    </ul>
    ${p('Here\'s why this matters for your agency:')}
    ${p('<strong>Website + AI worker = a complete business.</strong> Your client gets a site that ranks, captures leads, and has an AI that responds instantly. You charge $1,000–$2,000/mo for the bundle. They\'d pay $3,000+ for that separately.')}
    ${btn('Build Your First Client Website →', `${APP_URL}/agency`)}
    ${p('The Growth Engine alone is worth the subscription — it publishes SEO content on autopilot.', true)}`;

  return {
    subject: 'Build a 20-page SEO website for your client in 10 minutes',
    preview: 'Most Kyra users don\'t know about this.',
    html: wrap(body, email),
  };
}

// ── Email 5 — Day 7: Connect GHL Guide ───────────────────────────────────────

function email5(email: string): { subject: string; preview: string; html: string } {
  const body = `${h2('Connect GoHighLevel — 5 minutes to live leads')}
    ${p('GoHighLevel has 60,000+ agency users. It\'s where most of your clients\' leads are coming in. Once you connect GHL to Kyra, your AI worker starts responding to every inbound SMS and missed call automatically — under 30 seconds, every time.')}
    ${p('<strong>Here\'s how to connect:</strong>')}
    <ol style="color:#374151;font-size:15px;line-height:2.2;padding-left:20px;margin:0 0 20px;">
      <li>Open the client\'s settings in Kyra</li>
      <li>Click the <strong>GHL</strong> tab</li>
      <li>Paste your Private Integration token from GoHighLevel</li>
      <li>Select the sub-account (location) to connect</li>
      <li>Done — your AI is now receiving real leads</li>
    </ol>
    ${p('<strong>What happens after connection:</strong>')}
    ${p('Every new SMS, missed call, or form submission in GHL triggers your AI. It responds instantly, qualifies the lead, and books appointments — all while your client sleeps.')}
    ${btn('Connect GHL Now →', `${APP_URL}/agency/ghl-setup`)}
    ${p('No GHL yet? No problem — the web chat widget works standalone. But GHL is where the real magic happens.', true)}`;

  return {
    subject: 'Connect GHL and your AI starts responding to leads automatically',
    preview: 'Your AI worker is waiting for real leads.',
    html: wrap(body, email),
  };
}

// ── Email 6 — Day 14: Trial Recap + Upgrade Nudge ────────────────────────────

function email6(email: string): { subject: string; preview: string; html: string } {
  const body = `${h2('Your trial has been running 2 weeks. Here\'s what\'s next.')}
    ${p('You\'ve had 14 days to explore Kyra. Here\'s what you have access to right now on the free plan:')}
    <ul style="color:#374151;font-size:15px;line-height:2;padding-left:20px;margin:0 0 20px;">
      <li>1 AI worker for your first client</li>
      <li>GHL integration for SMS, calls, and forms</li>
      <li>Website builder with Growth Engine</li>
      <li>Web chat widget for any website</li>
    </ul>
    ${p('<strong>Here\'s what you unlock when you upgrade:</strong>')}
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#f9fafb;border-radius:8px;">
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px;color:#6b7280;font-size:13px;font-weight:600;">Plan</td>
        <td style="padding:12px;color:#6b7280;font-size:13px;font-weight:600;">Clients</td>
        <td style="padding:12px;color:#6b7280;font-size:13px;font-weight:600;">Price</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb;background:#eef2ff;">
        <td style="padding:12px;color:#374151;font-size:14px;font-weight:600;">Lite</td>
        <td style="padding:12px;color:#374151;font-size:14px;">Up to 3 clients</td>
        <td style="padding:12px;color:#4f46e5;font-size:14px;font-weight:600;">$99/mo</td>
      </tr>
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px;color:#374151;font-size:14px;font-weight:600;">Pro</td>
        <td style="padding:12px;color:#374151;font-size:14px;">Up to 10 clients</td>
        <td style="padding:12px;color:#374151;font-size:14px;">$299/mo</td>
      </tr>
      <tr>
        <td style="padding:12px;color:#374151;font-size:14px;font-weight:600;">Scale</td>
        <td style="padding:12px;color:#374151;font-size:14px;">Up to 20 clients</td>
        <td style="padding:12px;color:#6b7280;font-size:14px;">$499/mo</td>
      </tr>
    </table>
    ${p('Start free — upgrade when you are ready. White-label means your clients see <em>your</em> brand, not Kyra. That is how you build a real agency — not a reseller.')}
    ${btn('Get Started Free →', `${APP_URL}/agency/billing`)}
    ${p('Questions? Reply to this email — I read every one.', true)}`;

  return {
    subject: 'Your trial has been running 2 weeks. Here\'s what\'s next.',
    preview: 'Unlock more clients, white-label, and higher revenue.',
    html: wrap(body, email),
  };
}

// ── Email 7 — Day 21: Win-Back ────────────────────────────────────────────────

function email7(email: string): { subject: string; preview: string; html: string } {
  const body = `${h2('Still here? I want to help.')}
    ${p('Hey — it\'s Angel from Kyra.')}
    ${p('I noticed you haven\'t deployed a client yet. Or maybe you have and something didn\'t click. Either way, I want to understand what\'s holding you back.')}
    ${p('Is it:')}
    <ul style="color:#374151;font-size:15px;line-height:2;padding-left:20px;margin:0 0 20px;">
      <li>Not sure how to get started?</li>
      <li>Don\'t have a client to test with yet?</li>
      <li>Technical issue with GHL or setup?</li>
      <li>Not the right time?</li>
    </ul>
    ${p('Whatever it is — <strong>reply to this email and tell me.</strong> I read every response personally. No bot, no support ticket.')}
    ${p('If you want, I\'ll hop on a 15-minute call and walk you through setup. No pitch, just help.')}
    ${btn('Reply and Tell Me →', `mailto:angel@conversionsystem.com?subject=Need%20help%20with%20Kyra`)}
    ${p('— Angel', true)}`;

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
