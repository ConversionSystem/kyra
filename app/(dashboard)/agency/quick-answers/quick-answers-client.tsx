'use client';

import { Zap, AlertCircle } from 'lucide-react';
import QuickAnswersEditor from '@/components/dashboard/quick-answers-editor';

interface Props {
  agencyId: string;
  clientId: string | null;
  businessName: string;
}

export default function QuickAnswersPageClient({ clientId, businessName }: Props) {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="h-5 w-5 text-indigo-600" />
          Quick Answers
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Instant answers your AI gives at <strong>zero cost</strong> — no model call, no credits spent.
          Perfect for hours, pricing, location, and FAQs.
        </p>
      </div>

      {/* Cost savings callout */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">How this saves you credits</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              Every answer you define here is matched and returned instantly by the router — before it ever 
              reaches an AI model. For high-volume questions like "what are your hours?", this can eliminate 
              20–40% of your total credit usage.
            </p>
          </div>
        </div>
      </div>

      {clientId ? (
        <QuickAnswersEditor clientId={clientId} />
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">No AI worker set up yet</p>
            <p className="text-sm text-amber-700 mt-1">
              Quick Answers require an active AI worker. 
              Complete your setup first — once your AI worker is live, 
              come back here to configure instant answers.
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">How it works</p>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">1</span>
            Customer asks: <em>"What are your business hours?"</em>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">2</span>
            Router matches the question → returns your saved answer instantly
          </div>
          <div className="flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">✓</span>
            <span className="text-emerald-700 font-medium">0 credits used. 0ms model latency. 100% accurate.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
