'use client';

import { useState, useEffect } from 'react';

/**
 * LaunchCountdown — Live countdown to March 16 event
 * Target: March 16, 2026 @ 12:00 PM PT (19:00 UTC / 20:00 CET)
 */

const LAUNCH_TARGET = new Date('2026-03-16T19:00:00.000Z'); // noon PT San Francisco

function getTimeLeft(now: Date) {
  const diff = LAUNCH_TARGET.getTime() - now.getTime();
  if (diff <= 0) return null;
  const totalSecs = Math.floor(diff / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;
  return { hours, minutes, seconds, total: diff };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

interface Props {
  /** compact mode: just shows "Xh Ym" inline */
  compact?: boolean;
}

export default function LaunchCountdown({ compact = false }: Props) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(new Date()));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTimeLeft(getTimeLeft(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) {
    // SSR placeholder — avoids hydration mismatch
    if (compact) return <span className="tabular-nums">Loading…</span>;
    return null;
  }

  if (!timeLeft) {
    // Event has started / passed
    if (compact) {
      return (
        <span className="inline-flex items-center gap-1 font-semibold text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
          LIVE NOW
        </span>
      );
    }
    return (
      <div className="inline-flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-2xl font-bold text-lg animate-pulse">
        🎉 We're LIVE — watch now
      </div>
    );
  }

  if (compact) {
    if (timeLeft.hours > 0) {
      return (
        <span className="tabular-nums font-bold">
          {timeLeft.hours}h {pad(timeLeft.minutes)}m
        </span>
      );
    }
    return (
      <span className="tabular-nums font-bold text-red-400 animate-pulse">
        {timeLeft.minutes}m {pad(timeLeft.seconds)}s
      </span>
    );
  }

  // Full countdown block
  const segments = [
    { value: timeLeft.hours, label: 'hours' },
    { value: timeLeft.minutes, label: 'min' },
    { value: timeLeft.seconds, label: 'sec' },
  ];

  const isUrgent = timeLeft.hours === 0;

  return (
    <div className="flex items-center justify-center gap-3">
      {segments.map(({ value, label }) => (
        <div key={label} className="flex flex-col items-center">
          <div
            className={`
              text-4xl sm:text-5xl font-black tabular-nums leading-none
              ${isUrgent ? 'text-red-500 animate-pulse' : 'text-indigo-600'}
            `}
          >
            {pad(value)}
          </div>
          <span className="text-xs text-slate-400 uppercase tracking-widest mt-1">{label}</span>
        </div>
      ))}
    </div>
  );
}
