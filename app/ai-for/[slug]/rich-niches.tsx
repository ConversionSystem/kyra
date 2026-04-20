// Rich-content niches for /ai-for/[slug] — RENDERER + re-exports.
//
// Data (NICHES record + NICHE_SLUGS + NicheData type) lives in
// rich-niches-data.ts so tests can import the data without a JSX transform.
// The default export is the React component that renders a rich niche page.

import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
import { NICHES, NICHE_SLUGS, type NicheData } from './rich-niches-data';

// Re-export so existing callers of this module (page.tsx) keep working.
export { NICHES, NICHE_SLUGS };
export type { NicheData };

/**
 * Full page renderer for a rich niche. Same layout as the retired
 * app/ai-for/[niche]/page.tsx — just lifted into a component that
 * the [slug] route can call conditionally.
 */
export default function RichNichePage({ niche, data }: { niche: string; data: NicheData }) {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <PublicNav />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-bold px-4 py-2 rounded-full mb-6 border border-indigo-100">
              {data.emoji} AI Workforce Platform
            </div>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-6">
              {data.hero}
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed mb-8">
              {data.subhero}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/solo" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg px-8 py-4 rounded-xl transition text-center">
                Start Free — 50 Credits Included
              </Link>
              <Link href={`/try/${data.demoSlug}`} className="inline-block border-2 border-gray-200 hover:border-indigo-300 text-gray-700 font-semibold text-lg px-6 py-4 rounded-xl transition text-center">
                {data.emoji} See live demo →
              </Link>
            </div>
            <p className="text-gray-400 text-sm mt-4">No credit card · Setup in under 10 minutes · Works with any CRM</p>
          </div>
          <div className="space-y-4">
            <div className="bg-indigo-900 text-white rounded-2xl p-8 text-center">
              <p className="text-sm text-indigo-300 mb-2">Proven result</p>
              <p className="text-5xl font-black">{data.resultStat}</p>
              <p className="text-indigo-300 text-sm mt-2">for {data.emoji} {data.slug} clients</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
              <p className="font-bold text-gray-900 mb-2 text-sm">The core problem:</p>
              <p className="text-sm font-semibold text-red-600 mb-2">{data.pain}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{data.painDetail}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">What the AI worker handles</h2>
          <p className="text-center text-gray-500 mb-12">{data.result}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.features.map(f => (
              <div key={f.title} className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">
            Real questions your {data.emoji} clients get — handled automatically
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.useCases.map(uc => (
              <div key={uc} className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <span className="text-green-500 font-black shrink-0 text-lg leading-none">✓</span>
                <p className="text-sm text-gray-700 leading-relaxed italic">&quot;{uc}&quot;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-indigo-50 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-3">Set up in under 10 minutes</h2>
          <p className="text-gray-500 mb-12">Connects to your existing tools. No new software your clients need to learn.</p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Add a client', desc: 'Enter the business name and pick an industry template. 2 minutes.' },
              { step: '02', title: `${data.emoji} Pick template`, desc: `Choose the ${data.slug} industry template. Pre-built AI personality included.` },
              { step: '03', title: 'Go live', desc: 'AI starts responding to every inbound message immediately.' },
            ].map(s => (
              <div key={s.step}>
                <div className="w-14 h-14 rounded-full bg-indigo-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-4">{s.step}</div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Common questions</h2>
          <div className="space-y-6">
            {data.faq.map(item => (
              <div key={item.q} className="border-b border-gray-200 pb-6">
                <p className="font-bold text-gray-900 mb-2">{item.q}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other niches */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold text-gray-500 mb-6">Kyra AI works for 50+ industries</p>
          <div className="flex flex-wrap justify-center gap-3">
            {NICHE_SLUGS.filter(s => s !== niche).map(s => (
              <Link key={s} href={`/ai-for/${s}`}
                className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline capitalize">
                {NICHES[s].emoji} {s.replace(/-/g, ' ')}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-900 text-white py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Deploy your first {data.emoji} AI worker today.
          </h2>
          <p className="text-indigo-200 mb-8 text-lg">
            Free to start. Setup in under 10 minutes. 50 credits included.
          </p>
          <Link href="/solo" className="inline-block bg-white text-indigo-900 font-black text-xl px-10 py-5 rounded-xl hover:bg-indigo-50 transition">
            Get Started Free →
          </Link>
          <p className="text-indigo-400 text-sm mt-4">No credit card · Works with any CRM · Cancel anytime</p>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
