'use client';

import { useState } from 'react';
import { Check, Copy, Square, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const emailTo = 'openclaw@launch.co';
const emailSubject = 'Kyra — AI Employee Platform for 60,000 GHL Agencies (Live, Revenue, Demo Inside)';
const emailBody = `Hi team,

I'm Angel Castro, founder of Conversion System. I'm applying for the Launch Accelerator with Kyra — a platform that deploys AI employees inside GoHighLevel agency accounts.

─── THE ONE-LINE PITCH ───────────────────────────────────────

Kyra turns any GHL agency into an "AI employee agency" in minutes. Agencies add Kyra to their client's GHL account, pick an industry template, and the AI starts answering leads, booking appointments, and updating the CRM — automatically, 24/7.

─── TRACTION ────────────────────────────────────────────────

• Live at kyra.conversionsystem.com (free to try)
• 9 active agencies running 22 AI employees on dedicated infrastructure
• 75 features shipped in the last 72 hours (solo founder + AI CEO build velocity)
• Paid plans live: Lite $99/mo · Pro $249/mo · Scale $499/mo
• Working Stripe billing, automated email sequences, referral program
• Industries live: dental, real estate, auto, cannabis, restaurant, med spa, law, and 14 more templates

─── WHY NOW ─────────────────────────────────────────────────

GoHighLevel (60,000 agencies) just integrated OpenClaw — the open-source AI agent runtime we're built on. Every GHL agency is being handed an AI terminal. They have no idea what to do with it.

Kyra is the opinionated platform layer above that: one dashboard to deploy, manage, and monetize AI employees for multiple clients. It's the difference between a raw server and Vercel.

─── WHAT MAKES IT DEFENSIBLE ────────────────────────────────

1. GHL integration is our moat — we plug into their CRM, pipelines, conversations, and 7 channels (SMS, WhatsApp, Instagram, Facebook, Live Chat, Google Business, Email)
2. 21 industry templates — AI personalities pre-built for dental, cannabis, auto, real estate, etc.
3. White-label: agencies resell under their brand at $500–$2,000/mo per client
4. Network effects: more agencies → more templates → better AI → more agencies

─── THE BUSINESS MODEL ──────────────────────────────────────

Kyra charges agencies a SaaS fee ($99–$499/mo) for the infrastructure.
Agencies charge their clients $500–$2,000/mo per AI employee.
At the Lite plan ($99/mo, 5 clients): agency revenue ~$5K/mo, Kyra revenue $99/mo.
As they scale to Pro and Scale, margins compound on both sides.

─── THE ASK ─────────────────────────────────────────────────

$125K to:
1. Accelerate GHL Marketplace listing (pending, we have agency status)
2. Hire one growth operator to run agency outreach
3. Expand infrastructure capacity for 200+ simultaneous clients

Live demo (no login needed):
• kyra.conversionsystem.com/demo/dental — animated AI demo
• kyra.conversionsystem.com/roi — ROI calculator for prospects

Happy to do a 20-minute live demo at your convenience.

— Angel Castro
Founder, Conversion System
angel@conversionsystem.com
kyra.conversionsystem.com`;

const checklist = [
  'Record a 60-second Loom: dashboard → add client → AI responds to SMS in 60 seconds',
  'Screenshot 1: Overview with Today at a Glance stats',
  'Screenshot 2: Client personality tab with ✨ Generate with AI',
  'Screenshot 3: Live conversation feed (LIVE indicator)',
  'Update traction numbers with latest agency/conversation counts from /admin',
  'Confirm Stripe is working (test a checkout before sending)',
  'Apply at launch.co — click "Apply Now" → select "SaaS" category',
];

function ChecklistItem({ label }: { label: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setChecked(!checked)}
      className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg border transition-colors ${
        checked
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
      }`}
    >
      {checked ? (
        <CheckSquare className="h-4 w-4 text-green-600 shrink-0" />
      ) : (
        <Square className="h-4 w-4 text-gray-400 shrink-0" />
      )}
      <span className="text-sm">{label}</span>
    </button>
  );
}

export default function LaunchPitchPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const fullEmail = `To: ${emailTo}\nSubject: ${emailSubject}\n\n${emailBody}`;
    await navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Launch Accelerator Application</h1>
        <p className="text-gray-500 text-sm mt-1">
          Jason Calacanis&apos; accelerator — $125K opportunity. Email is ready to send.
        </p>
      </div>

      {/* Email draft */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base">Application Email</CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">To: {emailTo}</p>
            </div>
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs font-medium text-gray-500 mb-2">
            Subject: {emailSubject}
          </div>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4 border border-gray-100">
            {emailBody}
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Things to attach / prepare before sending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {checklist.map((item) => (
              <ChecklistItem key={item} label={item} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
