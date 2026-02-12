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
  ShieldCheckIcon,
  GlobeIcon,
  LockIcon,
  ClockIcon,
  BotIcon,
  DatabaseIcon,
  TrendingUpIcon,
} from 'lucide-react';
import HeroChatWidget from '@/components/landing/HeroChatWidget';

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
        {/* Hero. Stacked: Copy top, Chat widget below */}
        <section className="container mx-auto px-6 pt-12 pb-20">
          <div className="max-w-4xl mx-auto text-center mb-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-4 tracking-tight">
              Your{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
                personal AI
              </span>
              {' '}without the setup
            </h1>
            
            <p className="text-base text-gray-400 leading-relaxed max-w-xl mx-auto">
              Persistent memory, real-time tools, every platform. Try it 👇
            </p>
          </div>

          {/* Wide rectangular Chat Widget */}
          <div className="max-w-5xl mx-auto">
            <HeroChatWidget />
          </div>

          {/* CTA below chat */}
          <div className="flex flex-col items-center gap-3 mt-8">
            <Link
              href="/signup"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition font-semibold text-base shadow-lg shadow-purple-900/30"
            >
              Get Started Free
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <span className="text-sm text-gray-500">
              100 free credits/month · No credit card · 30 second setup
            </span>
          </div>
        </section>

        {/* What you get. value props */}
        <section className="border-y border-gray-800/50 py-16">
          <div className="container mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                Everything a personal AI should be
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Most AI tools are stateless chatbots. Kyra is a full AI platform that knows who you are and works for you around the clock.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              <KeyBenefit
                icon={<BrainIcon className="h-7 w-7" />}
                title="Remembers Everything"
                description="Your preferences, projects, relationships, and decisions. persistent across every conversation, forever."
              />
              <KeyBenefit
                icon={<GlobeIcon className="h-7 w-7" />}
                title="Works Everywhere"
                description="Web, Telegram, WhatsApp. same AI, same memory. Talk to Kyra wherever you already are."
              />
              <KeyBenefit
                icon={<ZapIcon className="h-7 w-7" />}
                title="Actually Does Things"
                description="Web search, calendar management, reminders, file analysis, even delegating to sub-agents. Not just chat."
              />
              <KeyBenefit
                icon={<LockIcon className="h-7 w-7" />}
                title="Private by Default"
                description="Encrypted, never used for AI training, deletable anytime. Your data belongs to you."
              />
            </div>
          </div>
        </section>

        {/* The problem Kyra solves */}
        <section className="container mx-auto px-6 py-20">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">
                  Powerful AI shouldn&apos;t require a CS degree
                </h2>
                <div className="space-y-4 text-gray-400 leading-relaxed">
                  <p>
                    The best AI assistants. the ones that remember you, search the web, manage your schedule, 
                    and work across Telegram, WhatsApp, and Slack. they exist. But they require API keys, 
                    terminal commands, server management, and hours of configuration.
                  </p>
                  <p>
                    That means 99% of people who&apos;d benefit from a persistent, intelligent AI 
                    assistant simply can&apos;t access one.
                  </p>
                  <p className="text-white font-medium text-lg">
                    Kyra changes that. Same power, zero setup. Just you and your AI.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <CompareItem 
                  before="Re-explain yourself every session" 
                  after="Kyra remembers everything about you" 
                />
                <CompareItem 
                  before="Copy-paste between ChatGPT tabs" 
                  after="One AI across web, Telegram, WhatsApp" 
                />
                <CompareItem 
                  before="Manage API keys and config files" 
                  after="Sign up and start chatting in 30 seconds" 
                />
                <CompareItem 
                  before="AI that only answers when asked" 
                  after="Proactive briefings, reminders, and alerts" 
                />
                <CompareItem 
                  before="Your data training someone else's model" 
                  after="Encrypted, private, deletable anytime" 
                />
              </div>
            </div>
          </div>
        </section>

        {/* Core Features */}
        <section id="features" className="container mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built for real life, not demos
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Every feature works out of the box. No plugins to install, no integrations to configure.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FeatureCard
              icon={<BrainIcon className="h-7 w-7" />}
              title="Persistent Memory"
              description="Kyra builds a knowledge graph of you. preferences, relationships, projects, decisions. Every conversation makes it smarter."
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
              description="Complex tasks get delegated to specialized AI workers. One request, a whole team working on it."
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
              description="Your conversations and memories are encrypted and never used for AI training. Delete everything anytime."
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
            <ChannelCard name="WhatsApp" status="live" emoji="💬" />
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
              No API keys. No server setup. No npm install. Just sign up and go.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              number="1"
              title="Create Your Account"
              description="Sign up with email or Google. Free tier included. no credit card needed."
            />
            <StepCard
              number="2"
              title="Start Talking"
              description="Chat on the web or connect Telegram/WhatsApp. Kyra learns who you are automatically."
            />
            <StepCard
              number="3"
              title="Let Kyra Work For You"
              description="Delegate research, get proactive briefings, manage your calendar. It gets better every day."
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
              Your AI is waiting
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto text-lg">
              100 free credits. No credit card. No technical setup.
              Just a personal AI that actually knows who you are.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-gray-900 hover:bg-gray-100 transition font-semibold text-lg shadow-lg"
            >
              Try Kyra Free
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <p className="text-xs text-gray-500 mt-4">
              100 free credits/month · No credit card · 30 second setup
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

function KeyBenefit({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center p-6 rounded-2xl bg-gray-900/30 border border-gray-800/50 hover:border-purple-700/40 transition-all">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-purple-600/15 text-purple-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
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
