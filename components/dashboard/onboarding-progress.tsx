'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, X } from 'lucide-react';
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

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/50">
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
          <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <span className="text-sm text-gray-500 whitespace-nowrap">
            {completedCount}/{totalSteps}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {stepsMeta.map(step => {
            const completed = steps[step.key]?.completed ?? false;
            return (
              <li key={step.key} className="flex items-start gap-2.5">
                {completed ? (
                  <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-300 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-medium ${completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {step.label}
                  </p>
                  {!completed && (
                    <p className="text-xs text-gray-400">{step.description}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
