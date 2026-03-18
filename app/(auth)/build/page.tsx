'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Check,
  ArrowRight,
  Search,
  MessageSquare,
  Mail,
  Handshake,
  ShoppingCart,
  Headphones,
  PenTool,
  BarChart3,
  CheckCircle2,
  Sparkles,
  CalendarCheck,
  Users,
  Phone,
  Instagram,
  FileText,
  Shield,
  Package,
  Megaphone,
  ClipboardList,
  Bot,
} from 'lucide-react';
import { KyraLogo } from '@/components/brand/kyra-logo';
import { PixelEvent } from '@/components/analytics/PixelEvent';

// ── Worker Types ──────────────────────────────────────────────────────────────

const WORKER_TYPES = [
  // ── Sales & Revenue ──
  {
    id: 'lead-generation',
    icon: Users,
    label: 'Lead Generation',
    desc: 'Find, score & qualify prospects from web, social & directories',
  },
  {
    id: 'b2b-outreach',
    icon: Handshake,
    label: 'B2B Outreach',
    desc: 'Personalized cold email sequences with research & follow-ups',
  },
  {
    id: 'appointment-booking',
    icon: CalendarCheck,
    label: 'Appointment Booking',
    desc: 'AI receptionist that books, confirms & reminds — 24/7',
  },
  {
    id: 'sales-assistant',
    icon: Phone,
    label: 'Sales Assistant',
    desc: 'Qualify inbound leads, answer questions & route to your team',
  },
  // ── Marketing ──
  {
    id: 'geo-optimization',
    icon: Search,
    label: 'GEO Optimization',
    desc: 'Get cited by ChatGPT, Perplexity & Gemini for your keywords',
  },
  {
    id: 'social-media',
    icon: Instagram,
    label: 'Social Media Manager',
    desc: 'Draft posts, schedule content & engage across platforms',
  },
  {
    id: 'comment-marketing',
    icon: MessageSquare,
    label: 'Comment Marketing',
    desc: 'Topical comments on YouTube, TikTok & Instagram daily',
  },
  {
    id: 'email-marketing',
    icon: Mail,
    label: 'Email Strategist',
    desc: 'Campaigns, sequences, A/B tests & performance analysis',
  },
  {
    id: 'content-writer',
    icon: PenTool,
    label: 'Content Writer',
    desc: 'Blog posts, landing pages, ad copy & social content',
  },
  {
    id: 'ad-manager',
    icon: Megaphone,
    label: 'Ad Campaign Manager',
    desc: 'Write ads, analyze performance & optimize spend across platforms',
  },
  // ── Customer Operations ──
  {
    id: 'customer-support',
    icon: Headphones,
    label: 'Customer Support',
    desc: '24/7 AI support across chat, email, SMS & social',
  },
  {
    id: 'review-manager',
    icon: ClipboardList,
    label: 'Review & Reputation Manager',
    desc: 'Monitor reviews, draft responses & request new reviews',
  },
  // ── E-Commerce ──
  {
    id: 'ecommerce-optimizer',
    icon: ShoppingCart,
    label: 'E-Commerce Optimizer',
    desc: 'Amazon Rufus, listing optimization & product SEO',
  },
  {
    id: 'inventory-ops',
    icon: Package,
    label: 'Inventory & Operations',
    desc: 'Demand forecasting, stock alerts & reorder automation',
  },
  // ── Intelligence ──
  {
    id: 'analytics-reporter',
    icon: BarChart3,
    label: 'Analytics & Reporting',
    desc: 'Weekly dashboards, competitor tracking & trend alerts',
  },
  {
    id: 'research-analyst',
    icon: FileText,
    label: 'Research Analyst',
    desc: 'Market research, competitor intel & strategic briefs',
  },
  // ── Technical ──
  {
    id: 'workflow-automation',
    icon: Bot,
    label: 'Workflow Automation',
    desc: 'Connect your tools — CRM, email, calendar, Slack & more',
  },
  {
    id: 'data-security',
    icon: Shield,
    label: 'Data & Compliance Monitor',
    desc: 'Track data privacy, flag risks & generate compliance reports',
  },
] as const;

const BUDGET_OPTIONS = ['$1K – $3K', '$3K – $5K', '$5K+'];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BuildPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [businessUrl, setBusinessUrl] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleWorker = (id: string) => {
    setSelectedWorkers((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/build-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          business_url: businessUrl || undefined,
          worker_types: selectedWorkers,
          description: description || undefined,
          budget_range: budget || undefined,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full bg-slate-800 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 disabled:opacity-50';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white">
      <PixelEvent event="ViewContent" />

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <KyraLogo variant="dark" size="sm" />
          <div className="flex items-center gap-3">
            <Link
              href="/solo"
              className="text-xs text-slate-400 hover:text-white transition"
            >
              Free Plan
            </Link>
            <Link
              href="/login"
              className="text-xs text-emerald-400 hover:text-emerald-300 transition font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-24 pb-20">
        {/* ── Success State ────────────────────────────────────────────── */}
        {submitted ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 mb-6">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Request Submitted!</h1>
            <p className="text-slate-400 max-w-md mx-auto mb-8">
              We&apos;ll review your requirements and get back to you within 24 hours with a plan
              tailored to your business.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/solo"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition"
              >
                <Sparkles className="h-4 w-4" />
                Start Free While You Wait
              </Link>
              <Link
                href="/"
                className="px-5 py-2.5 text-sm text-slate-400 hover:text-white transition"
              >
                Back to Home
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ── Hero ───────────────────────────────────────────────── */}
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-5">
                <Sparkles className="h-3 w-3" />
                Custom AI Workers
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight mb-4">
                We Build AI Workers<br />
                <span className="bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
                  For Your Business
                </span>
              </h1>
              <p className="text-slate-400 max-w-lg mx-auto leading-relaxed">
                Tell us what you need automated. We&apos;ll build custom AI workers trained on your
                brand, products, and goals — deployed in 1–2 weeks.
              </p>
            </div>

            {/* ── How It Works ────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-3 mb-12">
              {[
                { step: '1', title: 'Tell Us', desc: 'What you need automated' },
                { step: '2', title: 'We Build', desc: 'Custom workers in 1–2 weeks' },
                { step: '3', title: 'You Approve', desc: 'Nothing goes live without you' },
              ].map((s) => (
                <div
                  key={s.step}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 text-center"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-indigo-500 flex items-center justify-center text-xs font-bold mx-auto mb-2">
                    {s.step}
                  </div>
                  <p className="font-semibold text-sm">{s.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* ── What We Build ────────────────────────────────────────── */}
            <div className="mb-10">
              <h2 className="text-lg font-bold mb-1">What do you need?</h2>
              <p className="text-sm text-slate-500 mb-4">
                Select all that apply — or describe something custom below.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {WORKER_TYPES.map((w) => {
                  const selected = selectedWorkers.includes(w.id);
                  const Icon = w.icon;
                  return (
                    <button
                      key={w.id}
                      onClick={() => toggleWorker(w.id)}
                      className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                        selected
                          ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          selected ? 'bg-emerald-500/20' : 'bg-white/10'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            selected ? 'text-emerald-400' : 'text-slate-400'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${
                              selected ? 'text-emerald-300' : 'text-white'
                            }`}
                          >
                            {w.label}
                          </span>
                          {selected && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{w.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Intake Form ──────────────────────────────────────────── */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold">Tell us about your project</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Your Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="John Smith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="john@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Business Website
                  </label>
                  <input
                    type="url"
                    placeholder="https://yoursite.com"
                    value={businessUrl}
                    onChange={(e) => setBusinessUrl(e.target.value)}
                    disabled={isSubmitting}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Describe what you need
                  </label>
                  <textarea
                    placeholder="What tasks do you want automated? What are your goals? Any specific platforms or tools you use?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    disabled={isSubmitting}
                    className={inputClass + ' resize-y'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">
                    Budget Range
                  </label>
                  <div className="flex gap-2">
                    {BUDGET_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setBudget(budget === opt ? '' : opt)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                          budget === opt
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !name || !email}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      Submit Request
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* ── Trust signals ────────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500 mt-6">
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-400" />
                Free consultation
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-400" />
                1–2 week delivery
              </span>
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3 text-emerald-400" />
                No commitment
              </span>
            </div>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <div className="text-center mt-12 text-xs text-slate-600">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-emerald-400 hover:text-emerald-300 transition font-medium"
              >
                Sign in
              </Link>
              {' · '}
              Want to try the free plan?{' '}
              <Link
                href="/solo"
                className="text-indigo-400 hover:text-indigo-300 transition font-medium"
              >
                Start free
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
