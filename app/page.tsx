import Link from 'next/link';
import {
  ArrowRightIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  UsersIcon,
  BarChart3Icon,
  BrainIcon,
  SettingsIcon,
  GlobeIcon,
  SmartphoneIcon,
  TerminalIcon,
  ZapIcon,
  SearchIcon,
  FileTextIcon,
  ClockIcon,
  EyeIcon,
  LockIcon,
  LayersIcon,
  MonitorIcon,
  DollarSignIcon,
  CheckCircleIcon,
  XIcon,
  CheckIcon,
  SparklesIcon,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="container mx-auto px-4 md:px-6 py-4 md:py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <span className="text-xl font-semibold text-gray-900">Kyra</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#problem" className="text-gray-600 hover:text-gray-700 transition text-sm">
            The Problem
          </Link>
          <Link href="#layers" className="text-gray-600 hover:text-gray-700 transition text-sm">
            How It Works
          </Link>
          <Link href="#compare" className="text-gray-600 hover:text-gray-700 transition text-sm">
            Compare
          </Link>
          <Link href="#ai-os" className="text-gray-600 hover:text-gray-700 transition text-sm">
            Features
          </Link>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="text-gray-600 hover:text-gray-700 transition text-xs sm:text-sm font-medium">
            Sign In
          </Link>
          <Link
            href="/signup/agency"
            className="px-3 sm:px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition font-medium text-xs sm:text-sm text-white"
          >
            Join Beta
          </Link>
        </div>
      </header>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="container mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-16 md:pb-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold uppercase tracking-wider">
                Beta
              </span>
              <span className="text-indigo-600 font-medium text-sm">
                Powered by OpenClaw
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 tracking-tight text-gray-900">
              Give every client a real AI employee.
              <br />
              <span className="text-indigo-600">Not a chatbot.</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-8">
              Kyra hosts the full{' '}
              <Link href="https://openclaw.ai" className="text-indigo-600 hover:underline font-medium" target="_blank">
                OpenClaw
              </Link>
              {' '}platform for agencies. Your clients get autonomous AI employees that browse the web, manage leads, schedule follow-ups, and work 24/7 — all managed from one dashboard.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup/agency"
                className="flex items-center gap-2 px-7 py-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition font-semibold text-base text-white"
              >
                Start Free Beta
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="#compare"
                className="flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-300 hover:border-gray-400 transition font-medium text-sm text-gray-700"
              >
                See How We Compare
              </Link>
            </div>

            <p className="text-sm text-gray-400 mt-4">
              Free during beta · Bring your own API keys · No credit card required
            </p>
          </div>

          {/* Dashboard Preview */}
          <div className="max-w-4xl mx-auto mt-14">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 shadow-xl shadow-gray-200/50">
              <div className="rounded-xl bg-white border border-gray-100 overflow-hidden">
                {/* Fake browser chrome */}
                <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-300" />
                    <div className="w-3 h-3 rounded-full bg-yellow-300" />
                    <div className="w-3 h-3 rounded-full bg-green-300" />
                  </div>
                  <div className="flex-1 mx-8">
                    <div className="bg-gray-100 rounded-md px-3 py-1 text-xs text-gray-400 text-center max-w-xs mx-auto">
                      kyra.conversionsystem.com/agency
                    </div>
                  </div>
                </div>
                {/* Dashboard mockup */}
                <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-lg font-bold text-gray-900">Dashboard</div>
                      <div className="text-xs text-gray-400">Your Agency · 3 members</div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-medium flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      AI Gateway Online
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    {[
                      { label: 'Total Clients', value: '12', color: 'indigo' },
                      { label: 'Active', value: '10', color: 'green' },
                      { label: 'Messages Today', value: '847', color: 'blue' },
                      { label: 'Avg Response', value: '4.2s', color: 'violet' },
                    ].map((stat) => (
                      <div key={stat.label} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                        <div className="text-[10px] text-gray-400">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: 'Smile Dental', industry: 'Dental', messages: 142, status: 'active' },
                      { name: 'Peak Roofing', industry: 'Home Services', messages: 89, status: 'active' },
                      { name: 'Luxe Realty', industry: 'Real Estate', messages: 203, status: 'active' },
                    ].map((client) => (
                      <div key={client.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                            {client.name[0]}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{client.name}</div>
                            <div className="text-[10px] text-gray-400">{client.industry} · {client.messages} messages</div>
                          </div>
                        </div>
                        <div className="px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-600 text-[10px] font-medium">
                          {client.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── The Problem ───────────────────────────────────────────────── */}
        <section id="problem" className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">
                Your agency has 20 clients.<br />
                How do you give each one an AI employee?
              </h2>
              <div className="text-gray-600 leading-relaxed space-y-4 max-w-2xl mx-auto">
                <p>
                  <strong>Option A:</strong> GHL&apos;s built-in AI. Two intents. Scripted. Can&apos;t browse the web, read a PDF, or follow up on its own. Your clients will ask why it&apos;s dumb.
                </p>
                <p>
                  <strong>Option B:</strong> Host OpenClaw yourself. 20 servers. 20 terminals. 20 configs. 40+ hours/month managing infrastructure instead of selling.
                </p>
                <p>
                  <strong>Option C:</strong> Stammer.ai or a chatbot builder. Looks like AI. Acts like a script. Clients cancel in 2 months.
                </p>
                <p className="text-gray-900 font-semibold text-lg pt-2">
                  Option D: Kyra.
                </p>
                <p>
                  Real OpenClaw. Real autonomous AI. One dashboard. Every client gets their own AI employee that actually works — and you manage it all from one screen.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── The 3 Layers ──────────────────────────────────────────────── */}
        <section id="layers" className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Three layers of value. One platform.
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              More than hosting. More than a dashboard. A complete agency AI business.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <LayerCard
              number="1"
              color="blue"
              icon={<TerminalIcon className="h-6 w-6" />}
              title="Real OpenClaw Hosting"
              subtitle="The Foundation"
              description="Every agency gets a dedicated OpenClaw Gateway — the full terminal, all 51 skills, Chromium browser, persistent memory, multi-model support. Auto-provisioned in 3 minutes."
              tags={['51 skills', 'Chromium browser', 'Persistent memory', 'Any model']}
            />
            <LayerCard
              number="2"
              color="indigo"
              icon={<LayersIcon className="h-6 w-6" />}
              title="Agency Control Layer"
              subtitle="The Moat"
              description="Manage 20 clients' AI employees from one screen instead of 20 separate terminals. Per-client config, conversations inbox, usage tracking, GHL integration, white-label branding."
              tags={['Multi-client dashboard', 'GHL native', 'White-label', 'Per-client analytics']}
            />
            <LayerCard
              number="3"
              color="violet"
              icon={<DollarSignIcon className="h-6 w-6" />}
              title="AI Employee Business"
              subtitle="The Revenue"
              description='Your clients never see a terminal. They just know their "AI receptionist" handles leads 24/7. You set the price, keep the margin.'
              tags={['White-label ready', 'BYOK', 'You set the price', 'Recurring revenue']}
            />
          </div>
        </section>

        {/* ── AI Employee OS ─────────────────────────────────────────────── */}
        <section id="ai-os" className="bg-indigo-50/40 border-y border-indigo-100/50 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                The AI Employee OS
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Everything your agency needs to manage AI employees at scale — not just a chatbot terminal.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <AIOSCard
                emoji="💓"
                title="Always-On Accountability"
                body="Every AI employee checks in hourly. Set a North Star goal and watch your agents work toward it 24/7. Know instantly which clients are active, idle, or need attention."
                color="indigo"
              />
              <AIOSCard
                emoji="💰"
                title="Cost Control at Scale"
                body="Set monthly conversation limits per client, choose fast vs. smart AI models, and get alerts before you overspend. Agencies managing 20+ clients can't afford surprises."
                color="purple"
              />
              <AIOSCard
                emoji="📊"
                title="Prove ROI Every Monday"
                body="Automated weekly reports show conversations handled, active clients, and performance scores — delivered to your inbox. Turn your AI employees into measurable business results."
                color="green"
              />
            </div>
          </div>
        </section>

        {/* ── Named Competitor Comparison ────────────────────────────────── */}
        <section id="compare" className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                How Kyra compares
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                No other platform combines real autonomous AI with agency management.
              </p>
            </div>

            <div className="max-w-4xl mx-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 w-[200px]">Capability</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-400">GHL AI</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-400">Stammer.ai</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-400">xCloud / Hostinger</th>
                    <th className="text-center py-3 px-4 font-semibold text-indigo-600">Kyra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <CompareRow label="Real autonomous AI agent" ghl={false} stammer={false} xcloud="partial" kyra={true} />
                  <CompareRow label="Multi-client management" ghl={false} stammer={true} xcloud={false} kyra={true} />
                  <CompareRow label="Browse the web" ghl={false} stammer={false} xcloud={true} kyra={true} />
                  <CompareRow label="Persistent memory" ghl={false} stammer={false} xcloud={true} kyra={true} />
                  <CompareRow label="51+ skills & tools" ghl={false} stammer={false} xcloud={true} kyra={true} />
                  <CompareRow label="GHL CRM integration" ghl={true} stammer="partial" xcloud={false} kyra={true} />
                  <CompareRow label="White-label branding" ghl={false} stammer={true} xcloud={false} kyra={true} />
                  <CompareRow label="Per-client analytics" ghl="partial" stammer="partial" xcloud={false} kyra={true} />
                  <CompareRow label="Agency billing / markup" ghl={false} stammer={true} xcloud={false} kyra={true} />
                  <CompareRow label="Any AI model (BYOK)" ghl={false} stammer={false} xcloud={true} kyra={true} />
                  <CompareRow label="Conversations inbox" ghl="partial" stammer={false} xcloud={false} kyra={true} />
                  <CompareRow label="Permission controls" ghl={false} stammer={false} xcloud={false} kyra={true} />
                </tbody>
              </table>
            </div>

            <p className="text-center text-gray-400 text-xs mt-6 max-w-xl mx-auto">
              GHL = GoHighLevel Conversation AI ($97/mo). Stammer.ai = white-label chatbot builder ($49/mo). xCloud/Hostinger = raw OpenClaw hosting ($5-24/mo). Kyra = full OpenClaw + agency layer.
            </p>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Set up a client&apos;s AI employee in minutes
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              No servers. No terminal. No DevOps. Just results.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <Step
              number="1"
              title="Add a client"
              description="Name, industry, and what the AI should do. Pick from industry templates or start from scratch."
            />
            <Step
              number="2"
              title="Train the AI"
              description="Upload FAQs, business info, or a website URL. The AI learns their services, pricing, and tone."
            />
            <Step
              number="3"
              title="Connect channels"
              description="GHL for SMS/leads, Telegram, WhatsApp, Discord — one click each. The AI is live on all channels."
            />
            <Step
              number="4"
              title="Monitor & bill"
              description="Watch conversations in real-time. Track usage per client. Bill on your terms."
            />
          </div>
        </section>

        {/* ── What the AI can do ─────────────────────────────────────────── */}
        <section id="features" className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                What your clients&apos; AI employees can actually do
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Powered by OpenClaw — not a chatbot SDK.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
              <Feature
                icon={<MessageSquareIcon className="h-5 w-5" />}
                title="Respond to every lead"
                description="SMS, WhatsApp, Telegram, web chat — thoughtful replies in seconds. No leads left hanging, 24/7."
              />
              <Feature
                icon={<SearchIcon className="h-5 w-5" />}
                title="Research leads & competitors"
                description="Browse the web, check competitor pricing, look up businesses — real research, not canned answers."
              />
              <Feature
                icon={<FileTextIcon className="h-5 w-5" />}
                title="Analyze documents"
                description="Customer sends a PDF? The AI reads it, extracts key info, and responds intelligently."
              />
              <Feature
                icon={<ClockIcon className="h-5 w-5" />}
                title="Schedule & follow up"
                description="Proactively sends follow-ups, reminders, and check-ins. Doesn't wait to be asked."
              />
              <Feature
                icon={<BrainIcon className="h-5 w-5" />}
                title="Remember everything"
                description="Persistent memory across every conversation. Knows who called last week and what they asked about."
              />
              <Feature
                icon={<SmartphoneIcon className="h-5 w-5" />}
                title="GoHighLevel native"
                description="Reads contacts, updates pipelines, books on calendars — all through GHL's own API."
              />
              <Feature
                icon={<GlobeIcon className="h-5 w-5" />}
                title="Browse any website"
                description="Full Chromium browser built in. Fill forms, extract data, take screenshots, automate workflows."
              />
              <Feature
                icon={<ZapIcon className="h-5 w-5" />}
                title="Run automations"
                description="Scheduled tasks, recurring jobs, smart triggers. The AI works while everyone sleeps."
              />
              <Feature
                icon={<MonitorIcon className="h-5 w-5" />}
                title="Full OpenClaw Terminal"
                description="Power users get the complete Gateway Dashboard — chat, sessions, cron, skills, config, logs."
              />
            </div>
          </div>
        </section>

        {/* ── The Agency Math ────────────────────────────────────────────── */}
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                The agency math
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Stop selling chatbots. Start selling AI employees.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-10">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 md:p-8">
                <h3 className="font-semibold text-gray-500 mb-4">Without Kyra</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">✕</span>
                    20 clients = 20 separate OpenClaw instances
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">✕</span>
                    20 terminals to SSH into
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">✕</span>
                    20 configs to maintain manually
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">✕</span>
                    40+ hours/month on ops
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">✕</span>
                    No cross-client visibility
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/30 p-6 md:p-8">
                <h3 className="font-semibold text-indigo-700 mb-4">With Kyra</h3>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                    One dashboard, all clients managed
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                    One conversations inbox, every client
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                    Per-client AI config in clicks
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                    2 hours/month instead of 40
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                    Per-client usage tracking + billing
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 md:p-8 max-w-3xl mx-auto text-center">
              <p className="text-gray-700 mb-2">
                Agencies package AI employees as a <span className="font-bold text-gray-900">recurring service</span> for their clients.
              </p>
              <p className="text-gray-700">
                You control the pricing. You keep the margin. Kyra handles the infrastructure.
              </p>
              <p className="text-2xl font-bold text-indigo-700 mt-4">
                Your service. Your pricing. Your clients.
              </p>
            </div>
          </div>
        </section>

        {/* ── Agency Features Grid ───────────────────────────────────────── */}
        <section className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Built for agencies managing multiple clients
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Everything you need to run an AI employee business.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
              <AgencyCard
                icon={<UsersIcon className="h-5 w-5" />}
                title="Multi-client dashboard"
                description="Add clients, configure their AI, connect GHL, monitor conversations — all from one screen."
              />
              <AgencyCard
                icon={<MessageSquareIcon className="h-5 w-5" />}
                title="Cross-client conversations"
                description="One inbox for every conversation across all clients. Filter, search, monitor quality."
              />
              <AgencyCard
                icon={<SettingsIcon className="h-5 w-5" />}
                title="White-label everything"
                description="Your logo, your colors, your domain. Clients see your brand — never Kyra or OpenClaw."
              />
              <AgencyCard
                icon={<BarChart3Icon className="h-5 w-5" />}
                title="Per-client analytics"
                description="Messages handled, response times, costs per client. Real numbers for accurate billing."
              />
              <AgencyCard
                icon={<SmartphoneIcon className="h-5 w-5" />}
                title="GHL integration"
                description="Leads come in via GHL → routed to the right client's AI → response goes back. Seamless."
              />
              <AgencyCard
                icon={<LockIcon className="h-5 w-5" />}
                title="Permission controls"
                description="Choose what each client's AI can access. Web search? Yes. Send emails? Not yet. You decide."
              />
            </div>
          </div>
        </section>

        {/* ── Data Privacy ───────────────────────────────────────────────── */}
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Your clients&apos; data stays yours
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Every agency gets a completely isolated AI instance. No shared data. No shared sessions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            <Feature
              icon={<LockIcon className="h-5 w-5" />}
              title="Isolated per agency"
              description="Each agency gets their own OpenClaw instance on dedicated infrastructure. Nothing shared."
            />
            <Feature
              icon={<EyeIcon className="h-5 w-5" />}
              title="Agency-controlled"
              description="You decide what each AI can access. Granular permissions, full audit trail."
            />
            <Feature
              icon={<ShieldCheckIcon className="h-5 w-5" />}
              title="BYOK — your keys, your costs"
              description="Use your own AI provider accounts. Full transparency, no markups on API usage."
            />
          </div>
        </section>

        {/* ── 21 Industries ─────────────────────────────────────────────── */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                21 ready-to-deploy AI employee templates
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Pick an industry, configure the personality, connect the channel. Your client&apos;s AI employee is live in minutes.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto mb-10">
              {[
                { label: '🌿 Cannabis & Dispensary', hot: true, href: '/cannabis' },
                { label: '⚖️ Legal / Law Firm', hot: false },
                { label: '🏠 Real Estate', hot: false },
                { label: '🚗 Automotive', hot: false },
                { label: '🦷 Dental & Medical', hot: false },
                { label: '💊 Medical Aesthetics', hot: false },
                { label: '💪 Fitness & Wellness', hot: false },
                { label: '🍽️ Restaurant & Food', hot: false },
                { label: '🏨 Hotel & Hospitality', hot: false },
                { label: '🔧 Home Services', hot: false },
                { label: '📦 Retail & E-commerce', hot: false },
                { label: '🧘 Spa & Beauty', hot: false },
                { label: '📋 Insurance', hot: false },
                { label: '🏦 Mortgage & Lending', hot: false },
                { label: '🎉 Events & Venues', hot: false },
                { label: '🏋️ Chiropractic & PT', hot: false },
                { label: '🎓 Education', hot: false },
                { label: '📊 Sales & Consulting', hot: false },
                { label: '🔍 Market Intelligence', hot: false },
                { label: '📰 Media & Content', hot: false },
                { label: '🤖 General Purpose', hot: false },
              ].map((item) => {
                const cls = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                  item.hot
                    ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                    : 'bg-gray-50 border-gray-200 text-gray-600'
                }`;
                const inner = (
                  <>
                    {item.label}
                    {item.hot && <span className="text-[10px] font-bold bg-green-500 text-white rounded-full px-1.5">PROVEN</span>}
                  </>
                );
                return (item as any).href
                  ? <Link key={item.label} href={(item as any).href} className={cls}>{inner}</Link>
                  : <span key={item.label} className={cls}>{inner}</span>;
              })}
            </div>
            <div className="text-center">
              <Link
                href="/signup/agency"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition text-white font-semibold text-sm"
              >
                Deploy your first AI employee free
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Cannabis Proof ─────────────────────────────────────────────── */}
        <section className="bg-green-950 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-800 text-green-200 text-xs font-semibold uppercase tracking-wider mb-4">
                  🌿 Proven in Cannabis
                </span>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                  $29M+ generated for cannabis clients
                </h2>
                <p className="text-green-200 max-w-xl mx-auto">
                  Cannabis dispensaries face unique challenges: compliance, education, and high-volume inquiries. Our AI handles it all.
                </p>
                <div className="mt-4">
                  <Link href="/cannabis" className="inline-flex items-center gap-1.5 text-green-300 hover:text-green-100 text-sm font-semibold transition">
                    See the full cannabis AI →
                  </Link>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-5">
                {[
                  { stat: '$29M+', label: 'Revenue generated', sub: 'Across cannabis clients' },
                  { stat: '70%', label: 'Fewer phone calls', sub: 'Customers self-serve via AI' },
                  { stat: '<60s', label: 'AI response time', sub: 'SMS, Telegram, web chat' },
                ].map((item) => (
                  <div key={item.stat} className="rounded-xl bg-green-900/50 border border-green-800 p-6 text-center">
                    <p className="text-4xl font-black text-green-300 mb-1">{item.stat}</p>
                    <p className="text-white font-semibold">{item.label}</p>
                    <p className="text-green-400 text-sm mt-1">{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Beta CTA ───────────────────────────────────────────────────── */}
        <section className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold uppercase tracking-wider">
                    Beta
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Free during beta. Bring your own keys.
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Full platform access while we&apos;re in beta. Connect your own API keys — Anthropic, OpenAI, Google, or OpenRouter.
                  You control costs directly.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
                <div className="p-5 rounded-xl border border-gray-200 bg-white text-center">
                  <div className="text-3xl mb-3">🧠</div>
                  <h3 className="font-semibold mb-1 text-gray-900">Any Model</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Claude, GPT-4, Gemini, Llama — pick the model that fits your use case and budget.
                  </p>
                </div>
                <div className="p-5 rounded-xl border border-gray-200 bg-white text-center">
                  <div className="text-3xl mb-3">🔑</div>
                  <h3 className="font-semibold mb-1 text-gray-900">Your API Keys</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Connect your own provider accounts. No middlemen. You see exactly what you spend.
                  </p>
                </div>
                <div className="p-5 rounded-xl border border-gray-200 bg-white text-center">
                  <div className="text-3xl mb-3">⚡</div>
                  <h3 className="font-semibold mb-1 text-gray-900">3-Minute Setup</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Sign up, your AI gateway auto-provisions. Add a client and connect GHL in minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ──────────────────────────────────────────────────── */}
        <section className="bg-gray-900 py-20 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                Stop selling chatbots.
                <br />
                Start selling AI employees.
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto text-lg">
                Real OpenClaw. Agency-grade management. The category that doesn&apos;t exist yet — until now.
              </p>
              <Link
                href="/signup/agency"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition font-semibold text-lg text-white"
              >
                Join the Beta — It&apos;s Free
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
              <p className="text-sm text-gray-500 mt-4">
                Free during beta · Bring your own API keys · No credit card required
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 md:py-12 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">K</span>
              </div>
              <span className="font-semibold text-sm">Kyra</span>
              <span className="text-gray-400 text-sm ml-1">by Conversion System</span>
            </div>
            <p className="text-sm text-gray-400">
              © 2026 Conversion System. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="https://openclaw.ai" className="hover:text-gray-700 transition" target="_blank">OpenClaw</Link>
              <Link href="/privacy" className="hover:text-gray-700 transition">Privacy</Link>
              <Link href="/terms" className="hover:text-gray-700 transition">Terms</Link>
              <Link href="mailto:support@conversionsystem.com" className="hover:text-gray-700 transition">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Components ────────────────────────────────────────────────────────────────

function CompareRow({ label, ghl, stammer, xcloud, kyra }: {
  label: string;
  ghl: boolean | 'partial';
  stammer: boolean | 'partial';
  xcloud: boolean | 'partial';
  kyra: boolean | 'partial';
}) {
  const renderCell = (value: boolean | 'partial', highlight?: boolean) => {
    if (value === true) return (
      <td className={`text-center py-2.5 px-4 ${highlight ? 'bg-indigo-50/50' : ''}`}>
        <CheckIcon className={`h-4 w-4 mx-auto ${highlight ? 'text-indigo-600' : 'text-green-500'}`} />
      </td>
    );
    if (value === 'partial') return (
      <td className={`text-center py-2.5 px-4 ${highlight ? 'bg-indigo-50/50' : ''}`}>
        <span className="text-yellow-500 text-xs font-medium">Partial</span>
      </td>
    );
    return (
      <td className={`text-center py-2.5 px-4 ${highlight ? 'bg-indigo-50/50' : ''}`}>
        <XIcon className="h-4 w-4 mx-auto text-gray-300" />
      </td>
    );
  };

  return (
    <tr className="border-b border-gray-50">
      <td className="py-2.5 px-4 text-gray-700">{label}</td>
      {renderCell(ghl)}
      {renderCell(stammer)}
      {renderCell(xcloud)}
      {renderCell(kyra, true)}
    </tr>
  );
}

function LayerCard({ number, color, icon, title, subtitle, description, tags }: {
  number: string;
  color: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
}) {
  const colorMap: Record<string, { bg: string; border: string; text: string; tag: string }> = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', tag: 'bg-blue-100 text-blue-700' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', tag: 'bg-indigo-100 text-indigo-700' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600', tag: 'bg-violet-100 text-violet-700' },
  };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-6 md:p-8`}>
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${c.bg} ${c.text} mb-4`}>
        {icon}
      </div>
      <div className={`text-xs font-semibold uppercase tracking-wider ${c.text} mb-1`}>
        Layer {number} — {subtitle}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed mb-4">{description}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.tag}`}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function Step({ number, title, description }: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 font-semibold text-sm mb-3">
        {number}
      </div>
      <h3 className="font-semibold mb-1.5 text-gray-900">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function AgencyCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 p-5 rounded-xl border border-gray-200 bg-white">
      <div className="text-indigo-600 shrink-0 mt-0.5">{icon}</div>
      <div>
        <h3 className="font-semibold mb-1 text-gray-900">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function Feature({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 rounded-xl border border-gray-200 bg-white">
      <div className="text-indigo-600 mb-3">{icon}</div>
      <h3 className="font-semibold mb-1 text-gray-900">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function AIOSCard({ emoji, title, body, color }: {
  emoji: string;
  title: string;
  body: string;
  color: 'indigo' | 'purple' | 'green';
}) {
  const colorMap = {
    indigo: { icon: 'bg-indigo-100 text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
    purple: { icon: 'bg-purple-100 text-purple-600', badge: 'bg-purple-100 text-purple-700' },
    green: { icon: 'bg-green-100 text-green-600', badge: 'bg-green-100 text-green-700' },
  };
  const c = colorMap[color];

  return (
    <div className="relative p-6 rounded-xl border border-gray-200 bg-white shadow-sm">
      <span className={`absolute top-4 right-4 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${c.badge}`}>
        New
      </span>
      <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${c.icon} text-xl mb-4`}>
        {emoji}
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{body}</p>
    </div>
  );
}
