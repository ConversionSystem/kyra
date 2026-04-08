'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Crown, ChevronRight, CheckCircle2, Circle, ExternalLink, Copy, Check,
  CreditCard, Package, Settings, Webhook, FlaskConical, ArrowLeft, RefreshCw,
} from 'lucide-react';

interface EnvStatus {
  STRIPE_SECRET_KEY: boolean;
  STRIPE_WEBHOOK_SECRET: boolean;
  STRIPE_LITE_PRICE_ID: boolean;
  STRIPE_PRO_PRICE_ID: boolean;
  STRIPE_SCALE_PRICE_ID: boolean;
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: boolean;
  STRIPE_WEBHOOK_REGISTERED: boolean;
}

interface TestResult {
  ok: boolean;
  error?: string;
  accountName?: string;
}

function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 font-mono text-xs text-gray-300 mt-2">
      <code className="flex-1 overflow-x-auto whitespace-nowrap">{text}</code>
      <button onClick={copy} className="shrink-0 text-gray-500 hover:text-white transition" title="Copy">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function EnvBlock({ lines }: { lines: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = lines.join('\n');
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative bg-gray-800 border border-gray-700 rounded-lg p-3 font-mono text-xs text-gray-300 mt-2 overflow-x-auto">
      <button onClick={copy} className="absolute top-2 right-2 text-gray-500 hover:text-white transition" title="Copy all">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      {lines.map((line, i) => (
        <div key={i} className="whitespace-nowrap">{line}</div>
      ))}
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition text-xs font-medium mt-2">
      {children} <ExternalLink className="h-3 w-3" />
    </a>
  );
}

const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
];

export default function StripeSetupClient() {
  const [env, setEnv] = useState<EnvStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const fetchEnv = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/env-check');
      if (res.ok) setEnv(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEnv(); }, [fetchEnv]);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/stripe/test', { method: 'POST' });
      setTestResult(await res.json());
    } catch {
      setTestResult({ ok: false, error: 'Network error' });
    }
    setTesting(false);
    fetchEnv();
  };

  const stepDone = (n: number): boolean => {
    if (!env) return false;
    switch (n) {
      case 1: return env.STRIPE_SECRET_KEY;
      case 2: return env.STRIPE_LITE_PRICE_ID && env.STRIPE_PRO_PRICE_ID && env.STRIPE_SCALE_PRICE_ID;
      case 3: return env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_LITE_PRICE_ID && env.STRIPE_PRO_PRICE_ID && env.STRIPE_SCALE_PRICE_ID && env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      case 4: return env.STRIPE_WEBHOOK_SECRET && env.STRIPE_WEBHOOK_REGISTERED;
      case 5: return testResult?.ok ?? false;
      default: return false;
    }
  };

  const completedCount = env ? [1, 2, 3, 4, 5].filter(n => stepDone(n)).length : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Bar */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-600 p-1.5">
            <Crown className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Master Control</h1>
            <p className="text-[10px] text-gray-500">Conversion System</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={fetchEnv} className="text-gray-500 hover:text-white transition" title="Refresh status">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <Link href="/master" className="text-xs text-gray-400 hover:text-white transition flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-white">Activate Stripe Billing</h2>
          <p className="text-sm text-gray-400 mt-1">Complete these 5 steps to start accepting payments. Takes about 30 minutes.</p>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>{completedCount}/5 steps complete</span>
              {completedCount === 5 && <span className="text-emerald-400 font-medium">All done!</span>}
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4">

          {/* Step 1 */}
          <StepCard num={1} title="Create Stripe Account" icon={CreditCard} done={stepDone(1)}>
            <p className="text-sm text-gray-400">
              Go to stripe.com, create an account (or log in), then get your Secret Key from <strong className="text-gray-300">Developers → API Keys</strong>.
            </p>
            <CopyBox text="STRIPE_SECRET_KEY=sk_live_..." />
            <ExtLink href="https://dashboard.stripe.com/apikeys">Open Stripe API Keys</ExtLink>
          </StepCard>

          {/* Step 2 */}
          <StepCard num={2} title="Create 3 Products in Stripe" icon={Package} done={stepDone(2)}>
            <p className="text-sm text-gray-400 mb-3">
              In Stripe Dashboard → <strong className="text-gray-300">Products → Add product</strong>. Set each price as <strong className="text-gray-300">recurring monthly</strong>. Copy the Price ID (starts with <code className="text-indigo-400">price_</code>).
            </p>
            <div className="space-y-2">
              {[
                { name: 'Kyra Lite', price: '$99/mo', env: 'STRIPE_LITE_PRICE_ID', set: env?.STRIPE_LITE_PRICE_ID },
                { name: 'Kyra Pro', price: '$299/mo', env: 'STRIPE_PRO_PRICE_ID', set: env?.STRIPE_PRO_PRICE_ID },
                { name: 'Kyra Scale', price: '$499/mo', env: 'STRIPE_SCALE_PRICE_ID', set: env?.STRIPE_SCALE_PRICE_ID },
              ].map(p => (
                <div key={p.name} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
                  {p.set ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <Circle className="h-4 w-4 text-gray-600 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-white font-medium">{p.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{p.price} recurring</span>
                  </div>
                  <code className="text-[10px] text-gray-500 font-mono">{p.env}</code>
                </div>
              ))}
            </div>
            <ExtLink href="https://dashboard.stripe.com/products">Open Stripe Products</ExtLink>
          </StepCard>

          {/* Step 3 */}
          <StepCard num={3} title="Set Vercel Environment Variables" icon={Settings} done={stepDone(3)}>
            <p className="text-sm text-gray-400">
              Add all 6 environment variables in Vercel, then <strong className="text-gray-300">redeploy</strong> for them to take effect.
            </p>
            <EnvBlock lines={[
              'STRIPE_SECRET_KEY=sk_live_...',
              'STRIPE_WEBHOOK_SECRET=whsec_...',
              'STRIPE_LITE_PRICE_ID=price_...',
              'STRIPE_PRO_PRICE_ID=price_...',
              'STRIPE_SCALE_PRICE_ID=price_...',
              'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...',
            ]} />
            <div className="mt-2 space-y-0.5">
              {env && Object.entries(env).map(([key, set]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  {set ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Circle className="h-3 w-3 text-gray-600" />}
                  <span className={set ? 'text-gray-300' : 'text-gray-500'}>{key}</span>
                </div>
              ))}
            </div>
            <ExtLink href="https://vercel.com/conversionsystem/kyra/settings/environment-variables">Open Vercel Env Vars</ExtLink>
          </StepCard>

          {/* Step 4 */}
          <StepCard num={4} title="Configure Stripe Webhook" icon={Webhook} done={stepDone(4)}>
            <p className="text-sm text-gray-400">
              Go to <strong className="text-gray-300">Stripe Dashboard → Developers → Webhooks → Add endpoint</strong>.
            </p>
            <div className="mt-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Endpoint URL</span>
              <CopyBox text="https://kyra.conversionsystem.com/api/webhooks/stripe" />
            </div>
            <div className="mt-3">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Events to listen for</span>
              <div className="mt-1.5 space-y-1">
                {WEBHOOK_EVENTS.map(evt => (
                  <div key={evt} className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-indigo-500" />
                    <code className="text-xs text-gray-300 font-mono">{evt}</code>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              After creating the webhook, copy the <strong className="text-gray-400">Signing Secret</strong> and set it as <code className="text-indigo-400">STRIPE_WEBHOOK_SECRET</code>.
            </p>
            {env && (
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  {env.STRIPE_WEBHOOK_REGISTERED
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    : <Circle className="h-3.5 w-3.5 text-gray-600" />}
                  <span className={env.STRIPE_WEBHOOK_REGISTERED ? 'text-emerald-300' : 'text-gray-500'}>
                    {env.STRIPE_WEBHOOK_REGISTERED
                      ? 'Webhook endpoint active in Stripe'
                      : 'Webhook not yet registered in Stripe'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {env.STRIPE_WEBHOOK_SECRET
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    : <Circle className="h-3.5 w-3.5 text-gray-600" />}
                  <span className={env.STRIPE_WEBHOOK_SECRET ? 'text-gray-300' : 'text-gray-500'}>STRIPE_WEBHOOK_SECRET</span>
                </div>
              </div>
            )}
            <ExtLink href="https://dashboard.stripe.com/webhooks">Open Stripe Webhooks</ExtLink>
          </StepCard>

          {/* Step 5 */}
          <StepCard num={5} title="Test Connection" icon={FlaskConical} done={stepDone(5)}>
            <p className="text-sm text-gray-400">
              Verify that the Stripe API key is valid and Kyra can connect.
            </p>
            <button
              onClick={runTest}
              disabled={testing}
              className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
            >
              {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
              {testing ? 'Testing...' : 'Run Billing Test'}
            </button>
            {testResult && (
              <div className={`mt-3 p-3 rounded-lg border text-sm ${
                testResult.ok
                  ? 'bg-emerald-900/30 border-emerald-800 text-emerald-300'
                  : 'bg-red-900/30 border-red-800 text-red-300'
              }`}>
                {testResult.ok ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Billing is active! 🎉{testResult.accountName ? ` — Connected to ${testResult.accountName}` : ''}</span>
                  </div>
                ) : (
                  <span>Error: {testResult.error}</span>
                )}
              </div>
            )}
          </StepCard>
        </div>

        {/* All done banner */}
        {completedCount === 5 && (
          <div className="bg-emerald-900/20 border border-emerald-800 rounded-xl p-6 text-center">
            <p className="text-lg font-bold text-emerald-400">Billing is fully active! 🎉</p>
            <p className="text-sm text-gray-400 mt-1">Customers can now subscribe to Kyra Lite, Pro, and Scale plans.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StepCard({ num, title, icon: Icon, done, children }: {
  num: number; title: string; icon: React.ElementType; done: boolean; children: React.ReactNode;
}) {
  return (
    <div className={`bg-gray-900 border rounded-xl overflow-hidden transition ${done ? 'border-emerald-800/50' : 'border-gray-800'}`}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/50">
        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          done ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'
        }`}>
          {done ? <CheckCircle2 className="h-4 w-4" /> : num}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Icon className={`h-4 w-4 ${done ? 'text-emerald-400' : 'text-gray-500'}`} />
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        {done && <span className="text-[10px] text-emerald-400 font-medium shrink-0">Complete</span>}
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}
