'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  UserPlus, Settings, Plug, Zap, TrendingUp, CheckCircle2,
  ChevronRight, X, Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LaunchStage {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  checkFn: string; // key in settings to check
}

const STAGES: LaunchStage[] = [
  {
    key: 'signup',
    label: 'Sign Up',
    description: 'Create your account',
    icon: UserPlus,
    href: '/agency',
    checkFn: 'signup_complete',
  },
  {
    key: 'configure',
    label: 'Configure',
    description: 'Pick your industry, personality & services',
    icon: Settings,
    href: '/agency/setup',
    checkFn: 'setup_complete',
  },
  {
    key: 'connect',
    label: 'Connect',
    description: 'Connect GHL, channels or chat widget',
    icon: Plug,
    href: '/agency/channels',
    checkFn: 'channels_connected',
  },
  {
    key: 'automate',
    label: 'Automate',
    description: 'Set up autopilot, follow-ups & reviews',
    icon: Zap,
    href: '/agency/autopilot',
    checkFn: 'autopilot_configured',
  },
  {
    key: 'scale',
    label: 'Scale',
    description: 'Add more clients, track performance',
    icon: TrendingUp,
    href: '/agency/clients',
    checkFn: 'first_client_added',
  },
];

interface LaunchProgressProps {
  completedSteps: string[];
  onDismiss?: () => void;
  compact?: boolean;
}

export function LaunchProgress({ completedSteps, onDismiss, compact }: LaunchProgressProps) {
  // Always mark signup as complete (they're logged in)
  const completed = new Set([...completedSteps, 'signup_complete']);
  const currentIndex = STAGES.findIndex(s => !completed.has(s.checkFn));
  const progress = STAGES.filter(s => completed.has(s.checkFn)).length;
  const pct = Math.round((progress / STAGES.length) * 100);

  if (progress >= STAGES.length) {
    // All complete — show minimal celebration or hide
    if (compact) return null;
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <Rocket className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">Launch Complete! 🎉</p>
            <p className="text-xs text-green-600">Your AI workforce is fully operational.</p>
          </div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-green-400 hover:text-green-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Rocket className="h-4 w-4 text-indigo-600" />
            Launch Your AI Worker
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Stage {progress + 1} of {STAGES.length} — {pct}% complete</p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="px-5 pt-3">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stages */}
      <div className="px-5 py-4 space-y-1">
        {STAGES.map((stage, i) => {
          const done = completed.has(stage.checkFn);
          const isCurrent = i === currentIndex;
          const Icon = stage.icon;

          return (
            <Link
              key={stage.key}
              href={stage.href}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition group ${
                isCurrent
                  ? 'bg-indigo-50 border border-indigo-200'
                  : done
                    ? 'opacity-60'
                    : 'hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                done ? 'bg-green-100' : isCurrent ? 'bg-indigo-100' : 'bg-gray-100'
              }`}>
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Icon className={`h-4 w-4 ${isCurrent ? 'text-indigo-600' : 'text-gray-400'}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isCurrent ? 'text-indigo-700' : done ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                  {stage.label}
                </p>
                <p className="text-[11px] text-gray-400">{stage.description}</p>
              </div>
              {isCurrent && (
                <ChevronRight className="h-4 w-4 text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
