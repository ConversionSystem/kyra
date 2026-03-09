'use client';

import { useState } from 'react';
import { MODELS, ModelOption, getModelsByTier } from '@/lib/billing/model-credits';
import { Zap, Brain, Star, Cpu } from 'lucide-react';

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
}

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const byTier = getModelsByTier();

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 p-3 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-700">
        <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-500" />
        <span>
          <strong>Smart routing active.</strong> Simple messages (greetings, FAQs) use fast models at no cost.
          Your selected model is the <strong>maximum</strong> used for complex queries.
          The OpenClaw terminal always shows <code className="bg-indigo-100 px-1 rounded font-mono">openai/gpt-4o-mini</code> — this is normal.
        </span>
      </div>
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
              {models.map(model => (
                <ModelCard
                  key={model.id}
                  model={model}
                  selected={value === model.id}
                  onSelect={() => !disabled && onChange(model.id)}
                  disabled={disabled}
                  tierCfg={cfg}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModelCard({
  model, selected, onSelect, disabled, tierCfg,
}: {
  model: ModelOption;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  tierCfg: typeof TIER_CONFIG[keyof typeof TIER_CONFIG];
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`
        relative p-3 rounded-xl border text-left transition-all
        ${selected
          ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-1 ring-indigo-300'
          : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm hover:bg-gray-50/80'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{PROVIDER_LOGO[model.provider]}</span>
          <div>
            <div className={`text-sm font-semibold ${selected ? 'text-indigo-900' : 'text-gray-900'}`}>
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
        <span className="text-xs text-gray-400 font-medium">
          {model.creditsPerTurn === 1
            ? '1 credit / turn'
            : `${model.creditsPerTurn} credits / turn`}
        </span>
      </div>
      {selected && (
        <div className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-500" />
      )}
    </button>
  );
}
