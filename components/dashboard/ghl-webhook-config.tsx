'use client';

import { useState } from 'react';
import { Copy, CheckCircle2, Send, Loader2, AlertCircle, Webhook } from 'lucide-react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://kyra.conversionsystem.com';
const WEBHOOK_URL = `${APP_URL}/api/ghl/webhook`;

const GHL_STEPS = [
  {
    step: '1',
    title: 'Open GHL → Automations → Workflows',
    body: 'Go to the GHL sub-account. In the left sidebar, click Automations → Workflows → New Workflow.',
  },
  {
    step: '2',
    title: 'Add a trigger: "Customer Replied"',
    body: 'Add a trigger for "Customer Replied" (or "Inbound SMS" / "Inbound Message"). This fires when a contact sends you a message.',
  },
  {
    step: '3',
    title: 'Add action: "Custom Webhook"',
    body: 'In the workflow actions, add "Custom Webhook". Set method to POST. Paste the Kyra webhook URL below as the endpoint.',
  },
  {
    step: '4',
    title: 'Set payload to "Contact & Conversation"',
    body: 'In the webhook action, enable the Contact and Conversation payload fields so Kyra receives the contact info and message content.',
  },
  {
    step: '5',
    title: 'Publish and test',
    body: 'Save and publish the workflow. Use the "Test" button below to verify Kyra receives the webhook before going live.',
  },
];

type TestState = 'idle' | 'sending' | 'ok' | 'error';

export default function GHLWebhookConfig() {
  const [copied, setCopied] = useState(false);
  const [testState, setTestState] = useState<TestState>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(WEBHOOK_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = async () => {
    setTestState('sending');
    setTestError(null);
    try {
      // Send a synthetic test payload to our own webhook endpoint
      const res = await fetch('/api/ghl/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'InboundMessage',
          locationId: 'test-location',
          contactId: 'test-contact',
          message: {
            id: 'test-msg',
            type: 'SMS',
            body: '[Webhook test from Kyra dashboard]',
            direction: 'inbound',
          },
          contact: {
            id: 'test-contact',
            firstName: 'Test',
            lastName: 'Contact',
            phone: '+10000000000',
          },
          _kyra_test: true, // signal to handler that this is a test
        }),
      });
      if (res.ok || res.status === 200 || res.status === 204) {
        setTestState('ok');
      } else {
        const d = await res.json().catch(() => ({}));
        setTestError(d.error || `HTTP ${res.status}`);
        setTestState('error');
      }
    } catch (err: unknown) {
      setTestError(err instanceof Error ? err.message : 'Network error');
      setTestState('error');
    }
    setTimeout(() => { setTestState('idle'); setTestError(null); }, 5000);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
        <div className="rounded-xl bg-indigo-600 p-2">
          <Webhook className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">GHL Inbound Webhook</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Add this URL to a GHL Workflow to route incoming SMS/messages to your AI workers.
          </p>
        </div>
      </div>

      {/* Webhook URL */}
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your webhook URL</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 overflow-hidden whitespace-nowrap overflow-ellipsis">
            {WEBHOOK_URL}
          </div>
          <button
            onClick={handleCopy}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              copied
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-indigo-300'
            }`}
          >
            {copied ? <><CheckCircle2 className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
          </button>
          <button
            onClick={handleTest}
            disabled={testState === 'sending'}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
              testState === 'ok'    ? 'border-green-200 bg-green-50 text-green-700' :
              testState === 'error' ? 'border-red-200 bg-red-50 text-red-700' :
              'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
            }`}
          >
            {testState === 'sending' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {testState === 'ok'      && <CheckCircle2 className="h-3.5 w-3.5" />}
            {testState === 'error'   && <AlertCircle className="h-3.5 w-3.5" />}
            {testState === 'idle'    && <Send className="h-3.5 w-3.5" />}
            {testState === 'sending' ? 'Testing…' :
             testState === 'ok'      ? 'Webhook OK!' :
             testState === 'error'   ? 'Failed' :
             'Test'}
          </button>
        </div>
        {testState === 'error' && testError && (
          <p className="mt-2 text-xs text-red-600">Error: {testError}</p>
        )}
        {testState === 'ok' && (
          <p className="mt-2 text-xs text-green-600">✅ Webhook endpoint is reachable. GHL can post to it successfully.</p>
        )}
      </div>

      {/* Setup steps */}
      <div className="px-5 py-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">GHL Workflow setup</p>
        <div className="space-y-3">
          {GHL_STEPS.map((s) => (
            <div key={s.step} className="flex gap-3">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] shrink-0 mt-0.5">
                {s.step}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
