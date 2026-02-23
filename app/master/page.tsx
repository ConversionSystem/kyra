export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2, Users, Zap, DollarSign, Activity, Server,
  Crown, ChevronRight, Globe, BarChart3, AlertTriangle,
} from 'lucide-react';
import MasterVpsHealth from './master-vps-health';

const MASTER_EMAILS = ['angel@conversionsystem.com'];

function fmt(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default async function MasterDashboard() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !MASTER_EMAILS.includes(user.email ?? '')) redirect('/agency');

  // ── Platform stats ──────────────────────────────────────────────────────────
  const { data: agencies } = await sb
    .from('agencies')
    .select('id, name, slug, plan, account_level, created_at, settings, owner_id')
    .order('created_at', { ascending: false });

  const agencyIds = (agencies ?? []).map(a => a.id);

  const { data: clients } = await sb
    .from('agency_clients')
    .select('id, agency_id, name, industry, status, gateway_status, usage_this_month, billing_amount_cents, created_at')
    .in('agency_id', agencyIds.length ? agencyIds : ['00000000-0000-0000-0000-000000000000']);

  const allClients = clients ?? [];
  const realAgencies = (agencies ?? []).filter(a => a.account_level !== 'master');

  const platformMrr = allClients.reduce((s, c) => s + (c.billing_amount_cents ?? 0), 0);
  const activeClients = allClients.filter(c => c.gateway_status === 'running').length;
  const totalConversations = allClients.reduce((s, c) => s + (c.usage_this_month ?? 0), 0);

  // Clients per agency map
  const clientsByAgency: Record<string, typeof allClients> = {};
  for (const c of allClients) {
    if (!clientsByAgency[c.agency_id]) clientsByAgency[c.agency_id] = [];
    clientsByAgency[c.agency_id].push(c);
  }

  const agenciesWithStats = realAgencies.map(a => ({
    ...a,
    client_count: clientsByAgency[a.id]?.length ?? 0,
    running_clients: clientsByAgency[a.id]?.filter(c => c.gateway_status === 'running').length ?? 0,
    monthly_conversations: clientsByAgency[a.id]?.reduce((s, c) => s + c.usage_this_month, 0) ?? 0,
    monthly_revenue_cents: clientsByAgency[a.id]?.reduce((s, c) => s + c.billing_amount_cents, 0) ?? 0,
  }));

  const PLAN_COLOR: Record<string, string> = {
    free: 'bg-gray-100 text-gray-600',
    starter: 'bg-blue-100 text-blue-700',
    pro: 'bg-indigo-100 text-indigo-700',
    scale: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── Top Bar ── */}
      <div className="border-b border-gray-800 bg-gray-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-600 p-2">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Master Control</h1>
            <p className="text-xs text-gray-400">Conversion System · Platform Owner</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/agency"
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
            Switch to Agency View <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 md:p-8">

        {/* ── Platform KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-indigo-600/20 p-2">
                <Building2 className="h-4 w-4 text-indigo-400" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Agencies</span>
            </div>
            <p className="text-3xl font-bold text-white">{realAgencies.length}</p>
            <p className="text-xs text-gray-500 mt-1">Platform customers</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-green-600/20 p-2">
                <Zap className="h-4 w-4 text-green-400" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">AI Employees</span>
            </div>
            <p className="text-3xl font-bold text-white">{allClients.length}</p>
            <p className="text-xs text-gray-500 mt-1">{activeClients} running now</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-blue-600/20 p-2">
                <BarChart3 className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Conversations</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalConversations.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-emerald-600/20 p-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wider">Platform MRR</span>
            </div>
            <p className="text-3xl font-bold text-white">{fmt(platformMrr)}</p>
            <p className="text-xs text-gray-500 mt-1">Agency billing total</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Agency List ── */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  All Agencies
                </h2>
                <span className="text-xs text-gray-500">{realAgencies.length} total</span>
              </div>

              {agenciesWithStats.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No agencies yet</div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {agenciesWithStats.map(agency => (
                    <div key={agency.id} className="px-6 py-4 hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {agency.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{agency.name}</p>
                            <p className="text-xs text-gray-500 truncate">/{agency.slug}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-gray-400">{agency.client_count} clients</p>
                            <p className="text-xs text-gray-600">{agency.running_clients} active</p>
                          </div>
                          <div className="text-right hidden md:block">
                            <p className="text-xs font-semibold text-emerald-400">{fmt(agency.monthly_revenue_cents)}/mo</p>
                            <p className="text-xs text-gray-600">{agency.monthly_conversations.toLocaleString()} convs</p>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${PLAN_COLOR[agency.plan] ?? PLAN_COLOR.free}`}>
                            {agency.plan}
                          </span>
                          <a
                            href={`/master/impersonate?agency=${agency.id}`}
                            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors whitespace-nowrap"
                          >
                            View →
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-4">
            {/* VPS Health */}
            <MasterVpsHealth />

            {/* Account Levels */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                Account Levels
              </h3>
              <div className="space-y-3">
                {[
                  { level: 'Master', count: 1, color: 'bg-yellow-500', desc: 'ConversionSystem' },
                  { level: 'Agency', count: realAgencies.length, color: 'bg-indigo-500', desc: 'Platform customers' },
                  { level: 'Sub-account', count: allClients.length, color: 'bg-blue-500', desc: 'AI employees' },
                  { level: 'Users', count: 0, color: 'bg-gray-600', desc: 'Portal users (pending)' },
                ].map(({ level, count, color, desc }) => (
                  <div key={level} className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${color} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-white">{level}</span>
                        <span className="text-xs text-gray-400 font-mono">{count}</span>
                      </div>
                      <p className="text-[10px] text-gray-600 truncate">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Quick Links</h3>
              <div className="space-y-2">
                {[
                  { label: 'Agency Dashboard', href: '/agency', icon: Building2 },
                  { label: 'VPS Provisioner', href: 'http://192.99.43.7:9090/health', icon: Server, external: true },
                  { label: 'Supabase', href: 'https://supabase.com/dashboard', icon: Activity, external: true },
                  { label: 'Vercel', href: 'https://vercel.com/dashboard', icon: Globe, external: true },
                ].map(({ label, href, icon: Icon, external }) => (
                  <a
                    key={href}
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors py-1.5"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    <ChevronRight className="h-3 w-3 ml-auto" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
