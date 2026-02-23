'use client';

import { useState } from 'react';
import { Check, Copy, Mail, AlertCircle, Zap, Clock, PartyPopper, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ── Onboarding Drip Sequence ─────────────────────────────────────────────────

interface SequenceEmail {
  step: number;
  trigger: string;
  triggerIcon: React.ElementType;
  label: string;
  subject: string;
  body: string;
  note: string;
}

const SEQUENCE_EMAILS: SequenceEmail[] = [
  {
    step: 1,
    trigger: 'Sends immediately on signup',
    triggerIcon: Zap,
    label: 'Welcome',
    subject: "You're in — here's how to get your first AI live 🎉",
    body: `Hi {{agency_name}},

Welcome to Kyra. You just signed up for something that's going to change how your agency operates.

Here's your 3-step quickstart:

1. Add your first client → kyra.conversionsystem.com/agency/clients/new
   Pick an industry template — the AI personality is already written. Takes 5 minutes.

2. Connect GoHighLevel → kyra.conversionsystem.com/agency/ghl-setup
   Paste your Private Integration token. That's it. Your AI starts responding to GHL SMS within 60 seconds.

3. Test it → open Test Chat on your client's page and send a message.
   Watch your AI respond in real-time before you go live.

That's it. First AI live in under 30 minutes.

Questions? Reply to this email — Angel reads every one.

— Angel Castro
Founder, Conversion System`,
    note: 'Activate via RESEND_API_KEY in Vercel. Trigger: agency row inserted in Supabase.',
  },
  {
    step: 2,
    trigger: 'Sends 24h after signup — if no client added yet',
    triggerIcon: Clock,
    label: 'First client nudge',
    subject: 'One step standing between you and your first AI employee',
    body: `Hi {{agency_name}},

You signed up for Kyra yesterday but haven't added your first client yet.

Totally normal — most people aren't sure where to start. Here's the fastest path:

Go to: kyra.conversionsystem.com/agency/clients/new

Pick any industry template — dental, cannabis, real estate, restaurant, legal, whatever fits your first client. The AI is pre-trained with a full personality. You just set the business name and you're done.

Your AI can be live in the next 20 minutes.

Still have questions? I'll personally walk you through it — just reply with "demo" and I'll send you a booking link.

— Angel`,
    note: 'Trigger: agency.created_at < 24h ago AND agency_clients count = 0. Check hourly via cron.',
  },
  {
    step: 3,
    trigger: 'Sends when first AI conversation happens',
    triggerIcon: PartyPopper,
    label: 'First conversation 🎉',
    subject: 'Your AI just had its first conversation 🎉',
    body: `Hi {{agency_name}},

Your AI employee just handled its first real customer conversation.

That's not a test. That's a real customer who got a response within 60 seconds — automatically, without anyone on your team lifting a finger.

Here's what to do next:

1. Review the conversation → kyra.conversionsystem.com/agency/conversations
   Make sure the tone and responses match your client's brand.

2. Fine-tune the personality → open your client → Personality tab
   Add specific product names, pricing info, or FAQs so it gets sharper.

3. Tell your client → they'll love seeing AI handle their inquiries in real-time.

This is just the beginning. Add your next client at:
kyra.conversionsystem.com/agency/clients/new

You're building something real.

— Angel`,
    note: 'Trigger: first row in client_conversations for this agency. Fire once only.',
  },
];

function SequenceSection() {
  const [openStep, setOpenStep] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const handleCopy = async (email: SequenceEmail) => {
    const text = `Subject: ${email.subject}\n\n${email.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(email.step);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-4 w-4 text-indigo-500" />
            Onboarding Email Sequence
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">3 trigger-based emails. Activates when RESEND_API_KEY is set in Vercel.</p>
        </div>
        <Badge className="bg-amber-100 text-amber-700 text-[10px] border-0">Pending Resend</Badge>
      </div>

      <div className="space-y-3">
        {SEQUENCE_EMAILS.map((email) => {
          const TriggerIcon = email.triggerIcon;
          const isOpen = openStep === email.step;
          return (
            <div key={email.step} className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              {/* Header row */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setOpenStep(isOpen ? null : email.step)}
              >
                <div className="flex items-center justify-center h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs shrink-0">
                  {email.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{email.label}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <TriggerIcon className="h-3 w-3" />
                      {email.trigger}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">Subject: {email.subject}</p>
                </div>
                {isOpen
                  ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
              </button>

              {/* Expanded body */}
              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <p className="text-xs font-medium text-gray-600">Subject: <span className="text-gray-900">{email.subject}</span></p>
                    <button
                      onClick={() => handleCopy(email)}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        copied === email.step
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {copied === email.step
                        ? <><Check className="h-3.5 w-3.5" /> Copied!</>
                        : <><Copy className="h-3.5 w-3.5" /> Copy email</>}
                    </button>
                  </div>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-white rounded-lg p-4 border border-gray-100">
                    {email.body}
                  </pre>
                  <p className="mt-3 text-[11px] text-indigo-600 bg-indigo-50 rounded-md px-3 py-2 border border-indigo-100">
                    ⚙️ <strong>Dev note:</strong> {email.note}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── One-off Outreach Drafts ───────────────────────────────────────────────────

interface EmailDraft {
  agency: string;
  recipient: string;
  subject: string;
  body: string;
}

const drafts: EmailDraft[] = [
  {
    agency: 'Purple Lotus',
    recipient: 'Paul Rivera',
    subject: 'White-label AI for Purple Lotus — your own AI employee',
    body: `Hi Paul,

Quick one — you know the AI setup I've been building for Conversion System? I've turned it into a full platform called Kyra.

Idea: we white-label it for Purple Lotus so your dispensary has its own AI employee handling customer questions, compliance FAQs, and product recs 24/7. Branded as yours, managed by me.

Cannabis is the industry I know best. The compliance nuances, the customer sensitivity, the volume of repetitive questions — Kyra handles all of it.

Takes about a week to set up. Happy to show you a demo — 15 minutes on a call?

— Angel`,
  },
  {
    agency: 'Webblex',
    recipient: 'Webblex team',
    subject: 'Add AI employees to your client packages',
    body: `Hi Webblex team,

You build websites for clients. What if every site you ship also came with an AI employee?

With Kyra, you'd offer each client a white-labeled AI that handles their inquiries, qualifies leads, and works 24/7 — all managed from your agency dashboard. Your brand, your pricing, your recurring revenue.

Setup takes under a week per client. No AI expertise needed on your end — I handle the infrastructure.

Worth a quick call to see if this fits your current client packages?

— Angel, Conversion System`,
  },
  {
    agency: 'Join Marathon',
    recipient: 'Join Marathon team',
    subject: 'AI coaching assistant for your community',
    body: `Hi Join Marathon team,

Running communities live on connection and consistency — but your team can't be available every time a member has a question about training plans, nutrition, or race prep.

Kyra gives your community an AI coaching assistant: answers member questions 24/7, reflects your coaching philosophy, and escalates to your human coaches when it matters.

We white-label it under your brand so members interact with "Marathon AI" not some generic chatbot.

Happy to walk you through a demo this week?

— Angel`,
  },
  {
    agency: 'mk',
    recipient: 'mk team',
    subject: 'AI employee platform for your agency clients',
    body: `Hi mk team,

Building on our work together — I wanted to show you what I've been building.

Kyra is a white-label AI employee platform for agencies. You add it to your client packages, set up their AI in minutes, and collect recurring revenue while the AI handles their day-to-day conversations.

Dashboard gives you full visibility across all clients. Each AI has its own personality, channels, and goals.

Would love to show you a 10-minute demo. Worth a look?

— Angel`,
  },
];

function EmailCard({ draft }: { draft: EmailDraft }) {
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`outreach-sent-${draft.agency}`) === 'true';
    }
    return false;
  });

  const handleCopy = async () => {
    const fullEmail = `Subject: ${draft.subject}\n\n${draft.body}`;
    await navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSent = () => {
    const newValue = !sent;
    setSent(newValue);
    localStorage.setItem(`outreach-sent-${draft.agency}`, String(newValue));
  };

  return (
    <Card className={sent ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">{draft.agency}</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">To: {draft.recipient}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 text-xs h-7"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy Email
                </>
              )}
            </Button>
            <Button
              variant={sent ? 'default' : 'outline'}
              size="sm"
              onClick={toggleSent}
              className={`gap-1.5 text-xs h-7 ${sent ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              {sent ? (
                <>
                  <Check className="h-3 w-3" />
                  Sent
                </>
              ) : (
                <>
                  <Mail className="h-3 w-3" />
                  Mark as Sent
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xs font-medium text-gray-500 mb-2">
          Subject: {draft.subject}
        </div>
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4 border border-gray-100">
          {draft.body}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OutreachPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Outreach</h1>
        <p className="text-gray-500 text-sm mt-1">
          Automated onboarding sequences + one-off outreach drafts for target agencies.
        </p>
      </div>

      {/* Onboarding drip sequence */}
      <SequenceSection />

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">One-off outreach drafts</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6">
        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-700">
          4 agencies ready to white-label Kyra. Review before sending.
        </p>
      </div>

      {/* Email drafts */}
      <div className="space-y-4">
        {drafts.map((draft) => (
          <EmailCard key={draft.agency} draft={draft} />
        ))}
      </div>
    </div>
  );
}
