import Link from 'next/link';
import { 
  ArrowRightIcon, 
  SparklesIcon, 
  BrainIcon, 
  SmartphoneIcon, 
  ZapIcon, 
  SearchIcon, 
  UsersIcon, 
  CalendarIcon,
  CheckIcon,
  ShieldCheckIcon,
  GlobeIcon,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-8 w-8 text-purple-400" />
          <span className="text-2xl font-bold">Kyra</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-gray-300 hover:text-white transition text-sm">
            Features
          </Link>
          <Link href="#how-it-works" className="text-gray-300 hover:text-white transition text-sm">
            How It Works
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
            href="/signup" 
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition font-medium text-sm"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container mx-auto px-6 pt-20 pb-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-900/40 border border-purple-700/40 mb-8">
              <SparklesIcon className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-purple-300">Powered by Claude AI + OpenClaw</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
              Your AI That
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
                Actually Knows You
              </span>
            </h1>
            
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              An AI assistant with persistent memory that works across WhatsApp, Telegram, 
              Slack, and web. It remembers everything, searches the web, manages your calendar, 
              and gets smarter every conversation.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition font-semibold text-lg shadow-lg shadow-purple-900/30"
              >
                Start Free
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
              <Link
                href="#how-it-works"
                className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gray-800/80 hover:bg-gray-700/80 transition font-semibold text-lg border border-gray-700"
              >
                See How It Works
              </Link>
            </div>
            
            <p className="text-sm text-gray-500 mt-6">
              50 free credits/month. No credit card required.
            </p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Not just another chatbot
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Kyra is an AI that works for you — proactively, across platforms, with full context of who you are.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FeatureCard
              icon={<BrainIcon className="h-7 w-7" />}
              title="Persistent Memory"
              description="Remembers your preferences, your team, your projects. Every conversation makes Kyra smarter about you."
            />
            <FeatureCard
              icon={<SmartphoneIcon className="h-7 w-7" />}
              title="Works Everywhere"
              description="Chat on web, WhatsApp, Telegram, Slack, or Discord. Kyra follows you across every platform seamlessly."
            />
            <FeatureCard
              icon={<ZapIcon className="h-7 w-7" />}
              title="Proactive Assistant"
              description="Morning briefings, calendar reminders, email summaries. Kyra works for you even when you don't ask."
            />
            <FeatureCard
              icon={<SearchIcon className="h-7 w-7" />}
              title="Web Search & Research"
              description="Real-time web search, URL reading, deep research on any topic. Always current, always accurate."
            />
            <FeatureCard
              icon={<UsersIcon className="h-7 w-7" />}
              title="AI Workforce"
              description="Complex tasks get delegated to specialized sub-agents. One request, an entire team of AI workers."
            />
            <FeatureCard
              icon={<CalendarIcon className="h-7 w-7" />}
              title="Google Calendar"
              description="View your events, create meetings, set reminders. Your calendar, fully integrated and always accessible."
            />
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="container mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Up and running in 30 seconds
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              No complex setup. No API keys. Just sign up and start chatting.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              number="1"
              title="Create Your Account"
              description="Sign up with email or Google. Takes 30 seconds, no credit card needed."
            />
            <StepCard
              number="2"
              title="Tell Kyra About You"
              description="Share your preferences, goals, and context. Kyra remembers everything from day one."
            />
            <StepCard
              number="3"
              title="Let Kyra Handle It"
              description="Ask questions, delegate tasks, get briefings. Kyra works across all your platforms."
            />
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="container mx-auto px-6 py-24">
          <div className="text-center mb-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, credits-based pricing
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg mb-4">
              Pay for what you use. Every action costs credits — simple chat is 1 credit, 
              web search is 2, deep research is 5. Calendar and reminders are always free.
            </p>
          </div>

          {/* Credit costs mini-table */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16 text-sm">
            <CreditBadge action="Chat" cost="1" />
            <CreditBadge action="Web Search" cost="2" />
            <CreditBadge action="File Analysis" cost="3" />
            <CreditBadge action="Deep Research" cost="5" />
            <CreditBadge action="Calendar" cost="Free" free />
            <CreditBadge action="Reminders" cost="Free" free />
          </div>
          
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              credits="50 credits"
              features={[
                '50 credits/month',
                'Basic chat',
                'Web interface',
                'Basic memory',
              ]}
              cta="Get Started"
              href="/signup"
            />
            <PricingCard
              name="Starter"
              price="$20"
              credits="500 credits"
              features={[
                '500 credits/month',
                'All chat features',
                'Web search & research',
                'WhatsApp + Telegram',
                'Google Calendar',
                'Full memory',
              ]}
              cta="Start Free Trial"
              href="/signup?plan=starter"
              highlighted
            />
            <PricingCard
              name="Business"
              price="$100"
              credits="3,000 credits"
              features={[
                '3,000 credits/month',
                'Everything in Starter',
                'AI sub-agents',
                'Priority response times',
                'Email integration',
                'Custom instructions',
                'Priority support',
              ]}
              cta="Start Free Trial"
              href="/signup?plan=business"
            />
            <PricingCard
              name="Max"
              price="$200"
              credits="8,000 credits"
              features={[
                '8,000 credits/month',
                'Everything in Business',
                'Unlimited memory',
                'Dedicated AI workforce',
                'API access',
                'Custom integrations',
                'Dedicated support + SLA',
              ]}
              cta="Contact Sales"
              href="/signup?plan=max"
            />
          </div>
        </section>

        {/* Trust / Social Proof */}
        <section className="container mx-auto px-6 py-16">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-gray-500">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">SOC 2 Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <GlobeIcon className="h-5 w-5 text-blue-400" />
              <span className="text-sm font-medium">Powered by Claude AI</span>
            </div>
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-purple-400" />
              <span className="text-sm font-medium">Built on OpenClaw</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Your Data, Your Control</span>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-6 py-24">
          <div className="max-w-3xl mx-auto bg-gradient-to-br from-purple-900/40 to-pink-900/30 rounded-3xl p-12 md:p-16 border border-purple-800/40 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to meet your AI?
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto text-lg">
              Start with 50 free credits. No credit card required. 
              Your AI assistant is one click away.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-gray-900 hover:bg-gray-100 transition font-semibold text-lg shadow-lg"
            >
              Start Free
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="container mx-auto px-6">
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

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="group bg-gray-900/50 rounded-2xl p-8 border border-gray-800 hover:border-purple-700/50 transition-all duration-300">
      <div className="text-purple-400 mb-4 group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
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
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function CreditBadge({ action, cost, free = false }: { 
  action: string; 
  cost: string;
  free?: boolean;
}) {
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
      free 
        ? 'bg-green-900/20 border-green-700/30 text-green-400'
        : 'bg-gray-800/50 border-gray-700/50 text-gray-300'
    }`}>
      <span>{action}</span>
      <span className={free ? 'text-green-400' : 'text-purple-400'}>
        {free ? '✓ Free' : `${cost} credit${cost === '1' ? '' : 's'}`}
      </span>
    </div>
  );
}

function PricingCard({ 
  name, 
  price, 
  credits,
  features, 
  cta, 
  href, 
  highlighted = false 
}: { 
  name: string;
  price: string;
  credits: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-6 border flex flex-col ${
      highlighted 
        ? 'bg-gradient-to-b from-purple-900/50 to-purple-950/50 border-purple-600 ring-2 ring-purple-600/20 relative' 
        : 'bg-gray-900/50 border-gray-800'
    }`}>
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-purple-600 text-xs font-semibold">
          Most Popular
        </div>
      )}
      <h3 className="text-lg font-semibold mb-1">{name}</h3>
      <div className="mb-1">
        <span className="text-4xl font-bold">{price}</span>
        {price !== '$0' && <span className="text-gray-400">/mo</span>}
      </div>
      <p className="text-sm text-purple-400 mb-6">{credits}</p>
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <CheckIcon className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`block text-center py-3 rounded-lg font-medium transition ${
          highlighted
            ? 'bg-purple-600 hover:bg-purple-500 text-white'
            : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
