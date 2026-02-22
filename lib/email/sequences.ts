// ============================================================================
// Kyra Email Sequences
// 7-day onboarding sequence to convert free → paid agencies
//
// Day 1  (24h after signup)   — "Did you connect your first client AI?"
// Day 3  (72h after signup)   — "What other agencies did in their first 3 days"
// Day 5  (5d after signup)    — Upgrade nudge (if still on free plan)
// Day 7  (7d after signup)    — Final push + 30-day trial expiry warning
//
// Requires RESEND_API_KEY env var. Silently skips if missing.
// ============================================================================

const RESEND_API = 'https://api.resend.com/emails';
const FROM = 'Angel from Kyra <angel@kyra.conversionsystem.com>';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://kyra.conversionsystem.com').replace(/\/$/, '');

type SequenceDay = 1 | 3 | 5 | 7;

interface Agency {
  id: string;
  name: string;
  plan: string;
  ownerEmail: string;
  ownerName?: string;
  clientCount: number;
  ghlConnected: boolean;
  createdAt: string;
}

// ── Email Templates ──────────────────────────────────────────────────────────

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" style="background:#fff;border-radius:12px;padding:40px;max-width:100%;border:1px solid #e5e7eb;">
        <tr><td>
          <div style="margin-bottom:24px;">
            <span style="font-size:24px;">🤖</span>
            <span style="font-size:14px;font-weight:600;color:#6366f1;margin-left:8px;">Kyra AI</span>
          </div>
          ${body}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 20px;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">
            Kyra AI · <a href="${APP_URL}" style="color:#9ca3af;">kyra.conversionsystem.com</a>
            · <a href="${APP_URL}/agency/settings" style="color:#9ca3af;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function btn(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;margin:8px 0;">${text} →</a>`;
}

function p(text: string, small = false): string {
  const size = small ? '13px' : '15px';
  return `<p style="color:#374151;font-size:${size};line-height:1.7;margin:0 0 16px;">${text}</p>`;
}

function h2(text: string): string {
  return `<h2 style="color:#111827;font-size:20px;font-weight:700;margin:0 0 16px;">${text}</h2>`;
}

// Day 1 — First nudge: connect a client
function day1Email(agency: Agency): { subject: string; html: string } {
  const name = agency.ownerName?.split(' ')[0] || 'there';
  const hasClient = agency.clientCount > 0;
  const hasGHL = agency.ghlConnected;

  const body = hasClient && hasGHL
    ? `${h2(`${name}, your first AI employee is live 🎉`)}
       ${p(`You've connected <strong>${agency.clientCount} client${agency.clientCount > 1 ? 's' : ''}</strong> and linked GHL. Your AI is already handling conversations.`)}
       ${p(`Next step: share the web chat widget with your client so their website visitors can talk to the AI too.`)}
       ${btn('See embed code', `${APP_URL}/agency/clients`)}
       ${p(`The embed is one &lt;script&gt; tag. Takes 2 minutes to add to any website.`, true)}`
    : `${h2(`${name}, quick question — did you add your first client?`)}
       ${p(`You signed up for Kyra yesterday. Most agencies who add their first client within 24 hours are live and handling conversations within a week.`)}
       ${p(`It takes about 5 minutes:`)}
       <ol style="color:#374151;font-size:15px;line-height:2;padding-left:20px;margin:0 0 16px;">
         <li>Add a client (name + industry)</li>
         <li>Pick a template or generate a personality with AI</li>
         <li>Connect GHL for SMS/WhatsApp</li>
       </ol>
       ${btn('Add your first client', `${APP_URL}/agency/clients/new`)}`;

  return {
    subject: hasClient ? `${name}, your AI employee is live 🎉` : `${name}, your AI employee is waiting`,
    html: wrapHtml(body),
  };
}

// Day 3 — Social proof + quick wins
function day3Email(agency: Agency): { subject: string; html: string } {
  const name = agency.ownerName?.split(' ')[0] || 'there';

  const body = `${h2(`What other agencies did in their first 3 days`)}
    ${p(`Here's what the fastest-moving Kyra agencies do in week 1:`)}
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
      ${[
        ['Day 1', 'Added first client, connected GHL', '✅'],
        ['Day 2', 'Customized AI personality + greeting', '✅'],
        ['Day 3', 'Sent first client the web chat embed code', '✅'],
        ['Day 5', 'First real lead captured by AI', '🔥'],
        ['Day 7', 'Upgraded to Starter — added 2nd client', '💰'],
      ].map(([day, action, icon]) => `
        <tr>
          <td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;white-space:nowrap;">${day}</td>
          <td style="padding:8px 0;color:#374151;font-size:14px;flex:1;">${action}</td>
          <td style="padding:8px 0 8px 12px;font-size:16px;">${icon}</td>
        </tr>`).join('')}
    </table>
    ${p(`Where are you in this journey? Your dashboard shows everything at a glance.`)}
    ${btn('Open my dashboard', `${APP_URL}/agency`)}
    ${p(`<strong>Tip:</strong> The fastest way to get your first lead is the proactive outreach feature — when a new contact enters GHL, the AI greets them within 60 seconds automatically.`, true)}`;

  return {
    subject: `Day 3: where are you in the journey, ${name}?`,
    html: wrapHtml(body),
  };
}

// Day 5 — Upgrade nudge (only if still on free plan)
function day5Email(agency: Agency): { subject: string; html: string } {
  const name = agency.ownerName?.split(' ')[0] || 'there';
  const onFree = agency.plan === 'free';

  if (!onFree) {
    // Already upgraded — send a different message
    const body = `${h2(`${name}, you're on day 5 — here's what to do next`)}
      ${p(`You've upgraded to <strong>${agency.plan}</strong>. Nice. Now let's make sure you're getting the most out of it.`)}
      ${p(`Three things worth doing this week:`)}
      <ol style="color:#374151;font-size:15px;line-height:2;padding-left:20px;margin:0 0 16px;">
        <li>Add <strong>calendar booking links</strong> so the AI can schedule appointments</li>
        <li>Set up <strong>escalation alerts</strong> — get notified when a lead needs a human</li>
        <li>Share the <strong>web chat widget</strong> with your client for their website</li>
      </ol>
      ${btn('Open dashboard', `${APP_URL}/agency`)}`;
    return { subject: `Day 5: make the most of your Kyra plan`, html: wrapHtml(body) };
  }

  const body = `${h2(`${name}, you're leaving money on the table`)}
    ${p(`You've been on Kyra's free plan for 5 days. If your AI has had even one conversation, you already know it works.`)}
    ${p(`Here's what the upgrade unlocks:`)}
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#f9fafb;border-radius:8px;">
      ${[
        ['Free', '1 client AI', '—'],
        ['Starter — $97/mo', '5 client AIs', '🚀'],
        ['Pro — $247/mo', '15 client AIs', '⚡'],
        ['Scale — $497/mo', '50 client AIs', '🏆'],
      ].map(([plan, clients, icon]) => `
        <tr style="${plan.includes('Starter') ? 'background:#eef2ff;' : ''}">
          <td style="padding:10px 12px;color:#374151;font-size:14px;font-weight:${plan.includes('Starter') ? '600' : '400'};">${plan}</td>
          <td style="padding:10px 12px;color:#6366f1;font-size:14px;font-weight:600;">${clients}</td>
          <td style="padding:10px 12px;font-size:18px;">${icon}</td>
        </tr>`).join('')}
    </table>
    ${p(`Every plan includes a <strong>30-day free trial</strong>. No charge today.`)}
    ${btn('Start 30-day free trial', `${APP_URL}/agency/billing?upgrade=starter`)}
    ${p(`Your trial starts the moment you click. Cancel anytime in the first 30 days — you won't be charged.`, true)}`;

  return {
    subject: `${name}, you've been on Kyra 5 days — ready to scale?`,
    html: wrapHtml(body),
  };
}

// Day 7 — Final urgency push (free plan only)
function day7Email(agency: Agency): { subject: string; html: string } {
  const name = agency.ownerName?.split(' ')[0] || 'there';
  const onFree = agency.plan === 'free';

  if (!onFree) return { subject: '', html: '' }; // skip for paying users

  const body = `${h2(`Last message from me about upgrading`)}
    ${p(`${name}, I'm going to keep this short.`)}
    ${p(`You've been on Kyra's free plan for a week. If the AI handled even one conversation for you — it paid for itself.`)}
    ${p(`Starter is <strong>$97/month</strong> for 5 client AIs. Most agencies charge their clients <strong>$500–$2,000/month</strong> per AI. The math is obvious.`)}
    ${btn('Start free trial — $0 today', `${APP_URL}/agency/billing?upgrade=starter`)}
    ${p(`30-day free trial. Cancel anytime. No credit card games.`)}
    ${p(`If this isn't the right time, no worries — your free account stays active and your 1 client AI keeps working.`, true)}
    ${p(`— Angel`, true)}`;

  return {
    subject: `${name} — last note on upgrading (I'll stop after this)`,
    html: wrapHtml(body),
  };
}

// ── Main send function ───────────────────────────────────────────────────────

export function getSequenceEmail(day: SequenceDay, agency: Agency): { subject: string; html: string } | null {
  switch (day) {
    case 1: return day1Email(agency);
    case 3: return day3Email(agency);
    case 5: return day5Email(agency);
    case 7: {
      const email = day7Email(agency);
      return email.subject ? email : null; // null for paying users
    }
    default: return null;
  }
}

export const SEQUENCE_DAYS: SequenceDay[] = [1, 3, 5, 7];

export async function sendSequenceEmail(
  agency: Agency,
  day: SequenceDay,
): Promise<{ ok: boolean; emailId?: string; skipped?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, skipped: 'RESEND_API_KEY not configured' };
  if (!agency.ownerEmail) return { ok: false, skipped: 'No owner email' };

  const email = getSequenceEmail(day, agency);
  if (!email) return { ok: false, skipped: 'No email for this day/plan' };

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: agency.ownerEmail,
        subject: email.subject,
        html: email.html,
        tags: [
          { name: 'type', value: 'sequence' },
          { name: 'day', value: String(day) },
          { name: 'agency_id', value: agency.id },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Resend ${res.status}: ${err.slice(0, 100)}`);
    }

    const data = await res.json();
    return { ok: true, emailId: data.id };
  } catch (err: any) {
    return { ok: false, skipped: err.message };
  }
}
