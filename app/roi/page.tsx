'use client';

import { useState } from 'react';
import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
import { DollarSign, TrendingUp, Clock, Users, ArrowRight, CheckCircle, Mail, Loader2 } from 'lucide-react';

const INDUSTRIES = [
  { label: '🦷 Dental Practice', avgDeal: 800, missedRate: 0.35, responseBoost: 0.45 },
  { label: '🏡 Real Estate', avgDeal: 5000, missedRate: 0.40, responseBoost: 0.35 },
  { label: '🌿 Cannabis / Dispensary', avgDeal: 120, missedRate: 0.30, responseBoost: 0.50 },
  { label: '🚗 Auto Dealership', avgDeal: 2500, missedRate: 0.40, responseBoost: 0.30 },
  { label: '⚖️ Law Firm', avgDeal: 3000, missedRate: 0.50, responseBoost: 0.40 },
  { label: '🍽️ Restaurant', avgDeal: 150, missedRate: 0.25, responseBoost: 0.40 },
  { label: '💪 Fitness / Gym', avgDeal: 500, missedRate: 0.35, responseBoost: 0.45 },
  { label: '🔧 Home Services', avgDeal: 600, missedRate: 0.40, responseBoost: 0.45 },
  { label: '🏨 Hotel / Hospitality', avgDeal: 400, missedRate: 0.30, responseBoost: 0.40 },
  { label: '📋 Insurance', avgDeal: 1200, missedRate: 0.45, responseBoost: 0.35 },
  { label: '🧘 Spa & Beauty', avgDeal: 200, missedRate: 0.35, responseBoost: 0.50 },
  { label: '🏦 Mortgage / Lending', avgDeal: 2000, missedRate: 0.50, responseBoost: 0.35 },
  { label: '🎉 Events & Venues', avgDeal: 3000, missedRate: 0.40, responseBoost: 0.35 },
  { label: 'Other', avgDeal: 500, missedRate: 0.35, responseBoost: 0.40 },
];

function fmt(n: number) {
  return Math.round(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default function ROICalculatorPage() {
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [monthlyLeads, setMonthlyLeads] = useState(80);
  const [avgDealValue, setAvgDealValue] = useState(industry.avgDeal);
  const [currentCloseRate, setCurrentCloseRate] = useState(20);
  const [kyraPrice, setKyraPrice] = useState(997);
  const [captureEmail, setCaptureEmail] = useState('');
  const [captureSending, setCaptureSending] = useState(false);
  const [captureSuccess, setCaptureSuccess] = useState(false);

  // Calculations
  const missedLeads = monthlyLeads * industry.missedRate;
  const currentRevenue = monthlyLeads * (1 - industry.missedRate) * (currentCloseRate / 100) * avgDealValue;

  const kyraResponseRate = Math.min(0.99, (1 - industry.missedRate) + industry.missedRate * 0.85);
  const kyraLeadsContacted = monthlyLeads * kyraResponseRate;
  const kyraCloseRate = currentCloseRate * (1 + industry.responseBoost * 0.4);
  const kyraRevenue = kyraLeadsContacted * (kyraCloseRate / 100) * avgDealValue;

  const monthlyGain = kyraRevenue - currentRevenue;
  const netMonthlyGain = monthlyGain - kyraPrice;
  const roi = kyraPrice > 0 ? Math.round((monthlyGain / kyraPrice) * 100) : 0;
  const daysToROI = monthlyGain > 0 ? Math.ceil((kyraPrice / (monthlyGain / 30))) : 0;

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureEmail) return;
    setCaptureSending(true);
    try {
      await fetch('/api/roi/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: captureEmail,
          industry: industry.label,
          monthlyLeads,
          avgDealValue,
          currentCloseRate,
          kyraPrice,
          monthlyGain: Math.round(monthlyGain),
          roi,
          daysToROI,
        }),
      });
      setCaptureSuccess(true);
    } finally {
      setCaptureSending(false);
    }
  };

  const handleIndustryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = INDUSTRIES.find(i => i.label === e.target.value) || INDUSTRIES[0];
    setIndustry(selected);
    setAvgDealValue(selected.avgDeal);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
      <PublicNav />

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <TrendingUp className="h-4 w-4 text-green-400" />
            AI Employee ROI Calculator
          </div>
          <h1 className="text-3xl sm:text-5xl font-black mb-4">
            How much is slow response time<br />
            <span className="text-indigo-400">costing your business?</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Enter your numbers below. See exactly what an AI employee that responds in 60 seconds would be worth to you every month.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Inputs */}
          <div className="space-y-5">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="font-bold text-lg mb-5 flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                About your business
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Industry</label>
                  <select
                    value={industry.label}
                    onChange={handleIndustryChange}
                    className="w-full bg-slate-800 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-400"
                  >
                    {INDUSTRIES.map(i => (
                      <option key={i.label} value={i.label}>{i.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Monthly leads / inquiries
                    <span className="text-slate-500 ml-1">(texts, calls, website forms)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min={10} max={500} step={10}
                      value={monthlyLeads}
                      onChange={e => setMonthlyLeads(+e.target.value)}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="text-white font-bold w-12 text-right">{monthlyLeads}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Average deal / transaction value
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number" min={50} step={50}
                      value={avgDealValue}
                      onChange={e => setAvgDealValue(+e.target.value)}
                      className="w-full bg-slate-800 border border-white/20 rounded-lg pl-7 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Current lead → customer close rate
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min={1} max={80} step={1}
                      value={currentCloseRate}
                      onChange={e => setCurrentCloseRate(+e.target.value)}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="text-white font-bold w-14 text-right">{currentCloseRate}%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Monthly investment in AI employee
                  </label>
                  <div className="flex gap-2">
                    {[497, 997, 1997].map(p => (
                      <button
                        key={p}
                        onClick={() => setKyraPrice(p)}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${kyraPrice === p ? 'bg-indigo-600 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/15'}`}
                      >
                        ${p.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Current state */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5">
              <p className="font-semibold text-red-300 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Right now (slow / missed responses)
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Leads not reached in time</span>
                  <span className="text-red-400 font-bold">~{Math.round(missedLeads)}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Revenue from leads that close</span>
                  <span className="text-white font-bold">{fmt(currentRevenue)}/mo</span>
                </div>
                <div className="flex justify-between border-t border-red-500/20 pt-2 mt-2">
                  <span className="text-red-400">Estimated missed revenue</span>
                  <span className="text-red-400 font-bold">~{fmt(monthlyGain)}/mo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="space-y-5">
            {/* Big number */}
            <div className="bg-indigo-600 rounded-2xl p-6 text-center">
              <p className="text-indigo-200 text-sm font-medium mb-2">With an AI employee responding in 60 seconds</p>
              <p className="text-5xl sm:text-6xl font-black mb-2">{fmt(kyraRevenue)}</p>
              <p className="text-indigo-200 text-sm">estimated monthly revenue</p>
              <div className="mt-4 pt-4 border-t border-indigo-500 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-black text-green-300">+{fmt(monthlyGain)}</p>
                  <p className="text-indigo-200 text-xs">extra revenue/mo</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-green-300">{roi}%</p>
                  <p className="text-indigo-200 text-xs">ROI on investment</p>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <p className="font-bold">Monthly breakdown</p>
              {[
                { label: 'Extra revenue generated', value: fmt(monthlyGain), color: 'text-green-400' },
                { label: 'AI employee cost', value: `-${fmt(kyraPrice)}`, color: 'text-red-400' },
                { label: 'Net monthly gain', value: fmt(netMonthlyGain), color: 'text-white font-black' },
                { label: 'Days to break even', value: `${daysToROI} days`, color: 'text-indigo-300' },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-slate-400">{row.label}</span>
                  <span className={row.color}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* What the AI does */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="font-bold mb-3">What the AI does to get there</p>
              <ul className="space-y-2">
                {[
                  `Responds to all ${monthlyLeads} monthly leads in < 60 seconds`,
                  'Books appointments and answers questions 24/7',
                  'Follows up with leads who didn\'t respond',
                  'Updates your CRM automatically after every conversation',
                  'Escalates frustrated customers to your team immediately',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Lead capture + CTA */}
            {captureSuccess ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 text-center">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-3" />
                <p className="font-bold text-white mb-1">Your ROI report is on the way!</p>
                <p className="text-sm text-slate-400 mb-4">Check your inbox for the full breakdown + implementation guide.</p>
                <Link href="/signup/agency" className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl w-full justify-center transition">
                  Start Free — Deploy in 10 Minutes <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5">
                <p className="font-black text-gray-900 text-lg mb-1">
                  Capture {fmt(monthlyGain)}/mo — get the plan
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Enter your email and we'll send you this exact ROI breakdown + a 10-step implementation guide.
                </p>
                <form onSubmit={handleCapture} className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden focus-within:border-indigo-400">
                    <Mail className="h-4 w-4 text-gray-400 ml-3 shrink-0" />
                    <input
                      type="email" required
                      value={captureEmail}
                      onChange={e => setCaptureEmail(e.target.value)}
                      placeholder="you@agency.com"
                      className="flex-1 bg-transparent py-3 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={captureSending}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    {captureSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    {captureSending ? 'Sending…' : 'Send Me the Report'}
                  </button>
                </form>
                <div className="border-t border-gray-100 pt-3 text-center">
                  <Link href="/signup/agency" className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-semibold">
                    Or start free now → <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">No spam. Unsubscribe anytime.</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-8">
          * Estimates based on industry averages. Individual results vary. ROI calculator assumes improved response rate leads to proportionally higher close rates.
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}
