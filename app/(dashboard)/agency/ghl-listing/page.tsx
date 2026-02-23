'use client';

import { useState } from 'react';
import { Check, Copy, Square, CheckSquare, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function CopyField({ label, value, mono, note }: { label: string; value: string; mono?: boolean; note?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700">{label}</CardTitle>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}>
            {copied ? <><Check className="h-3 w-3 text-green-600" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
          </Button>
        </div>
        {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
      </CardHeader>
      <CardContent>
        <div className={`text-sm text-gray-700 leading-relaxed whitespace-pre-wrap ${mono ? 'font-mono text-xs bg-gray-50 rounded-lg p-3 border border-gray-100' : ''}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function ScreenshotItem({ label, done }: { label: string; done?: boolean }) {
  const [checked, setChecked] = useState(done ?? false);
  return (
    <button type="button" onClick={() => setChecked(!checked)}
      className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-lg border transition-colors ${
        checked ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
      }`}
    >
      {checked ? <CheckSquare className="h-4 w-4 text-green-600 shrink-0" /> : <Square className="h-4 w-4 text-gray-400 shrink-0" />}
      <span className="text-sm">{label}</span>
    </button>
  );
}

const APP_NAME = 'Kyra — AI Employee Platform for GHL Agencies';

const SHORT_DESC = 'Deploy AI employees inside your GHL sub-accounts. Responds to SMS in 60s, books appointments, updates CRM tags, escalates frustrated leads — fully automated from one agency dashboard.';

const LONG_DESC = `Kyra is the AI Employee Platform built specifically for GHL agencies.

While GoHighLevel gives you the CRM, pipeline, and marketing infrastructure — Kyra gives you an AI employee that WORKS INSIDE every client's GHL sub-account. It responds to leads, qualifies prospects, books appointments, updates your pipeline, and escalates to humans when needed.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ WHAT KYRA DOES (automatically, 24/7)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 SMS & Multi-channel
• Responds to every GHL SMS within 60 seconds — no staff required
• Works on every channel you have connected: WhatsApp, Instagram DMs, Facebook Messenger, Live Chat, Google Business, Email
• Handles opt-outs (STOP/UNSUBSCRIBE) automatically — never contacts opted-out leads
• Respects business hours — no 3am texts

👋 Proactive Lead Outreach
• New contact added to GHL → AI greets them within 60 seconds
• Completely automatic — zero manual touchpoints needed

🧠 Knows Who It's Talking To
• Reads CRM tags, pipeline stage, and notes before every reply
• Remembers the last 6 messages in the conversation
• Personalizes every response based on contact data

🏷️ CRM Automation
• Tags contacts after every conversation (e.g. "appointment-requested", "price-inquiry", "hot-lead")
• Writes CRM notes automatically: "[Kyra AI] Customer asked about pricing. Offered Tuesday 2pm slot."
• Moves contacts through pipeline stages based on conversation outcomes

🚨 Smart Escalation
• Detects frustrated customers and escalates immediately
• Sends email alert to agency with full conversation context
• Tags escalated contacts for your team to follow up

📅 Appointment Booking
• Includes your GHL booking link when customers ask to schedule
• Works with any GHL calendar — no integration required

🌐 Website Chat Widget (NEW)
• Embed a chat bubble on any website with one line of code
• AI responds on the website too — no GHL required for this channel
• Sessions persist across visits via localStorage

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FOR GHL AGENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• One dashboard to manage AI employees for ALL your clients
• Per-client personality training (name, persona, greeting, detailed instructions)
• ✨ "Generate with AI" — auto-writes a full AI personality from just the business name
• 21 industry templates: dental, real estate, auto, cannabis, restaurant, med spa, law, and more
• White-label branding — your agency's name, your client's AI employee
• Setup score shows you exactly what each client needs to go live
• Shareable pitch pages: send prospects a live demo link per industry (dental, auto, etc.)
• Business-in-a-Box playbook: scripts, pricing, email templates to sign and retain clients

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ANALYTICS & REPORTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• 7-day conversation analytics with bar charts
• Live conversation feed — see AI replies in real time
• Escalation tracking — know which clients need attention
• Weekly performance email reports (optional, per agency)
• Today at a Glance: conversations, greetings, escalations on one screen

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ HOW TO GET STARTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Sign up free at kyra.conversionsystem.com
2. Add your GHL Private Integration token (2 minutes — no marketplace approval needed)
3. Add a client, pick an industry template
4. Click "✨ Generate with AI" to auto-write their personality
5. AI goes live immediately — starts responding to every SMS within 60 seconds

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ PRICING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Free: 1 client AI employee
• Lite: $99/mo — 5 client AI employees
• Pro: $249/mo — 15 client AI employees  
• Scale: $499/mo — 50 client AI employees
• All paid plans include 30-day free trial

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ WHO THIS IS FOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GHL agencies who want to add a recurring AI revenue stream. Charge clients $500–$5,000/month for a white-labeled AI employee. Kyra handles all the infrastructure — you set the price and keep the margin.

Most agencies bill $997–$1,997/month per AI employee. At $99/month for 5 client slots, your margin starts on day 1.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Get started free: kyra.conversionsystem.com`;

const CATEGORY = 'AI / Automation';
const PRICING_TIER = 'Freemium — Free plan available. Paid plans from $99/mo (Lite, 5 clients) to $499/mo (Scale, 50 clients). 30-day free trial on all paid plans.';
const WEBSITE = 'https://kyra.conversionsystem.com';
const SUPPORT_EMAIL = 'angel@conversionsystem.com';
const WEBHOOK_URL = 'https://kyra.conversionsystem.com/api/ghl/poll (Vercel cron — polls every minute)';

const SCREENSHOTS = [
  { label: 'Agency Overview — MRR stats + Today at a Glance (conversations, greetings, escalations)' },
  { label: 'Clients list — setup score bars, active/setup status, client count per plan' },
  { label: 'Client detail → Personality tab with "✨ Generate with AI" button' },
  { label: 'Client detail → Channels tab — web chat embed snippet, GHL multi-channel coverage' },
  { label: 'Client detail → Conversations tab — GHL SMS exchanges with escalation badges' },
  { label: 'GHL tab — Private Integration token setup wizard (3 steps)' },
  { label: 'Live Conversations feed — LIVE indicator, greeted/escalated badges' },
  { label: 'Performance page — 7-day bar chart + top clients by conversation volume' },
  { label: 'Pitch Generator — shareable industry pitch links (dental, auto, cannabis, etc.)' },
  { label: 'Public Pitch Page — animated SMS demo + ROI calculator (no login)' },
  { label: 'Demo page — /demo/dental animated SMS conversation (shareable with prospects)' },
  { label: 'Billing page — plan upgrade flow with 30-day trial messaging' },
];

export default function GHLListingPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-12">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">GHL Marketplace Listing</h1>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => window.open('https://marketplace.gohighlevel.com', '_blank')}>
            <ExternalLink className="h-3.5 w-3.5" /> Open GHL Marketplace
          </Button>
        </div>
        <p className="text-gray-500 text-sm">All fields are copy-ready. Paste directly into the GHL marketplace submission form.</p>
      </div>

      <CopyField label="App Name" value={APP_NAME} />
      <CopyField label="Short Description (160 chars)" value={SHORT_DESC} note={`${SHORT_DESC.length} chars`} />
      <CopyField label="Long Description" value={LONG_DESC} mono />
      <CopyField label="Category" value={CATEGORY} />
      <CopyField label="Pricing Model" value={PRICING_TIER} />
      <CopyField label="Website URL" value={WEBSITE} />
      <CopyField label="Support Email" value={SUPPORT_EMAIL} />
      <CopyField label="GHL Integration Type" value="Private Integration Token (no OAuth required)" />
      <CopyField label="Webhook / Poll URL" value={WEBHOOK_URL} />

      <CopyField
        label="🎬 60-Second Demo Video Script (record your screen while reading this)"
        note="Open /try/dental in one window, start recording, and read the script while clicking. 1 minute is enough for GHL."
        value={`[0:00 — Show the landing page kyra.conversionsystem.com]
"This is Kyra — an AI employee platform built for GHL agencies."

[0:06 — Navigate to /try/dental]
"I'm going to show you a live AI right now — no demo mode, real responses."

[0:10 — Type: "Hi, how much is a cleaning?"]
[Wait for AI response]
"See that? Under 60 seconds. The AI answered, offered insurance info, and is ready to book."

[0:25 — Type: "Can I book Tuesday?"]
[Wait for response]
"It's booking an appointment — in a real conversation. No flows, no scripts, no keyword matching."

[0:38 — Switch to agency dashboard]
"In the dashboard, I can manage AI employees for every one of my clients. Each one has its own personality, channels, and analytics."

[0:48 — Show conversations tab]
"I can see every conversation across all clients, flag escalations, and check performance — from one place."

[0:56 — Show CTA]
"Free to start at kyra.conversionsystem.com. Works with your existing GHL account in under 10 minutes."`}
        mono
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Required Screenshots Checklist</CardTitle>
          <p className="text-xs text-gray-400 mt-1">GHL requires 3–8 screenshots. Check off as you capture them.</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {SCREENSHOTS.map(s => <ScreenshotItem key={s.label} label={s.label} />)}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4 bg-amber-50 border-amber-200">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">📋 Submission checklist</p>
          <ul className="text-xs text-amber-700 space-y-1 list-disc ml-4">
            <li>Screenshots captured and resized to 1280×800px (or GHL's required size)</li>
            <li>App logo: square, min 256×256px, transparent background preferred</li>
            <li>Demo video: 60–120 seconds, showing the AI responding to a real SMS</li>
            <li>GHL agency account status confirmed (required to list apps)</li>
            <li>Support email monitored (GHL reviews may ask questions)</li>
            <li>Webhook URL tested and responding correctly to GHL poll</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
