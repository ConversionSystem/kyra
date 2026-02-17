'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

const stages = [
  { message: 'Waking up your AI...', minTime: 0 },
  { message: 'Starting up the engine...', minTime: 5_000 },
  { message: 'Almost ready...', minTime: 15_000 },
  { message: 'Just a moment longer...', minTime: 30_000 },
];

export function WakingUpIndicator() {
  const [stageIndex, setStageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const nextIndex = [...stages].reverse().findIndex(s => elapsed >= s.minTime);
      const newIndex = nextIndex === -1 ? 0 : stages.length - 1 - nextIndex;

      if (newIndex !== stageIndex) {
        setIsTransitioning(true);
        setTimeout(() => {
          setStageIndex(newIndex);
          setIsTransitioning(false);
        }, 200);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [stageIndex]);

  return (
    <div className="py-4 md:py-6">
      <div className="mx-auto max-w-3xl px-4 md:px-0">
        <div className="mb-1 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-xs font-medium text-zinc-500">Kyra</span>
        </div>

        <div className="flex items-center gap-3 pt-1">
          {/* Animated sparkle orb */}
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
            <div className="absolute inset-0 animate-ping rounded-full bg-indigo-500/20" />
            <div className="absolute inset-0 animate-pulse rounded-full bg-indigo-500/10" />
            <div className="relative animate-spin-slow text-lg">✨</div>
          </div>

          {/* Rotating message with fade */}
          <div className="flex flex-col gap-1">
            <span
              className={`text-sm text-zinc-300 transition-opacity duration-200 ${
                isTransitioning ? 'opacity-0' : 'opacity-100'
              }`}
            >
              {stages[stageIndex].message}
            </span>

            {/* Progress dots */}
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500/60 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500/60 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500/60" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
