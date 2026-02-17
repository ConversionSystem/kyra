import Link from 'next/link';
import { 
  ArrowRightIcon, 
  SparklesIcon, 
  ZapIcon, 
  MessageSquareIcon, 
  ShieldCheckIcon,
  ClockIcon,
  UsersIcon,
  BarChart3Icon,
  BrainIcon,
  SettingsIcon,
  LayersIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  GaugeIcon,
  EyeIcon,
  CalendarIcon,
  HeadphonesIcon,
  TrendingUpIcon,
  StarIcon,
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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm font-medium mb-6">
              <SparklesIcon className="h-3.5 w-3.5" />
              AI-Powered Conversations for GoHighLevel
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 tracking-tight">
              Turn your clients&apos;{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
                leads into booked appointments
              </span>
              {' '}with AI
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-4">
              Kyra plugs into your GoHighLevel sub-accounts and gives each client a dedicated AI assistant that responds to leads, qualifies prospects, and books appointments — 24/7.
            </p>

            <p className="text-sm text-gray-500 max-w-xl mx-auto mb-8">
              Built for GHL agencies. Integrates in minutes. White-label ready so clients see your brand.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup/agency"
                className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition font-semibold text-base shadow-lg shadow-purple-900/30"
              >
                Start Your 30-Day Free Trial
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
              30-day free trial · No credit card required · Cancel anytime
            </p>
          </div>
        </section>

        {/* Social Proof / Stats */}
        <section className="border-y border-gray-800/50 py-8">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
              <Stat value="< 60s" label="Lead Response Time" />
              <Stat value="24/7" label="Always On" />
              <Stat value="5 min" label="Setup per Client" />
              <Stat value="100%" label="White-Label" />
            </div>
          </div>
        </section>

        {/* Value Prop — What Kyra Does */}
        <section className="container mx-auto px-4 md:px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Give every client an AI employee that never sleeps
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                Kyra adds intelligent AI assistants to your clients&apos; GoHighLevel accounts — handling lead response, qualification, and appointment booking so no opportunity slips through the cracks.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <ValueCard 
                icon={<ClockIcon className="h-8 w-8" />}
                title="Instant Lead Response"
                description="Leads get a personalized reply within 60 seconds — SMS, email, or chat. No more leads going cold overnight."
              />
              <ValueCard 
                icon={<CalendarIcon className="h-8 w-8" />}
                title="Automated Booking"
                description="AI qualifies prospects through natural conversation and books appointments directly on your client's calendar."
              />
              <ValueCard 
                icon={<TrendingUpIcon className="h-8 w-8" />}
                title="New Revenue Stream"
                description="Offer AI-powered lead engagement as a premium service. Set your own pricing and bill clients directly."
              />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="container mx-auto px-4 md:px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Live in 5 minutes. No code required.
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Connect Kyra to any GoHighLevel sub-account and start responding to leads with AI.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <StepCard
              number="1"
              title="Connect GHL"
              description="One-click OAuth to connect your client's GoHighLevel sub-account. Kyra syncs contacts, conversations, and pipeline data."
            />
            <StepCard
              number="2"
              title="Choose a Persona"
              description="Pick from industry-specific AI personas — dental, real estate, home services, and more — or create your own."
            />
            <StepCard
              number="3"
              title="Set the Rules"
              description="Define what the AI can do: respond to messages, book appointments, update pipelines. Start conservative, expand as you go."
            />
            <StepCard
              number="4"
              title="Go Live"
              description="Flip the switch. Kyra starts engaging leads in your client's GHL account immediately. Monitor everything from your dashboard."
            />
          </div>

          {/* Flow Diagram */}
          <div className="max-w-3xl mx-auto mt-16 p-6 md:p-8 rounded-2xl bg-gray-900/50 border border-gray-800">
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 uppercase tracking-wider font-medium">How It Works</p>
            </div>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center">
              <FlowStep emoji="📱" label="Lead comes in" sublabel="via SMS or chat" />
              <FlowArrow />
              <FlowStep emoji="🧠" label="Kyra reads" sublabel="CRM context" />
              <FlowArrow />
              <FlowStep emoji="💬" label="AI responds" sublabel="personalized reply" />
              <FlowArrow />
              <FlowStep emoji="📅" label="Appointment" sublabel="booked automatically" />
            </div>
          </div>
        </section>

        {/* Built for Agencies */}
        <section className="container mx-auto px-4 md:px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Built for agencies that manage multiple clients
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                Whether you manage 5 clients or 50, Kyra gives you one dashboard to deploy, monitor, and bill for AI-powered lead engagement across every account.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <AgencyFeature
                icon={<UsersIcon className="h-5 w-5" />}
                title="Multi-Client Management"
                description="Add clients, connect GHL sub-accounts, and customize each AI persona from a single agency dashboard."
              />
              <AgencyFeature
                icon={<LayersIcon className="h-5 w-5" />}
                title="White-Label Branding"
                description="Your logo, your colors, your domain. Clients see your brand — you control the experience end to end."
              />
              <AgencyFeature
                icon={<CreditCardIcon className="h-5 w-5" />}
                title="Built-In Client Billing"
                description="Set your own pricing with Stripe Connect. Bill clients directly through your Stripe account. Keep the margin."
              />
              <AgencyFeature
                icon={<BarChart3Icon className="h-5 w-5" />}
                title="Performance Reporting"
                description="Track conversations, response times, appointments booked, and AI costs per client — all in real time."
              />
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section id="features" className="border-y border-gray-800/50 py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Powerful features, simple setup
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                Everything you need to deliver AI-powered lead engagement as a service.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <FeatureCard
                icon={<MessageSquareIcon className="h-6 w-6" />}
                title="Conversational AI"
                description="Natural, context-aware conversations that understand your client's business, services, and tone of voice."
              />
              <FeatureCard
                icon={<LayersIcon className="h-6 w-6" />}
                title="Industry Personas"
                description="Pre-built AI personas for dental, real estate, home services, retail, and more. Deploy in minutes, customize in seconds."
              />
              <FeatureCard
                icon={<GaugeIcon className="h-6 w-6" />}
                title="Smart Model Routing"
                description="Simple messages use fast, affordable AI. Complex conversations automatically use premium models. Costs stay low."
              />
              <FeatureCard
                icon={<EyeIcon className="h-6 w-6" />}
                title="Gradual Rollout"
                description="Start in monitor-only mode. Enable responses when ready. Then unlock booking and pipeline updates at your pace."
              />
              <FeatureCard
                icon={<SettingsIcon className="h-6 w-6" />}
                title="Granular Controls"
                description="Fine-tune exactly what each AI assistant can access and do — contacts, messages, calendar, pipeline — toggle by toggle."
              />
              <FeatureCard
                icon={<BrainIcon className="h-6 w-6" />}
                title="Conversation Memory"
                description="Kyra remembers past interactions with each contact, building context over time for smarter, more relevant responses."
              />
              <FeatureCard
                icon={<ZapIcon className="h-6 w-6" />}
                title="Multi-Channel"
                description="Respond to leads via SMS, email, web chat, and more — all from the same AI persona with consistent messaging."
              />
              <FeatureCard
                icon={<HeadphonesIcon className="h-6 w-6" />}
                title="Human Handoff"
                description="AI knows when to step back. Complex situations get flagged for your team to take over seamlessly."
              />
              <FeatureCard
                icon={<ShieldCheckIcon className="h-6 w-6" />}
                title="Data Privacy"
                description="Client data stays in their GHL account and your Stripe. No data sharing, no training on conversations, full compliance."
              />
            </div>
          </div>
        </section>

        {/* Testimonial / Social Proof Placeholder */}
        <section className="container mx-auto px-4 md:px-6 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-1 mb-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <StarIcon key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <blockquote className="text-xl md:text-2xl font-medium text-gray-200 leading-relaxed mb-6">
              &quot;We went from manually following up with every lead to having AI handle it instantly. Our clients are booking 3x more appointments and we added a new revenue stream we didn&apos;t have before.&quot;
            </blockquote>
            <div className="text-gray-500">
              <span className="text-gray-300 font-medium">Marketing Agency Owner</span> · GHL Agency
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
              extra="$29/mo per additional client"
              features={[
                'GoHighLevel integration',
                'Agency dashboard',
                'Industry AI personas',
                'SMS & email AI responses',
                'Conversation monitoring',
                'Email support',
              ]}
              cta="Start 30-Day Free Trial"
              href="/signup/agency"
            />
            <PricingCard
              name="Pro"
              price="$249"
              period="/mo"
              description="For agencies scaling AI services"
              clients="15 clients included"
              extra="$25/mo per additional client"
              features={[
                'Everything in Lite',
                'White-label branding',
                'Stripe Connect client billing',
                'Custom AI personas',
                'Smart model routing',
                'Bring your own API keys',
                'Priority support',
              ]}
              cta="Start 30-Day Free Trial"
              href="/signup/agency"
              highlighted
            />
            <PricingCard
              name="Scale"
              price="$499"
              period="/mo"
              description="For agencies at volume"
              clients="50 clients included"
              extra="$19/mo per additional client"
              features={[
                'Everything in Pro',
                'Persona marketplace access',
                'API access',
                'Unlimited team members',
                'Dedicated account manager',
                'Custom integrations',
              ]}
              cta="Contact Us"
              href="mailto:angel@conversionsystem.com"
            />
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              All plans include a 30-day free trial. No credit card required. 10% platform fee on client billing via Stripe Connect.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 md:px-6 py-24">
          <div className="max-w-3xl mx-auto bg-gradient-to-br from-purple-900/40 to-pink-900/30 rounded-3xl p-12 md:p-16 border border-purple-800/40 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start converting more leads today
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto text-lg">
              Give your clients AI-powered lead engagement that responds instantly, books appointments, and never takes a day off.
            </p>
            <Link
              href="/signup/agency"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-gray-900 hover:bg-gray-100 transition font-semibold text-lg shadow-lg"
            >
              Start Your 30-Day Free Trial
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <p className="text-xs text-gray-500 mt-4">
              Free for 30 days · 5 clients included · No credit card required
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

function ValueCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center p-6">
      <div className="text-purple-400 mb-4 flex justify-center">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
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

function AgencyFeature({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 p-5 rounded-xl bg-gray-900/50 border border-gray-800">
      <div className="text-purple-400 shrink-0 mt-0.5">{icon}</div>
      <div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      </div>
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
