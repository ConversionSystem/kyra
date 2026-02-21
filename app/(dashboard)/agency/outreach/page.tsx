'use client';

import { useState } from 'react';
import { Check, Copy, Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
        <h1 className="text-2xl font-bold text-gray-900">Outreach Drafts</h1>
        <p className="text-gray-500 text-sm mt-1">
          4 agencies ready to white-label Kyra. Review, copy, and send.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6">
        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-700">
          These are draft templates. Review before sending.
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
