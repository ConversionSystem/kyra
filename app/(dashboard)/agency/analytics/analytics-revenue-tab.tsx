'use client';

/**
 * Analytics Revenue Tab — Sprint 3
 * Moved from /agency/revenue into /agency/analytics as a sub-tab.
 * The /agency/revenue route now redirects here.
 */

import { useState, useEffect } from 'react';
import { DollarSign, Users, TrendingUp, Zap, ArrowRight, CheckCircle2, Edit2, Save, Loader2 } from 'lucide-react';

// Client counts mirror plans.ts → maxClients (plan workers + 1 free worker)
// Prices are monthly — Pro is $299, not $249
const PLAN_LIMITS = {
  free:    { clients: 1,  price: 0,   label: 'Free'    },
  lite:    { clients: 4,  price: 99,  label: 'Lite'    },
  starter: { clients: 4,  price: 99,  label: 'Lite'    },
  pro:     { clients: 11, price: 299, label: 'Pro'     },
  scale:   { clients: 21, price: 499, label: 'Scale'   },
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

interface ClientRate {
  id: string;
  name: string;
  status: string;
  monthlyRate: number;
}

function ActualMrrCard({ clients }: { clients: ClientRate[] }) {
  const [rates, setRates] = useState<Record<string, string>>(
    Object.fromEntries(clients.map((c) => [c.id, c.monthlyRate > 0 ? String(c.monthlyRate) : '']))
  );
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const totalMrr = clients.reduce((sum, c) => {
    const r = parseFloat(rates[c.id] || '0');
    return sum + (isNaN(r) ? 0 : r);
  }, 0);

  const handleSave = async (clientId: string) => {
    setSaving((s) => ({ ...s, [clientId]: true }));
    const rate = parseFloat(rates[clientId] || '0');
    try {
      await fetch(`/api/agency/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { monthly_rate: isNaN(rate) ? 0 : rate } }),
      });
      setSaved((s) => ({ ...s, [clientId]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [clientId]: false })), 2000);
    } finally {
      setSaving((s) => ({ ...s, [clientId]: false }));
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Monthly Recurring Revenue</h2>
          <p className="text-sm text-gray-500">What you charge each client per month</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{fmt(totalMrr)}<span className="text-base font-normal text-gray-400">/mo</span></div>
          <div className="text-sm text-gray-500">{fmt(totalMrr * 12)}/yr ARR</div>
        </div>
      </div>
      {clients.length === 0 ? (
        <div className="px-6 py-8 text-center text-gray-400 text-sm">No clients yet</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {clients.map((c) => (
            <div key={c.id} className="px-6 py-3 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                <span className={`text-xs ${c.status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>{c.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">$</span>
                <input
                  type="number"
                  className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0"
                  value={rates[c.id] || ''}
                  onChange={(e) => setRates((r) => ({ ...r, [c.id]: e.target.value }))}
                />
                <span className="text-xs text-gray-400">/mo</span>
                <button
                  onClick={() => handleSave(c.id)}
                  disabled={saving[c.id]}
                  className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition"
                  title="Save rate"
                >
                  {saving[c.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : saved[c.id] ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RevenueCalculator({ realClientCount }: { realClientCount: number }) {
  const [plan, setPlan] = useState<keyof typeof PLAN_LIMITS>('pro');
  const [clientCount, setClientCount] = useState(realClientCount || 5);
  const [ratePerClient, setRatePerClient] = useState(500);

  const planInfo = PLAN_LIMITS[plan];
  const mrrFromClients = clientCount * ratePerClient;
  const kyraFee = planInfo.price;
  const netMrr = mrrFromClients - kyraFee;
  const netArr = netMrr * 12;
  const margin = mrrFromClients > 0 ? ((netMrr / mrrFromClients) * 100).toFixed(0) : '0';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Revenue Calculator</h2>
      <p className="text-sm text-gray-500 mb-5">Model your growth potential at different price points</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Your Kyra Plan</label>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={plan}
            onChange={(e) => setPlan(e.target.value as keyof typeof PLAN_LIMITS)}
          >
            {Object.entries(PLAN_LIMITS).filter(([k]) => !['starter'].includes(k)).map(([k, v]) => (
              <option key={k} value={k}>{v.label} — {fmt(v.price)}/mo</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Number of Clients</label>
          <input
            type="number"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={clientCount}
            onChange={(e) => setClientCount(Math.max(0, parseInt(e.target.value) || 0))}
            min={0}
            max={100}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Your Rate per Client</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={ratePerClient}
              onChange={(e) => setRatePerClient(Math.max(0, parseInt(e.target.value) || 0))}
              min={0}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Gross MRR', value: fmt(mrrFromClients), sub: 'from clients', color: 'text-gray-900' },
          { label: 'Kyra Fee', value: fmt(kyraFee), sub: planInfo.label + ' plan', color: 'text-red-500' },
          { label: 'Net MRR', value: fmt(Math.max(0, netMrr)), sub: `${margin}% margin`, color: 'text-green-600' },
          { label: 'Net ARR', value: fmt(Math.max(0, netArr)), sub: 'annualized', color: 'text-indigo-600' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsRevenueTab({ clients }: { clients: ClientRate[] }) {
  const activeClientCount = clients.filter(c => c.status === 'active').length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-green-500" />
        <h2 className="text-xl font-bold text-gray-900">Revenue</h2>
      </div>
      <ActualMrrCard clients={clients} />
      <RevenueCalculator realClientCount={activeClientCount} />
    </div>
  );
}
