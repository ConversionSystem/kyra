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
          <Link href="#why-kyra" className="text-gray-600 hover:text-gray-700 transition text-sm">
            Why Kyra
          </Link>
          <Link href="#how-it-works" className="text-gray-600 hover:text-gray-700 transition text-sm">
            How It Works
          </Link>
          <Link href="#features" className="text-gray-600 hover:text-gray-700 transition text-sm">
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
        {/* Hero */}
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
              {' '}platform for agencies. Your clients get AI employees that browse the web, research leads, schedule follow-ups, analyze documents, and work 24/7 — managed from one dashboard.
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
                href="#why-kyra"
                className="flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-300 hover:border-gray-400 transition font-medium text-sm text-gray-700"
              >
                See Why Agencies Switch
              </Link>
            </div>

            <p className="text-sm text-gray-400 mt-4">
              Free during beta · Bring your own API keys · No credit card required
            </p>
          </div>
        </section>

        {/* The Problem */}
        <section id="why-kyra" className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
                Every &ldquo;AI agent&rdquo; your agency can buy today is just a chatbot.
              </h2>
              <div className="text-gray-600 leading-relaxed space-y-4 text-center max-w-2xl mx-auto">
                <p>
                  GHL&apos;s Conversation AI has 2 intents. Stammer.ai builds chat widgets.
                  They respond to messages — that&apos;s it. They can&apos;t research a lead, browse a website,
                  analyze a PDF, or proactively follow up on their own.
                </p>
                <p className="text-gray-900 font-medium text-lg">
                  Your clients don&apos;t need another chatbot.
                  They need an AI employee that actually works.
                </p>
                <p>
                  <Link href="https://openclaw.ai" className="text-indigo-600 hover:underline" target="_blank">OpenClaw</Link>
                  {' '}is the most powerful autonomous AI agent platform — 51 skills, 24 tools,
                  browser control, persistent memory, multi-model support. But it needs a server, a terminal, and technical expertise.
                </p>
                <p className="text-gray-900 font-medium">
                  Kyra hosts real OpenClaw for every client. Agencies manage everything from one dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Chatbot vs AI Employee comparison */}
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Chatbot vs. AI Employee
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                The gap between what agencies sell today and what Kyra delivers.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Chatbot column */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 md:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <MessageSquareIcon className="h-5 w-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-500">Typical &ldquo;AI Agent&rdquo;</h3>
                </div>
                <ul className="space-y-3">
                  <CompareItem text="Answers FAQs from a script" negative />
                  <CompareItem text="2 intents: Q&A + booking" negative />
                  <CompareItem text="OpenAI only" negative />
                  <CompareItem text="Can't browse the web" negative />
                  <CompareItem text="Can't read documents" negative />
                  <CompareItem text="Can't take proactive action" negative />
                  <CompareItem text="Forgets everything between sessions" negative />
                  <CompareItem text="One trick: respond to messages" negative />
                </ul>
              </div>

              {/* AI Employee column */}
              <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/30 p-6 md:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <BrainIcon className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-indigo-700">Kyra AI Employee</h3>
                </div>
                <ul className="space-y-3">
                  <CompareItem text="Understands context and nuance" />
                  <CompareItem text="Unlimited capabilities via 51 skills" />
                  <CompareItem text="Claude, GPT, Gemini — any model" />
                  <CompareItem text="Browses the web and researches leads" />
                  <CompareItem text="Reads PDFs, analyzes documents" />
                  <CompareItem text="Schedules follow-ups autonomously" />
                  <CompareItem text="Persistent memory across all conversations" />
                  <CompareItem text="Full OpenClaw: browser, email, files, cron" />
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* The 3 Layers of Value */}
        <section className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
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
                description="Every user gets a real OpenClaw Gateway with the full terminal UI, all 51 skills, 24 tools, Chromium browser, and multi-model support. Not a dumbed-down version — the real thing."
                tags={['51 skills', '24 tools', 'Browser control', 'Persistent memory']}
              />
              <LayerCard
                number="2"
                color="indigo"
                icon={<LayersIcon className="h-6 w-6" />}
                title="Agency Control Layer"
                subtitle="The Differentiator"
                description="Manage 20 clients' AI employees from one screen instead of 20 separate terminals. Per-client config, conversations inbox, usage tracking, GHL integration, white-label branding."
                tags={['Multi-client dashboard', 'GHL integration', 'White-label', 'Per-client analytics']}
              />
              <LayerCard
                number="3"
                color="violet"
                icon={<DollarSignIcon className="h-6 w-6" />}
                title="AI Employee Business"
                subtitle="The Revenue"
                description='Sell AI employees to clients at $500–5,000/month. Your cost: platform + API keys. Clients never see a terminal — they just know their "AI receptionist" works 24/7.'
                tags={['70-90% margins', '$500-5K/client/mo', 'White-label ready', 'BYOK']}
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="container mx-auto px-4 md:px-6 py-16 md:py-20">
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
              title="Monitor & scale"
              description="Watch conversations in real-time. Track usage per client. Add more clients as you grow."
            />
          </div>
        </section>

        {/* What the AI can actually do */}
        <section id="features" className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                What your clients&apos; AI employees can actually do
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Powered by OpenClaw&apos;s full autonomous agent platform — not a chatbot SDK.
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
                description="Power users get the complete OpenClaw Gateway Dashboard — chat, sessions, cron, skills, config, logs."
              />
            </div>
          </div>
        </section>

        {/* For Agencies — the business case */}
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                The agency math
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Stop selling chatbots for $300/month. Sell AI employees for $2,000/month.
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
                    20 dashboards to monitor
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
                    One platform, all clients managed
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                    One conversations inbox across all clients
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                    Per-client AI config from one dashboard
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                    5 hours/month instead of 40
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                    Usage tracking + billing per client
                  </li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 md:p-8 max-w-3xl mx-auto text-center">
              <p className="text-gray-700 mb-2">
                Agencies charge clients <span className="font-bold text-gray-900">$500–$5,000/month</span> for AI employee services.
              </p>
              <p className="text-gray-700">
                Their cost with Kyra: platform fee + API keys (~$50–100/client).
              </p>
              <p className="text-2xl font-bold text-indigo-700 mt-4">
                70–90% gross margins.
              </p>
            </div>
          </div>
        </section>

        {/* Agency features grid */}
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
                description="Add clients, set up their AI, connect GHL, monitor conversations — all from one screen."
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

        {/* OpenClaw section */}
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl border border-gray-200 p-8 md:p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center">
                  <TerminalIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="font-semibold text-gray-900 block">Powered by OpenClaw</span>
                  <span className="text-xs text-gray-500">The autonomous AI agent platform</span>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                OpenClaw is an open-source framework used by thousands of developers to build autonomous agents.
                Every Kyra user gets the <strong>real thing</strong> — not a simplified version, not an API wrapper.
                The full OpenClaw Gateway with terminal UI, all skills, all tools.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                Kyra&apos;s value is what we build <em>around</em> OpenClaw: multi-client management, GHL integration,
                conversation monitoring, per-client analytics, white-label branding. The agency control layer
                that makes OpenClaw usable for managing 10, 50, or 100 clients.
              </p>
              <div className="flex flex-wrap gap-2">
                <Tag text="51 skills" />
                <Tag text="24 built-in tools" />
                <Tag text="Claude, GPT, Gemini" />
                <Tag text="Persistent memory" />
                <Tag text="Browser automation" />
                <Tag text="Sub-agents" />
                <Tag text="Scheduling & cron" />
                <Tag text="Web search" />
                <Tag text="File management" />
                <Tag text="Full terminal UI" />
              </div>
            </div>
          </div>
        </section>

        {/* Data Privacy */}
        <section className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Your clients&apos; data stays yours
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                No training on conversations. No sharing. Full control.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
              <Feature
                icon={<LockIcon className="h-5 w-5" />}
                title="No training on your data"
                description="Conversations are never used to train AI models. Not ours, not anyone else's."
              />
              <Feature
                icon={<EyeIcon className="h-5 w-5" />}
                title="Agency-controlled"
                description="You decide what each AI can access. Granular permissions, full audit trail."
              />
              <Feature
                icon={<ShieldCheckIcon className="h-5 w-5" />}
                title="BYOK — your keys, your costs"
                description="Use your own AI provider accounts. Full transparency, no markups."
              />
            </div>
          </div>
        </section>

        {/* BYOK + Beta CTA */}
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
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
                You control costs directly. No surprise bills.
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
                <div className="text-3xl mb-3">🆓</div>
                <h3 className="font-semibold mb-1 text-gray-900">Free During Beta</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Full access. Help us shape the product and get early-adopter perks at launch.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gray-900 py-20 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                Stop selling chatbots.
                <br />
                Start selling AI employees.
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto text-lg">
                Real OpenClaw power. Agency-grade management. The category that doesn&apos;t exist yet — until now.
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

// ── Components ────────────────────────────────────────────────────────────

function CompareItem({ text, negative }: { text: string; negative?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-sm">
      {negative ? (
        <span className="text-gray-400 mt-0.5 shrink-0">✕</span>
      ) : (
        <CheckCircleIcon className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
      )}
      <span className={negative ? 'text-gray-500' : 'text-gray-700'}>{text}</span>
    </li>
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

function Tag({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
      {text}
    </span>
  );
}
