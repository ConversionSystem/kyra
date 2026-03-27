import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
import {
  ArrowRightIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  ShoppingBagIcon,
  ClockIcon,
  TrendingUpIcon,
  ZapIcon,
  SmartphoneIcon,
  MailIcon,
  StarIcon,
  UsersIcon,
  RefreshCwIcon,
  PackageIcon,
  MegaphoneIcon,
} from 'lucide-react';

export const metadata = {
  title: 'AI Worker for E-Commerce & Consumer Brands | Kyra',
  description:
    'Kyra deploys an autonomous AI worker for your e-commerce or CPG brand. Handle customer questions 24/7, recover abandoned carts, generate content, and grow your DTC sales — automatically.',
};

function StatCard({ stat, label, sub }: { stat: string; label: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-orange-900/40 border border-orange-700/50 p-6 text-center">
      <p className="text-4xl md:text-5xl font-black text-orange-300 mb-1">{stat}</p>
      <p className="text-white font-semibold text-sm">{label}</p>
      <p className="text-orange-400 text-xs mt-1">{sub}</p>
    </div>
  );
}

function FeatureRow({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
        <Icon className="h-5 w-5 text-orange-700" />
      </div>
      <div>
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

const USE_CASES = [
  {
    brand: '☕ Instant Coffee Brand',
    problem: 'Customers ask "how do I make this taste better?" 80x a day. Nobody answers fast enough.',
    solution: 'Your AI instantly answers brew methods, product comparisons, caffeine content, and flavour profiles. On Instagram DMs, SMS, and web chat.',
  },
  {
    brand: '💄 Skincare / Beauty Brand',
    problem: '"Is this good for sensitive skin?" "Will this break me out?" Support inbox overflows.',
    solution: 'AI handles product-fit questions with your ingredient knowledge, recommends bundles, and captures every lead who inquires.',
  },
  {
    brand: '🍫 Food & Snack Brand',
    problem: 'Retail buyers ask for pitch decks. Customers ask about allergens. Both go unanswered for days.',
    solution: 'AI responds to consumer questions instantly and flags wholesale/retail inquiries for follow-up — with context already gathered.',
  },
  {
    brand: '🏋️ Supplements Brand',
    problem: "Customers compare you to competitors. Sales reps can't respond fast enough to close.",
    solution: 'AI handles objections, stacks comparisons in your favour, and books a sales call when the lead is warm.',
  },
];

export default function EcommercePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <PublicNav />

      {/* Hero */}
      <section className="bg-orange-950 py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-800 border border-orange-700 text-orange-200 text-sm font-medium mb-6">
              🛒 E-Commerce & Consumer Brands · AI Workers
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-6">
              Your brand deserves
              <br />
              <span className="text-orange-300">an AI that sells for you 24/7</span>
            </h1>
            <p className="text-lg text-orange-100 max-w-2xl mx-auto mb-8 leading-relaxed">
              Instant product answers on every channel. Abandoned cart recovery. Content that ranks.
              An AI worker that knows your brand inside-out — and works while you sleep.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/solo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-orange-500 hover:bg-orange-400 transition font-bold text-white text-lg"
              >
                Deploy Free — No Card Required
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
              <Link
                href="#use-cases"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-orange-700 text-orange-200 hover:bg-orange-900 transition font-semibold text-lg"
              >
                See Brand Examples
              </Link>
            </div>
            <p className="text-xs text-orange-600 mt-4">Free during beta · Live in 48 hours · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-orange-900 py-14">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <StatCard stat="24/7" label="Customer support" sub="Every DM and question answered" />
            <StatCard stat="< 60s" label="Response time" sub="Faster than any human team" />
            <StatCard stat="100%" label="Leads captured" sub="No inquiry goes unanswered" />
            <StatCard stat="5+" label="Channels at once" sub="SMS, IG, web, email, WhatsApp" />
          </div>
        </div>
      </section>

      {/* What the AI does */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                One AI worker. Your entire brand operation.
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                Built for DTC and CPG brands that need to scale without scaling headcount.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <FeatureRow
                icon={MessageSquareIcon}
                title="Instant product Q&A"
                desc='Ingredients, allergens, caffeine content, sizing, shipping — answered in under 60 seconds on every channel. "Does this contain gluten?" never goes unanswered again.'
              />
              <FeatureRow
                icon={SmartphoneIcon}
                title="Every channel, one brain"
                desc="Instagram DMs, SMS, your website chat, WhatsApp, Facebook Messenger. One AI with your full product knowledge — everywhere your customers are."
              />
              <FeatureRow
                icon={RefreshCwIcon}
                title="Abandoned cart recovery"
                desc="Customer added to cart but didn't buy? Your AI follows up with a personalised message, answers objections, and offers the right nudge at the right time."
              />
              <FeatureRow
                icon={MegaphoneIcon}
                title="Content on autopilot"
                desc="Weekly blog posts, Instagram captions, product descriptions, email newsletters — your AI drafts them based on your brand voice. You approve and post."
              />
              <FeatureRow
                icon={PackageIcon}
                title="Wholesale & retail buyer intake"
                desc="Retail buyers asking about your product? AI gathers their info (store size, location, volume), answers their questions, and routes them to your sales inbox — warm."
              />
              <FeatureRow
                icon={TrendingUpIcon}
                title="SEO website included"
                desc="A full multi-page website built by AI — product pages, ingredient breakdowns, FAQ, blog — all optimised to rank when people search your category."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Brand use cases */}
      <section id="use-cases" className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Built for your type of brand</h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                Whether you sell coffee, skincare, snacks, or supplements — here's exactly what your AI handles.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              {USE_CASES.map((uc) => (
                <div key={uc.brand} className="rounded-2xl bg-white border border-gray-200 p-6">
                  <p className="text-lg font-bold text-gray-900 mb-3">{uc.brand}</p>
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">The problem</p>
                    <p className="text-sm text-gray-600">{uc.problem}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">What Kyra does</p>
                    <p className="text-sm text-gray-700">{uc.solution}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                The DTC brand problem nobody talks about
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingBagIcon className="h-5 w-5 text-red-500" />
                  <p className="font-bold text-red-700">Without Kyra</p>
                </div>
                <ul className="space-y-2.5 text-sm text-red-800">
                  {[
                    'Customer DMs you at 9pm — no reply until morning. Sale lost.',
                    '"What\'s the difference between X and Y?" answered 50x a week manually',
                    'Retail buyer emails cold — you respond 3 days later. They moved on.',
                    'Content calendar always behind — too busy handling support',
                    'No visibility into what questions customers actually ask',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-red-400 font-bold mt-0.5 shrink-0">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ZapIcon className="h-5 w-5 text-green-600" />
                  <p className="font-bold text-green-700">With Kyra</p>
                </div>
                <ul className="space-y-2.5 text-sm text-green-800">
                  {[
                    'Every DM answered in under 60 seconds — any time of day',
                    'Product comparison questions handled with your exact copy',
                    'Retail buyers get a polished response instantly, warm lead in your inbox',
                    'AI drafts weekly blog posts, captions, emails — you review and post',
                    'Full conversation history showing exactly what customers ask most',
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
      <section className="bg-gray-50 border-y border-gray-100 py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Live in 48 hours</h2>
              <p className="text-gray-500">No developers. No complicated setup.</p>
            </div>
            <div className="space-y-4">
              {[
                { step: '1', title: 'Tell us about your brand', desc: 'Products, ingredients, brand voice, common customer questions, shipping policy. 15 minutes with a form.' },
                { step: '2', title: 'Your AI worker is configured', desc: 'We build it on our e-commerce template. It knows your product range, can compare items, answer FAQs, and draft content in your voice.' },
                { step: '3', title: 'Test every scenario', desc: '"Is this vegan?" "How is this different from [competitor]?" "Can I wholesale?" Test until you\'re happy. We tweak until it\'s right.' },
                { step: '4', title: 'Connect your channels', desc: 'Your website chat widget, SMS number, Instagram DMs, email inbox. Each takes under 10 minutes to connect.' },
                { step: '5', title: 'Your AI worker goes live', desc: 'Every inquiry handled instantly. You see every conversation. Content drafts land in your inbox weekly.' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 items-start">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">
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

      {/* Pricing CTA */}
      <section className="bg-orange-950 py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Less than one customer support hire. For your whole brand.
            </h2>
            <p className="text-orange-200 mb-8 max-w-xl mx-auto">
              Most DTC brands spend $3,000–$6,000/month on customer support staff. Kyra handles the routine 80% automatically — so your team focuses on what actually needs a human.
            </p>
            <div className="rounded-2xl bg-orange-900 border border-orange-700 p-8 mb-6">
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-5xl font-black text-orange-300">Free</span>
                <span className="text-orange-400">during beta</span>
              </div>
              <p className="text-orange-200 text-sm mb-6">
                Bring your own AI key (Anthropic or OpenAI). Full platform. No limits during beta.
              </p>
              <ul className="space-y-2 text-left max-w-xs mx-auto mb-6">
                {[
                  'E-commerce AI worker pre-trained on your products',
                  'SMS + Instagram DMs + web chat + email',
                  'Content drafting (blog, social, email)',
                  'SEO website with product & FAQ pages',
                  'Full conversation history & analytics',
                  'Setup support included',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-orange-100">
                    <CheckCircleIcon className="h-4 w-4 text-orange-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/solo"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-orange-400 hover:bg-orange-300 transition font-bold text-orange-950 text-lg w-full justify-center"
              >
                Deploy Your Brand AI — Free
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
              <p className="text-xs text-orange-600 mt-3">Beta is free · Paid plans from $79/mo · Early adopters get 50% off forever</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Your customers are messaging right now. Who's answering?
          </h2>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">
            The brand that responds first wins the sale. Don't let a slow reply cost you the customer you already earned.
          </p>
          <Link
            href="/solo"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-orange-600 hover:bg-orange-500 transition font-bold text-white text-lg"
          >
            Get Your Brand AI Free
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
          <p className="text-sm text-gray-400 mt-4">
            Questions?{' '}
            <Link href="mailto:angel@conversionsystem.com" className="text-orange-600 hover:underline">
              Email us
            </Link>
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
