'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, X, ArrowRight } from 'lucide-react';
import type { OnboardingStepMeta, OnboardingStepsRecord } from '@/lib/onboarding/tracker';

interface OnboardingProgressProps {
  steps: OnboardingStepsRecord;
  stepsMeta: OnboardingStepMeta[];
}

export function OnboardingProgress({ steps, stepsMeta }: OnboardingProgressProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissed(localStorage.getItem('onboarding_dismissed') === 'true');
    }
  }, []);

  const completedCount = stepsMeta.filter(s => steps[s.key]?.completed).length;
  const totalSteps = stepsMeta.length;
  const percentComplete = Math.round((completedCount / totalSteps) * 100);

  // Auto-hide at 100% or if dismissed
  if (dismissed || completedCount === totalSteps) return null;

  const handleDismiss = () => {
    localStorage.setItem('onboarding_dismissed', 'true');
    setDismissed(true);
  };

  // Find the first incomplete step (the "current" step)
  const currentStepKey = stepsMeta.find(s => !steps[s.key]?.completed)?.key ?? null;

  return (
    <Card className="mb-6 border-indigo-200 bg-indigo-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-gray-900">
            Get started with Kyra
          </CardTitle>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss onboarding checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 h-2 bg-indigo-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {completedCount}/{totalSteps}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-1">
          {stepsMeta.map(step => {
            const completed = steps[step.key]?.completed ?? false;
            const isCurrent = step.key === currentStepKey;

            if (completed) {
              return (
                <li key={step.key} className="flex items-center gap-2.5 py-1.5 px-2">
                  <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0" />
                  <p className="text-sm font-medium text-gray-400 line-through">{step.label}</p>
                </li>
              );
            }

            return (
              <li key={step.key}>
                <Link
                  href={step.href}
                  className={`flex items-center gap-2.5 py-2 px-2 rounded-lg group transition-colors ${
                    isCurrent
                      ? 'bg-indigo-50 border border-indigo-100'
                      : 'hover:bg-indigo-50/50'
                  }`}
                >
                  <Circle className={`h-5 w-5 shrink-0 ${isCurrent ? 'text-indigo-400' : 'text-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isCurrent ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-gray-400">{step.description}</p>
                    )}
                  </div>
                  {isCurrent ? (
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-md shrink-0">
                      Start <ArrowRight className="inline h-3 w-3 ml-0.5" />
                    </span>
                  ) : (
                    <ArrowRight className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
