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

const longDescription = `Kyra is the AI Employee OS built for GHL agencies.

While GoHighLevel gives you a powerful CRM and marketing platform, Kyra gives you AI employees that live inside your client accounts — answering leads, qualifying prospects, and handling conversations 24/7.

What makes Kyra different:
\u2022 White-label AI employees — your brand, your clients, your revenue
\u2022 One dashboard to manage all your clients' AI from anywhere
\u2022 Heartbeat Protocol — AI employees check in hourly and work toward client-defined goals
\u2022 Token Budget Manager — set monthly limits and model preferences per client
\u2022 Performance Telemetry — automated weekly reports proving ROI to your clients
\u2022 Native GHL integration — webhook triggers fire directly into your GHL workflows
\u2022 Multi-channel — SMS, Telegram, web portal chat, and more

How it works:
1. Connect your GHL account in Kyra's Agency Dashboard
2. Add your clients and pick an AI template (dental, real estate, cannabis, etc.)
3. Set their North Star goal — the one outcome their AI works toward
4. Go live in under 5 minutes

Who it's for:
GHL agencies who want to add a recurring AI revenue stream. Charge clients $500\u2013$5,000/mo for a white-labeled AI employee. Kyra costs a fraction of that.

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
        value="Deploy white-labeled AI employees for your clients in minutes. Each AI has its own personality, channels, and goals — managed from one agency dashboard."
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
            <ScreenshotItem label="Agency Dashboard Overview" />
            <ScreenshotItem label="Heartbeat Protocol page (show 3+ clients with status)" />
            <ScreenshotItem label="Token Budget Manager (show usage bars)" />
            <ScreenshotItem label="New Client creation (show template picker)" />
            <ScreenshotItem label="Client detail with terminal access" />
            <ScreenshotItem label="Performance Telemetry page" />
            <ScreenshotItem label="GHL Webhook setup in Settings" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
