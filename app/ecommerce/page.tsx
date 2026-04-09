import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
import {
  ArrowRightIcon,
  MessageSquareIcon,
  CheckCircleIcon,
  ShoppingBagIcon,
  ZapIcon,
  SmartphoneIcon,
  RefreshCwIcon,
  PackageIcon,
  MegaphoneIcon,
  TrendingUpIcon,
  GlobeIcon,
} from 'lucide-react';

export const metadata = {
  title: 'AI Worker for E-Commerce & Consumer Brands | Kyra',
  description:
    'Kyra deploys a full AI worker for your e-commerce or CPG brand — instant product Q&A, content on autopilot, SEO website, and lead capture across every channel. 24/7.',
};

const USE_CASES = [
  {
    emoji: '☕',
    brand: 'Instant Coffee Brand',
    problem: '"How does this taste vs Nespresso?" answered manually 50x a day.',
    solution: 'AI answers brew methods, product comparisons, and flavour profiles instantly — on SMS, email, and web chat.',
  },
  {
    emoji: '💄',
    brand: 'Skincare / Beauty Brand',
    problem: '"Is this good for sensitive skin?" Support inbox overflows. Sales lost before they start.',
    solution: 'AI handles product-fit questions with your ingredient knowledge, recommends bundles, and captures every lead who inquires.',
  },
  {
    emoji: '🍫',
    brand: 'Food & Snack Brand',
    problem: 'Retail buyers ask for info. Customers ask about allergens. Both go unanswered for days.',
    solution: 'AI responds to consumer questions instantly and routes warm wholesale inquiries to your inbox — with all the info already gathered.',
  },
  {
    emoji: '🏋️',
    brand: 'Supplements Brand',
    problem: 'Customers compare you to competitors. No one is there to handle objections and close.',
    solution: "AI handles comparisons in your favour, answers objections, and books a sales call when the lead is warm.",
  },
];

const FEATURES = [
  { icon: MessageSquareIcon, title: 'Instant product Q&A', desc: 'Ingredients, allergens, caffeine content, sizing, shipping — answered in under 60 seconds on every channel. Nothing goes unanswered.' },
  { icon: SmartphoneIcon, title: 'Every channel, one brain', desc: 'SMS, website chat, WhatsApp, Telegram, email. One AI with your full product knowledge — everywhere your customers are.' },
  { icon: RefreshCwIcon, title: 'Payment collection', desc: 'Send Stripe payment links via SMS — collect deposits, invoices, and fees directly in conversation. No separate payment flow needed.' },
  { icon: MegaphoneIcon, title: 'Content drafting', desc: 'Product descriptions, FAQ answers, email copy — drafted in your brand voice. You review and post.' },
  { icon: PackageIcon, title: 'Wholesale & retail buyer intake', desc: 'Retail buyers asking about your product get a polished response instantly. AI gathers their details and routes a warm lead to your inbox.' },
  { icon: GlobeIcon, title: 'SEO website included', desc: 'A full multi-page website built by AI — product pages, ingredient breakdowns, FAQ, blog — optimised to rank when people search your category.' },
];

export default function EcommercePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
      <PublicNav />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 pt-20 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-8">
          <span className="bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">New</span>
          E-Commerce & Consumer Brands · AI Workers
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] mb-6 tracking-tight">
          Your brand deserves an AI that{' '}
          <span className="text-indigo-400">sells for you 24/7.</span>
        </h1>
        <p className="text-slate-300 text-lg sm:text-xl leading-relaxed mb-8 max-w-2xl mx-auto">
          Instant product answers on every channel. Content that ranks. Lead capture on autopilot.
          An AI worker trained on your brand — working while you sleep.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/solo"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white font-bold text-lg px-8 py-4 rounded-xl"
          >
            Deploy Free — No Card Required
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
          <Link
            href="#use-cases"
            className="inline-flex items-center justify-center gap-2 border border-white/20 text-white hover:bg-white/10 transition font-semibold text-lg px-8 py-4 rounded-xl"
          >
            See Brand Examples
          </Link>
        </div>
        <p className="text-sm text-slate-500 mt-4">1 free account included · No credit card needed · Cancel anytime</p>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-14">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '24/7', label: 'Customer support', sub: 'Every DM and question answered' },
              { value: '< 60s', label: 'Response time', sub: 'Faster than any human team' },
              { value: '100%', label: 'Leads captured', sub: 'No inquiry goes unanswered' },
              { value: '7', label: 'Channels at once', sub: 'SMS, WhatsApp, Telegram, Discord, voice, email, web chat' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                <p className="text-3xl font-black text-white">{s.value}</p>
                <p className="text-sm font-semibold text-white mt-1">{s.label}</p>
                <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature grid ──────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              One AI worker.{' '}
              <span className="text-indigo-400">Your entire brand operation.</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Built for DTC and CPG brands that need to scale without scaling headcount.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-indigo-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Brand use cases ───────────────────────────────────────────── */}
      <section id="use-cases" className="border-t border-white/10 py-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Built for your type of brand</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Coffee, skincare, snacks, supplements — here is exactly what your AI handles.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {USE_CASES.map(uc => (
              <div key={uc.brand} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{uc.emoji}</span>
                  <h3 className="font-bold text-white">{uc.brand}</h3>
                </div>
                <div className="mb-3">
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">The problem</p>
                  <p className="text-sm text-slate-400">{uc.problem}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-1">What Kyra does</p>
                  <p className="text-sm text-slate-300">{uc.solution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before / After ────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">
              The DTC problem nobody talks about
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBagIcon className="h-5 w-5 text-red-400" />
                <p className="font-bold text-red-400">Without Kyra</p>
              </div>
              <ul className="space-y-2.5">
                {[
                  'Customer DMs at 9pm — no reply until morning. Sale lost.',
                  '"What\'s the difference between X and Y?" answered manually 50x a week',
                  'Retail buyer emails cold — you reply 3 days later. They moved on.',
                  'Content calendar always behind — too busy handling support',
                  'No visibility into what customers actually ask most',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="text-red-400 font-bold mt-0.5 shrink-0">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <ZapIcon className="h-5 w-5 text-green-400" />
                <p className="font-bold text-green-400">With Kyra</p>
              </div>
              <ul className="space-y-2.5">
                {[
                  'Every message answered in under 60 seconds — any time of day',
                  'Product comparisons handled with your exact copy, instantly',
                  'Retail buyers get a polished response immediately — warm lead in your inbox',
                  'AI drafts product copy, FAQ answers, emails — you review and post',
                  'Full conversation history showing exactly what customers ask most',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircleIcon className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-black mb-4">Live in 48 hours</h2>
            <p className="text-slate-400">No developers. No complicated setup.</p>
          </div>
          <div className="space-y-5">
            {[
              { step: '1', title: 'Tell us about your brand', desc: 'Products, ingredients, brand voice, common questions, shipping policy. 15 minutes with a form.' },
              { step: '2', title: 'Your AI worker is configured', desc: 'Built on our e-commerce template. It knows your product range, can compare items, answer FAQs, and draft content in your voice.' },
              { step: '3', title: 'Test every scenario', desc: '"Is this vegan?" "How is this different from [competitor]?" "Can I wholesale?" Test until you\'re satisfied. We adjust until it\'s right.' },
              { step: '4', title: 'Connect your channels', desc: 'Website chat, SMS, WhatsApp, Telegram, email, voice, Discord. 7 channels, each takes under 10 minutes to connect.' },
              { step: '5', title: 'Your AI worker goes live', desc: 'Every inquiry handled instantly. You see every conversation. Content drafts land in your inbox weekly.' },
            ].map(item => (
              <div key={item.step} className="flex gap-4 items-start">
                <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                  {item.step}
                </div>
                <div className="pt-1.5">
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="text-sm text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="border-t border-white/10 py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Your customers are messaging right now.{' '}
            <span className="text-indigo-400">Who is answering?</span>
          </h2>
          <p className="text-slate-400 text-lg mb-3 max-w-lg mx-auto">
            The brand that responds first wins the sale. Deploy your AI worker free and never miss another customer.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8">
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-5xl font-black text-white">$99</span>
              <span className="text-slate-400">/mo — Lite plan</span>
            </div>
            <p className="text-slate-400 text-sm mb-6">
              Full AI worker platform. 4 AI workers, 5,000 credits/month, 7 channels. Start with 1 free account.
            </p>
            <ul className="space-y-2 text-left max-w-xs mx-auto mb-6">
              {[
                'E-commerce AI worker trained on your products',
                'SMS + web chat + email + WhatsApp',
                'Content drafting (blog, social, email)',
                'SEO website with product & FAQ pages',
                'Full conversation history & analytics',
                'Review management + lead scoring',
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircleIcon className="h-4 w-4 text-indigo-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/solo"
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 transition text-white font-bold text-lg px-8 py-4 rounded-xl w-full"
            >
              Deploy Your Brand AI — Free
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <p className="text-xs text-slate-600 mt-3">1 free account included · No credit card needed · Plans from $99/mo</p>
          </div>
          <p className="text-sm text-slate-500">
            Questions?{' '}
            <Link href="mailto:angel@conversionsystem.com" className="text-indigo-400 hover:underline">
              Email us
            </Link>
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
