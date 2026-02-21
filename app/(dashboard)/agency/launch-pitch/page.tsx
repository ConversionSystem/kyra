'use client';

import { useState } from 'react';
import { Check, Copy, Square, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const emailTo = 'openclaw@launch.co';
const emailSubject = 'Kyra — The AI Employee OS for 60,000 GHL Agencies';
const emailBody = `Hi team,

I'm Angel Castro, founder of Conversion System and creator of Kyra — an AI employee platform built on OpenClaw.

What Kyra does: Agencies deploy white-labeled AI employees for their clients in minutes. Each AI has its own personality, channels, and goals — all managed from one dashboard. We're live with 9 agencies and 13 AI employees running 24/7.

Why now: GoHighLevel (60,000 agencies) just integrated OpenClaw terminals. Every GHL agency is about to hit the ceiling of what a basic terminal can do. Kyra is the platform layer above that — the "Vercel for OpenClaw" built specifically for agencies.

Traction:
- Live platform: kyra.conversionsystem.com
- 9 active agencies, 13 AI employees deployed
- Industries: cannabis, dental, real estate, fitness, marketing
- Built the Heartbeat Protocol, Token Budget Manager, and Performance Telemetry — features that answer the #1 agency question: "Is my AI actually working?"

The ask: $125K to accelerate go-to-market with GHL's 60K agency base.

Happy to do a 20-minute demo at your convenience.

— Angel Castro
angel@conversionsystem.com
kyra.conversionsystem.com`;

const checklist = [
  'Record a 60-second screen demo (show dashboard \u2192 new client \u2192 heartbeat \u2192 terminal)',
  'Take 3 screenshots of the platform',
  'Confirm traction numbers are up to date',
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
