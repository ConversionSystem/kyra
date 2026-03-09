'use client';

import { useState } from 'react';
import { MODELS, ModelOption, getModelsByTier } from '@/lib/billing/model-credits';
import { Zap, Brain, Star, Cpu } from 'lucide-react';

const TIER_CONFIG = {
  mini:      { label: 'Fast',      icon: Zap,   color: 'text-green-400',  badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
  standard:  { label: 'Standard',  icon: Cpu,   color: 'text-blue-400',   badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  reasoning: { label: 'Reasoning', icon: Brain, color: 'text-purple-400', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  premium:   { label: 'Premium',   icon: Star,  color: 'text-amber-400',  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
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
    <div className="space-y-4">
      {(['mini', 'standard', 'reasoning', 'premium'] as const).map(tier => {
        const models = byTier[tier];
        if (!models.length) return null;
        const cfg = TIER_CONFIG[tier];
        const Icon = cfg.icon;

        return (
          <div key={tier}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${cfg.color}`} />
              <span className="text-sm font-medium text-gray-400">{cfg.label}</span>
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
        relative p-3 rounded-lg border text-left transition-all
        ${selected
          ? 'border-primary bg-primary/10'
          : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{PROVIDER_LOGO[model.provider]}</span>
          <div>
            <div className="text-sm font-medium text-white">{model.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{model.description}</div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className={`text-xs px-1.5 py-0.5 rounded border ${tierCfg.badge}`}>
          {tierCfg.label}
        </span>
        <span className="text-xs text-gray-500">
          {model.creditsPerTurn === 1
            ? '1 credit / turn'
            : `${model.creditsPerTurn} credits / turn`}
        </span>
      </div>
      {selected && (
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
      )}
    </button>
  );
}
