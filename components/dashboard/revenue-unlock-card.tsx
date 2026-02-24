'use client';

import Link from 'next/link';
import { TrendingUp, Zap, Lock } from 'lucide-react';

interface Props {
  plan: string;
  clientCount: number;
  ratePerClient?: number; // default $997/mo
}

const PLAN_NEXT: Record<string, { name: string; key: string; price: number; max: number }> = {
  free:    { name: 'Lite',  key: 'starter', price: 99,  max: 5  },
  starter: { name: 'Pro',   key: 'pro',     price: 249, max: 15 },
  pro:     { name: 'Scale', key: 'scale',   price: 499, max: 50 },
};

export default function RevenueUnlockCard({ plan, clientCount, ratePerClient = 997 }: Props) {
  const next = PLAN_NEXT[plan];
  if (!next) return null; // scale plan — no upsell needed

  const currentMRR = clientCount * ratePerClient;
  const nextMRR = next.max * ratePerClient;
  const uplift = nextMRR - currentMRR;
  const roi = Math.round((uplift - next.price) / next.price); // ROI multiple

  const fmtK = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`;

  return (
    <div className="rounded-2xl overflow-hidden border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">You&apos;re leaving money on the table</p>
            <p className="text-indigo-200 text-xs mt-0.5">
              {clientCount === 0
                ? `Add your first client → start billing at ${fmtK(ratePerClient)}/mo`
                : `${clientCount} client${clientCount !== 1 ? 's' : ''} now = ${fmtK(currentMRR)}/mo potential`}
            </p>
          </div>
        </div>

        {/* Revenue bars */}
        <div className="space-y-2.5 mb-4">
          {/* Current */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-indigo-300 w-14 text-right shrink-0">NOW</span>
            <div className="flex-1 bg-white/10 rounded-full h-5 overflow-hidden">
              <div
                className="h-full bg-white/25 rounded-full flex items-center pl-2"
                style={{ width: `${Math.max(8, (clientCount / next.max) * 100)}%` }}
              >
                <span className="text-[9px] font-bold text-white/80 whitespace-nowrap">
                  {clientCount}/{next.max === 50 ? '∞' : next.max}
                </span>
              </div>
            </div>
            <span className="text-[11px] font-bold text-white/80 w-14 shrink-0">{fmtK(currentMRR)}/mo</span>
          </div>
          {/* After upgrade */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-yellow-300 w-14 text-right shrink-0 font-semibold">{next.name}</span>
            <div className="flex-1 bg-white/10 rounded-full h-5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full flex items-center pl-2 w-full">
                <span className="text-[9px] font-bold text-yellow-900 whitespace-nowrap">
                  up to {next.max} clients
                </span>
              </div>
            </div>
            <span className="text-[11px] font-bold text-yellow-300 w-14 shrink-0">{fmtK(nextMRR)}/mo</span>
          </div>
        </div>

        {/* ROI call-out */}
        <div className="bg-white/10 rounded-xl p-3 mb-4 flex items-center gap-3">
          <Zap className="h-5 w-5 text-yellow-300 shrink-0" />
          <div>
            <p className="text-xs font-bold text-white leading-tight">
              Upgrade for ${next.price}/mo → unlock {fmtK(uplift)}/mo more revenue potential
            </p>
            <p className="text-[10px] text-indigo-200 mt-0.5">
              {roi}× ROI from day one with one new client
            </p>
          </div>
        </div>

        {/* Locked slots teaser */}
        <div className="flex items-center gap-1.5 mb-4">
          {Array.from({ length: Math.min(8, next.max - clientCount) }).map((_, i) => (
            <div key={i} className="flex-1 h-7 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
              <Lock className="h-3 w-3 text-white/40" />
            </div>
          ))}
          {next.max - clientCount > 8 && (
            <span className="text-[10px] text-indigo-300 ml-1">+{next.max - clientCount - 8} more</span>
          )}
        </div>

        <Link
          href={`/agency/billing?upgrade=${next.key}`}
          className="block w-full text-center bg-white text-indigo-700 font-black py-3 rounded-xl hover:bg-indigo-50 transition text-sm"
        >
          Unlock {next.max} clients — Upgrade to {next.name} →
        </Link>
        <p className="text-center text-[10px] text-indigo-300 mt-2">
          Cancel anytime · ${next.price}/mo vs {fmtK(nextMRR)}/mo in client revenue
        </p>
      </div>
    </div>
  );
}
