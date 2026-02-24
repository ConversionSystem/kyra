import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Kyra — Built for GHL Agencies | HighLevel LIVE India 2026',
  description:
    "You're at HighLevel LIVE India. Kyra is the AI workforce platform that deploys autonomous AI workers to every GHL sub-account. Live in 5 minutes. Free to start.",
  openGraph: {
    title: 'Kyra — The AI Workforce Platform for GHL Agencies 🇮🇳',
    description: 'Deploy AI workers to every GHL client. One dashboard. 5 minutes to live. Built for the agencies at HighLevel LIVE India 2026.',
    type: 'website',
  },
};

const WHAT_IT_DOES = [
  { emoji: '⚡', title: 'Replies in < 60 seconds', desc: 'Every inbound SMS, WhatsApp, IG DM — replied automatically, 24/7.' },
  { emoji: '📅', title: 'Books appointments', desc: 'Checks calendar, offers slots, confirms booking. No back-and-forth.' },
  { emoji: '🏷️', title: 'Updates the CRM', desc: 'Tags contacts, adds notes, moves pipeline stages — all automatic.' },
  { emoji: '🚨', title: 'Escalates hot leads', desc: 'Detects buying intent, pings your team instantly. Never miss a sale.' },
  { emoji: '🧠', title: "Knows your client's business", desc: 'Persona, services, pricing, hours — trained once, works forever.' },
  { emoji: '🏢', title: 'One dashboard, all clients', desc: "Manage every client's AI worker from a single Kyra login." },
];

const STEPS = [
  { n: '1', title: 'Sign up free', desc: 'kyra.conversionsystem.com — 60 seconds.' },
  { n: '2', title: 'Add your GHL client', desc: 'Paste the Private Integration token. Takes 2 minutes.' },
  { n: '3', title: 'Pick an industry template', desc: '21 ready-made AI workers — dental, real estate, cannabis, and more.' },
  { n: '4', title: 'AI worker goes live', desc: 'Handles every inbound message automatically from that moment.' },
];

export default function IndiaPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">

      {/* ── Hero ── */}
      <section className="px-4 pt-12 pb-16 text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-4 py-1.5 text-sm font-semibold text-orange-300 mb-6">
          🇮🇳 HighLevel LIVE India 2026 · Gurugram, Feb 25–27
        </div>

        <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-5">
          Your GHL clients need
          <br />
          <span className="text-indigo-400">an AI workforce.</span>
          <br />
          <span className="text-gray-400 text-3xl">Not a chatbot. A worker.</span>
        </h1>

        <p className="text-lg text-gray-300 leading-relaxed mb-8 max-w-xl mx-auto">
          Kyra deploys autonomous AI workers to every GHL sub-account.
          They reply in 60 seconds, book appointments, update the CRM, and escalate hot leads —
          24/7, under your agency brand.
        </p>

        {/* Event offer */}
        <div className="bg-gradient-to-r from-orange-500/20 to-indigo-500/20 border border-orange-500/30 rounded-2xl px-6 py-5 mb-8 text-left max-w-md mx-auto">
          <p className="text-xs text-orange-300 font-bold uppercase tracking-wider mb-2">🎁 HighLevel LIVE India Exclusive</p>
          <p className="text-white font-bold text-lg mb-1">60-day free trial + 500 bonus credits</p>
          <p className="text-gray-400 text-sm">Standard trial is 30 days. Use code <span className="font-mono font-bold text-orange-300">INDIA2026</span> at signup for double the trial + bonus credits to test with real clients.</p>
        </div>

        <Link
          href="/signup/agency?promo=INDIA2026&src=ghl-live-india"
          className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xl px-10 py-5 rounded-2xl transition shadow-2xl shadow-indigo-900/50 w-full sm:w-auto"
        >
          Start Free — Use Code INDIA2026 →
        </Link>
        <p className="text-gray-500 text-sm mt-3">No credit card · Setup in 5 min · Works with your existing GHL account</p>
      </section>

      {/* ── Stats ── */}
      <section className="border-t border-white/5 py-10 px-4">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { v: '< 60s', l: 'First reply time' },
            { v: '21', l: 'Industry templates' },
            { v: '24/7', l: 'Never stops working' },
          ].map(s => (
            <div key={s.l}>
              <p className="text-3xl font-black text-indigo-400">{s.v}</p>
              <p className="text-xs text-gray-400 mt-1">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What it does ── */}
      <section className="py-14 px-4 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-2">What your client's AI worker does</h2>
          <p className="text-gray-400 text-center text-sm mb-8">Automatically. 24 hours a day. While your client runs their business.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {WHAT_IT_DOES.map(f => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-3">
                <span className="text-2xl shrink-0">{f.emoji}</span>
                <div>
                  <p className="font-bold text-white text-sm">{f.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-14 px-4 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-8">Live in 5 minutes</h2>
          <div className="space-y-4">
            {STEPS.map(s => (
              <div key={s.n} className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-full bg-indigo-600 font-black text-white flex items-center justify-center text-lg shrink-0">
                  {s.n}
                </div>
                <div>
                  <p className="font-bold text-white">{s.title}</p>
                  <p className="text-gray-400 text-sm mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Agency math ── */}
      <section className="py-14 px-4 border-t border-white/5 bg-white/[0.02]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-2">The agency revenue math</h2>
          <p className="text-gray-400 text-center text-sm mb-8">Add AI workers as a recurring service. Your margin starts on day 1.</p>
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 text-xs text-gray-500 font-semibold uppercase tracking-wider px-5 py-3 border-b border-white/5">
              <span>Your Plan</span>
              <span className="text-center">Client Slots</span>
              <span className="text-right">At ₹40K/mo per client</span>
            </div>
            {[
              { plan: 'Lite — $99/mo', slots: '5 clients', rev: '₹2,00,000/mo' },
              { plan: 'Pro — $249/mo', slots: '15 clients', rev: '₹6,00,000/mo', hot: true },
              { plan: 'Scale — $499/mo', slots: '50 clients', rev: '₹2,00,00,000/mo' },
            ].map(r => (
              <div key={r.plan} className={`grid grid-cols-3 px-5 py-4 text-sm border-b border-white/5 ${r.hot ? 'bg-indigo-500/10' : ''}`}>
                <span className={`font-semibold ${r.hot ? 'text-indigo-300' : 'text-gray-300'}`}>{r.plan}</span>
                <span className="text-center text-gray-400">{r.slots}</span>
                <span className={`text-right font-bold ${r.hot ? 'text-indigo-300' : 'text-gray-300'}`}>{r.rev}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-xs text-center mt-3">₹40,000/mo per client is conservative. Many agencies charge ₹75,000–₹1,50,000/mo for AI workers.</p>
        </div>
      </section>

      {/* ── GHL-specific ── */}
      <section className="py-14 px-4 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-2">Built specifically for GHL agencies</h2>
          <p className="text-gray-400 text-center text-sm mb-8">Works inside your existing GHL setup. No new tech to learn.</p>
          <div className="space-y-3">
            {[
              'Uses your GHL Private Integration token — no marketplace approval needed',
              'Works across every channel your clients already use: SMS, WhatsApp, Instagram, FB Messenger, Live Chat, Google Business',
              "Reads GHL contact data before every reply — knows the customer's history",
              'Writes conversation notes + tags directly back to GHL CRM',
              'Your clients never see Kyra — they see their own branded AI worker',
              'Manages 1 client or 50 from the same dashboard',
            ].map(item => (
              <div key={item} className="flex items-start gap-3 text-sm text-gray-300">
                <span className="text-green-400 font-bold mt-0.5 shrink-0">✓</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live demo CTA ── */}
      <section className="py-14 px-4 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-400 text-sm mb-4">Want to see it working right now?</p>
          <Link
            href="/try/dental"
            className="inline-block bg-white/10 border border-white/20 hover:bg-white/15 text-white font-bold px-8 py-3 rounded-xl transition mb-3 mr-3"
          >
            Live Dental Demo →
          </Link>
          <Link
            href="/try/cannabis"
            className="inline-block bg-white/10 border border-white/20 hover:bg-white/15 text-white font-bold px-8 py-3 rounded-xl transition mb-3"
          >
            Live Cannabis Demo →
          </Link>
          <p className="text-gray-500 text-xs mt-3">No login. Real AI. Type anything and see it respond.</p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-16 px-4 border-t border-white/5 bg-gradient-to-b from-transparent to-indigo-950/30">
        <div className="max-w-xl mx-auto text-center">
          <div className="text-4xl mb-4">🇮🇳</div>
          <h2 className="text-3xl font-black mb-3">You're already at the right event.</h2>
          <p className="text-gray-300 text-lg mb-2">Now deploy the right platform.</p>
          <p className="text-gray-500 text-sm mb-8">
            Every agency owner at HighLevel LIVE India is asking the same question:<br />
            <span className="text-white font-semibold">"How do I add AI to what I'm already doing in GHL?"</span><br />
            Kyra is that answer. And it's free to start.
          </p>
          <Link
            href="/signup/agency?promo=INDIA2026&src=ghl-live-india"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xl px-10 py-5 rounded-2xl transition shadow-2xl shadow-indigo-900/50 w-full sm:w-auto"
          >
            Start Free — Code INDIA2026 →
          </Link>
          <p className="text-gray-500 text-sm mt-3">60-day trial · 500 bonus credits · No credit card needed</p>
          <p className="text-gray-600 text-xs mt-4">
            Questions? Email <a href="mailto:support@conversionsystem.com" className="text-indigo-400 hover:underline">support@conversionsystem.com</a>
          </p>
        </div>
      </section>

    </div>
  );
}
