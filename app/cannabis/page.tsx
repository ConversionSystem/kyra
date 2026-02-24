import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
import {
  ArrowRightIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  PhoneCallIcon,
  ClockIcon,
  DollarSignIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  ZapIcon,
  SmartphoneIcon,
  UsersIcon,
  StarIcon,
} from 'lucide-react';

export const metadata = {
  title: 'AI Worker for Cannabis Dispensaries | Kyra — OpenClaw-Powered',
  description: 'The only OpenClaw-powered autonomous AI worker built for cannabis dispensaries. Handle 100s of daily inquiries, recommend products, book consultations — compliance-aware, 24/7. $29M+ generated for cannabis clients.',
};

function StatCard({ stat, label, sub }: { stat: string; label: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-green-900/40 border border-green-700/50 p-6 text-center">
      <p className="text-4xl md:text-5xl font-black text-green-300 mb-1">{stat}</p>
      <p className="text-white font-semibold text-sm">{label}</p>
      <p className="text-green-400 text-xs mt-1">{sub}</p>
    </div>
  );
}

function FeatureRow({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
        <Icon className="h-5 w-5 text-green-700" />
      </div>
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function CannabisPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <PublicNav />

      {/* Hero */}
      <section className="bg-green-950 py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-800 border border-green-700 text-green-200 text-sm font-medium mb-6">
              🌿 OpenClaw-Powered · Cannabis AI Workers
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
              Your dispensary needs
              <br />
              <span className="text-green-300">an autonomous AI worker that never sleeps</span>
            </h1>
            <p className="text-lg text-green-100 max-w-2xl mx-auto mb-8 leading-relaxed">
              Handle hundreds of daily product inquiries, recommend strains by effect, answer compliance questions, 
              and book consultations — automatically. Compliance-aware. Cannabis-trained.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup/agency"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-green-500 hover:bg-green-400 transition font-bold text-green-950 text-lg"
              >
                Deploy Free — No Card Required
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-green-700 text-green-200 hover:bg-green-900 transition font-semibold text-lg"
              >
                See How It Works
              </Link>
            </div>
            <p className="text-xs text-green-600 mt-4">Free during beta · Live in 72 hours · Cancel anytime</p>
            <p className="text-xs text-green-500 mt-2">
              OpenClaw&apos;s per-client isolation means each cannabis client&apos;s data stays separate. Compliance-aware by design.
            </p>
          </div>
        </div>
      </section>

      {/* Social proof stats */}
      <section className="bg-green-900 py-14">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <StatCard stat="$29M+" label="Revenue generated" sub="Across cannabis clients" />
            <StatCard stat="70%" label="Fewer phone calls" sub="Staff handles 30% vs 100%" />
            <StatCard stat="< 60s" label="Response time" sub="SMS, Telegram, web chat" />
            <StatCard stat="24/7" label="Always available" sub="No sick days, no overtime" />
          </div>
        </div>
      </section>

      {/* What it does */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                What your dispensary AI employee handles
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                Every question your budtenders answer 50 times a day — automated.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <FeatureRow
                icon={MessageSquareIcon}
                title="Product recommendations"
                desc="Ask about effects, potency, indica vs. sativa, terpenes, edibles vs. flower. The AI recommends the right product — and never makes medical claims."
              />
              <FeatureRow
                icon={ClockIcon}
                title="Hours, location & parking"
                desc="'Are you open right now?' 'Where do I park?' 'Do you have a drive-through?' Answered instantly, 24/7, without tying up staff."
              />
              <FeatureRow
                icon={SmartphoneIcon}
                title="Text-based consultations"
                desc="Customers text your dispensary number. The AI responds within 60 seconds. Staff only gets involved when it's a question they actually need to answer."
              />
              <FeatureRow
                icon={DollarSignIcon}
                title="Deals, promotions & loyalty"
                desc="Daily specials, happy hour deals, loyalty points balance — the AI knows your current promotions and tells customers automatically."
              />
              <FeatureRow
                icon={ShieldCheckIcon}
                title="Compliance-aware responses"
                desc="Never makes health or medical claims. Knows not to discuss delivery in restricted areas. Stays within legal boundaries automatically."
              />
              <FeatureRow
                icon={UsersIcon}
                title="Consultation booking"
                desc="Customers wanting a private consultation get booked with a budtender or manager. New patient intake handled before they arrive."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Phone call problem */}
      <section className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                The phone problem every dispensary owner knows
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <PhoneCallIcon className="h-5 w-5 text-red-500" />
                  <p className="font-bold text-red-700">Before Kyra</p>
                </div>
                <ul className="space-y-2.5 text-sm text-red-800">
                  {[
                    'Budtenders interrupted on the floor every 5 minutes',
                    'Phones ringing during rush hour, customers waiting',
                    '"Do you have Blue Dream?" — answered 40x per day',
                    'After-hours calls going to voicemail, leads lost',
                    '2-3 staff members needed just for phone/text support',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-red-400 font-bold mt-0.5">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ZapIcon className="h-5 w-5 text-green-600" />
                  <p className="font-bold text-green-700">After Kyra</p>
                </div>
                <ul className="space-y-2.5 text-sm text-green-800">
                  {[
                    'Budtenders stay focused on in-store customers',
                    'Every text answered in under 60 seconds',
                    'Product questions handled automatically, 24/7',
                    'Leads captured at 11pm when your store is closed',
                    '1 staff member monitors AI — handles exceptions only',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Live in 72 hours</h2>
              <p className="text-gray-500">No technical knowledge required.</p>
            </div>
            <div className="space-y-4">
              {[
                { step: '1', title: 'Tell us about your dispensary', desc: 'Products you carry, hours, location, your brand voice. 15 minutes.' },
                { step: '2', title: 'We configure your AI employee', desc: 'Pre-built on our cannabis template with $29M+ of industry training. We customize it for your specific store.' },
                { step: '3', title: 'You test it and approve', desc: 'Test every scenario — strain questions, compliance edge cases, competitor questions. Approve when you\'re happy.' },
                { step: '4', title: 'Connect your phone number', desc: 'Your existing dispensary text number, or we set up a new one. Takes 10 minutes.' },
                { step: '5', title: 'Your AI employee goes live', desc: 'Every customer text handled automatically. You see every conversation. Staff only touches the exceptions.' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 items-start">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold">
                    {item.step}
                  </div>
                  <div className="pt-1.5">
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing for dispensaries */}
      <section className="bg-green-950 py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Less than one hour of staff time. Per month.
            </h2>
            <p className="text-green-200 mb-8 max-w-xl mx-auto">
              Most dispensaries spend $2,000–$5,000/month on staff handling questions this AI handles automatically.
              Kyra costs a fraction — and works 24/7.
            </p>
            <div className="rounded-2xl bg-green-900 border border-green-700 p-8 mb-6">
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-5xl font-black text-green-300">Free</span>
                <span className="text-green-400">during beta</span>
              </div>
              <p className="text-green-200 text-sm mb-6">Bring your own AI key (Anthropic or OpenAI). Full platform. No limits.</p>
              <ul className="space-y-2 text-left max-w-xs mx-auto mb-6">
                {[
                  'Cannabis-trained AI responses',
                  'SMS + Telegram + web chat',
                  'Compliance-aware guardrails',
                  'Full conversation history',
                  'Setup support included',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-green-100">
                    <CheckCircleIcon className="h-4 w-4 text-green-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup/agency"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-green-400 hover:bg-green-300 transition font-bold text-green-950 text-lg w-full justify-center"
              >
                Deploy Your Dispensary AI — Free
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
              <p className="text-xs text-green-600 mt-3">Beta is free · Paid plans coming soon · Early adopters get 50% off forever</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Your competitors will have this. Will you?
          </h2>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">
            Cannabis customers text before they visit. The dispensary that answers fastest wins the sale.
          </p>
          <Link
            href="/signup/agency"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-green-600 hover:bg-green-500 transition font-bold text-white text-lg"
          >
            Get Your Dispensary AI Free
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
          <p className="text-sm text-gray-400 mt-4">
            Questions?{' '}
            <Link href="mailto:angel@conversionsystem.com" className="text-green-600 hover:underline">
              Email us
            </Link>
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
