import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
import { INDUSTRY_TEMPLATES } from '@/lib/templates/industry-templates';

export const metadata: Metadata = {
  title: 'AI Workers for 50+ Industries | Kyra — Free During Beta',
  description: 'Browse 50+ AI worker templates for every industry. Dental, real estate, cannabis, law, HVAC, restaurants, and more. Deploy in minutes. Free during beta. Powered by OpenClaw.',
  openGraph: {
    title: 'AI Workers for 50+ Industries | Kyra',
    description: 'Deploy autonomous AI workers for any industry. 50+ pre-built templates. Free during beta.',
    url: 'https://kyra.conversionsystem.com/ai-for',
  },
  alternates: { canonical: 'https://kyra.conversionsystem.com/ai-for' },
};

// Group templates by category
const CATEGORIES: Record<string, string[]> = {
  'Healthcare': ['dental', 'medspa', 'veterinary', 'chiropractic', 'physical-therapy', 'therapy'],
  'Home Services': ['plumbing', 'hvac', 'electrician', 'cleaning', 'roofing', 'painting', 'pool-service', 'flooring', 'landscaping', 'pest-control', 'home-remodeling', 'construction', 'locksmith'],
  'Professional Services': ['law-firm', 'accounting', 'insurance', 'mortgage', 'staffing', 'property-management'],
  'Retail & Hospitality': ['restaurant', 'cannabis', 'ecommerce', 'salon', 'tattoo', 'dry-cleaning', 'catering'],
  'Automotive & Transport': ['auto-repair', 'car-dealership', 'towing', 'moving'],
  'Fitness & Wellness': ['gym', 'personal-trainer', 'yoga-studio', 'martial-arts'],
  'Education & Lifestyle': ['tutoring', 'music-lessons', 'photography', 'wedding-planner'],
  'Other': ['real-estate', 'solar', 'travel', 'pet-services', 'daycare', 'senior-care'],
};

export default function AiForIndexPage() {
  const templateMap = new Map(INDUSTRY_TEMPLATES.map((t) => [t.id, t]));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
      <PublicNav />

      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <span className="bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">New</span>
            50+ industry templates
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4">
            AI workers for <span className="text-indigo-400">every industry</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Each template comes pre-configured with the right personality, tools, conversation flows, and automations for your industry. Deploy in minutes. Start with 1 free account.
          </p>
        </div>

        {/* Categories */}
        {Object.entries(CATEGORIES).map(([category, slugs]) => {
          const templates = slugs.map((s) => templateMap.get(s)).filter(Boolean);
          if (templates.length === 0) return null;

          return (
            <div key={category} className="mb-12">
              <h2 className="text-xl font-black text-slate-300 mb-4 flex items-center gap-2">
                {category}
                <span className="text-sm font-normal text-slate-500">({templates.length})</span>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((t) => t && (
                  <Link
                    key={t.id}
                    href={`/ai-for/${t.id}`}
                    className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-indigo-400/40 hover:bg-white/[0.07] transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{t.emoji}</span>
                      <div>
                        <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors">{t.name}</h3>
                        <p className="text-xs text-slate-500">{t.suggestedTools.length} tools · {t.automations?.length || 0} automations</p>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm line-clamp-2">{t.description}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {t.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="bg-white/5 text-slate-500 text-[11px] px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {/* CTA */}
        <div className="text-center mt-16">
          <div className="bg-indigo-600 rounded-2xl p-10 max-w-2xl mx-auto">
            <h2 className="text-3xl font-black mb-4">Ready to deploy?</h2>
            <p className="text-indigo-200 mb-6">Pick any template above and have your AI worker live in under 5 minutes.</p>
            <Link
              href="/solo"
              className="inline-flex items-center gap-2 bg-white text-indigo-700 font-black text-lg px-10 py-4 rounded-xl hover:bg-indigo-50 transition"
            >
              Try Kyra Free →
            </Link>
            <p className="text-indigo-300 text-sm mt-3">1 free account included · No credit card required</p>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
