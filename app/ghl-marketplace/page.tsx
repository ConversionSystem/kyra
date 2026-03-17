import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
import { PixelEvent } from '@/components/analytics/PixelEvent';

export const metadata: Metadata = {
  title: 'Kyra for GHL — Website + AI Worker + CRM for Every Sub-Account',
  description:
    'Give every GHL client a live 15-25 page SEO-optimized website, an AI worker that books appointments 24/7, and a CRM — all deployed in under 10 minutes from one agency dashboard.',
};

const FEATURES = [
  {
    icon: '🌐',
    title: 'AI Website Builder',
    desc: '15-25 SEO-optimized pages generated automatically from business info. Service pages, city pages, blog, FAQ — built for search engines.',
  },
  {
    icon: '⚡',
    title: 'Replies automatically — 24/7',
    desc: 'Every inbound SMS, email, or DM gets an intelligent, context-aware reply — day and night, including weekends.',
  },
  {
    icon: '📅',
    title: 'AI booking, connected to your GHL Calendar',
    desc: 'When GHL Calendar is connected, checks availability, offers slots, and confirms bookings. No human needed.',
  },
  {
    icon: '📊',
    title: 'Lead forms sync to GHL CRM',
    desc: 'Every lead from the website, chat widget, and forms flows directly into your client\'s GHL CRM. Nothing falls through.',
  },
  {
    icon: '📈',
    title: 'Growth Engine',
    desc: 'AI suggests new pages to grow your search presence. One click to generate and publish. Sites that keep growing with AI-generated content.',
  },
  {
    icon: '🏷️',
    title: 'Auto-tags & updates CRM',
    desc: 'After every conversation, tags are applied, notes are written, and opportunities are updated — all in real time.',
  },
  {
    icon: '🚨',
    title: 'Escalates frustrated leads',
    desc: 'Detects keywords like "frustrated," "angry," "speak to a person" and immediately pings your team via email.',
  },
  {
    icon: '🏢',
    title: 'One dashboard, all clients',
    desc: 'Manage every client\'s website, AI worker, and leads from a single Kyra login. No switching sub-accounts.',
  },
];

const VERTICALS = [
  { emoji: '🦷', name: 'Dental Clinics', result: '20-page site + appointment booking AI' },
  { emoji: '🏡', name: 'Real Estate', result: 'Neighborhood pages + lead qualification AI' },
  { emoji: '🌿', name: 'Cannabis', result: 'Menu pages + high-volume SMS handling' },
  { emoji: '🚗', name: 'Auto Dealerships', result: 'Inventory pages + test drive booking AI' },
  { emoji: '💆', name: 'Med Spa', result: 'Treatment pages + consultation booking 24/7' },
  { emoji: '🏋️', name: 'Fitness / Gyms', result: 'Class pages + trial sign-up AI' },
  { emoji: '⚖️', name: 'Law Firms', result: 'Up to 25-page site + instant intake qualification' },
  { emoji: '🔧', name: 'Home Services', result: 'Service area pages + emergency dispatch AI' },
  { emoji: '🏥', name: 'Chiropractic', result: 'Treatment pages + re-activation campaigns' },
  { emoji: '💰', name: 'Mortgage', result: 'Rate pages + lead pre-qualification AI' },
  { emoji: '🐾', name: 'Veterinary', result: 'Service pages + 24/7 appointment booking' },
  { emoji: '🌞', name: 'Solar', result: 'Service area pages + high-ticket follow-up AI' },
];

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Install from Marketplace',
    desc: 'One-click OAuth install directly from the GHL Marketplace. No API keys, no technical setup.',
  },
  {
    step: '2',
    title: 'Add your first client',
    desc: 'Enter the business name, industry, and location. Kyra generates a 15-25 page SEO-optimized website, deploys an AI worker, and sets up lead capture — automatically.',
  },
  {
    step: '3',
    title: 'Connect GHL sub-account',
    desc: "Paste the client's GHL Private Integration token. Kyra starts monitoring their inbox and syncing leads immediately.",
  },
  {
    step: '4',
    title: 'Watch it work',
    desc: 'Client has a live website, an AI worker handling chats and messages, and every lead flowing into GHL CRM. All in under 10 minutes.',
  },
];

export default function GhlMarketplacePage() {
  return (
    <div className="bg-white text-gray-900 min-h-screen font-sans">
      <PixelEvent event="ViewContent" params={{ content_name: 'GHL Marketplace Page', content_category: 'Landing Page' }} />
      <PublicNav />

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
            <span className="text-green-400 text-xs font-bold">●</span>
            Official GoHighLevel Integration
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6">
            Give every GHL client a{' '}
            <span className="text-indigo-300">live website + AI worker</span>
            <br />in 10 minutes
          </h1>
          <p className="text-xl text-indigo-200 max-w-2xl mx-auto mb-10 leading-relaxed">
            Kyra generates a 15-25 page SEO-optimized website, deploys an AI worker, and syncs every lead to GHL —
            all from one agency dashboard. Your clients get a complete online business. You get recurring revenue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/website-builder"
              className="inline-block bg-white text-indigo-900 font-bold text-lg px-8 py-4 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Try It Free — Build Your First Site →
            </Link>
            <Link
              href="/try/dental"
              className="inline-block bg-white/10 border border-white/30 text-white font-semibold text-lg px-8 py-4 rounded-xl hover:bg-white/20 transition-colors"
            >
              See Live Demo
            </Link>
          </div>
          <p className="text-indigo-400 text-sm mt-4">1 free account included — no credit card needed</p>
        </div>
      </section>

      {/* ── Key Stats ── */}
      <section className="border-b border-gray-100 py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: '15–25', label: 'Pages per client site', sub: 'Auto-generated SEO content' },
              { value: '< 10 min', label: 'From signup to live site', sub: 'Website + AI worker + CRM' },
              { value: '3x–10x', label: 'Average agency markup', sub: '$99 cost → $500+ revenue' },
              { value: '24/7', label: 'AI worker coverage', sub: 'Never misses a lead' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-4xl font-black text-indigo-700">{s.value}</p>
                <p className="text-sm font-semibold text-gray-800 mt-1">{s.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">Live website + AI worker in under 10 minutes</h2>
          <p className="text-center text-gray-500 mb-12">No code. No API setup. No technical expertise required.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="relative">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-black text-lg flex items-center justify-center mb-4">
                  {step.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">Website + AI worker + CRM — everything your clients need</h2>
          <p className="text-center text-gray-500 mb-12">Works inside GHL natively. No Zapier. No webhooks to configure.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1.5 text-sm">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Verticals ── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">Website + AI worker for every vertical</h2>
          <p className="text-center text-gray-500 mb-12">Each client gets a full SEO site + AI worker trained on their industry. Pick one, deploy, go live.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {VERTICALS.map((v) => (
              <div
                key={v.name}
                className="border border-gray-200 rounded-xl p-4 text-center hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="text-3xl mb-2">{v.emoji}</div>
                <p className="font-semibold text-gray-900 text-sm">{v.name}</p>
                <p className="text-xs text-indigo-600 mt-1 font-medium">{v.result}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Revenue callout ── */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-4">The agency math</h2>
          <p className="text-center text-gray-500 mb-12">
            You pay Kyra $99–499/mo. You charge each client $500–2,000/mo for their website + AI worker + CRM.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                plan: 'Lite — 3 clients',
                cost: '$99/mo',
                revenue: '$1,500–2,400/mo',
                margin: '15–24x ROI',
              },
              {
                plan: 'Pro — 10 clients',
                cost: '$249/mo',
                revenue: '$8,000–12,000/mo',
                margin: '32–48x ROI',
              },
              {
                plan: 'Scale — 30 clients',
                cost: '$499/mo',
                revenue: '$30,000–60,000/mo',
                margin: '60–120x ROI',
              },
            ].map((r) => (
              <div key={r.plan} className="border border-gray-200 rounded-2xl p-6 text-center bg-white">
                <p className="text-sm font-semibold text-gray-500 mb-2">{r.plan}</p>
                <p className="text-sm text-gray-400">Your cost: {r.cost}</p>
                <p className="text-2xl font-black text-green-600 mt-2">{r.revenue}</p>
                <p className="text-xs text-green-600 font-semibold mt-1">{r.margin}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Common questions</h2>
          <div className="space-y-6">
            {[
              {
                q: 'Does this replace the GHL messaging feature?',
                a: 'No — Kyra works on top of GHL. It monitors the GHL inbox for new inbound messages and sends replies through the GHL messaging API. Everything stays in GHL. Your clients never leave their existing workflow.',
              },
              {
                q: 'Do my clients get a real website?',
                a: 'Yes. Kyra generates a live, hosted 15-25 page SEO-optimized website for each client — service pages, city/location pages, blog posts, FAQ, contact page. Built for search engines. All with lead capture forms that sync to the CRM.',
              },
              {
                q: "What happens if the AI doesn't know the answer?",
                a: 'You configure a fallback behavior per client — either the AI says "Let me have a team member follow up" and tags the contact as escalated, or it can be set to respond confidently within its configured knowledge.',
              },
              {
                q: 'Can I white-label this for my clients?',
                a: 'Yes. The AI worker has a custom name and operates from your client\'s GHL account. The website is on a custom domain. Your clients never see "Kyra."',
              },
              {
                q: 'How does the Growth Engine work?',
                a: 'AI suggests new pages based on your client\'s industry and existing content, helping grow their search presence. One click to generate and publish. Sites grow their SEO footprint over time with AI-generated content.',
              },
              {
                q: 'What GHL plan do I need?',
                a: 'Kyra works with GHL Agency Starter and above. You need access to the Private Integration feature (available on all Agency plans) to generate the token Kyra uses.',
              },
            ].map((faq) => (
              <div key={faq.q} className="border-b border-gray-200 pb-6">
                <p className="font-bold text-gray-900 mb-2">{faq.q}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-indigo-700 text-white py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">First client site live in 10 minutes.</h2>
          <p className="text-indigo-200 text-lg mb-8">
            15-25 page SEO-optimized website. AI worker. CRM. All synced to GHL. Free to start.
          </p>
          <Link
            href="/website-builder"
            className="inline-block bg-white text-indigo-900 font-black text-lg px-10 py-4 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            Try It Free — Build Your First Site →
          </Link>
          <p className="text-indigo-400 text-sm mt-4">
            Already a GHL Agency partner? Use your existing login — no new account needed.
          </p>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
