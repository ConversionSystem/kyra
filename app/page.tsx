import Link from 'next/link';
import { 
  ArrowRightIcon, 
  SparklesIcon, 
  BrainIcon, 
  SmartphoneIcon, 
  ZapIcon, 
  SearchIcon, 
  MessageSquareIcon, 
  CalendarIcon,
  CheckIcon,
  ShieldCheckIcon,
  GlobeIcon,
  LockIcon,
  ClockIcon,
  SendIcon,
  BotIcon,
  DatabaseIcon,
  TrendingUpIcon,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-8 w-8 text-purple-400" />
          <span className="text-2xl font-bold">Kyra</span>
          <span className="ml-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Beta
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-gray-300 hover:text-white transition text-sm">
            Features
          </Link>
          <Link href="#channels" className="text-gray-300 hover:text-white transition text-sm">
            Channels
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
            Try Free
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
              An AI That
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
                Remembers Everything
              </span>
            </h1>
            
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Meet Kyra — your personal AI assistant that learns who you are, 
              works across every platform you use, and gets smarter with every conversation. 
              Not a chatbot. A partner.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition font-semibold text-lg shadow-lg shadow-purple-900/30"
              >
                Start Free — No Card Required
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
            </div>
            
            <p className="text-sm text-gray-500 mt-6">
              50 free credits/month · Set up in 30 seconds · Cancel anytime
            </p>
          </div>
        </section>

        {/* Social proof bar */}
        <section className="border-y border-gray-800/50 py-8 mb-8">
          <div className="container mx-auto px-6">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-gray-400 text-sm">
              <div className="flex items-center gap-2">
                <BrainIcon className="h-4 w-4 text-purple-400" />
                <span>Persistent Memory</span>
              </div>
              <div className="flex items-center gap-2">
                <SmartphoneIcon className="h-4 w-4 text-purple-400" />
                <span>Multi-Platform</span>
              </div>
              <div className="flex items-center gap-2">
                <SearchIcon className="h-4 w-4 text-purple-400" />
                <span>Real-Time Web Search</span>
              </div>
              <div className="flex items-center gap-2">
                <BotIcon className="h-4 w-4 text-purple-400" />
                <span>AI Sub-Agents</span>
              </div>
              <div className="flex items-center gap-2">
                <LockIcon className="h-4 w-4 text-purple-400" />
                <span>Your Data, Your Control</span>
              </div>
            </div>
          </div>
        </section>

        {/* Problem → Solution */}
        <section className="container mx-auto px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">
                  Every other AI forgets you exist
                </h2>
                <div className="space-y-4 text-gray-400">
                  <p>ChatGPT doesn&apos;t know your name next Tuesday. Claude forgets your preferences every session. Every conversation starts from zero.</p>
                  <p>You end up repeating yourself. Explaining your business. Re-teaching context. Over and over.</p>
                  <p className="text-white font-medium">Kyra is different.</p>
                </div>
              </div>
              <div className="space-y-4">
                <BenefitItem icon={<BrainIcon className="h-5 w-5" />} title="Remembers your name, your projects, your preferences" />
                <BenefitItem icon={<TrendingUpIcon className="h-5 w-5" />} title="Gets smarter the more you use it" />
                <BenefitItem icon={<MessageSquareIcon className="h-5 w-5" />} title="Same AI across web, Telegram, WhatsApp, Slack" />
                <BenefitItem icon={<ClockIcon className="h-5 w-5" />} title="Works for you even when you don't ask" />
                <BenefitItem icon={<DatabaseIcon className="h-5 w-5" />} title="Your data stays yours — never used for training" />
              </div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section id="features" className="container mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need in one AI
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Kyra combines the best AI capabilities into one assistant that actually knows your context.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FeatureCard
              icon={<BrainIcon className="h-7 w-7" />}
              title="Persistent Memory"
              description="Kyra builds a knowledge graph of you — preferences, relationships, projects, decisions. Every conversation makes it smarter."
              tag="Core"
            />
            <FeatureCard
              icon={<SearchIcon className="h-7 w-7" />}
              title="Live Web Search"
              description="Real-time web search, URL reading, and deep research. Always current information, properly cited."
              tag="Built-in"
            />
            <FeatureCard
              icon={<BotIcon className="h-7 w-7" />}
              title="AI Sub-Agents"
              description="Complex tasks get delegated to specialized AI workers. One request, a whole team on it."
              tag="Powerful"
            />
            <FeatureCard
              icon={<CalendarIcon className="h-7 w-7" />}
              title="Google Calendar"
              description="View events, create meetings, get reminders. Your schedule fully integrated and always accessible."
              tag="Integrated"
            />
            <FeatureCard
              icon={<ZapIcon className="h-7 w-7" />}
              title="Proactive Briefings"
              description="Morning updates, calendar reminders, email summaries. Kyra works in the background so you don't miss what matters."
              tag="Proactive"
            />
            <FeatureCard
              icon={<ShieldCheckIcon className="h-7 w-7" />}
              title="Privacy First"
              description="Your conversations and memories are encrypted and never used for AI training. You can delete everything anytime."
              tag="Secure"
            />
          </div>
        </section>

        {/* Channels */}
        <section id="channels" className="container mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              One AI, every platform
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Chat with Kyra wherever you already are. Same memory, same context, everywhere.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            <ChannelCard name="Web App" status="live" emoji="🌐" />
            <ChannelCard name="Telegram" status="live" emoji="✈️" />
            <ChannelCard name="WhatsApp" status="coming" emoji="💬" />
            <ChannelCard name="Slack" status="coming" emoji="💼" />
            <ChannelCard name="Discord" status="coming" emoji="🎮" />
            <ChannelCard name="Email" status="coming" emoji="📧" />
            <ChannelCard name="iMessage" status="planned" emoji="🍎" />
            <ChannelCard name="Voice" status="planned" emoji="🎙️" />
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Up and running in 30 seconds
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              No API keys. No complex setup. Just sign up and start talking.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              number="1"
              title="Create Your Account"
              description="Sign up with email or Google. Free tier included — no credit card needed."
            />
            <StepCard
              number="2"
              title="Start Talking"
              description="Chat on the web or connect Telegram. Kyra learns your preferences, projects, and context automatically."
            />
            <StepCard
              number="3"
              title="Let Kyra Work For You"
              description="Delegate research, get briefings, manage your calendar. Kyra becomes more useful every day."
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
              Every action costs credits. Upgrade anytime as you need more.
            </p>
          </div>

          {/* Credit costs */}
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
                'Web chat interface',
                'Basic memory',
                'Community support',
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
                'All AI features',
                'Web search & research',
                'Telegram + WhatsApp',
                'Google Calendar',
                'Full persistent memory',
                'Email support',
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
                'All channel integrations',
                'Custom AI instructions',
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

        {/* Trust */}
        <section className="container mx-auto px-6 py-16">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 text-gray-500">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">End-to-End Encrypted</span>
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
              <LockIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Never Used for AI Training</span>
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
              Join the beta. 50 free credits, no credit card required. 
              Your personal AI assistant is one click away.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-gray-900 hover:bg-gray-100 transition font-semibold text-lg shadow-lg"
            >
              Join the Beta — Free
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <p className="text-xs text-gray-500 mt-4">
              Kyra is currently in public beta. We&apos;re actively building and improving based on user feedback.
            </p>
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
              <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-amber-500/20 text-amber-400">
                Beta
              </span>
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

function BenefitItem({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 bg-gray-900/50 rounded-xl px-5 py-4 border border-gray-800">
      <div className="text-purple-400 shrink-0">{icon}</div>
      <span className="text-gray-200 font-medium">{title}</span>
    </div>
  );
}

function FeatureCard({ icon, title, description, tag }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  tag?: string;
}) {
  return (
    <div className="group bg-gray-900/50 rounded-2xl p-8 border border-gray-800 hover:border-purple-700/50 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="text-purple-400 group-hover:scale-110 transition-transform">{icon}</div>
        {tag && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400/70 bg-purple-900/30 px-2 py-0.5 rounded-full">
            {tag}
          </span>
        )}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function ChannelCard({ name, status, emoji }: {
  name: string;
  status: 'live' | 'coming' | 'planned';
  emoji: string;
}) {
  const statusConfig = {
    live: { label: 'Live', color: 'text-green-400 bg-green-900/30 border-green-700/30' },
    coming: { label: 'Coming Soon', color: 'text-amber-400 bg-amber-900/30 border-amber-700/30' },
    planned: { label: 'Planned', color: 'text-gray-400 bg-gray-800/50 border-gray-700/30' },
  };
  const cfg = statusConfig[status];
  
  return (
    <div className="bg-gray-900/50 rounded-xl p-5 border border-gray-800 text-center hover:border-gray-700 transition">
      <div className="text-3xl mb-2">{emoji}</div>
      <div className="font-medium mb-2">{name}</div>
      <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.color}`}>
        {cfg.label}
      </span>
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
