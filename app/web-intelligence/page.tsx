import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Web Intelligence — AI Workers That Read the Internet | Kyra',
  description:
    'The only white-label AI workforce platform where your workers can browse the web in real time. Live competitor pricing, lead enrichment, company research, industry news — all on autopilot.',
  openGraph: {
    title: 'Web Intelligence — AI Workers That Read the Internet',
    description:
      'Live competitor pricing. Lead enrichment. Company research. Industry news. Your AI workers can now browse the web — automatically, on every plan.',
    url: 'https://kyra.conversionsystem.com/web-intelligence',
  },
  alternates: { canonical: 'https://kyra.conversionsystem.com/web-intelligence' },
};

const USE_CASES = [
  {
    icon: '🔍',
    title: 'Competitor Intelligence',
    desc: 'Ask your AI worker to check a competitor\'s pricing, services, or reviews. It reads the site and gives you a real-time answer. No manual browsing required.',
    example: '"What is ABC Dental charging for cleanings right now?"',
  },
  {
    icon: '🏢',
    title: 'Lead Enrichment',
    desc: 'When a lead comes in, your AI worker can look up the company website, LinkedIn, and news to enrich the contact before your team ever sees it.',
    example: '"Research TrustedNetworx before our meeting tomorrow."',
  },
  {
    icon: '📰',
    title: 'Industry News & Alerts',
    desc: 'Set up your AI worker to check industry news and send you a briefing every morning. Regulatory changes, competitor launches, market shifts.',
    example: '"Summarize the top 5 cannabis industry news stories from this week."',
  },
  {
    icon: '📦',
    title: 'Product & Pricing Research',
    desc: 'Find live pricing, availability, and specs from any website. Perfect for procurement, quoting, and staying ahead of market changes.',
    example: '"What are the current prices for HVAC units at the top 3 suppliers?"',
  },
  {
    icon: '🗺️',
    title: 'Local Market Mapping',
    desc: 'Crawl local business directories, Google Maps, and review sites to build prospect lists and understand the competitive landscape in any area.',
    example: '"Find all dental clinics within 10 miles of downtown Phoenix with ratings under 4 stars."',
  },
  {
    icon: '📋',
    title: 'Report Generation',
    desc: 'Your AI worker gathers data from multiple sites, synthesizes it, and delivers a formatted report — without you lifting a finger.',
    example: '"Build me a competitive analysis report for our new HVAC client."',
  },
];

const PLANS = [
  { name: 'Lite', price: '$99', scrapes: '500', clients: '3', highlight: false },
  { name: 'Pro', price: '$299', scrapes: '2,000', clients: '10', highlight: true },
  { name: 'Scale', price: '$499', scrapes: '5,000', clients: '20', highlight: false },
];

export default function WebIntelligencePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
      <PublicNav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 text-sm font-medium">
            <span className="bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">New</span>
            Included on every paid plan
          </div>
        </div>

        <h1 className="text-5xl sm:text-6xl font-black leading-[1.05] mb-6 tracking-tight">
          AI workers that<br />
          <span className="text-indigo-400">read the internet.</span>
        </h1>

        <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Kyra is the only white-label AI workforce platform where your workers can browse the web in real time.
          Live competitor pricing, lead enrichment, company research, industry news — all on autopilot.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            Start free trial
          </Link>
          <Link
            href="/pricing"
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            See pricing
          </Link>
        </div>
      </section>

      {/* ── What it is ───────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-16 border-t border-white/10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-black mb-4">
              Your AI workers just got a lot smarter.
            </h2>
            <p className="text-slate-400 leading-relaxed mb-4">
              Until now, AI workers only knew what you told them. They could answer questions, book appointments, and handle CRM — but they were blind to the live web.
            </p>
            <p className="text-slate-400 leading-relaxed mb-4">
              With <strong className="text-white">Web Intelligence</strong>, every AI worker on Kyra can now read any website, search the web, crawl competitor sites, and extract structured data — powered by Firecrawl and routed securely through Kyra.
            </p>
            <p className="text-slate-400 leading-relaxed">
              It works out of the box. No setup. No API keys. No configuration. Just ask your AI worker to check something, and it will.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 font-mono text-sm">
            <div className="text-slate-500 mb-3">// Example conversation</div>
            <div className="mb-3">
              <span className="text-slate-400">You:</span>
              <span className="text-white ml-2">&quot;Research our top 3 competitors and tell me their pricing.&quot;</span>
            </div>
            <div className="mb-3">
              <span className="text-indigo-400">AI Worker:</span>
              <span className="text-slate-300 ml-2">Browsing competitor websites now...</span>
            </div>
            <div className="bg-indigo-950/50 border border-indigo-500/30 rounded-xl p-4 mt-4">
              <div className="text-indigo-300 text-xs font-bold uppercase tracking-wide mb-2">✓ Competitor Analysis Ready</div>
              <div className="text-slate-300 text-sm">ABC Dental: $150 cleaning, $0 with insurance</div>
              <div className="text-slate-300 text-sm">XYZ Dental: $175 cleaning, accepts Delta</div>
              <div className="text-slate-300 text-sm">Quick Dental: $120, no insurance accepted</div>
              <div className="text-slate-400 text-xs mt-2">Sources verified · Updated 2 minutes ago</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Use Cases ────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-16 border-t border-white/10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black mb-3">What your workers can do now</h2>
          <p className="text-slate-400">Real-world tasks your AI workers handle automatically.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {USE_CASES.map((uc) => (
            <div key={uc.title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="text-2xl mb-3">{uc.icon}</div>
              <h3 className="font-bold mb-2">{uc.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-3">{uc.desc}</p>
              <div className="bg-slate-800 rounded-lg px-3 py-2 text-indigo-300 text-xs italic">{uc.example}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-16 border-t border-white/10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black mb-3">How it works</h2>
          <p className="text-slate-400">Zero setup. Works out of the box.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            { step: '1', title: 'Ask your AI worker anything', desc: 'Type a natural language request. &quot;Research this company.&quot; &quot;Check their pricing.&quot; &quot;Find local competitors.&quot;' },
            { step: '2', title: 'Worker browses the web', desc: 'Your AI worker automatically fetches pages, searches for information, and extracts the data you need.' },
            { step: '3', title: 'Get the answer instantly', desc: 'Results delivered in plain English, structured data, or a formatted report — whatever you asked for.' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-black text-xl flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-bold mb-2">{item.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: item.desc }} />
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-16 border-t border-white/10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black mb-3">Included on every plan</h2>
          <p className="text-slate-400">Web Intelligence is built in — no add-ons, no extra fees.</p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-6 border text-center ${
                plan.highlight
                  ? 'bg-indigo-600 border-indigo-500 ring-2 ring-indigo-400'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {plan.highlight && (
                <div className="text-xs font-black uppercase tracking-widest text-indigo-200 mb-2">Most Popular</div>
              )}
              <div className="text-2xl font-black mb-1">{plan.name}</div>
              <div className="text-3xl font-black mb-4">
                {plan.price}<span className="text-base font-normal text-slate-400">/mo</span>
              </div>
              <div className="text-lg font-bold text-indigo-300 mb-1">{plan.scrapes}</div>
              <div className="text-sm text-slate-400 mb-2">web scrapes/month</div>
              <div className="text-sm text-slate-400 mb-6">{plan.clients} client accounts</div>
              <Link
                href="/signup"
                className={`block w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                  plan.highlight
                    ? 'bg-white text-indigo-600 hover:bg-indigo-50'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                }`}
              >
                Start free trial
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-black mb-4">
          The AI workers your clients actually need.
        </h2>
        <p className="text-slate-400 text-lg mb-8 leading-relaxed">
          Don&apos;t just give clients an AI that answers questions. Give them one that finds answers.
          Web Intelligence is live today on every Kyra paid plan.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-10 py-4 rounded-xl text-lg transition-colors"
        >
          Start your 7-day free trial →
        </Link>
      </section>

      <PublicFooter />
    </div>
  );
}
