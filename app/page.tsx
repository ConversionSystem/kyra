import Link from 'next/link';
import { ArrowRightIcon, SparklesIcon, BrainIcon, CalendarIcon, SlackIcon } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-8 w-8 text-purple-400" />
          <span className="text-2xl font-bold">Kyra</span>
        </div>
        <nav className="flex items-center gap-6">
          <Link href="#features" className="text-gray-300 hover:text-white transition">
            Features
          </Link>
          <Link href="#pricing" className="text-gray-300 hover:text-white transition">
            Pricing
          </Link>
          <Link 
            href="/login" 
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition font-medium"
          >
            Sign In
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6 pt-20 pb-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-900/50 border border-purple-700/50 mb-8">
            <SparklesIcon className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-purple-300">Your AI assistant, everywhere</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Meet <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Kyra</span>
            <br />
            Your Personal AI
          </h1>
          
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            An AI assistant that remembers everything, works across all your apps, 
            and helps you get things done. No setup required.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition font-semibold text-lg"
            >
              Get Started Free
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-gray-800 hover:bg-gray-700 transition font-semibold text-lg border border-gray-700"
            >
              Sign In
            </Link>
          </div>
          
          <p className="text-sm text-gray-500 mt-6">
            Free tier includes 100 messages/month. No credit card required.
          </p>
        </div>

        {/* Features */}
        <section id="features" className="mt-32">
          <h2 className="text-3xl font-bold text-center mb-16">
            Everything you need in an AI assistant
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard
              icon={<BrainIcon className="h-8 w-8" />}
              title="Remembers Everything"
              description="Kyra learns your preferences, remembers past conversations, and gets smarter over time."
            />
            <FeatureCard
              icon={<SlackIcon className="h-8 w-8" />}
              title="Works in Slack"
              description="Chat with Kyra directly in Slack. No context switching needed."
            />
            <FeatureCard
              icon={<CalendarIcon className="h-8 w-8" />}
              title="Manages Your Calendar"
              description="Connect Google Calendar and let Kyra handle scheduling and reminders."
            />
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mt-32">
          <h2 className="text-3xl font-bold text-center mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">
            Start free, upgrade as you grow. Cancel anytime.
          </p>
          
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              period="/month"
              features={[
                '100 messages/month',
                'Basic memory',
                'Web chat only',
              ]}
              cta="Get Started"
              href="/signup"
            />
            <PricingCard
              name="Starter"
              price="$19"
              period="/month"
              features={[
                '1,000 messages/month',
                'Full memory',
                'Web + Slack',
                'Google Calendar',
              ]}
              cta="Start Trial"
              href="/signup?plan=starter"
              highlighted
            />
            <PricingCard
              name="Business"
              price="$49"
              period="/month"
              features={[
                '5,000 messages/month',
                'Priority support',
                'All integrations',
                'Custom instructions',
              ]}
              cta="Start Trial"
              href="/signup?plan=business"
            />
            <PricingCard
              name="Enterprise"
              price="$199"
              period="/month"
              features={[
                '25,000 messages/month',
                'Dedicated support',
                'SSO & compliance',
                'SLA guarantee',
              ]}
              cta="Contact Sales"
              href="mailto:sales@conversionsystem.com"
            />
          </div>
        </section>

        {/* CTA */}
        <section className="mt-32 text-center">
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-3xl p-12 border border-purple-800/50">
            <h2 className="text-3xl font-bold mb-4">Ready to meet your AI assistant?</h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Join thousands of users who are getting more done with Kyra.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-gray-900 hover:bg-gray-100 transition font-semibold text-lg"
            >
              Get Started Free
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-6 w-6 text-purple-400" />
            <span className="font-bold">Kyra</span>
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
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800 hover:border-purple-800/50 transition">
      <div className="text-purple-400 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function PricingCard({ 
  name, 
  price, 
  period, 
  features, 
  cta, 
  href, 
  highlighted = false 
}: { 
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-6 border ${
      highlighted 
        ? 'bg-gradient-to-b from-purple-900/50 to-purple-950/50 border-purple-600 ring-2 ring-purple-600/20' 
        : 'bg-gray-900/50 border-gray-800'
    }`}>
      {highlighted && (
        <div className="text-xs font-medium text-purple-400 mb-2">Most Popular</div>
      )}
      <h3 className="text-lg font-semibold mb-2">{name}</h3>
      <div className="mb-6">
        <span className="text-4xl font-bold">{price}</span>
        <span className="text-gray-400">{period}</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
            <CheckIcon />
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

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
