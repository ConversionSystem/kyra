'use client';

import { useState } from 'react';
import { Check, Copy, Square, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function CopyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{label}</CardTitle>
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
                Copy
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-sm text-gray-700 leading-relaxed whitespace-pre-wrap ${mono ? 'font-mono text-xs bg-gray-50 rounded-lg p-3 border border-gray-100' : ''}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function ScreenshotItem({ label }: { label: string }) {
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

const longDescription = `Kyra is the AI Employee Platform built for GHL agencies.

While GoHighLevel gives you a powerful CRM and marketing platform, Kyra gives you AI employees that work inside your clients' GHL sub-accounts — responding to leads, qualifying prospects, booking appointments, and updating your CRM automatically.

✅ WHAT KYRA DOES (automatically, 24/7):

📱 Responds to every GHL SMS within 60 seconds
👋 Greets new contacts the moment they're added to GHL
🧠 Knows who it's talking to — reads CRM tags, pipeline stage, and notes before every reply
💬 Maintains conversation context — remembers the last 3 exchanges
🏷️ Auto-tags contacts after every conversation (e.g. "appointment-requested", "price-inquiry")
📝 Writes CRM notes automatically ("[Kyra AI] Customer asked about pricing. Offered Tuesday 2pm slot.")
🚨 Detects frustrated customers and escalates to a human — with instant email alert to the agency
⛔ Handles STOP/opt-outs automatically — never contacts opted-out leads again
⏰ Respects business hours — no 3am texts
📅 Includes your GHL booking link when customers ask to schedule

✅ FOR AGENCIES:

• White-label AI employees under your agency brand
• One dashboard to manage all your clients' AI
• Per-client personality training (persona, greeting, instructions)
• ✨ "Generate with AI" — auto-writes persona + instructions from business name
• Setup score showing completion status per client
• Weekly performance reports (optional, Resend-powered)
• 7-day conversation analytics with bar charts
• Escalation alerts to your email when human intervention needed

✅ HOW IT WORKS:

1. Connect your GHL Private Integration token (takes 2 minutes)
2. Add your client, pick a template (dental, real estate, auto, cannabis, etc.)
3. Customize the personality — or click "✨ Generate with AI"
4. AI goes live immediately — responds to every GHL SMS automatically

✅ WHO IT'S FOR:

GHL agencies adding a recurring AI revenue stream. Charge clients $500–$5,000/mo for a white-labeled AI employee. Kyra costs a fraction of that — 98%+ gross margins.

Get started at kyra.conversionsystem.com`;

export default function GHLListingPage() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">GHL Marketplace Listing Draft</h1>
        <p className="text-gray-500 text-sm mt-1">
          Copy this and paste into your GHL marketplace submission. All fields are ready.
        </p>
      </div>

      {/* Fields */}
      <CopyField
        label="App Name"
        value="Kyra — AI Employee Platform for Agencies"
      />

      <CopyField
        label="Short Description (160 chars)"
        value="AI employees for your GHL clients. Responds to SMS in 60s, books appointments, tags contacts, and escalates to humans — all automatically from one agency dashboard."
      />

      <CopyField
        label="Long Description"
        value={longDescription}
        mono
      />

      <CopyField
        label="Category"
        value="AI / Automation"
      />

      <CopyField
        label="Pricing Tier"
        value="Free to install, usage-based (starter plans from $97/mo)"
      />

      <CopyField
        label="Website"
        value="https://kyra.conversionsystem.com"
      />

      <CopyField
        label="Support Email"
        value="angel@conversionsystem.com"
      />

      {/* Screenshots Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Required Screenshots</CardTitle>
          <p className="text-xs text-gray-400 mt-1">
            Check off each screenshot as you take it. These are required for the GHL marketplace submission.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <ScreenshotItem label="Agency Overview — Today at a Glance (conversations, greetings, escalations)" />
            <ScreenshotItem label="Clients list — setup score bars + client cards" />
            <ScreenshotItem label="Client detail — Personality tab with ✨ Generate with AI" />
            <ScreenshotItem label="Client detail — Conversations tab showing GHL SMS exchanges" />
            <ScreenshotItem label="GHL tab — Private Integration token setup wizard" />
            <ScreenshotItem label="Conversations page — LIVE indicator + escalation/greeted badges" />
            <ScreenshotItem label="Performance page — 7-day bar chart + top clients" />
            <ScreenshotItem label="Settings — Escalation Alert Email field" />
            <ScreenshotItem label="Demo page — /demo/dental animated SMS conversation" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
