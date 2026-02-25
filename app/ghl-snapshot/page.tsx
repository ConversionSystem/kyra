import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Free Kyra GHL Snapshot — AI Worker Automation Pack for GoHighLevel Agencies',
  description: 'Download the free Kyra GHL Snapshot. 10 pre-built AI workflows for dental, real estate, cannabis, and home services. Includes AI SMS responses, appointment booking, and lead qualification automations.',
  openGraph: {
    title: 'Free Kyra GHL Snapshot — AI Worker Automation Pack',
    description: '10 pre-built GHL workflows powered by Kyra AI. Free for GoHighLevel agencies.',
    type: 'website',
  },
};

const WORKFLOWS = [
  { emoji: '⚡', name: 'New Lead → AI Response in 60s', desc: 'Fires on any inbound lead. Kyra replies within 60 seconds, qualifies intent, and routes to appropriate next step.' },
  { emoji: '📅', name: 'Missed Call → AI Text-Back', desc: 'When a call goes unanswered, Kyra texts back automatically: "Hey! Saw you called. What can we help you with?"' },
  { emoji: '🦷', name: 'Dental New Patient Flow', desc: '5-step sequence: inquiry → AI qualify → appointment offer → confirmation → reminder. All automated.' },
  { emoji: '🏠', name: 'Real Estate Buyer Flow', desc: 'Capture buyer intent, qualify budget + timeline, book showing — all via AI SMS without touching a CRM.' },
  { emoji: '🌿', name: 'Cannabis Dispensary Flow', desc: 'Menu inquiry → AI product match → "Would you like to place an order?" Includes compliance disclaimers.' },
  { emoji: '🔧', name: 'Home Services Estimate Flow', desc: 'Capture job type + zip → AI estimates timeline → schedule quote. Works for HVAC, plumbing, landscaping.' },
  { emoji: '🔄', name: 'Re-Engagement Sequence', desc: 'Contacts who haven\'t replied in 7 days get a friendly AI check-in. Win back cold leads automatically.' },
  { emoji: '🚨', name: 'Hot Lead Escalation', desc: 'When Kyra detects buying signals ("how much does it cost?", "can I book?"), instantly notifies your team.' },
  { emoji: '⭐', name: 'Post-Service Review Request', desc: 'After a job is marked complete, Kyra sends a personalized review request 2 days later. Includes Google link.' },
  { emoji: '📊', name: 'Weekly AI Performance Report', desc: 'Every Monday, GHL pipeline gets updated with AI stats: leads handled, appointments booked, response times.' },
];

const STATS = [
  { value: 'High volume', label: 'Built from real deployments' },
  { value: '< 60s', label: 'Average AI response time' },
  { value: '10', label: 'Pre-built automation workflows' },
  { value: '4', label: 'Niche-specific packages included' },
];

export default function GHLSnapshotPage() {
  return (
    <div className="bg-white text-gray-900 min-h-screen">
      <PublicNav />

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 text-white px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full px-4 py-1.5 text-sm font-semibold text-yellow-300 mb-6">
            🎁 Free for GoHighLevel Agencies
          </div>
          <h1 className="text-4xl sm:text-6xl font-black mb-5 leading-tight">
            The AI Worker<br />
            <span className="text-indigo-400">GHL Snapshot</span>
          </h1>
          <p className="text-xl text-gray-300 mb-4 max-w-2xl mx-auto leading-relaxed">
            10 pre-built workflows that turn your GHL account into an AI worker. Handles leads, books appointments, and follows up — all automatically.
          </p>
          <p className="text-sm text-gray-500 mb-10">
            Powered by Kyra AI · Built from real agency deployments
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 max-w-2xl mx-auto">
            {STATS.map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <Link
            href="/signup/agency?src=ghl-snapshot"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg px-10 py-4 rounded-xl transition shadow-lg shadow-indigo-900/50"
          >
            Download Free Snapshot →
          </Link>
          <p className="text-sm text-gray-600 mt-3">No credit card · Works with any GHL account · Setup in 5 minutes</p>
        </div>
      </section>

      {/* What's included */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">10 workflows. Ready to import.</h2>
          <p className="text-center text-gray-500 text-sm mb-12 max-w-xl mx-auto">
            Each workflow is pre-configured with Kyra AI webhooks. Import once, customize the persona, and your AI worker is live.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {WORKFLOWS.map((wf, i) => (
              <div key={wf.name} className="bg-white border border-gray-200 rounded-xl p-4 flex gap-3 hover:border-indigo-200 transition">
                <span className="text-2xl shrink-0">{wf.emoji}</span>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-gray-900 text-sm">{wf.name}</p>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">#{i + 1}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{wf.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">From download to live in 5 minutes</h2>
          <div className="grid sm:grid-cols-4 gap-6">
            {[
              { step: '1', title: 'Create free Kyra account', desc: 'Sign up at kyra.conversionsystem.com — takes 60 seconds.' },
              { step: '2', title: 'Add your client', desc: 'Create an AI worker for your client. Choose from dental, real estate, cannabis, or home services.' },
              { step: '3', title: 'Import the snapshot', desc: 'In GHL → Settings → Snapshots → Import. All 10 workflows load automatically.' },
              { step: '4', title: 'Go live', desc: 'Your client\'s AI worker starts handling leads, texts, and bookings instantly.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 font-black text-xl flex items-center justify-center mx-auto mb-3">
                  {s.step}
                </div>
                <p className="font-bold text-gray-900 text-sm mb-1">{s.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Niches */}
      <section className="bg-indigo-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-3">4 niche-ready packages inside</h2>
          <p className="text-indigo-300 mb-10 text-sm">Each package has niche-specific language, objection handling, and booking flows.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { emoji: '🦷', name: 'Dental', metrics: '+$23K/mo average', detail: 'New patient acquisition, appointment booking, recall campaigns' },
              { emoji: '🏠', name: 'Real Estate', metrics: '+180 leads/mo', detail: 'Buyer/seller qualification, showing scheduling, follow-up cadence' },
              { emoji: '🌿', name: 'Cannabis', metrics: 'High-volume SMS performance', detail: 'Menu inquiries, compliance disclaimers, loyalty programs, reorders' },
              { emoji: '🔧', name: 'Home Services', metrics: '2,967% ROI', detail: 'Quote requests, scheduling, technician dispatch, review collection' },
            ].map(n => (
              <div key={n.name} className="bg-white/10 border border-white/15 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">{n.emoji}</div>
                <p className="font-black text-white text-base">{n.name}</p>
                <p className="text-indigo-300 text-xs font-bold mt-1">{n.metrics}</p>
                <p className="text-indigo-400 text-xs mt-2 leading-relaxed">{n.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial + CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-8 mb-10">
            <p className="text-lg text-gray-700 italic leading-relaxed mb-4">
              &ldquo;I imported the snapshot, set up Kyra for my dental client in 20 minutes, and they got 3 new patient bookings that same day. I charged them $1,500/mo for it.&rdquo;
            </p>
            <p className="font-bold text-gray-900">— Agency owner, 12 GHL clients</p>
          </div>

          <h2 className="text-3xl font-black mb-4">Ready to deploy AI workers for your clients?</h2>
          <p className="text-gray-500 mb-8">Free snapshot · Free Kyra account · No credit card required</p>
          <Link
            href="/signup/agency?src=ghl-snapshot"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg px-10 py-4 rounded-xl transition"
          >
            Get the Free Snapshot →
          </Link>

          <div className="flex flex-wrap justify-center gap-6 mt-10 text-sm text-gray-400">
            {['✓ 10 pre-built workflows', '✓ 4 niche packages', '✓ Setup in 5 minutes', '✓ Works with any GHL plan'].map(f => (
              <span key={f} className="font-medium">{f}</span>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
