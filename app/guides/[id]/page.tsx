import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SETUP_GUIDES, getGuide } from '@/lib/guides/setup-guides';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return SETUP_GUIDES.map(g => ({ id: g.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const guide = getGuide(id);
  if (!guide) return { title: 'Guide Not Found' };
  return {
    title: `${guide.title} — Setup Guide | Kyra`,
    description: guide.description,
  };
}

const difficultyColor: Record<string, string> = {
  Easy: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Advanced: 'bg-red-100 text-red-700',
};

export default async function GuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guide = getGuide(id);
  if (!guide) notFound();

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-gray-950 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/guides" className="text-blue-400 hover:text-blue-300 text-sm mb-4 inline-block">
            ← All Guides
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">{guide.emoji}</span>
            <div>
              <h1 className="text-3xl font-bold">{guide.title}</h1>
              <p className="text-blue-400 font-medium mt-1">{guide.subtitle}</p>
            </div>
          </div>
          <p className="text-gray-400 mb-4">{guide.description}</p>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${difficultyColor[guide.difficulty]}`}>
              {guide.difficulty}
            </span>
            <span className="text-gray-500 text-sm">⏱ {guide.timeEstimate}</span>
            <span className="text-gray-500 text-sm">📋 {guide.steps.length} steps</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Prerequisites */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Before You Start</h2>
          <div className="bg-gray-50 rounded-xl p-5 space-y-2">
            {guide.prerequisites.map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">☐</span>
                <span className="text-gray-700 text-sm">{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-8">
          {guide.steps.map((step) => (
            <div key={step.step} className="relative">
              {/* Step number */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {step.step}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-gray-600 mb-4">{step.description}</p>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    {step.details.map((detail, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1 shrink-0">→</span>
                        <span
                          className="text-gray-700 text-sm"
                          dangerouslySetInnerHTML={{
                            __html: detail
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>'),
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Pro tip */}
                  {step.tip && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                      <p className="text-blue-800 text-sm">
                        <span className="font-bold">💡 Pro tip:</span> {step.tip}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        {guide.faq.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {guide.faq.map((f, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-5">
                  <p className="font-semibold text-gray-900 mb-2">{f.q}</p>
                  <p className="text-gray-600 text-sm">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="mt-10 flex flex-wrap gap-2">
          {guide.tags.map(tag => (
            <span key={tag} className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center py-10 bg-gray-950 rounded-2xl">
          <h2 className="text-2xl font-bold text-white mb-2">{guide.ctaText}</h2>
          <p className="text-gray-400 mb-6">Free to start. No credit card required.</p>
          <Link href="/solo" className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            Get Started Free
          </Link>
        </div>

        {/* Other guides */}
        <div className="mt-16">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Other Guides</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {SETUP_GUIDES.filter(g => g.id !== guide.id).slice(0, 4).map(g => (
              <Link key={g.id} href={`/guides/${g.id}`}>
                <div className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition flex items-center gap-3">
                  <span className="text-2xl">{g.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{g.title}</p>
                    <p className="text-gray-500 text-xs">{g.timeEstimate} · {g.difficulty}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
