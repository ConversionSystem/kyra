'use client';

/**
 * OutreachWebhookSetup
 *
 * In-app wizard to connect Kyra's outreach engine to a GHL webhook workflow.
 * Stores the URL in agency settings — no Vercel env vars required.
 *
 * Usage:
 *   import OutreachWebhookSetup from '@/components/dashboard/outreach-webhook-setup';
 *   <OutreachWebhookSetup onComplete={() => {}} />
 */

import { useState, useEffect } from 'react';
import {
  CheckCircle2, Circle, ExternalLink, Zap, AlertCircle,
  Copy, Check, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SetupStatus {
  configured: boolean;
  source: 'settings' | 'env' | null;
  masked_url: string | null;
}

interface OutreachWebhookSetupProps {
  onComplete?: () => void;
  compact?: boolean; // show as a compact "fix this" banner instead of full wizard
}

const STEPS = [
  {
    n: 1,
    title: 'Open GHL → Automation → Workflows',
    detail:
      'In your GHL account (the main Conversion System account, not a sub-account), go to Automation → Workflows → + New Workflow.',
    action: {
      label: 'Open GHL Automation',
      href: 'https://app.gohighlevel.com/automation',
    },
  },
  {
    n: 2,
    title: 'Add trigger: Inbound Webhook',
    detail:
      'Select "Start from Scratch". Add a trigger → choose "Inbound Webhook". GHL will generate a unique webhook URL — copy it, you\'ll need it in Step 4.',
    tip: 'The webhook URL looks like: https://services.leadconnectorhq.com/hooks/...',
  },
  {
    n: 3,
    title: 'Add actions: Create Contact + Email Sequence',
    detail: 'After the webhook trigger, add two actions:',
    bullets: [
      'Create/Update Contact — map fields: Full Name ({{full_name}}), Email ({{email}}), Company ({{company_name}})',
      'Add to Workflow / Email Sequence — use your cold outreach sequence. The payload includes {{personalized_opener}} and {{pitch_url}} as merge fields.',
    ],
  },
  {
    n: 4,
    title: 'Paste your GHL Webhook URL below',
    detail:
      "Copy the webhook URL from Step 2 (starts with https://services.leadconnectorhq.com/hooks/...) and paste it below. We'll test it instantly.",
    isInput: true,
  },
];

export default function OutreachWebhookSetup({ onComplete, compact = false }: OutreachWebhookSetupProps) {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!compact);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/agency/outreach/setup')
      .then(r => r.json())
      .then((data: SetupStatus) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!webhookUrl.trim()) return;
    setSaving(true);
    setSaveResult(null);
    setTestResult(null);
    try {
      const res = await fetch('/api/agency/outreach/setup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveResult({ ok: true, message: 'Webhook URL saved ✓' });
        setStatus({ configured: true, source: 'settings', masked_url: null });
      } else {
        setSaveResult({ ok: false, message: data.error ?? 'Save failed' });
      }
    } catch {
      setSaveResult({ ok: false, message: 'Network error — try again' });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/agency/outreach/setup', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setTestResult({ ok: true, message: data.message ?? 'Test lead sent to GHL ✓' });
        onComplete?.();
      } else {
        setTestResult({ ok: false, message: data.error ?? 'Test failed' });
      }
    } catch {
      setTestResult({ ok: false, message: 'Network error — try again' });
    }
    setTesting(false);
  };

  const handleClearUrl = async () => {
    setSaving(true);
    try {
      await fetch('/api/agency/outreach/setup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: '' }),
      });
      setStatus({ configured: false, source: null, masked_url: null });
      setWebhookUrl('');
      setSaveResult(null);
      setTestResult(null);
    } catch { /* silent */ }
    setSaving(false);
  };

  const copyPayloadFields = () => {
    const fields = `full_name, email, company_name, niche, pitch_url, personalized_opener, why_fit, warmth`;
    navigator.clipboard.writeText(fields).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 p-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking outreach status…
      </div>
    );
  }

  // ── Already configured ────────────────────────────────────────────────────
  if (status?.configured && !webhookUrl) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Outbound loop LIVE ✓</p>
            {status.masked_url && (
              <p className="text-xs text-green-600 font-mono mt-0.5">{status.masked_url}</p>
            )}
            {status.source === 'env' && (
              <p className="text-xs text-green-600 mt-0.5">Source: Vercel env var</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleTest} disabled={testing}
            className="border-green-300 text-green-700 hover:bg-green-100 text-xs h-7">
            {testing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
            Test
          </Button>
          <button
            onClick={handleClearUrl}
            className="text-xs text-green-600 hover:text-green-800 underline"
          >
            Change URL
          </button>
        </div>
        {testResult && (
          <p className={`text-xs font-medium ${testResult.ok ? 'text-green-700' : 'text-red-600'}`}>
            {testResult.message}
          </p>
        )}
      </div>
    );
  }

  // ── Compact mode — just the banner + expand toggle ────────────────────────
  if (compact && !expanded) {
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Outbound loop not connected</p>
            <p className="text-xs text-amber-600">Connect GHL webhook → auto-enroll leads in email sequences</p>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-amber-600 shrink-0" />
      </div>
    );
  }

  // ── Full wizard ───────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer"
        onClick={() => compact && setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center">
            <Zap className="h-4 w-4 text-amber-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900">Complete the GHL Outreach Loop</p>
            <p className="text-xs text-amber-700">
              4 steps · ~5 minutes · No code required · No Vercel env vars needed
            </p>
          </div>
        </div>
        {compact && (
          expanded
            ? <ChevronUp className="h-4 w-4 text-amber-600 shrink-0" />
            : <ChevronDown className="h-4 w-4 text-amber-600 shrink-0" />
        )}
      </div>

      {/* Steps */}
      <div className="px-5 pb-5 space-y-5 border-t border-amber-100">
        {STEPS.map((step, i) => (
          <div key={step.n} className="flex gap-4 pt-4">
            {/* Step number */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-7 h-7 rounded-full bg-amber-200 text-amber-800 font-bold text-sm flex items-center justify-center">
                {step.n}
              </div>
              {i < STEPS.length - 1 && (
                <div className="w-px flex-1 min-h-[20px] bg-amber-200" />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 min-w-0 pb-2">
              <p className="text-sm font-semibold text-amber-900 mb-1">{step.title}</p>
              <p className="text-xs text-amber-700 leading-relaxed">{step.detail}</p>

              {step.tip && (
                <p className="text-xs text-amber-600 mt-2 font-mono bg-amber-100 rounded px-2 py-1 inline-block">
                  {step.tip}
                </p>
              )}

              {step.bullets && (
                <ul className="mt-2 space-y-1">
                  {step.bullets.map((b, bi) => (
                    <li key={bi} className="flex items-start gap-2 text-xs text-amber-700">
                      <Circle className="h-1.5 w-1.5 mt-1.5 shrink-0 fill-amber-400 text-amber-400" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              {step.action && (
                <a
                  href={step.action.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded-lg px-3 py-1.5 transition"
                >
                  {step.action.label} <ExternalLink className="h-3 w-3" />
                </a>
              )}

              {/* Payload fields helper (step 3) */}
              {step.n === 3 && (
                <div className="mt-3 bg-white border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-700">Available merge fields from Kyra:</p>
                    <button
                      onClick={copyPayloadFields}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">
                    full_name, email, company_name, niche,<br />
                    pitch_url, personalized_opener, why_fit, warmth
                  </p>
                </div>
              )}

              {/* Input + save (step 4) */}
              {step.isInput && (
                <div className="mt-3 space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={e => setWebhookUrl(e.target.value)}
                      placeholder="https://services.leadconnectorhq.com/hooks/..."
                      className="flex-1 text-xs border border-amber-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent font-mono"
                    />
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving || !webhookUrl.trim()}
                      className="bg-amber-600 hover:bg-amber-700 text-white h-auto px-4 py-2.5 text-xs font-semibold"
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                    </Button>
                  </div>

                  {saveResult && (
                    <p className={`text-xs font-medium ${saveResult.ok ? 'text-green-700' : 'text-red-600'}`}>
                      {saveResult.message}
                    </p>
                  )}

                  {saveResult?.ok && (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-700">
                        URL saved ✓ — Now send a test lead to verify the GHL workflow receives it:
                      </p>
                      <Button
                        size="sm"
                        onClick={handleTest}
                        disabled={testing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1.5"
                      >
                        {testing ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending test lead…</>
                        ) : (
                          <><Zap className="h-3.5 w-3.5" /> Send Test Lead to GHL</>
                        )}
                      </Button>
                    </div>
                  )}

                  {testResult && (
                    <div className={`rounded-lg px-3 py-2 text-xs font-medium ${
                      testResult.ok
                        ? 'bg-green-50 border border-green-200 text-green-800'
                        : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                      {testResult.ok ? '✓ ' : '✗ '}{testResult.message}
                      {testResult.ok && (
                        <p className="font-normal mt-1 text-green-700">
                          Check your GHL workflow — a test contact should appear within 30 seconds.
                          Once verified, the "Enroll in GHL" buttons on your leads will start firing automatically.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
