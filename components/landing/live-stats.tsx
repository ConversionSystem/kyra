'use client';

import { useEffect, useState } from 'react';

interface Stats {
  agencies: number;
  ai_employees: number;
  conversations: number;
  industries: number;
}

const FALLBACK: Stats = { agencies: 9, ai_employees: 22, conversations: 500, industries: 21 };

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K+`;
  return `${n}+`;
}

interface StatItem {
  value: string;
  label: string;
  sub: string;
}

export default function LiveStats() {
  const [stats, setStats] = useState<Stats>(FALLBACK);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const items: StatItem[] = [
    { value: `< 60s`, label: 'Average response time', sub: 'to every inbound SMS' },
    { value: `${stats.agencies}`, label: 'Active agencies', sub: 'managing clients on Kyra' },
    { value: `${stats.industries}`, label: 'Industry templates', sub: 'ready to deploy' },
    { value: `${formatNum(stats.conversations)}`, label: 'AI conversations handled', sub: 'and counting' },
  ];

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-60'}`}>
      {items.map(s => (
        <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
          <p className="text-3xl font-black text-white mb-1">{s.value}</p>
          <p className="text-sm font-semibold text-slate-300">{s.label}</p>
          <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}
