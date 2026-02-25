import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

type Params = { params: Promise<{ agencyId: string }> };

const INDUSTRY_META: Record<string, { emoji: string; label: string; desc: string; demo: string }> = {
  dental:      { emoji: '🦷', label: 'Dental',       desc: 'AI receptionist for dental practices',    demo: 'dental' },
  realestate:  { emoji: '🏡', label: 'Real Estate',  desc: 'AI lead qualifier for real estate',       demo: 'realestate' },
  auto:        { emoji: '🚗', label: 'Auto',          desc: 'AI sales assistant for dealerships',      demo: 'auto' },
  cannabis:    { emoji: '🌿', label: 'Cannabis',      desc: 'AI budtender for dispensaries',           demo: 'cannabis' },
  restaurant:  { emoji: '🍽️', label: 'Restaurant',   desc: 'AI host for restaurants & catering',     demo: 'restaurant' },
  medspa:      { emoji: '✨', label: 'Med Spa',        desc: 'AI concierge for aesthetic clinics',      demo: 'medspa' },
  law:         { emoji: '⚖️', label: 'Legal',          desc: 'AI intake for law firms',                demo: 'law' },
  fitness:     { emoji: '💪', label: 'Fitness',       desc: 'AI receptionist for gyms & studios',     demo: 'fitness' },
};

async function getAgencyData(agencyId: string) {
  const sb = createServiceClientWithoutCookies();

  const { data: agency } = await sb
    .from('agencies')
    .select('id, name, settings')
    .eq('id', agencyId)
    .single();

  if (!agency) return null;

  const { data: clients } = await sb
    .from('agency_clients')
    .select('industry')
    .eq('agency_id', agencyId)
    .eq('status', 'active');

  // Unique industries
  const industrySet = new Set<string>();
  (clients ?? []).forEach(c => { if (c.industry) industrySet.add(c.industry.toLowerCase()); });

  return {
    name: agency.name,
    tagline: (agency.settings as Record<string, string> | null)?.tagline ?? null,
    industries: [...industrySet],
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { agencyId } = await params;
  const data = await getAgencyData(agencyId);
  if (!data) return {};
  return {
    title: `${data.name} | AI Worker Solutions`,
    description: `${data.name} uses Kyra AI to provide 24/7 AI workers for businesses. ${data.industries.length > 0 ? `Specializing in: ${data.industries.map(i => INDUSTRY_META[i]?.label ?? i).join(', ')}.` : ''}`,
  };
}

export default async function AgencyProfilePage({ params }: Params) {
  const { agencyId } = await params;
  const data = await getAgencyData(agencyId);
  if (!data) notFound();

  const industries = data.industries
    .map(ind => INDUSTRY_META[ind])
    .filter(Boolean);

  const primaryDemo = industries[0]?.demo ?? 'dental';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Hero */}
      <div className="py-20 px-6 text-center max-w-3xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-2xl font-black mx-auto mb-6">
          {data.name.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-4xl sm:text-5xl font-black mb-4">{data.name}</h1>
        {data.tagline ? (
          <p className="text-slate-400 text-xl mb-8">{data.tagline}</p>
        ) : (
          <p className="text-slate-400 text-xl mb-8">
            We equip local businesses with AI workers that respond 24/7 — no staff required.
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href={`/try/${primaryDemo}`}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-7 py-3.5 rounded-xl transition">
            💬 Try a Live Demo
          </Link>
          <a href="mailto:?subject=AI%20Employee%20Solutions"
            className="bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold px-7 py-3.5 rounded-xl transition">
            Get In Touch
          </a>
        </div>
      </div>

      {/* Industries */}
      {industries.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 mb-20">
          <h2 className="text-xl font-black text-center mb-8 text-slate-300">Industries We Serve</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {industries.map(ind => (
              <Link key={ind.demo} href={`/try/${ind.demo}`}
                className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/50 rounded-2xl p-5 transition">
                <div className="text-3xl mb-3">{ind.emoji}</div>
                <h3 className="font-bold text-white mb-1">{ind.label} AI</h3>
                <p className="text-slate-400 text-sm">{ind.desc}</p>
                <p className="text-indigo-400 text-xs font-semibold mt-3 group-hover:text-indigo-300 transition">
                  Try live demo →
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 mb-20">
        <h2 className="text-xl font-black text-center mb-8 text-slate-300">How It Works</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { n: '01', title: 'We connect to your SMS', desc: 'Your existing business number starts routing to the AI — no new number needed.' },
            { n: '02', title: 'AI learns your business', desc: 'We configure the AI with your pricing, FAQs, policies, and booking process.' },
            { n: '03', title: 'It responds in 60 seconds', desc: 'Every text, 24/7. Books appointments, answers questions, escalates edge cases to you.' },
          ].map(s => (
            <div key={s.n} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <p className="text-3xl font-black text-indigo-400 mb-3">{s.n}</p>
              <h3 className="font-bold text-white mb-2">{s.title}</h3>
              <p className="text-slate-400 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 mb-20 text-center">
        <div className="bg-indigo-950/40 border border-indigo-900/40 rounded-2xl p-8">
          <h2 className="text-2xl font-black mb-3">Ready to get your AI worker?</h2>
          <p className="text-slate-400 mb-6">Most businesses are live within 10 minutes. No contract, cancel anytime.</p>
          <Link href={`/try/${primaryDemo}`}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-xl transition">
            Try a Live Demo →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-6 text-center">
        <p className="text-slate-600 text-sm">
          Powered by{' '}
          <Link href="https://kyra.conversionsystem.com" className="text-indigo-500 hover:text-indigo-400 transition">
            Kyra AI
          </Link>
          {' '}· AI workforce platform for agencies
        </p>
      </footer>
    </div>
  );
}
