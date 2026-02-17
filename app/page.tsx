import Link from 'next/link';
import { 
  ArrowRightIcon, 
  MessageSquareIcon, 
  ShieldCheckIcon,
  UsersIcon,
  BarChart3Icon,
  BrainIcon,
  SettingsIcon,
  CreditCardIcon,
  CalendarIcon,
  HeadphonesIcon,
  GlobeIcon,
  SmartphoneIcon,
  MailIcon,
  WrenchIcon,
  Trash2Icon,
  EyeIcon,
  LockIcon,
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
          <Link href="#how-it-works" className="text-gray-600 hover:text-gray-700 transition text-sm">
            How It Works
          </Link>
          <Link href="#features" className="text-gray-600 hover:text-gray-700 transition text-sm">
            Features
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-gray-600 hover:text-gray-700 transition text-sm font-medium">
            Sign In
          </Link>
          <Link 
            href="/signup/agency" 
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition font-medium text-sm text-white"
          >
            Join the Beta
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
              Your clients deserve a dedicated assistant. Now they can have one.
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-8">
              Kyra brings the power of{' '}
              <Link href="https://openclaw.ai" className="text-indigo-600 hover:underline" target="_blank">
                OpenClaw
              </Link>
              {' '}to people who&apos;ll never run a terminal. Sign up, connect GoHighLevel, pick a persona — your client has a personal assistant that handles leads, books appointments, and never clocks out.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup/agency"
                className="flex items-center gap-2 px-7 py-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition font-semibold text-base text-white"
              >
                Join the Beta — It&apos;s Free
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-300 hover:border-gray-400 transition font-medium text-sm text-gray-700"
              >
                See How It Works
              </Link>
            </div>

            <p className="text-sm text-gray-400 mt-4">
              Free during beta · Bring your own API keys · No credit card required
            </p>
            <p className="text-xs text-gray-400 mt-2 flex items-center justify-center gap-1.5">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-indigo-400" />
              Your data never trains AI models
            </p>
          </div>
        </section>

        {/* What is Kyra */}
        <section className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">
                OpenClaw is incredible. But 99% of people will never set it up.
              </h2>
              <div className="text-gray-600 leading-relaxed space-y-4 text-center max-w-2xl mx-auto">
                <p>
                  <Link href="https://openclaw.ai" className="text-indigo-600 hover:underline" target="_blank">OpenClaw</Link> is one of the most powerful personal assistant frameworks out there — tools, memory, scheduling, multi-channel messaging, sub-agents, browser control. It can genuinely run parts of a business.
                </p>
                <p>
                  But it needs API keys, a server, CLI comfort, and time to configure. That&apos;s fine for developers. It&apos;s a dealbreaker for everyone else.
                </p>
                <p className="text-gray-900 font-medium">
                  Kyra is the bridge. We host OpenClaw so your clients don&apos;t have to. They get a dedicated assistant — you get a new service to sell.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What it actually does */}
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                What your clients actually get
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Not a chatbot. A persistent assistant that knows their business, their contacts, and their calendar.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Outcome 
                icon={<MessageSquareIcon className="h-6 w-6" />}
                title="Responds to every lead"
                description="SMS, email, or chat — every inbound message gets a thoughtful, personalized reply within 60 seconds. No leads left hanging."
              />
              <Outcome 
                icon={<CalendarIcon className="h-6 w-6" />}
                title="Books appointments"
                description="Qualifies prospects through natural conversation and puts them on the calendar. Your client's team shows up to close, not chase."
              />
              <Outcome 
                icon={<BrainIcon className="h-6 w-6" />}
                title="Remembers everything"
                description="Every interaction builds context. The assistant knows who called last week, what they asked about, and where they are in the pipeline."
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Set up a client in 5 minutes
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                No code, no servers. Connect your API keys, pick a persona, and go.
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              <Step
                number="1"
                title="Connect their GHL account"
                description="One-click OAuth. Kyra syncs their contacts, conversations, and pipeline."
              />
              <Step
                number="2"
                title="Pick a persona"
                description="Dental receptionist, real estate assistant, home services coordinator — or build your own."
              />
              <Step
                number="3"
                title="Set the boundaries"
                description="Choose what the assistant can do. Start with just reading, then unlock messaging, booking, and more."
              />
              <Step
                number="4"
                title="Turn it on"
                description="The assistant starts working. You monitor everything from your dashboard."
              />
            </div>
          </div>
        </section>

        {/* For Agencies */}
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Built for agencies managing multiple clients
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                One dashboard. Every client. Full control.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
              <AgencyCard
                icon={<UsersIcon className="h-5 w-5" />}
                title="Multi-client dashboard"
                description="Add clients, connect their GHL accounts, customize each assistant's personality — all from one place."
              />
              <AgencyCard
                icon={<CreditCardIcon className="h-5 w-5" />}
                title="Bill your clients directly"
                description="Set your own pricing with Stripe Connect. They pay you, we take a small platform fee. The margin is yours."
              />
              <AgencyCard
                icon={<BarChart3Icon className="h-5 w-5" />}
                title="See what's working"
                description="Conversations, response times, appointments booked, costs per client — real numbers, not vanity metrics."
              />
              <AgencyCard
                icon={<SettingsIcon className="h-5 w-5" />}
                title="Your brand, not ours"
                description="White-label the whole thing. Your logo, your colors, your domain. Clients never see Kyra's name."
              />
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section id="features" className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Under the hood
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Kyra runs on OpenClaw&apos;s engine — the same technology that powers autonomous agents for developers worldwide.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
              <Feature
                icon={<GlobeIcon className="h-5 w-5" />}
                title="Multi-channel"
                description="SMS, email, web chat, WhatsApp, Telegram — one assistant, consistent everywhere."
              />
              <Feature
                icon={<SmartphoneIcon className="h-5 w-5" />}
                title="GoHighLevel native"
                description="Reads contacts, updates pipelines, books on calendars — all through GHL's own APIs."
              />
              <Feature
                icon={<HeadphonesIcon className="h-5 w-5" />}
                title="Knows when to hand off"
                description="Complex situations get flagged for a human. The assistant steps back gracefully."
              />
              <Feature
                icon={<WrenchIcon className="h-5 w-5" />}
                title="Gradual rollout"
                description="Start in monitor-only mode. Enable responses when ready. Expand capabilities at your pace."
              />
              <Feature
                icon={<MailIcon className="h-5 w-5" />}
                title="Conversation memory"
                description="Every interaction builds a richer picture. Follow-ups feel natural, not robotic."
              />
              <Feature
                icon={<ShieldCheckIcon className="h-5 w-5" />}
                title="Your data stays yours"
                description="No training on conversations. No sharing with third parties. Client data lives in GHL and your Stripe."
              />
            </div>
          </div>
        </section>

        {/* Data Privacy & Independence */}
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Your clients&apos; data stays yours. Period.
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
                We get it — you need to know that your client conversations aren&apos;t training someone else&apos;s AI, 
                that billing data isn&apos;t being shared with OpenAI, Anthropic, or Google, and that you&apos;re always in control. 
                Here&apos;s the short version: your data is yours. Full stop.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
              <AgencyCard
                icon={<LockIcon className="h-5 w-5" />}
                title="No training on your data"
                description="Conversations are never used to train AI models. Not ours, not anyone else's. Your client interactions stay private."
              />
              <AgencyCard
                icon={<CreditCardIcon className="h-5 w-5" />}
                title="Your Stripe, your revenue"
                description="Client payments go to YOUR Stripe account. We never touch client billing data — we only take a small platform fee."
              />
              <AgencyCard
                icon={<Trash2Icon className="h-5 w-5" />}
                title="Delete anytime"
                description="Remove a client and their data is gone. No retention, no dark patterns, no 'we keep it for 90 days' fine print."
              />
              <AgencyCard
                icon={<EyeIcon className="h-5 w-5" />}
                title="Agency-controlled"
                description="You decide what the AI can access. Read-only mode, granular permissions, full audit trail. Nothing happens without your say-so."
              />
            </div>
          </div>
        </section>

        {/* OpenClaw section */}
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-20">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl border border-gray-200 p-8 md:p-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                  <span className="text-gray-900 text-xs font-bold">OC</span>
                </div>
                <span className="font-semibold text-gray-900">Powered by OpenClaw</span>
              </div>
              <p className="text-gray-600 leading-relaxed mb-4">
                OpenClaw is an open-source framework used by thousands of developers to build autonomous agents. It comes with 60+ skills, multi-model support, persistent memory, browser control, scheduling, and a growing ecosystem on{' '}
                <Link href="https://clawhub.com" className="text-indigo-600 hover:underline" target="_blank">ClawHub</Link>.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                Kyra packages all of that into a hosted platform that anyone can use — no terminal, no API keys, no DevOps. Agencies deploy it for clients. Businesses use it directly. The technology is the same; the experience is completely different.
              </p>
              <div className="flex flex-wrap gap-3">
                <Tag text="60+ skills" />
                <Tag text="Multi-model (Claude, GPT, Gemini)" />
                <Tag text="Persistent memory" />
                <Tag text="Sub-agents" />
                <Tag text="Browser control" />
                <Tag text="Scheduling & cron" />
                <Tag text="File management" />
                <Tag text="Voice" />
              </div>
            </div>
          </div>
        </section>

        {/* BYOK + Beta */}
        <section id="byok" className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold uppercase tracking-wider">
                  Beta
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Bring Your Own Keys. Use Any Model.
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Kyra is free during the beta. Connect your own API keys — just like OpenClaw — and use the AI models you already trust. No vendor lock-in, no surprise bills from us.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
              <div className="p-5 rounded-xl border border-gray-200 bg-white text-center">
                <div className="text-3xl mb-3">🧠</div>
                <h3 className="font-semibold mb-1 text-gray-900">Any LLM</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Claude, GPT-4, Gemini, Llama, Mistral — plug in the model that fits your use case and budget.
                </p>
              </div>
              <div className="p-5 rounded-xl border border-gray-200 bg-white text-center">
                <div className="text-3xl mb-3">🔑</div>
                <h3 className="font-semibold mb-1 text-gray-900">Your API Keys</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  You control costs directly with your own provider accounts. No markups, no middlemen.
                </p>
              </div>
              <div className="p-5 rounded-xl border border-gray-200 bg-white text-center">
                <div className="text-3xl mb-3">🆓</div>
                <h3 className="font-semibold mb-1 text-gray-900">Free During Beta</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Full platform access while we&apos;re in beta. Help us shape the product, and you&apos;ll get early-adopter perks when we launch.
                </p>
              </div>
            </div>

            <div className="text-center mt-10">
              <Link
                href="/signup/agency"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition font-semibold text-base text-white"
              >
                Join the Beta
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <p className="text-sm text-gray-400 mt-3">
                No credit card required · You only pay your AI provider directly
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 md:px-6 py-20 md:py-24">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Give your clients an assistant they&apos;ll actually rely on
            </h2>
            <p className="text-gray-600 mb-8 max-w-xl mx-auto text-lg">
              Not another chatbot. A real assistant — powered by OpenClaw, managed by you, working for them around the clock.
            </p>
            <Link
              href="/signup/agency"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition font-semibold text-lg text-white"
            >
              Join the Beta
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <p className="text-sm text-gray-400 mt-4">
              Free during beta · Bring your own API keys · No credit card required
            </p>
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

function Outcome({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="text-indigo-600 mb-3">{icon}</div>
      <h3 className="text-lg font-semibold mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
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

// PricingCard removed — pricing hidden during beta
