'use client';

import { useState } from 'react';
import { Copy, CheckCircle2, Mail, ChevronDown, ChevronRight } from 'lucide-react';
import { AISuggestButton } from '@/components/ai/suggest-button';

interface Template {
  id: string;
  subject: string;
  tag: string;
  description: string;
  body: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'cold-dental',
    tag: '🦷 Dental',
    subject: 'Your dental clients are missing calls right now',
    description: 'Cold outreach to dental marketing agencies or dental office owners',
    body: `Hi {{firstName}},

Quick question: what happens when a new patient texts your dental office at 8pm asking about scheduling a cleaning?

Most practices I talk to admit the honest answer is... nothing. The inquiry sits until someone checks their phone in the morning — by which time the patient has already booked somewhere else.

We built an AI worker specifically for dental practices that responds to every text in under 60 seconds, 24/7. It books appointments, answers insurance questions, and follows up on no-shows — all without touching your staff's time.

I'd love to show you what it looks like for a real dental practice. Here's a live demo: https://kyra.conversionsystem.com/try/dental

15 minutes to see if it's a fit?

Best,
{{senderName}}
{{senderAgency}}`,
  },
  {
    id: 'cold-cannabis',
    tag: '🌿 Cannabis',
    subject: 'Your dispensary clients are losing customers to slow replies',
    description: 'Cold outreach to cannabis dispensary owners or cannabis marketing agencies',
    body: `Hi {{firstName}},

Cannabis customers have zero patience. If your client's dispensary doesn't respond to a product question or hours inquiry within a few minutes, they're ordering from the competitor down the street.

We've built an AI budtender that handles product questions, checks inventory, and follows up on loyalty customers — 24/7, compliantly. Our previous AI SMS deployments have already helped cannabis clients generate significant attributable revenue.

Here's what a conversation looks like: https://kyra.conversionsystem.com/try/cannabis

Worth a quick call to see if it fits your clients?

{{senderName}}
{{senderAgency}}`,
  },
  {
    id: 'cold-realestate',
    tag: '🏡 Real Estate',
    subject: 'Real estate leads are gone in 5 minutes — here\'s the fix',
    description: 'Cold outreach to real estate agents or real estate marketing agencies',
    body: `Hi {{firstName}},

You already know this: in real estate, whoever responds first wins. 70% of buyers contact 3+ agents and go with whoever gets back to them first.

The problem is your clients can't respond to every new listing inquiry the moment it comes in — especially after hours.

We built an AI that handles every inbound text in under 60 seconds. It qualifies buyers, books showings, and follows up on cold leads — even at 11pm when the inquiry comes in.

See it in action: https://kyra.conversionsystem.com/try/realestate

Can we grab 15 minutes this week?

{{senderName}}
{{senderAgency}}`,
  },
  {
    id: 'cold-auto',
    tag: '🚗 Auto',
    subject: 'Car buyers are deciding before they walk in — are you there?',
    description: 'Cold outreach to auto dealerships or automotive marketing agencies',
    body: `Hi {{firstName}},

67% of car buyers make their decision before stepping foot in a dealership. They're texting inventory questions, asking about financing, and checking availability — at 10pm on a Sunday.

If your dealership doesn't have instant answers, they're buying from someone who does.

We built an AI for dealerships that handles every inbound inquiry 24/7 — inventory questions, test drive booking, trade-in inquiries, and finance leads. While you're closed, the AI is working.

Live demo: https://kyra.conversionsystem.com/try/auto

Happy to show you the ROI math on a quick call.

{{senderName}}
{{senderAgency}}`,
  },
  {
    id: 'cold-medspa',
    tag: '✨ Med Spa',
    subject: 'A $500 Botox lead just went to your competitor',
    description: 'Cold outreach to med spa owners or aesthetic marketing agencies',
    body: `Hi {{firstName}},

Quick math: the average med spa pays $200–$500 to acquire a new patient. If that patient inquires over text and doesn't hear back for 2 hours, they book with someone else. You just lost $500 and a lifetime customer.

We built an AI for med spas that responds to every treatment inquiry in under 60 seconds. Pricing questions, consultation bookings, promo redemptions — handled automatically, with your spa's voice and personality.

See what it looks like: https://kyra.conversionsystem.com/try/medspa

Want to see what it would look like for your practice specifically?

{{senderName}}
{{senderAgency}}`,
  },
  {
    id: 'follow-up',
    tag: '📧 Follow-Up',
    subject: 'Re: AI worker for {{clientName}}',
    description: 'Follow-up for prospects who didn\'t reply to the first email',
    body: `Hi {{firstName}},

Sending a quick follow-up in case my last message got buried.

I know this sounds like another "AI tool" pitch — but what we're building is different. This isn't a chatbot with a script. Each client gets a dedicated AI worker trained on their specific business, pricing, and policies. It responds like a real team member would.

A few things agencies using Kyra are telling their clients:
- "Your AI handled 47 conversations last week without a single human intervention"
- "We booked 3 appointments at 11pm on a Tuesday — the AI did it"
- "A customer was frustrated and the AI de-escalated it, then flagged it for me"

I put together a live demo for your industry: https://kyra.conversionsystem.com/try/dental

If this isn't the right time, no worries at all — just let me know and I'll leave you alone. But if you're curious, even a 10-minute call would tell you if it's a fit.

{{senderName}}`,
  },
  {
    id: 'client-upsell',
    tag: '💰 Client Upsell',
    subject: 'One thing I wanted to share about your business',
    description: 'Email to an existing client suggesting you add Kyra to their package',
    body: `Hi {{firstName}},

We've been working together on {{currentService}} and I've been thinking about something.

One of the biggest gaps I see in businesses like yours is what happens to inbound leads when your team isn't available. Evenings, weekends, holidays — every missed text is a missed customer.

I've been working with a platform called Kyra that puts an AI worker on your SMS and web chat, 24/7. It's not a chatbot — it's trained on your specific business and responds like a real team member. Most clients see their response rate go from hours to under 60 seconds.

I think this would be a strong addition to what we're already doing together. I'd love to add it to your package and show you the results in the first 30 days.

Interested in a quick call to map it out?

{{senderName}}
{{senderAgency}}`,
  },
  {
    id: 'ghl-agency',
    tag: '🔗 GHL Agency Pitch',
    subject: 'Add AI workers to your GHL agency — new revenue stream',
    description: 'Outreach to GoHighLevel agencies about adding Kyra to their offerings',
    body: `Hi {{firstName}},

If you're running a GHL agency, you've probably already seen that clients want AI — but GHL's built-in automations can only do so much.

I've been running a white-label AI workforce platform built specifically for GHL agencies. The short version:

→ Connect Kyra to any GHL location in 2 minutes
→ AI responds to every inbound SMS in <60 seconds, 24/7
→ Auto-updates CRM tags, notes, and pipeline stage after every conversation
→ Escalates frustrated customers to your team with a Slack/email alert
→ You charge $500–$2,000/month per client. Your cost: as low as $99/month for 5 clients.

It works across all 7 GHL channels: SMS, WhatsApp, Instagram, Facebook, email, Live Chat, and GMB.

Here's what it looks like: https://kyra.conversionsystem.com/try/dental

Worth a 15-minute call this week?

{{senderName}}`,
  },
];

const TIPS = [
  'Replace {{firstName}}, {{senderName}}, {{senderAgency}} with real values before sending.',
  'Send from a personal email address (not newsletter@) for higher open rates.',
  'Follow up exactly once, 3–5 business days later. The follow-up often gets more replies than the first email.',
  'Personalize the first line with something specific to the recipient for 2–3× higher reply rates.',
];

export default function EmailTemplates() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(TEMPLATES[0].id);

  const copy = (template: Template) => {
    const full = `Subject: ${template.subject}\n\n${template.body}`;
    navigator.clipboard.writeText(full).then(() => {
      setCopiedId(template.id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-6 w-6 text-indigo-500" />
            Email Template Library
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Copy-ready cold emails for agency outreach. Personalize and send — no writing required.
          </p>
        </div>
        <AISuggestButton type="email_templates" label="Generate Templates" />
      </div>

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
        <p className="text-xs font-semibold text-amber-800 mb-2">✉️ Sending tips</p>
        <ul className="space-y-1">
          {TIPS.map(t => (
            <li key={t} className="text-xs text-amber-700 flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0">•</span> {t}
            </li>
          ))}
        </ul>
      </div>

      {/* Templates */}
      <div className="space-y-3">
        {TEMPLATES.map(t => (
          <div key={t.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <button
              onClick={() => setOpenId(openId === t.id ? null : t.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition text-left gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-medium text-indigo-600 whitespace-nowrap">{t.tag}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{t.subject}</p>
                  <p className="text-xs text-gray-400 truncate">{t.description}</p>
                </div>
              </div>
              {openId === t.id
                ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              }
            </button>

            {openId === t.id && (
              <div className="border-t border-gray-100">
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                  <p className="text-xs font-mono text-gray-500">Subject: {t.subject}</p>
                  <button
                    onClick={() => copy(t)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                      copiedId === t.id
                        ? 'bg-green-100 text-green-700'
                        : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    }`}
                  >
                    {copiedId === t.id
                      ? <><CheckCircle2 className="h-3.5 w-3.5" /> Copied!</>
                      : <><Copy className="h-3.5 w-3.5" /> Copy email</>
                    }
                  </button>
                </div>
                <pre className="px-4 py-4 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {t.body}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
