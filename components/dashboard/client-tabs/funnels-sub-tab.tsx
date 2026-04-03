'use client';

import { useState, useCallback } from 'react';
import {
  Sparkles, Loader2, Zap, ChevronDown, ChevronUp,
  Globe, FormInput, ThumbsUp, TrendingUp, Mail,
  Copy, Check, ArrowRight,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import type { FunnelPlan, FunnelStep } from '@/lib/funnels/ai-funnel-builder';

// ── Helpers ──────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

const STEP_ICONS: Record<FunnelStep['type'], React.ElementType> = {
  landing: Globe,
  form: FormInput,
  thankyou: ThumbsUp,
  upsell: TrendingUp,
};

const STEP_COLORS: Record<FunnelStep['type'], string> = {
  landing: 'bg-blue-100 text-blue-700',
  form: 'bg-purple-100 text-purple-700',
  thankyou: 'bg-green-100 text-green-700',
  upsell: 'bg-amber-100 text-amber-700',
};

const STEP_LABELS: Record<FunnelStep['type'], string> = {
  landing: 'Landing Page',
  form: 'Lead Capture',
  thankyou: 'Thank You',
  upsell: 'Upsell',
};

// ── Step Card ─────────────────────────────────────────────────────────────────

function FunnelStepCard({ step, isLast }: { step: FunnelStep; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = STEP_ICONS[step.type] || Globe;

  return (
    <div className="relative">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-6 top-full w-0.5 h-6 bg-gray-200 z-0" />
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden relative z-10">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${STEP_COLORS[step.type]}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-400">Step {step.order}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STEP_COLORS[step.type]}`}>
                  {STEP_LABELS[step.type]}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{step.headline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CopyButton text={`${step.headline}\n${step.subheadline}\n\n${step.body}`} />
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-gray-100 p-4 space-y-3">
            <p className="text-sm text-gray-600">{step.subheadline}</p>
            <div
              className="text-sm text-gray-700 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: step.body }}
            />
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                {step.ctaText}
              </button>
              {step.designHints.imagePrompt && (
                <p className="text-xs text-gray-400 italic">📷 {step.designHints.imagePrompt}</p>
              )}
            </div>
            {step.formFields && step.formFields.length > 0 && (
              <div className="space-y-2 mt-3">
                <p className="text-xs font-medium text-gray-500">Form Fields:</p>
                {step.formFields.map((field, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span>{field.placeholder}</span>
                    <span className="text-gray-400">({field.type})</span>
                    {field.required && <span className="text-red-400">*</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function FunnelsSubTab({ client }: { client: AgencyClient }) {
  const [offerDescription, setOfferDescription] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [funnel, setFunnel] = useState<FunnelPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEmails, setShowEmails] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!offerDescription.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/agency/clients/${client.id}/funnels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerDescription: offerDescription.trim(), price: price.trim() || undefined }),
      });
      const data = await res.json() as { funnel?: FunnelPlan; error?: string };
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to generate funnel.');
      } else if (data.funnel) {
        setFunnel(data.funnel);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client.id, offerDescription, price]);

  return (
    <div className="space-y-6">
      {/* Generator */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-gray-900">AI Funnel Builder</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Describe your offer and AI will generate a complete multi-step sales funnel with landing pages, forms, and follow-up emails.
        </p>
        <div className="space-y-3">
          <textarea
            value={offerDescription}
            onChange={e => setOfferDescription(e.target.value)}
            placeholder='e.g. "I sell HVAC maintenance plans at $199/month — includes seasonal tune-ups, priority service, and 10% off repairs"'
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            rows={3}
            disabled={loading}
          />
          <div className="flex gap-3">
            <input
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="Price (optional) e.g. $199/month"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !offerDescription.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Building...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Build Funnel
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400">⚡ Costs 3 credits per funnel</p>
        </div>
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-100 px-4 py-2">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Funnel Preview */}
      {funnel && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{funnel.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {funnel.steps.length} steps • Generated {new Date(funnel.generatedAt).toLocaleDateString()}
              </p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
              Draft
            </span>
          </div>

          {/* Funnel flow visualization */}
          <div className="space-y-6">
            {funnel.steps.map((step, i) => (
              <FunnelStepCard
                key={step.id}
                step={step}
                isLast={i === funnel.steps.length - 1}
              />
            ))}
          </div>

          {/* Email sequence */}
          {funnel.emailSequence.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <button
                onClick={() => setShowEmails(!showEmails)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm font-semibold text-gray-900">Follow-Up Email Sequence</span>
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                    {funnel.emailSequence.length}
                  </span>
                </div>
                {showEmails ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {showEmails && (
                <div className="border-t border-gray-100 p-4 space-y-3">
                  {funnel.emailSequence.map((email, i) => (
                    <div key={i} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-400">Day {email.sendDay}</span>
                          <span className="text-sm font-medium text-gray-900">{email.subject}</span>
                        </div>
                        <CopyButton text={`Subject: ${email.subject}\n\n${email.body}`} />
                      </div>
                      <div
                        className="text-sm text-gray-700 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: email.body }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!funnel && !loading && (
        <div className="text-center py-12 px-6">
          <Globe className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No funnels yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Describe your offer above and AI will build a complete conversion funnel.
          </p>
        </div>
      )}
    </div>
  );
}
