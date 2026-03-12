'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

const INDUSTRIES = [
  'Dental', 'Real Estate', 'Auto Dealership', 'Cannabis / Dispensary',
  'Restaurant', 'Med Spa / Aesthetics', 'Law Firm', 'Fitness / Gym',
  'Insurance', 'Home Services', 'Mortgage / Lending', 'Other',
];

const SIZES = [
  '1–5 clients', '6–15 clients', '16–30 clients', '30+ clients',
];

const HOW = [
  'Google search', 'CRM community', 'LinkedIn', 'Referral from another agency',
  'Twitter / X', 'YouTube', 'Other',
];

export default function GetDemoPage() {
  const [form, setForm] = useState({
    name: '', email: '', company: '', industry: '', size: '', how: '', message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          name: form.name,
          industry: form.industry,
          source: 'get-demo',
          company: form.company,
          size: form.size,
          how: form.how,
          message: form.message,
        }),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="h-14 w-14 text-green-400 mx-auto mb-6" />
          <h1 className="text-2xl font-black mb-3">You're on the list.</h1>
          <p className="text-slate-400 mb-8">
            Angel will reach out within 24 hours to schedule your demo. In the meantime, try the live AI below.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/try/dental" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition flex items-center gap-2">
              Try Live AI Demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/" className="bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl transition text-sm">
              Back Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const inputCls = "w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-indigo-500 focus:bg-white/8 transition";
  const selectCls = `${inputCls} appearance-none`;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <PublicNav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-2 gap-12 items-start">
        {/* Left: Info */}
        <div>
          <div className="inline-flex items-center gap-2 bg-indigo-600/20 border border-indigo-500/30 rounded-full px-4 py-1.5 text-sm text-indigo-300 font-medium mb-6">
            30-minute live demo — no sales pitch
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-4">
            See Kyra in action.<br />
            <span className="text-indigo-400">Ask us anything.</span>
          </h1>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed">
            Schedule a live demo with Angel Castro (Founder). See your industry's AI worker respond to real leads, watch the CRM integration in action, and ask any technical questions.
          </p>

          <div className="space-y-4 mb-8">
            {[
              { icon: '🎯', title: 'Live demo for your industry', desc: 'We\'ll demo dental, real estate, auto, cannabis, or whichever industry matters most to your clients.' },
              { icon: '🔌', title: 'CRM integration walkthrough', desc: 'See how Kyra connects to your existing CRM in under 5 minutes.' },
              { icon: '💬', title: 'Real AI conversation', desc: 'Watch the AI respond to a real SMS, update the CRM, and book an appointment — live.' },
              { icon: '💰', title: 'Pricing & margin walkthrough', desc: 'We\'ll show you exactly what to charge clients and what your margins look like.' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p className="font-semibold text-white text-sm">{f.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-3">What agencies say after the demo:</p>
            <p className="text-sm text-slate-300 italic">
              &ldquo;I had 3 objections walking in. By the end I was trying to figure out how to bill my first 5 clients.&rdquo;
            </p>
            <p className="text-xs text-slate-500 mt-2">— Agency owner, after a 30-minute demo</p>
          </div>
        </div>

        {/* Right: Form */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-bold mb-1">Request a demo</h2>
          <p className="text-xs text-slate-400 mb-6">We respond within 24 hours. Usually faster.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Your name *</label>
                <input className={inputCls} placeholder="Angel Castro" value={form.name} onChange={set('name')} required />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Work email *</label>
                <input type="email" className={inputCls} placeholder="you@agency.com" value={form.email} onChange={set('email')} required />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Agency / company name *</label>
              <input className={inputCls} placeholder="Your Agency LLC" value={form.company} onChange={set('company')} required />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Primary industry</label>
                <select className={selectCls} value={form.industry} onChange={set('industry')}>
                  <option value="">Select...</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Number of clients</label>
                <select className={selectCls} value={form.size} onChange={set('size')}>
                  <option value="">Select...</option>
                  {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">How did you hear about Kyra?</label>
              <select className={selectCls} value={form.how} onChange={set('how')}>
                <option value="">Select...</option>
                {HOW.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Anything specific you want to see? (optional)</label>
              <textarea className={`${inputCls} min-h-[80px] resize-none`}
                placeholder="E.g. 'I have 10 dental clients, want to see how the AI handles insurance questions...'"
                value={form.message} onChange={set('message')} />
            </div>

            {status === 'error' && (
              <p className="text-xs text-red-400">Something went wrong. Email us directly at angel@conversionsystem.com</p>
            )}

            <button type="submit" disabled={status === 'loading' || !form.name || !form.email || !form.company}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2">
              {status === 'loading'
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                : <>Request Demo <ArrowRight className="h-4 w-4" /></>
              }
            </button>

            <p className="text-center text-xs text-slate-600">
              Or try the{' '}
              <Link href="/try/dental" className="text-indigo-400 hover:underline">live AI demo right now</Link>
              {' '}— no form required
            </p>
          </form>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
