import Link from 'next/link';
import { 
  ArrowRightIcon, 
  SparklesIcon, 
  SmartphoneIcon, 
  ZapIcon, 
  MessageSquareIcon, 
  ShieldCheckIcon,
  LockIcon,
  ClockIcon,
  UsersIcon,
  BarChart3Icon,
  BrainIcon,
  SettingsIcon,
  LayersIcon,
  CheckCircle2Icon,
  BuildingIcon,
  CreditCardIcon,
  GaugeIcon,
  EyeIcon,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white">
      {/* Header */}
      <header className="container mx-auto px-4 md:px-6 py-4 md:py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-7 w-7 md:h-8 md:w-8 text-purple-400" />
          <span className="text-xl md:text-2xl font-bold">Kyra</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#how-it-works" className="text-gray-300 hover:text-white transition text-sm">
            How It Works
          </Link>
          <Link href="#features" className="text-gray-300 hover:text-white transition text-sm">
            Features
          </Link>
          <Link href="#pricing" className="text-gray-300 hover:text-white transition text-sm">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-gray-300 hover:text-white transition text-sm font-medium">
            Sign In
          </Link>
          <Link 
            href="/signup/agency" 
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition font-medium text-sm"
          >
            Start Free Trial
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-4 md:px-6 pt-12 md:pt-20 pb-16 md:pb-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
              </span>
              SMS AI Loop — Live & Responding
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 tracking-tight">
              Deploy{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
                AI employees
              </span>
              {' '}for your clients in 5 minutes
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-4">
              Kyra connects to your clients&apos; GoHighLevel CRM. The AI reads contacts, replies to SMS, books appointments, and moves deals — while you bill for it.
            </p>

            <p className="text-sm text-gray-500 max-w-xl mx-auto mb-8">
              Built for GHL agencies. White-label ready. Independent — your data stays with your agency, not Big Tech.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup/agency"
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition font-semibold text-base shadow-lg shadow-purple-900/30"
              >
                Start Free — 5 Clients Included
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-700 hover:border-gray-600 transition font-medium text-sm text-gray-300"
              >
                See How It Works
              </Link>
            </div>

            <p className="text-xs text-gray-600 mt-4">
              14-day free trial · No credit card required · Cancel anytime
            </p>
          </div>
        </section>

        {/* Social Proof / Live Stats */}
        <section className="border-y border-gray-800/50 py-8">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
              <Stat value="< 60s" label="AI Response Time" />
              <Stat value="5 min" label="Setup to Live" />
              <Stat value="10%" label="Platform Fee" />
              <Stat value="100%" label="White-Label" />
            </div>
          </div>
        </section>

        {/* The Problem */}
        <section className="container mx-auto px-4 md:px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Your clients want AI. GHL&apos;s built-in isn&apos;t enough.
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                GHL&apos;s Conversation AI is rule-based — it only does what you hardcode into workflows. Your clients need an AI that actually thinks.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              <CompareItem 
                before="Rule-based chatbots that break" 
                after="AI that reasons, adapts, and learns" 
              />
              <CompareItem 
                before="No memory between conversations" 
                after="Remembers every customer interaction" 
              />
              <CompareItem 
                before="Per-usage billing confusion" 
                after="Predictable per-client pricing you control" 
              />
              <CompareItem 
                before="Hire developers to build custom AI" 
                after="Pick a template, connect GHL, go live" 
              />
              <CompareItem 
                before="Same generic chatbot for everyone" 
                after="Industry-specific AI personalities" 
              />
              <CompareItem 
                before="No way to bill clients for AI" 
                after="Stripe Connect — set your price, keep the margin" 
              />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="container mx-auto px-4 md:px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Live in 5 minutes. No code.
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              From signup to your client&apos;s first AI-powered SMS reply.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <StepCard
              number="1"
              title="Pick a Template"
              description="Choose from dental, real estate, home services, retail, or lead gen. Each comes with industry-specific AI behavior."
            />
            <StepCard
              number="2"
              title="Connect GHL"
              description="One-click OAuth. Kyra connects to your client's sub-account and starts reading contacts, conversations, and pipeline."
            />
            <StepCard
              number="3"
              title="Set Permissions"
              description="Start in read-only mode. When you're confident, unlock SMS replies, appointment booking, and pipeline updates."
            />
            <StepCard
              number="4"
              title="Bill Your Client"
              description="Set your price through Stripe Connect. Your client pays you directly. Kyra takes a 10% platform fee."
            />
          </div>

          {/* Architecture Diagram */}
          <div className="max-w-3xl mx-auto mt-16 p-6 md:p-8 rounded-2xl bg-gray-900/50 border border-gray-800">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">How the SMS AI Loop Works</p>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center">
              <FlowStep emoji="📱" label="Customer texts" sublabel="your GHL number" />
              <FlowArrow />
              <FlowStep emoji="🔍" label="Kyra reads" sublabel="CRM + history" />
              <FlowArrow />
              <FlowStep emoji="🧠" label="AI generates" sublabel="personalized reply" />
              <FlowArrow />
              <FlowStep emoji="💬" label="Customer gets" sublabel="SMS in < 60s" />
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section id="features" className="border-y border-gray-800/50 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything your agency needs
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                Manage dozens of client AIs from one dashboard. Every feature built for scale.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <FeatureCard
                icon={<MessageSquareIcon className="h-6 w-6" />}
                title="SMS AI Loop"
                description="Customer texts → AI reads CRM → personalized reply in under 60 seconds. Live today, not a demo."
              />
              <FeatureCard
                icon={<UsersIcon className="h-6 w-6" />}
                title="Multi-Client Dashboard"
                description="Add clients, connect GHL sub-accounts, customize AI personalities, monitor conversations — all from one screen."
              />
              <FeatureCard
                icon={<LayersIcon className="h-6 w-6" />}
                title="Industry Templates"
                description="Dental, real estate, home services, retail, lead gen. Pre-built AI behavior for each vertical. Deploy in minutes."
              />
              <FeatureCard
                icon={<CreditCardIcon className="h-6 w-6" />}
                title="Stripe Connect Billing"
                description="Set your own prices. Bill clients directly through your Stripe account. Keep the margin, we take 10%."
              />
              <FeatureCard
                icon={<GaugeIcon className="h-6 w-6" />}
                title="Smart Model Routing"
                description="Simple messages use cheap AI. Complex sales conversations use premium AI. Automatic cost optimization per client."
              />
              <FeatureCard
                icon={<EyeIcon className="h-6 w-6" />}
                title="Read-Only → Autonomous"
                description="Deploy in read-only mode first. Unlock SMS replies, then appointments, then pipeline. You control the pace."
              />
              <FeatureCard
                icon={<BarChart3Icon className="h-6 w-6" />}
                title="Usage & Cost Dashboard"
                description="See exactly what each client costs in AI tokens. Per-client, per-day, per-channel breakdowns. Price your services with confidence."
              />
              <FeatureCard
                icon={<SettingsIcon className="h-6 w-6" />}
                title="Granular Permissions"
                description="9 GHL capability toggles. Control exactly what each AI can do: read contacts ✓, book appointments ✗, move deals ✗."
              />
              <FeatureCard
                icon={<BuildingIcon className="h-6 w-6" />}
                title="White-Label Ready"
                description="Your logo, your colors, your domain. Clients see your brand — zero mention of Kyra or Conversion System."
              />
            </div>
          </div>
        </section>

        {/* Independence / Trust */}
        <section className="container mx-auto px-4 md:px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/30 rounded-2xl p-8 md:p-12 border border-gray-800">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">
                    Your agency. Your data. Your platform.
                  </h2>
                  <p className="text-gray-400 leading-relaxed mb-6">
                    The AI landscape shifts every week. Platforms get acquired. Data policies change overnight. Your agency can&apos;t afford that risk.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    Kyra is independently operated. We don&apos;t sell your data, we don&apos;t feed conversations into training sets, and we don&apos;t answer to OpenAI, Google, or anyone else. Your clients trust you — we built Kyra so you never have to break that trust.
                  </p>
                </div>
                <div className="space-y-4">
                  <TrustItem icon={<LockIcon className="h-5 w-5" />} text="Client data stays in YOUR Stripe account" />
                  <TrustItem icon={<ShieldCheckIcon className="h-5 w-5" />} text="No vendor lock-in — export everything, anytime" />
                  <TrustItem icon={<BrainIcon className="h-5 w-5" />} text="Model-agnostic — switch between Claude, GPT, Gemini" />
                  <TrustItem icon={<SparklesIcon className="h-5 w-5" />} text="EU-hosted infrastructure (Frankfurt)" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="container mx-auto px-4 md:px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple pricing. Real margins.
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              You set the price for your clients. The difference is your profit.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <PricingCard
              name="Lite"
              price="$99"
              period="/mo"
              description="For agencies getting started with AI"
              clients="5 clients included"
              extra="$29/mo per extra client"
              features={[
                'GHL integration',
                'Agency dashboard',
                'Community templates',
                'SMS AI replies',
                'Email support',
              ]}
              cta="Start Free Trial"
              href="/signup/agency"
            />
            <PricingCard
              name="Pro"
              price="$249"
              period="/mo"
              description="For agencies scaling AI services"
              clients="15 clients included"
              extra="$25/mo per extra client"
              features={[
                'Everything in Lite',
                'White-label branding',
                'Stripe Connect billing',
                'Create custom templates',
                'Smart model routing',
                'BYOK (your own API keys)',
                'Priority support',
              ]}
              cta="Start Free Trial"
              href="/signup/agency"
              highlighted
            />
            <PricingCard
              name="Scale"
              price="$499"
              period="/mo"
              description="For agencies at volume"
              clients="50 clients included"
              extra="$19/mo per extra client"
              features={[
                'Everything in Pro',
                'Sell templates on marketplace',
                'API access',
                'Unlimited team members',
                'Dedicated support',
                'Custom integrations',
              ]}
              cta="Contact Us"
              href="mailto:angel@conversionsystem.com"
            />
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              All plans include a 14-day free trial. No credit card required. 10% platform fee on client billing via Stripe Connect.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 md:px-6 py-24">
          <div className="max-w-3xl mx-auto bg-gradient-to-br from-purple-900/40 to-pink-900/30 rounded-3xl p-12 md:p-16 border border-purple-800/40 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Your clients are waiting for AI.
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto text-lg">
              5 minutes from now, your first client could have an AI employee answering their SMS, booking appointments, and moving deals.
            </p>
            <Link
              href="/signup/agency"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-gray-900 hover:bg-gray-100 transition font-semibold text-lg shadow-lg"
            >
              Deploy Your First AI Employee
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <p className="text-xs text-gray-500 mt-4">
              14-day free trial · 5 clients included · No credit card required
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 md:py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-6 w-6 text-purple-400" />
              <span className="font-bold">Kyra</span>
              <span className="text-gray-600 text-sm ml-2">by Conversion System</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2026 Conversion System. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition">Terms</Link>
              <Link href="mailto:support@conversionsystem.com" className="hover:text-white transition">Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Components ────────────────────────────────────────────────────────────

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function CompareItem({ before, after }: { before: string; after: string }) {
  return (
    <div className="bg-gray-900/50 rounded-xl px-5 py-4 border border-gray-800 space-y-2">
      <div className="flex items-start gap-2 text-sm text-gray-500">
        <span className="shrink-0 mt-0.5">✕</span>
        <span className="line-through">{before}</span>
      </div>
      <div className="flex items-start gap-2 text-sm text-purple-300 font-medium">
        <span className="shrink-0 mt-0.5">✓</span>
        <span>{after}</span>
      </div>
    </div>
  );
}

function StepCard({ number, title, description }: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-600/20 border border-purple-600/40 text-purple-400 font-bold text-lg mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function FlowStep({ emoji, label, sublabel }: { emoji: string; label: string; sublabel: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm font-medium text-white">{label}</span>
      <span className="text-xs text-gray-500">{sublabel}</span>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden md:block text-gray-600">
      <ArrowRightIcon className="h-5 w-5" />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="group bg-gray-900/50 rounded-2xl p-6 border border-gray-800 hover:border-purple-700/50 transition-all duration-300">
      <div className="text-purple-400 mb-4 group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="text-green-400 shrink-0">{icon}</div>
      <span className="text-gray-300">{text}</span>
    </div>
  );
}

function PricingCard({ name, price, period, description, clients, extra, features, cta, href, highlighted }: {
  name: string;
  price: string;
  period: string;
  description: string;
  clients: string;
  extra: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-8 border ${
      highlighted 
        ? 'bg-gradient-to-b from-purple-900/40 to-gray-900/80 border-purple-600/50 ring-1 ring-purple-500/20' 
        : 'bg-gray-900/50 border-gray-800'
    } flex flex-col`}>
      {highlighted && (
        <div className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-4">Most Popular</div>
      )}
      <h3 className="text-xl font-bold mb-1">{name}</h3>
      <p className="text-gray-500 text-sm mb-4">{description}</p>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-gray-500">{period}</span>
      </div>
      <p className="text-sm text-purple-400 font-medium mb-1">{clients}</p>
      <p className="text-xs text-gray-500 mb-6">{extra}</p>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-gray-300">
            <CheckCircle2Icon className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`block text-center py-3 rounded-lg font-medium transition ${
          highlighted
            ? 'bg-purple-600 hover:bg-purple-500 text-white'
            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
