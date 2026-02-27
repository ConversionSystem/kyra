// Public agency results page — /results/[agencySlug]
// Agencies share this URL with prospective clients as social proof
// e.g. kyra.conversionsystem.com/results/apex-digital

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';

import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
interface Props {
  params: Promise<{ agencySlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { agencySlug } = await params;
  return {
    title: `${agencySlug} — AI Worker Results | Powered by Kyra`,
    description: `See real AI worker performance metrics for ${agencySlug}. Powered by Kyra.`,
  };
}

async function getAgencyStats(slug: string) {
  const svc = createServiceClientWithoutCookies();

  // Fetch agency
  const { data: agency } = await svc
    .from('agencies')
    .select('id, name, slug, plan, created_at, settings')
    .eq('slug', slug)
    .single();

  if (!agency) return null;

  // Check if agency has opted into public results (default: off for privacy)
  const settings = (agency.settings as Record<string, unknown>) ?? {};
  if (settings.public_results === false) return null;

  // Fetch client stats
  const { data: clients } = await svc
    .from('agency_clients')
    .select('id, name, industry, gateway_status, usage_this_month, container_config')
    .eq('agency_id', agency.id);

  const totalClients = clients?.length ?? 0;
  const activeClients = clients?.filter(c => c.gateway_status === 'running').length ?? 0;
  const totalUsage = clients?.reduce((sum, c) => sum + (c.usage_this_month ?? 0), 0) ?? 0;

  // Get all-time conversation count
  const { count: totalConversations } = await svc
    .from('client_conversations')
    .select('*', { count: 'exact', head: true })
    .in('client_id', (clients ?? []).map(c => c.id));

  // Industries served
  const industries = Array.from(
    new Set((clients ?? []).map(c => c.industry).filter(Boolean))
  ).slice(0, 6) as string[];

  return {
    name: agency.name,
    slug: agency.slug,
    plan: agency.plan,
    memberSince: agency.created_at,
    totalClients,
    activeClients,
    conversationsThisMonth: totalUsage,
    totalConversations: totalConversations ?? 0,
    industries,
  };
}

const INDUSTRY_EMOJI: Record<string, string> = {
  dental: '🦷', 'real estate': '🏡', cannabis: '🌿', auto: '🚗',
  restaurant: '🍽️', 'med spa': '💆', fitness: '💪', legal: '⚖️',
  'home services': '🔧', insurance: '📋', mortgage: '🏦', education: '🎓',
};

function getEmoji(industry: string) {
  const lower = industry.toLowerCase();
  for (const [key, emoji] of Object.entries(INDUSTRY_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return '🤖';
}

export default async function AgencyResultsPage({ params }: Props) {
  const { agencySlug } = await params;
  const stats = await getAgencyStats(agencySlug);

  if (!stats) notFound();

  const memberSince = new Date(stats.memberSince);
  const monthsActive = Math.max(1, Math.round(
    (Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24 * 30)
  ));

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <PublicNav />
      {/* Kyra powered bar */}
      <div className="bg-indigo-900 text-white text-center text-xs px-4 py-2.5">
        <span className="text-indigo-300">AI workers powered by </span>
        <Link href="/" className="font-bold text-white hover:underline">Kyra</Link>
        <span className="text-indigo-300"> · kyra.conversionsystem.com</span>
      </div>

      {/* Nav */}
      <nav className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">AI Worker Performance</p>
            <p className="font-black text-xl text-gray-900">{stats.name}</p>
          </div>
          <Link href="/signup/agency" className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition">
            Get This for Your Business →
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-semibold px-4 py-2 rounded-full mb-6 border border-green-200">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block" />
            {stats.activeClients} AI {stats.activeClients === 1 ? 'employee' : 'employees'} active right now
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-4">
            {stats.name}'s AI workers<br />
            <span className="text-indigo-600">are working around the clock.</span>
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Every inbound SMS, inquiry, and lead — handled automatically in under 60 seconds. 24/7, no staff required.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {[
            { value: stats.totalConversations.toLocaleString(), label: 'Conversations handled', sub: 'All time', color: 'text-indigo-600' },
            { value: stats.conversationsThisMonth.toLocaleString(), label: 'This month', sub: 'AI responses sent', color: 'text-green-600' },
            { value: `${stats.activeClients}`, label: 'Active AI workers', sub: 'Across clients', color: 'text-purple-600' },
            { value: '< 60s', label: 'Avg response time', sub: 'Day and night', color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="border border-gray-200 rounded-2xl p-5 text-center">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-sm font-semibold text-gray-800 mt-1">{s.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* What the AI does */}
        <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 mb-10">
          <h2 className="text-xl font-black mb-6">What the AI worker handles</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: '💬', title: 'Responds in < 60 seconds', desc: 'Every inbound SMS, inquiry, or lead gets an intelligent reply — including nights and weekends.' },
              { icon: '📅', title: 'Books appointments', desc: 'Checks availability and books directly into the calendar. No human needed.' },
              { icon: '🏷️', title: 'Updates the CRM', desc: 'Every conversation is logged. Contacts tagged, notes written, pipeline updated.' },
              { icon: '🚨', title: 'Escalates when needed', desc: 'Detects frustration or complex issues and immediately pings the team.' },
            ].map(f => (
              <div key={f.title} className="flex gap-3">
                <span className="text-2xl leading-none">{f.icon}</span>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{f.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Industries */}
        {stats.industries.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-black mb-4">Industries served</h2>
            <div className="flex flex-wrap gap-2">
              {stats.industries.map(ind => (
                <span key={ind} className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 text-sm font-medium px-3 py-1.5 rounded-full border border-indigo-100">
                  {getEmoji(ind)} {ind}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA box */}
        <div className="bg-indigo-700 text-white rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-black mb-3">Want AI workers for your business?</h2>
          <p className="text-indigo-200 mb-6">
            {stats.name} uses Kyra to power their AI workers. Set up your own in under 10 minutes — free to start.
          </p>
          <Link href="/signup/agency" className="inline-block bg-white text-indigo-900 font-black text-lg px-8 py-4 rounded-xl hover:bg-indigo-50 transition">
            Start Free — $2 in Credits Included →
          </Link>
          <p className="text-indigo-400 text-sm mt-3">No credit card · Works with GoHighLevel · Cancel anytime</p>
        </div>

        {/* Member since */}
        <p className="text-center text-xs text-gray-400 mt-8">
          {stats.name} has been using Kyra AI workers for {monthsActive} month{monthsActive !== 1 ? 's' : ''}
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}
