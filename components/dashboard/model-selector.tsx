'use client';

import { useState } from 'react';
import { MODELS, ModelOption, getModelsByTier } from '@/lib/billing/model-credits';
import { Zap, Brain, Star, Cpu, Lock } from 'lucide-react';
import Link from 'next/link';

const TIER_CONFIG = {
  mini:      { label: 'Fast',      icon: Zap,   color: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  standard:  { label: 'Standard',  icon: Cpu,   color: 'text-indigo-600',  badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  pro:       { label: 'Pro',       icon: Star,  color: 'text-blue-600',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  reasoning: { label: 'Reasoning', icon: Brain, color: 'text-violet-600',  badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  premium:   { label: 'Premium',   icon: Star,  color: 'text-amber-600',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  ultra:     { label: 'Ultra',     icon: Star,  color: 'text-rose-600',    badge: 'bg-rose-50 text-rose-700 border-rose-200' },
} as const;

const PROVIDER_LOGO: Record<string, string> = {
  openai:    '🟢',
  anthropic: '🟤',
  google:    '🔵',
};

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  availableProviders?: ('openai' | 'anthropic' | 'google')[];
}

export function ModelSelector({ value, onChange, disabled, availableProviders }: ModelSelectorProps) {
  const byTier = getModelsByTier();
  // Default: only openai if no providers specified
  const available = availableProviders ?? ['openai'];
  const hasLocked = !available.includes('anthropic') || !available.includes('google');

  return (
    <div className="space-y-5">
      {hasLocked && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
          <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
          <span>
            <strong>Anthropic and Google models require your own API key.</strong>{' '}
            Add your key in{' '}
            <Link href="/agency/api-keys" className="underline font-medium hover:text-amber-900">
              Settings → API Keys
            </Link>{' '}
            to unlock Claude and Gemini models.
          </span>
        </div>
      )}
      {(['mini', 'standard', 'pro', 'reasoning', 'premium', 'ultra'] as const).map(tier => {
        const models = byTier[tier];
        if (!models.length) return null;
        const cfg = TIER_CONFIG[tier];
        const Icon = cfg.icon;

        return (
          <div key={tier}>
            <div className="flex items-center gap-2 mb-2.5">
              <Icon className={`w-4 h-4 ${cfg.color}`} />
              <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {models.map(model => {
                const isLocked = !available.includes(model.provider);
                return (
                  <ModelCard
                    key={model.id}
                    model={model}
                    selected={value === model.id}
                    onSelect={() => !disabled && !isLocked && onChange(model.id)}
                    disabled={disabled || isLocked}
                    locked={isLocked}
                    tierCfg={cfg}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModelCard({
  model, selected, onSelect, disabled, locked, tierCfg,
}: {
  model: ModelOption;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  locked?: boolean;
  tierCfg: typeof TIER_CONFIG[keyof typeof TIER_CONFIG];
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`
        relative p-3 rounded-xl border text-left transition-all
        ${locked
          ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
          : selected
            ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-1 ring-indigo-300 cursor-pointer'
            : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm hover:bg-gray-50/80 cursor-pointer'
        }
        ${!locked && disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{PROVIDER_LOGO[model.provider]}</span>
          <div>
            <div className={`text-sm font-semibold ${selected && !locked ? 'text-indigo-900' : 'text-gray-900'}`}>
              {model.label}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{model.description}</div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${tierCfg.badge}`}>
          {tierCfg.label}
        </span>
        {locked ? (
          <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
            <Lock className="w-3 h-3" /> Needs API key
          </span>
        ) : (
          <span className="text-xs text-gray-400 font-medium">
            {model.creditsPerTurn === 1 ? '1 credit / turn' : `${model.creditsPerTurn} credits / turn`}
          </span>
        )}
      </div>
      {selected && !locked && (
        <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-500" />
      )}
    </button>
  );
}
