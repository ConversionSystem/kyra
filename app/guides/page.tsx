import Link from 'next/link';
import { SETUP_GUIDES } from '@/lib/guides/setup-guides';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Setup Guides — Kyra AI Worker',
  description: 'Step-by-step guides to connect your AI worker to Facebook Ads, Google Ads, Instagram, WhatsApp, website chat, and more.',
};

const difficultyColor: Record<string, string> = {
  Easy: 'bg-green-100 text-green-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Advanced: 'bg-red-100 text-red-700',
};

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-950 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-blue-400 font-semibold text-sm mb-2">SETUP GUIDES</p>
          <h1 className="text-4xl font-bold mb-4">Connect Your AI Worker to Anything</h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Step-by-step guides to get your AI worker responding to leads from Facebook, Google, Instagram, WhatsApp, your website, and more.
          </p>
        </div>
      </div>

      {/* Guides Grid */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SETUP_GUIDES.map(guide => (
            <Link key={guide.id} href={`/guides/${guide.id}`}>
              <div className="border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all h-full flex flex-col">
                <span className="text-4xl mb-4 block">{guide.emoji}</span>
                <h3 className="font-bold text-gray-900 text-lg mb-1">{guide.title}</h3>
                <p className="text-blue-600 text-sm font-medium mb-2">{guide.subtitle}</p>
                <p className="text-gray-500 text-sm mb-4 flex-1">{guide.description}</p>
                <div className="flex items-center gap-2 mt-auto">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${difficultyColor[guide.difficulty]}`}>
                    {guide.difficulty}
                  </span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500">{guide.timeEstimate}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500">{guide.steps.length} steps</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 py-12 bg-gray-50 rounded-2xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Don&apos;t see your setup?</h2>
          <p className="text-gray-500 mb-6">
            If it connects to your CRM or website, your AI worker can handle it. Contact us and we&apos;ll help you set it up.
          </p>
          <Link href="/solo" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  );
}
