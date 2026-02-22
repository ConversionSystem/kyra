'use client';

import { useState } from 'react';
import { DollarSign, Users, TrendingUp, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const KYRA_COST_PER_CLIENT = null; // unknown — pricing TBD

const PLAN_LIMITS = {
  starter: { clients: 5,  price: 0,   label: 'Starter (Beta)' },
  pro:     { clients: 20, price: 249, label: 'Pro'            },
  scale:   { clients: 100, price: 499, label: 'Scale'          },
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default function RevenuePage() {
  const [numClients, setNumClients] = useState(5);
  const [pricePerClient, setPricePerClient] = useState(500);

  const kyraFee = numClients <= 5 ? 0 : numClients <= 20 ? 249 : 499;
  const totalCost = kyraFee;
  const grossRevenue = numClients * pricePerClient;
  const netRevenue = grossRevenue - totalCost;
  const margin = grossRevenue > 0 ? Math.round((netRevenue / grossRevenue) * 100) : 0;
  const annualRevenue = netRevenue * 12;

  const plan = numClients <= 5 ? 'starter' : numClients <= 20 ? 'pro' : 'scale';

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <h1 className="text-2xl font-bold text-gray-900">Revenue Calculator</h1>
        </div>
        <p className="text-sm text-gray-500">
          See exactly how much you can make reselling AI employees to your clients.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Sliders */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Your Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Clients slider */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  Number of clients
                </label>
                <span className="text-xl font-bold text-gray-900">{numClients}</span>
              </div>
              <input type="range"
                min={1} max={100} step={1}
                value={numClients}
                onChange={(e) => setNumClients(Number(e.target.value))}
                className="w-full mb-2 accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1</span><span>25</span><span>50</span><span>75</span><span>100</span>
              </div>
            </div>

            {/* Price slider */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  Your price per client / mo
                </label>
                <span className="text-xl font-bold text-gray-900">{fmt(pricePerClient)}</span>
              </div>
              <input type="range"
                min={99} max={5000} step={50}
                value={pricePerClient}
                onChange={(e) => setPricePerClient(Number(e.target.value))}
                className="w-full mb-2 accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>$99</span><span>$500</span><span>$1K</span><span>$2.5K</span><span>$5K</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Industry average: $500–$2,000/mo. Cannabis, legal, medical often {'>'}$2K.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="bg-gray-900 text-white border-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-gray-300">Your Numbers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Gross revenue / mo</span>
              <span className="text-lg font-bold text-white">{fmt(grossRevenue)}</span>
            </div>
            <div className="border-t border-gray-800 pt-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Kyra plan ({PLAN_LIMITS[plan].label})</span>
                <span className="text-gray-400">− {fmt(kyraFee)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Platform hosting</span>
                <span className="text-gray-400">Included</span>
              </div>
            </div>
            <div className="border-t border-gray-700 pt-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-white">Net profit / mo</span>
                <span className="text-2xl font-bold text-green-400">{fmt(netRevenue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Annual revenue</span>
                <span className="text-lg font-bold text-green-300">{fmt(annualRevenue)}</span>
              </div>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
              <p className="text-xs text-green-400 mb-0.5">Profit margin</p>
              <p className="text-3xl font-black text-green-400">{margin}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* What agencies charge in the wild */}
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

      {/* Why it works */}
      <Card className="mb-8 border-indigo-100 bg-indigo-50/30">
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Why agencies love the math</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: 'High margins', desc: 'Your platform cost is a predictable low monthly fee. You charge clients $500–5,000/mo and keep the difference.', icon: '💰' },
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
            Deploy Your First AI Employee
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/agency/templates">
            <ArrowRight className="h-4 w-4 mr-2" />
            Browse 21 Templates
          </Link>
        </Button>
      </div>
    </div>
  );
}
