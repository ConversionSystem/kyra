'use client';

import { useState } from 'react';
import { DollarSign, Users, TrendingUp, Zap, ArrowRight, CheckCircle2, Edit2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const PLAN_LIMITS = {
  free:    { clients: 1,  price: 0,   label: 'Free'    },
  starter: { clients: 5,  price: 99,  label: 'Lite' },
  pro:     { clients: 15, price: 247, label: 'Pro'     },
  scale:   { clients: 50, price: 497, label: 'Scale'   },
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

// ── Actual MRR card ────────────────────────────────────────────────────────────

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
    await fetch(`/api/agency/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { monthly_rate: isNaN(rate) ? 0 : rate } }),
    });
    setSaving((s) => ({ ...s, [clientId]: false }));
    setSaved((s) => ({ ...s, [clientId]: true }));
    setTimeout(() => setSaved((s) => ({ ...s, [clientId]: false })), 2000);
  };

  if (clients.length === 0) return null;

  const activeClients = clients.filter((c) => c.status === 'active');
  const configuredCount = activeClients.filter((c) => (parseFloat(rates[c.id] || '0') || 0) > 0).length;

  return (
    <Card className="mb-8 border-green-200 bg-gradient-to-br from-green-50/60 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Your Actual MRR
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Set what you charge each client to track your real recurring revenue.
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-green-700">{fmt(totalMrr)}</p>
            <p className="text-xs text-gray-400">/ month</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {configuredCount === 0 && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
            💡 Set your rate for each client below to see your real MRR. Rates are saved privately and never visible to clients.
          </p>
        )}

        <div className="space-y-2">
          {clients.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${c.status === 'active' ? 'bg-green-400' : 'bg-gray-300'}`} />
              <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{c.name}</span>
              <Badge className={`text-[10px] shrink-0 ${c.status === 'active' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                {c.status}
              </Badge>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="0"
                  value={rates[c.id]}
                  onChange={(e) => setRates((r) => ({ ...r, [c.id]: e.target.value }))}
                  className="w-20 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-right focus:outline-none focus:border-indigo-400"
                />
                <span className="text-xs text-gray-400">/mo</span>
                <button
                  onClick={() => handleSave(c.id)}
                  disabled={saving[c.id]}
                  className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                    saved[c.id]
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-700'
                  }`}
                >
                  {saved[c.id] ? <CheckCircle2 className="h-3 w-3" /> : <Save className="h-3 w-3" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        {totalMrr > 0 && (
          <div className="mt-4 pt-4 border-t border-green-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900">{fmt(totalMrr)}</p>
              <p className="text-[10px] text-gray-400">MRR</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{fmt(totalMrr * 12)}</p>
              <p className="text-[10px] text-gray-400">ARR</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">
                {clients.length > 0 ? fmt(totalMrr / clients.length) : '$0'}
              </p>
              <p className="text-[10px] text-gray-400">Avg / client</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Hypothetical Calculator ────────────────────────────────────────────────────

export default function RevenueCalculator({ realClientCount }: { realClientCount: number }) {
  const [numClients, setNumClients] = useState(Math.max(realClientCount, 1));
  const [pricePerClient, setPricePerClient] = useState(500);

  const plan = numClients <= 1 ? 'free' : numClients <= 5 ? 'starter' : numClients <= 15 ? 'pro' : 'scale';
  const kyraFee = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS].price;
  const grossRevenue = numClients * pricePerClient;
  const netRevenue = grossRevenue - kyraFee;
  const margin = grossRevenue > 0 ? Math.round((netRevenue / grossRevenue) * 100) : 0;
  const annualRevenue = netRevenue * 12;

  return (
    <>
      {/* Pre-fill hint */}
      {realClientCount > 0 && (
        <div className="mb-6 flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2.5">
          <Users className="h-4 w-4 shrink-0" />
          Calculator pre-filled with your {realClientCount} active client{realClientCount !== 1 ? 's' : ''}. Drag to model growth.
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Sliders */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Model Your Growth</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  Number of clients
                </label>
                <span className="text-xl font-bold text-gray-900">{numClients}</span>
              </div>
              <input type="range" min={1} max={100} step={1} value={numClients}
                onChange={(e) => setNumClients(Number(e.target.value))}
                className="w-full mb-2 accent-indigo-600" />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1</span><span>25</span><span>50</span><span>75</span><span>100</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  Your price per client / mo
                </label>
                <span className="text-xl font-bold text-gray-900">{fmt(pricePerClient)}</span>
              </div>
              <input type="range" min={99} max={5000} step={50} value={pricePerClient}
                onChange={(e) => setPricePerClient(Number(e.target.value))}
                className="w-full mb-2 accent-indigo-600" />
              <div className="flex justify-between text-xs text-gray-400">
                <span>$99</span><span>$500</span><span>$1K</span><span>$2.5K</span><span>$5K</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Industry average: $500–$2,000/mo. Cannabis, legal, medical often &gt;$2K.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-indigo-200">Projected Numbers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-indigo-200">Gross revenue / mo</span>
              <span className="text-lg font-bold text-white">{fmt(grossRevenue)}</span>
            </div>
            <div className="border-t border-white/20 pt-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-indigo-200">Kyra plan ({PLAN_LIMITS[plan].label})</span>
                <span className="text-indigo-200">− {fmt(kyraFee)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-indigo-200">Platform hosting</span>
                <span className="text-indigo-200">Included</span>
              </div>
            </div>
            <div className="border-t border-white/20 pt-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-white">Net profit / mo</span>
                <span className="text-2xl font-bold text-emerald-300">{fmt(netRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-indigo-200">Annual revenue</span>
                <span className="text-lg font-bold text-emerald-300">{fmt(annualRevenue)}</span>
              </div>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-lg p-3 text-center">
              <p className="text-xs text-emerald-300 mb-0.5">Profit margin</p>
              <p className="text-3xl font-black text-emerald-300">{margin}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing benchmarks */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Real agency pricing in the wild
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { industry: 'Cannabis Dispensary', price: '$1,500–$3,000', tag: '🌿 Our specialty' },
              { industry: 'Medical / Dental', price: '$800–$2,500', tag: '💊 High demand' },
              { industry: 'Real Estate', price: '$500–$1,500', tag: '🏠 Volume play' },
              { industry: 'Legal / Law Firm', price: '$2,000–$5,000', tag: '⚖️ High value' },
              { industry: 'Restaurant', price: '$300–$800', tag: '🍽️ Easy close' },
              { industry: 'Auto Dealer', price: '$1,000–$3,000', tag: '🚗 High ROI' },
              { industry: 'Fitness / Gym', price: '$400–$1,200', tag: '💪 Retention' },
              { industry: 'Insurance', price: '$1,500–$4,000', tag: '📊 Lead gen' },
            ].map((item) => (
              <div key={item.industry} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <p className="text-xs font-medium text-gray-900 mb-1">{item.industry}</p>
                <p className="text-sm font-bold text-indigo-600">{item.price}<span className="text-xs text-gray-400 font-normal">/mo</span></p>
                <p className="text-[10px] text-gray-400 mt-1">{item.tag}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8 border-indigo-100 bg-indigo-50/30">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Why agencies love the math</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: 'High margins', desc: 'Predictable platform cost. You charge $500–5K/mo and keep the spread.', icon: '💰' },
              { title: 'Recurring revenue', desc: 'Clients pay every month. One sale = income for years.', icon: '🔄' },
              { title: 'No technical overhead', desc: 'Kyra manages all containers, updates, and infrastructure.', icon: '⚙️' },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="text-2xl shrink-0">{item.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button asChild>
          <Link href="/agency/clients/new">
            <Users className="h-4 w-4 mr-2" />
            Deploy Your First AI Worker
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/agency/templates">
            <ArrowRight className="h-4 w-4 mr-2" />
            Browse 21 Templates
          </Link>
        </Button>
      </div>
    </>
  );
}

export { ActualMrrCard };
