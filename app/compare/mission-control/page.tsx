import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kyra vs Mission Control — Which AI Platform is Right for You?',
  description: 'Compare Kyra and Mission Control side by side. See why agencies choose Kyra for zero-setup AI workers with built-in CRM, billing, and white-label.',
};

const COMPARISON = [
  { feature: 'Setup time', kyra: '2 minutes — sign up and go', mc: '30+ minutes — git clone, .env, Docker, terminal', winner: 'kyra' },
  { feature: 'Technical skills needed', kyra: 'None. Point-and-click dashboard', mc: 'CLI, Docker, environment variables', winner: 'kyra' },
  { feature: 'Hosting', kyra: 'Fully managed cloud (we handle it)', mc: 'Self-hosted (you manage servers)', winner: 'kyra' },
  { feature: 'Updates', kyra: 'Automatic — always on latest version', mc: 'Manual — git pull, rebuild, restart', winner: 'kyra' },
  { feature: 'AI worker templates', kyra: '15 industry templates pre-built', mc: 'Build from scratch', winner: 'kyra' },
  { feature: 'Multi-agent routing', kyra: '6 specialized agents + smart routing', mc: 'Manual agent setup', winner: 'kyra' },
  { feature: 'CRM', kyra: 'Full CRM built in — contacts, deals, tasks, tags', mc: 'No CRM — use external tools', winner: 'kyra' },
  { feature: 'GHL integration', kyra: 'Native — SMS, webhooks, contacts sync', mc: 'Manual webhook setup', winner: 'kyra' },
  { feature: 'SMS / WhatsApp', kyra: 'Built-in channels, one-click connect', mc: 'Configure yourself', winner: 'kyra' },
  { feature: 'Review gates', kyra: 'Built-in human approval before sending', mc: 'Built-in review panel', winner: 'tie' },
  { feature: 'Token dashboard', kyra: 'Per-client cost tracking + margin view', mc: 'Token usage panel', winner: 'tie' },
  { feature: 'Alert rules', kyra: 'Configurable — offline, spike, stale', mc: 'Built-in monitoring', winner: 'tie' },
  { feature: 'Pipeline builder', kyra: 'Visual agent chaining with templates', mc: 'Scheduler + manual chains', winner: 'tie' },
  { feature: 'Autopilot', kyra: 'Pre-built sequences — follow-ups, reminders, reviews', mc: 'Cron scheduler (manual setup)', winner: 'kyra' },
  { feature: 'White-label', kyra: 'Full white-label — your brand, your domain', mc: 'Not designed for reselling', winner: 'kyra' },
  { feature: 'Client management', kyra: 'Multi-client dashboard with isolation', mc: 'Single-user focus', winner: 'kyra' },
  { feature: 'Billing system', kyra: 'Built-in credits + Stripe integration', mc: 'No billing — free/self-hosted', winner: 'kyra' },
  { feature: 'Price', kyra: 'Free tier + paid from $99/mo', mc: 'Free (self-hosted) + OpenClaw costs', winner: 'mc' },
  { feature: 'Data ownership', kyra: 'Your data on our managed servers', mc: 'Full control — your hardware', winner: 'mc' },
  { feature: 'Customization depth', kyra: 'Dashboard-driven config', mc: 'Full code access — unlimited flexibility', winner: 'mc' },
];

export default function CompareMissionControl() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="px-4 py-16 lg:py-24 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-indigo-400 text-sm font-semibold uppercase tracking-widest mb-4">Honest Comparison</p>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight">
            Kyra vs Mission Control
          </h1>
          <p className="text-lg text-slate-400 mt-4 max-w-xl mx-auto">
            Both platforms build AI workers. One requires terminal commands and Docker. The other is ready in 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              href="/solo"
              className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold text-white transition w-full sm:w-auto"
            >
              Try Kyra Free →
            </Link>
            <a
              href="https://github.com/builderz-labs/mission-control"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 border border-white/20 hover:bg-white/5 rounded-xl font-semibold text-white transition w-full sm:w-auto"
            >
              View Mission Control ↗
            </a>
          </div>
        </div>
      </section>

      {/* TL;DR */}
      <section className="px-4 pb-12">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-indigo-950/50 border border-indigo-800/40 rounded-xl p-6">
            <p className="text-indigo-400 font-bold text-sm mb-2">Choose Kyra if you...</p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>✅ Want to be live in 2 minutes, not 2 hours</li>
              <li>✅ Run an agency and manage multiple clients</li>
              <li>✅ Need built-in CRM, billing, and white-label</li>
              <li>✅ Don&apos;t want to manage servers or Docker</li>
              <li>✅ Want pre-built templates and autopilot</li>
            </ul>
          </div>
          <div className="bg-slate-900/50 border border-slate-700/40 rounded-xl p-6">
            <p className="text-slate-400 font-bold text-sm mb-2">Choose Mission Control if you...</p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>✅ Want full code control and unlimited customization</li>
              <li>✅ Are comfortable with CLI, Docker, and .env files</li>
              <li>✅ Want to self-host on your own hardware</li>
              <li>✅ Don&apos;t need multi-client management or billing</li>
              <li>✅ Prefer free tools over managed services</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-4 py-16 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Feature-by-Feature</h2>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-3 gap-0 border-b border-white/10 text-sm font-semibold">
              <div className="px-4 py-3 text-slate-500">Feature</div>
              <div className="px-4 py-3 text-indigo-400 text-center border-x border-white/5">Kyra</div>
              <div className="px-4 py-3 text-slate-400 text-center">Mission Control</div>
            </div>

            {/* Rows */}
            {COMPARISON.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 gap-0 text-sm ${
                  i < COMPARISON.length - 1 ? 'border-b border-white/5' : ''
                } ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}
              >
                <div className="px-4 py-3 text-slate-300 font-medium">{row.feature}</div>
                <div className={`px-4 py-3 text-center border-x border-white/5 ${
                  row.winner === 'kyra' ? 'text-indigo-300 bg-indigo-950/30' : 'text-slate-400'
                }`}>
                  {row.kyra}
                  {row.winner === 'kyra' && <span className="ml-1.5 text-indigo-400">✓</span>}
                </div>
                <div className={`px-4 py-3 text-center ${
                  row.winner === 'mc' ? 'text-emerald-300 bg-emerald-950/20' : 'text-slate-500'
                }`}>
                  {row.mc}
                  {row.winner === 'mc' && <span className="ml-1.5 text-emerald-400">✓</span>}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-600 mt-4">
            Last updated March 2026 · We try to be fair — corrections welcome
          </p>
        </div>
      </section>

      {/* The Big Question */}
      <section className="px-4 py-16 border-t border-white/5 bg-gradient-to-b from-transparent to-indigo-950/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Do you want to build the tool, or use it?
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Mission Control is a powerful open-source framework for developers who want full control.
            Kyra is for business owners and agencies who want AI workers running in minutes, not days.
            Both are valid. Pick what fits your workflow.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/solo"
              className="inline-flex items-center justify-center px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-white transition w-full sm:w-auto"
            >
              Start Free with Kyra
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-3.5 border border-white/20 hover:bg-white/5 rounded-xl font-semibold text-white transition w-full sm:w-auto"
            >
              See Plans & Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-white/5 text-center">
        <p className="text-xs text-slate-600">
          Kyra is not affiliated with Mission Control or builderz-labs. Mission Control is an open-source project under its own license.
        </p>
      </footer>
    </div>
  );
}
