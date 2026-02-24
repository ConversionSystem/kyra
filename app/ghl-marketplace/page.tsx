import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Kyra AI — GoHighLevel Marketplace App | AI Employee for GHL Agencies',
  description: 'Kyra adds an OpenClaw-powered autonomous AI worker to any GHL sub-account. Responds to every lead in 60 seconds, books appointments, updates the CRM, escalates hot leads. White-labeled for agencies.',
};

const FEATURES = [
  { icon: '⚡', title: 'Replies in < 60 seconds', desc: 'Every inbound SMS, email, or DM gets an intelligent, context-aware reply — 24/7, including nights and weekends.' },
  { icon: '📅', title: 'Books into GHL Calendar', desc: 'Checks real-time availability, offers slots, confirms bookings, and sends reminder texts. No human needed.' },
  { icon: '🏷️', title: 'Auto-tags & updates CRM', desc: 'After every conversation, tags are applied, notes are written, and opportunities are updated — all in real time.' },
  { icon: '🚨', title: 'Escalates frustrated leads', desc: 'Detects keywords like "frustrated," "angry," "speak to a person" and immediately pings your team via email.' },
  { icon: '🧠', title: 'Knows your client\'s business', desc: 'You set the personality, services, pricing, hours, and tone once. The AI handles every conversation in character.' },
  { icon: '📊', title: 'Full conversation history', desc: 'Every AI conversation is logged, searchable, and exportable from your Kyra agency dashboard.' },
  { icon: '🔒', title: 'STOP keyword compliance', desc: 'Detects opt-out keywords instantly and permanently tags the contact — never messages them again.' },
  { icon: '🏢', title: 'One dashboard, all clients', desc: 'Manage every client\'s AI employee from a single Kyra login. No switching sub-accounts.' },
];

const VERTICALS = [
  { emoji: '🦷', name: 'Dental Clinics', result: '+40% appointment bookings' },
  { emoji: '🏡', name: 'Real Estate', result: 'Every lead responded to in <60s' },
  { emoji: '🌿', name: 'Cannabis Dispensaries', result: '$29M+ revenue generated' },
  { emoji: '🚗', name: 'Auto Dealerships', result: 'Test drive bookings on autopilot' },
  { emoji: '💆', name: 'Med Spa / Aesthetics', result: 'Consultation bookings 24/7' },
  { emoji: '🏋️', name: 'Fitness / Gyms', result: 'Trial sign-ups → zero no-shows' },
  { emoji: '⚖️', name: 'Law Firms', result: 'Instant intake qualification' },
  { emoji: '🔧', name: 'Home Services', result: 'Emergency calls never missed' },
  { emoji: '🏥', name: 'Chiropractic', result: 'Re-activation campaigns automated' },
  { emoji: '💰', name: 'Mortgage / Finance', result: 'Leads qualified before human call' },
  { emoji: '🐾', name: 'Veterinary Clinics', result: '24/7 appointment booking' },
  { emoji: '🌞', name: 'Solar', result: 'High-ticket follow-up automated' },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Install from Marketplace', desc: 'One-click OAuth install directly from the GHL Marketplace. No API keys, no technical setup.' },
  { step: '2', title: 'Add your first client', desc: 'Pick an industry template (dental, real estate, cannabis, etc.). Customize the AI name, personality, and business info.' },
  { step: '3', title: 'Connect GHL sub-account', desc: 'Paste the client\'s GHL Private Integration token. Kyra starts monitoring their inbox immediately.' },
  { step: '4', title: 'Watch it work', desc: 'Every inbound message gets a smart reply within 60 seconds. Check the Conversations tab to see everything in real time.' },
];

const PLANS = [
  {
    name: 'Lite', price: '$99', per: '/mo', clients: '1–3 clients',
    features: ['3 AI employees', 'All 21 industry templates', 'GHL CRM sync', 'Conversation history', 'Email escalation alerts'],
    highlight: false,
  },
  {
    name: 'Pro', price: '$249', per: '/mo', clients: '5–15 clients',
    features: ['15 AI employees', 'Everything in Lite', 'White-label dashboard', 'Custom AI personalities', 'Priority support', 'Usage analytics'],
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Scale', price: '$499', per: '/mo', clients: 'Unlimited clients',
    features: ['Unlimited AI employees', 'Everything in Pro', 'Dedicated onboarding', 'API access', 'Custom integrations', 'SLA guarantee'],
    highlight: false,
  },
];

export default function GhlMarketplacePage() {
  return (
    <div className="bg-white text-gray-900 min-h-screen font-sans">

      <PublicNav />

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
            <span className="text-green-400 text-xs font-bold">●</span>
            Official GoHighLevel Integration
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-6">
            Give Every GHL Client<br />
            <span className="text-indigo-300">an AI Employee</span>
          </h1>
          <p className="text-xl text-indigo-200 max-w-2xl mx-auto mb-10 leading-relaxed">
            Kyra plugs into any GHL sub-account and handles inbound conversations 24/7.
            Responds in under 60 seconds. Books appointments. Updates the CRM. Escalates hot leads.
            All white-labeled under your agency brand.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup/agency" className="inline-block bg-white text-indigo-900 font-bold text-lg px-8 py-4 rounded-xl hover:bg-indigo-50 transition-colors">
              Start Free — $2 in Credits Included
            </Link>
            <Link href="/try/dental" className="inline-block bg-white/10 border border-white/30 text-white font-semibold text-lg px-8 py-4 rounded-xl hover:bg-white/20 transition-colors">
              See Live Demo →
            </Link>
          </div>
          <p className="text-indigo-400 text-sm mt-4">No credit card · Setup in under 10 minutes · Cancel anytime</p>
        </div>
      </section>

      {/* ── Key Stats ── */}
      <section className="border-b border-gray-100 py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: '< 60s', label: 'Average response time', sub: 'Day and night' },
              { value: '$29M+', label: 'Revenue generated', sub: 'Across client verticals' },
              { value: '21', label: 'Industry templates', sub: 'Ready to deploy' },
              { value: '100%', label: 'Leads responded to', sub: 'Zero missed follow-ups' },
            ].map(s => (
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
          <h2 className="text-3xl font-black text-center mb-3">Up and running in under 10 minutes</h2>
          <p className="text-center text-gray-500 mb-12">No code. No API setup. No technical expertise required.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(step => (
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
          <h2 className="text-3xl font-black text-center mb-3">Everything an AI employee should do</h2>
          <p className="text-center text-gray-500 mb-12">Works inside GHL natively. No Zapier. No webhooks to configure.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(f => (
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
          <h2 className="text-3xl font-black text-center mb-3">Works for every vertical your clients serve</h2>
          <p className="text-center text-gray-500 mb-12">21 pre-built industry templates. Pick one, customize, go live.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {VERTICALS.map(v => (
              <div key={v.name} className="border border-gray-200 rounded-xl p-4 text-center hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="text-3xl mb-2">{v.emoji}</div>
                <p className="font-semibold text-gray-900 text-sm">{v.name}</p>
                <p className="text-xs text-indigo-600 mt-1 font-medium">{v.result}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cannabis Case Study (strongest proof) ── */}
      <section className="bg-green-950 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🌿</span>
            <span className="text-green-400 text-sm font-bold uppercase tracking-wider">Case Study — Cannabis Vertical</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black mb-6 leading-tight">
            $29M+ in cannabis revenue.<br />
            <span className="text-green-400">Powered by AI SMS.</span>
          </h2>
          <p className="text-green-100 text-lg mb-10 max-w-2xl leading-relaxed">
            Cannabis dispensaries face a unique challenge — high inbound volume, strict regulations, and customers who need fast answers on product, pricing, and pickup.
            Kyra handles all of it automatically, in under 60 seconds, while staying fully compliant.
          </p>
          <div className="grid sm:grid-cols-3 gap-6 mb-10">
            {[
              { value: '$29M+', label: 'Revenue attributed to AI SMS', icon: '💰' },
              { value: '2 clients', label: 'Purple Lotus ($27M) + The Flower Shop ($1.95M/mo)', icon: '🏪' },
              { value: '60s', label: 'Average response time to inbound product questions', icon: '⚡' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="text-2xl mb-2">{s.icon}</div>
                <p className="text-3xl font-black text-green-300">{s.value}</p>
                <p className="text-sm text-green-200 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <Link href="/try/cannabis" className="inline-block bg-green-500 hover:bg-green-400 text-white font-bold px-6 py-3 rounded-xl transition-colors">
            See Cannabis AI Demo →
          </Link>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-4">What OpenClaw AI workers deliver</h2>
          <p className="text-center text-gray-500 mb-12">Real results from live deployments — not hypotheticals.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                stat: '$29M+',
                label: 'Revenue generated',
                desc: 'Across cannabis and retail deployments — AI workers running 24/7 while staff focused on in-store service.',
                emoji: '💰',
              },
              {
                stat: '< 60s',
                label: 'First response time',
                desc: 'Every inbound GHL message — SMS, WhatsApp, Instagram — gets an intelligent reply in under 60 seconds.',
                emoji: '⚡',
              },
              {
                stat: '40+',
                label: 'Messages in one shift',
                desc: 'A single AI worker handled 40+ inbound texts during a dispensary Friday night rush. Every one answered.',
                emoji: '📲',
              },
            ].map(r => (
              <div key={r.stat} className="border border-gray-200 rounded-2xl p-6 text-center">
                <div className="text-3xl mb-3">{r.emoji}</div>
                <p className="text-3xl font-black text-gray-900 mb-1">{r.stat}</p>
                <p className="text-sm font-semibold text-indigo-600 mb-3">{r.label}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">Simple agency pricing</h2>
          <p className="text-center text-gray-500 mb-12">One flat fee. Unlimited conversations per client. No per-message charges.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {PLANS.map(plan => (
              <div key={plan.name} className={`rounded-2xl p-7 border-2 ${plan.highlight ? 'border-indigo-500 bg-white shadow-lg shadow-indigo-100 scale-[1.02]' : 'border-gray-200 bg-white'}`}>
                {plan.badge && (
                  <span className="inline-block bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                    {plan.badge}
                  </span>
                )}
                <p className="text-lg font-bold text-gray-900">{plan.name}</p>
                <div className="flex items-baseline gap-1 mt-2 mb-1">
                  <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.per}</span>
                </div>
                <p className="text-sm text-indigo-600 font-medium mb-5">{plan.clients}</p>
                <ul className="space-y-2 mb-7">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-green-500 font-bold">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup/agency" className={`block text-center font-bold py-3 rounded-xl transition-colors text-sm ${plan.highlight ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                  Start Free →
                </Link>
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
                q: 'What happens if the AI doesn\'t know the answer?',
                a: 'You configure a fallback behavior per client — either the AI says "Let me have a team member follow up" and tags the contact as escalated, or it can be set to always respond confidently within its configured knowledge.',
              },
              {
                q: 'Can I white-label this for my clients?',
                a: 'Yes. The AI employee has a custom name (e.g., "Alex from Dental Plus") and operates from your client\'s GHL account. Your clients never see "Kyra" — they see their own branded AI.',
              },
              {
                q: 'How do billing and credits work?',
                a: 'Your agency gets $2 in free credits on signup (good for ~200 test conversations). After that, you can purchase credit packs or add your own API key (Anthropic, OpenAI, etc.) to power the AI directly.',
              },
              {
                q: 'Is there a limit on how many messages the AI sends per client?',
                a: 'No per-message limits on the flat-rate plans. 1 credit = 1 conversation on credit packs. The flat plans are unlimited.',
              },
              {
                q: 'What GHL plan do I need?',
                a: 'Kyra works with GHL Agency Starter and above. You need access to the Private Integration feature (available on all Agency plans) to generate the token Kyra uses.',
              },
            ].map(faq => (
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
          <h2 className="text-3xl sm:text-4xl font-black mb-4">Deploy your first AI employee today.</h2>
          <p className="text-indigo-200 text-lg mb-8">
            Connect GHL. Pick a template. Live in 10 minutes. Free $2 in credits included.
          </p>
          <Link href="/signup/agency" className="inline-block bg-white text-indigo-900 font-black text-lg px-10 py-4 rounded-xl hover:bg-indigo-50 transition-colors">
            Get Started Free →
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
