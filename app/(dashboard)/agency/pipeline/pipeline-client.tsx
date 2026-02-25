'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Target, Plus, Search, Sparkles, Send, Loader2, ChevronDown,
  Users, Mail, MessageSquare, Calendar, CheckCircle2, X, Eye,
  Zap, Building2, MapPin, Briefcase, Globe, Linkedin, ArrowRight,
  BarChart3, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Campaign {
  id: string;
  name: string;
  target_industry: string | null;
  target_role: string | null;
  target_company_size: string | null;
  target_location: string | null;
  target_pain_points: string | null;
  value_prop: string | null;
  status: string;
  leads_found: number;
  leads_messaged: number;
  leads_replied: number;
  leads_booked: number;
  stage_counts: Record<string, number>;
  created_at: string;
}

interface Lead {
  id: string;
  campaign_id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  title: string | null;
  company: string | null;
  industry: string | null;
  company_size: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  website: string | null;
  enrichment_data: {
    company_context?: string;
    services_offered?: string;
    clients_mentioned?: string;
    tech_stack?: string;
    years_in_business?: string;
    number_of_employees?: string;
    likely_pain_points?: string;
    opportunity_angle?: string;
    icebreaker?: string;
    emails_found?: string[];
    phones_found?: string[];
    socials?: Record<string, string>;
    person_source?: string;
  };
  personalized_subject: string | null;
  personalized_email: string | null;
  personalized_opener: string | null;
  stage: string;
  ghl_contact_id: string | null;
  messaged_at: string | null;
  replied_at: string | null;
  notes: string | null;
  created_at: string;
}

type Stage = 'all' | 'found' | 'researched' | 'messaged' | 'replied' | 'interested' | 'booked' | 'closed';

const STAGES: { id: Stage; label: string; color: string; icon: typeof Search }[] = [
  { id: 'all', label: 'All', color: 'bg-gray-100 text-gray-700', icon: Users },
  { id: 'found', label: 'Found', color: 'bg-blue-100 text-blue-700', icon: Search },
  { id: 'researched', label: 'Researched', color: 'bg-purple-100 text-purple-700', icon: Sparkles },
  { id: 'messaged', label: 'Messaged', color: 'bg-indigo-100 text-indigo-700', icon: Send },
  { id: 'replied', label: 'Replied', color: 'bg-amber-100 text-amber-700', icon: MessageSquare },
  { id: 'interested', label: 'Interested', color: 'bg-orange-100 text-orange-700', icon: Zap },
  { id: 'booked', label: 'Booked', color: 'bg-green-100 text-green-700', icon: Calendar },
  { id: 'closed', label: 'Closed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
];

const STAGE_BADGE: Record<string, string> = {
  found: 'bg-blue-100 text-blue-700',
  researched: 'bg-purple-100 text-purple-700',
  approved: 'bg-cyan-100 text-cyan-700',
  messaged: 'bg-indigo-100 text-indigo-700',
  replied: 'bg-amber-100 text-amber-700',
  interested: 'bg-orange-100 text-orange-700',
  booked: 'bg-green-100 text-green-700',
  closed: 'bg-emerald-100 text-emerald-700',
  skipped: 'bg-gray-100 text-gray-500',
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function PipelineClient() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stageFilter, setStageFilter] = useState<Stage>('all');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // ─── Campaign creation form ────
  const [form, setForm] = useState({
    name: '', target_industry: '', target_role: '', target_company_size: '11-50',
    target_location: '', target_pain_points: '', value_prop: '', lead_count: 25,
  });

  // ─── Load campaigns ────────────
  const loadCampaigns = useCallback(async () => {
    const res = await fetch('/api/agency/pipeline/campaigns');
    const data = await res.json();
    setCampaigns(data.campaigns ?? []);
    if (!activeCampaign && data.campaigns?.length > 0) {
      setActiveCampaign(data.campaigns[0]);
    }
    setLoading(false);
  }, [activeCampaign]);

  // ─── Load leads for active campaign ────────
  const loadLeads = useCallback(async () => {
    if (!activeCampaign) return;
    const url = `/api/agency/pipeline/leads?campaign_id=${activeCampaign.id}`;
    const res = await fetch(url);
    const data = await res.json();
    setLeads(data.leads ?? []);
  }, [activeCampaign]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);
  useEffect(() => { loadLeads(); }, [loadLeads]);

  // ─── Create campaign + auto-search ────────
  const createCampaign = async () => {
    if (!form.name.trim()) return;
    setSearching(true);
    try {
      const res = await fetch('/api/agency/pipeline/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      const campaign = data.campaign;
      if (!campaign) throw new Error(data.error || 'Failed to create');

      setShowCreate(false);
      setActiveCampaign(campaign);

      // Auto-search for leads
      const searchRes = await fetch('/api/agency/pipeline/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaign.id, criteria: { count: form.lead_count || 25 } }),
      });
      const searchData = await searchRes.json();
      setLeads(searchData.leads ?? []);
      await loadCampaigns();
    } finally {
      setSearching(false);
    }
  };

  // ─── Research all found leads ────────
  const enrichAll = async () => {
    const foundLeads = filteredLeads.filter(l => l.stage === 'found');
    if (!foundLeads.length) return;
    setEnriching(true);
    try {
      await fetch('/api/agency/pipeline/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: foundLeads.map(l => l.id) }),
      });
      await loadLeads();
      await loadCampaigns();
    } finally {
      setEnriching(false);
    }
  };

  // ─── Launch all researched leads ────────
  const launchAll = async () => {
    const ready = filteredLeads.filter(l => l.stage === 'researched');
    if (!ready.length) return;
    setLaunching(true);
    try {
      await fetch('/api/agency/pipeline/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: ready.map(l => l.id) }),
      });
      await loadLeads();
      await loadCampaigns();
    } finally {
      setLaunching(false);
    }
  };

  // ─── Update a single lead ────────
  const updateLead = async (leadId: string, updates: Record<string, unknown>) => {
    await fetch(`/api/agency/pipeline/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await loadLeads();
  };

  // ─── Search more leads ────────
  const searchMore = async (count = 25) => {
    if (!activeCampaign) return;
    setSearching(true);
    try {
      const res = await fetch('/api/agency/pipeline/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: activeCampaign.id, criteria: { count } }),
      });
      const data = await res.json();
      if (data.leads) setLeads(prev => [...data.leads, ...prev]);
      await loadCampaigns();
    } finally {
      setSearching(false);
    }
  };

  // ─── Filtered leads ────────
  const filteredLeads = stageFilter === 'all'
    ? leads
    : leads.filter(l => l.stage === stageFilter);

  // ─── Stage counts ────────
  const stageCounts: Record<string, number> = {};
  for (const l of leads) {
    stageCounts[l.stage] = (stageCounts[l.stage] ?? 0) + 1;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl space-y-6">

      {/* ─── Header ─── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-500" />
            AI Sales Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Find leads → Research → Personalize → Launch → Close
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeCampaign && (
            <>
              <Button
                onClick={() => searchMore(25)}
                disabled={searching}
                variant="outline"
                className="text-sm flex items-center gap-1.5"
              >
                {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Find 25 More
              </Button>
              <Button
                onClick={enrichAll}
                disabled={enriching || !leads.some(l => l.stage === 'found')}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm flex items-center gap-1.5"
              >
                {enriching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Research All ({stageCounts.found ?? 0})
              </Button>
              <Button
                onClick={launchAll}
                disabled={launching || !leads.some(l => l.stage === 'researched')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm flex items-center gap-1.5"
              >
                {launching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send All ({stageCounts.researched ?? 0})
              </Button>
            </>
          )}
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-gray-900 hover:bg-gray-800 text-white text-sm flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> New Campaign
          </Button>
        </div>
      </div>

      {/* ─── Campaign selector ─── */}
      {campaigns.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {campaigns.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCampaign(c)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition ${
                activeCampaign?.id === c.id
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c.name}
              <span className="ml-2 text-xs opacity-60">
                {Object.values(c.stage_counts).reduce((a, b) => a + b, 0)} leads
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ─── Stats strip ─── */}
      {activeCampaign && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Found', count: stageCounts.found ?? 0, icon: Search, color: 'text-blue-600 bg-blue-50' },
            { label: 'Researched', count: stageCounts.researched ?? 0, icon: Sparkles, color: 'text-purple-600 bg-purple-50' },
            { label: 'Messaged', count: stageCounts.messaged ?? 0, icon: Send, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Replied', count: stageCounts.replied ?? 0, icon: MessageSquare, color: 'text-amber-600 bg-amber-50' },
            { label: 'Interested', count: stageCounts.interested ?? 0, icon: Zap, color: 'text-orange-600 bg-orange-50' },
            { label: 'Booked', count: stageCounts.booked ?? 0, icon: Calendar, color: 'text-green-600 bg-green-50' },
            { label: 'Closed', count: stageCounts.closed ?? 0, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          ].map(({ label, count, icon: Icon, color }) => (
            <div key={label} className={`rounded-xl border px-3 py-2.5 ${color}`}>
              <div className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{label}</span>
              </div>
              <p className="text-xl font-bold mt-0.5">{count}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── Stage filter tabs ─── */}
      {activeCampaign && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STAGES.map(({ id, label, color, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setStageFilter(id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                stageFilter === id ? color : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
              {id !== 'all' && stageCounts[id] ? (
                <span className="ml-0.5 opacity-70">({stageCounts[id]})</span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {/* ─── Empty state ─── */}
      {!activeCampaign && campaigns.length === 0 && (
        <div className="text-center py-16">
          <Target className="h-12 w-12 text-indigo-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Launch Your First Campaign</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Create a campaign to find qualified leads, research them with AI,
            generate personalized outreach, and launch — all from one place.
          </p>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Plus className="h-4 w-4 mr-1" /> Create Campaign
          </Button>
        </div>
      )}

      {/* ─── Lead cards grid ─── */}
      {filteredLeads.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition cursor-pointer"
              onClick={() => setSelectedLead(lead)}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{lead.full_name}</p>
                  <p className="text-xs text-gray-500">{lead.title}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STAGE_BADGE[lead.stage] || 'bg-gray-100'}`}>
                  {lead.stage.toUpperCase()}
                </span>
              </div>
              <div className="space-y-1 mb-3">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Building2 className="h-3 w-3 text-gray-400" />
                  {lead.company} {lead.company_size && `· ${lead.company_size}`}
                </div>
                {lead.location && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    {lead.location}
                  </div>
                )}
                {lead.industry && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Briefcase className="h-3 w-3 text-gray-400" />
                    {lead.industry}
                  </div>
                )}
              </div>
              {lead.personalized_opener && (
                <p className="text-xs text-indigo-600 italic line-clamp-2 mb-2">
                  &ldquo;{lead.personalized_opener}&rdquo;
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-gray-100">
                {lead.website && (
                  <a
                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noopener"
                    onClick={e => e.stopPropagation()}
                    className="text-gray-400 hover:text-gray-600"
                    title={lead.website}
                  >
                    <Globe className="h-3.5 w-3.5" />
                  </a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} onClick={e => e.stopPropagation()} className="text-gray-400 hover:text-indigo-600" title={lead.email}>
                    <Mail className="h-3.5 w-3.5" />
                  </a>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} onClick={e => e.stopPropagation()} className="text-gray-400 hover:text-green-600" title={lead.phone}>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  </a>
                )}
                {lead.enrichment_data?.socials && Object.keys(lead.enrichment_data.socials).length > 0 && (
                  <span className="text-[9px] text-gray-400 font-medium" title={Object.keys(lead.enrichment_data.socials).join(', ')}>
                    +{Object.keys(lead.enrichment_data.socials).length} social
                  </span>
                )}
                <div className="flex-1" />
                {lead.stage === 'found' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); enrichSingle(lead.id); }}
                    className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded hover:bg-purple-100"
                  >
                    Research
                  </button>
                )}
                {lead.stage === 'researched' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); launchSingle(lead.id); }}
                    className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded hover:bg-indigo-100"
                  >
                    Send
                  </button>
                )}
                {lead.messaged_at && (
                  <span className="text-[10px] text-gray-400">
                    Sent {new Date(lead.messaged_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeCampaign && filteredLeads.length === 0 && !searching && (
        <div className="text-center py-12">
          <Search className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {stageFilter === 'all' ? 'No leads yet. Click "Find More Leads" to start.' : `No leads in ${stageFilter} stage.`}
          </p>
        </div>
      )}

      {/* ─── Create Campaign Modal ─── */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">New Campaign</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Campaign name *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="e.g. GHL Agency Owners — Q1 2026"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Target industry</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Marketing Agencies"
                    value={form.target_industry}
                    onChange={e => setForm(f => ({ ...f, target_industry: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Target role/title</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Agency Owner, CEO"
                    value={form.target_role}
                    onChange={e => setForm(f => ({ ...f, target_role: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Company size</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={form.target_company_size}
                    onChange={e => setForm(f => ({ ...f, target_company_size: e.target.value }))}
                  >
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="200+">200+ employees</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Location</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. United States"
                    value={form.target_location}
                    onChange={e => setForm(f => ({ ...f, target_location: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Pain points (what problems do they have?)</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[60px]"
                  placeholder="e.g. struggling to add AI services for clients, losing deals to competitors with AI..."
                  value={form.target_pain_points}
                  onChange={e => setForm(f => ({ ...f, target_pain_points: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Value proposition (what do you offer?)</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[60px]"
                  placeholder="e.g. Kyra deploys autonomous AI workers to GHL sub-accounts in 5 minutes, one dashboard for all clients"
                  value={form.value_prop}
                  onChange={e => setForm(f => ({ ...f, value_prop: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">How many leads to find?</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={form.lead_count}
                  onChange={e => setForm(f => ({ ...f, lead_count: Number(e.target.value) }))}
                >
                  <option value={10}>10 leads</option>
                  <option value={25}>25 leads</option>
                  <option value={50}>50 leads</option>
                  <option value={100}>100 leads</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button
                onClick={createCampaign}
                disabled={!form.name.trim() || searching}
                className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5"
              >
                {searching
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating & Finding Leads...</>
                  : <><Sparkles className="h-4 w-4" /> Create & Find Leads</>
                }
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Lead Detail Modal ─── */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLead(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{selectedLead.full_name}</h2>
                <p className="text-sm text-gray-500">{selectedLead.title} at {selectedLead.company}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STAGE_BADGE[selectedLead.stage] || 'bg-gray-100'}`}>
                  {selectedLead.stage.toUpperCase()}
                </span>
                <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {selectedLead.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-gray-400" /> {selectedLead.location}
                </div>
              )}
              {selectedLead.industry && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Briefcase className="h-4 w-4 text-gray-400" /> {selectedLead.industry}
                </div>
              )}
              {selectedLead.company_size && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="h-4 w-4 text-gray-400" /> {selectedLead.company_size}
                </div>
              )}
              {selectedLead.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" /> <a href={`mailto:${selectedLead.email}`} className="text-indigo-600 hover:underline">{selectedLead.email}</a>
                </div>
              )}
              {selectedLead.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <a href={`tel:${selectedLead.phone}`} className="text-indigo-600 hover:underline">{selectedLead.phone}</a>
                </div>
              )}
              {selectedLead.website && (
                <a href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
                  <Globe className="h-4 w-4" /> {selectedLead.website}
                </a>
              )}
              {/* Social Media Profiles */}
              {selectedLead.enrichment_data?.socials && Object.keys(selectedLead.enrichment_data.socials).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(selectedLead.enrichment_data.socials).map(([platform, url]) => (
                    <a key={platform} href={url} target="_blank" rel="noopener"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                      {platform === 'facebook' && '📘'}
                      {platform === 'instagram' && '📸'}
                      {platform === 'twitter' && '🐦'}
                      {platform === 'youtube' && '▶️'}
                      {platform === 'tiktok' && '🎵'}
                      {platform === 'linkedin' && '💼'}
                      {platform === 'yelp' && '⭐'}
                      {platform === 'google_business' && '📍'}
                      {!['facebook','instagram','twitter','youtube','tiktok','linkedin','yelp','google_business'].includes(platform) && '🔗'}
                      {' '}{platform.charAt(0).toUpperCase() + platform.slice(1).replace('_', ' ')}
                    </a>
                  ))}
                </div>
              )}
              {/* Additional emails found */}
              {selectedLead.enrichment_data?.emails_found && selectedLead.enrichment_data.emails_found.length > 1 && (
                <div className="text-xs text-gray-500 pt-1">
                  Also found: {selectedLead.enrichment_data.emails_found.filter(e => e !== selectedLead.email).join(', ')}
                </div>
              )}
              {/* Additional phones found */}
              {selectedLead.enrichment_data?.phones_found && selectedLead.enrichment_data.phones_found.length > 1 && (
                <div className="text-xs text-gray-500">
                  Other phones: {selectedLead.enrichment_data.phones_found.filter(p => p !== selectedLead.phone).join(', ')}
                </div>
              )}
            </div>

            {/* Enrichment data */}
            {selectedLead.enrichment_data?.company_context && (
              <div className="space-y-3 mb-4">
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                  <p className="text-xs font-bold text-purple-700 mb-1">🏢 About</p>
                  <p className="text-sm text-gray-700">{selectedLead.enrichment_data.company_context}</p>
                </div>
                {selectedLead.enrichment_data.services_offered && (
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                    <p className="text-xs font-bold text-slate-700 mb-1">🛠️ Services</p>
                    <p className="text-sm text-gray-700">{selectedLead.enrichment_data.services_offered}</p>
                  </div>
                )}
                {(selectedLead.enrichment_data.clients_mentioned || selectedLead.enrichment_data.tech_stack || selectedLead.enrichment_data.years_in_business) && (
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 grid grid-cols-1 gap-1.5">
                    {selectedLead.enrichment_data.clients_mentioned && (
                      <div><span className="text-xs font-semibold text-gray-500">Clients: </span><span className="text-xs text-gray-700">{selectedLead.enrichment_data.clients_mentioned}</span></div>
                    )}
                    {selectedLead.enrichment_data.tech_stack && (
                      <div><span className="text-xs font-semibold text-gray-500">Tech: </span><span className="text-xs text-gray-700">{selectedLead.enrichment_data.tech_stack}</span></div>
                    )}
                    {selectedLead.enrichment_data.years_in_business && (
                      <div><span className="text-xs font-semibold text-gray-500">Est: </span><span className="text-xs text-gray-700">{selectedLead.enrichment_data.years_in_business}</span></div>
                    )}
                    {selectedLead.enrichment_data.number_of_employees && (
                      <div><span className="text-xs font-semibold text-gray-500">Team: </span><span className="text-xs text-gray-700">{selectedLead.enrichment_data.number_of_employees}</span></div>
                    )}
                  </div>
                )}
                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <p className="text-xs font-bold text-red-700 mb-1">🔥 Pain Points</p>
                  <p className="text-sm text-gray-700">{selectedLead.enrichment_data.likely_pain_points}</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                  <p className="text-xs font-bold text-green-700 mb-1">💡 Opportunity</p>
                  <p className="text-sm text-gray-700">{selectedLead.enrichment_data.opportunity_angle}</p>
                </div>
                {selectedLead.enrichment_data.icebreaker && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs font-bold text-blue-700 mb-1">🧊 Icebreaker</p>
                    <p className="text-sm text-gray-700">{selectedLead.enrichment_data.icebreaker}</p>
                  </div>
                )}
                {selectedLead.enrichment_data.person_source === 'website' && (
                  <p className="text-[10px] text-green-600 font-medium">✅ Contact found on their actual website</p>
                )}
              </div>
            )}

            {/* Personalized messaging */}
            {selectedLead.personalized_subject && (
              <div className="space-y-3 mb-4">
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                  <p className="text-xs font-bold text-indigo-700 mb-1">📧 Subject</p>
                  <p className="text-sm text-gray-900 font-medium">{selectedLead.personalized_subject}</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                  <p className="text-xs font-bold text-indigo-700 mb-1">📝 Email</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{selectedLead.personalized_email}</p>
                </div>
                {selectedLead.personalized_opener && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="text-xs font-bold text-amber-700 mb-1">💬 SMS/DM Opener</p>
                    <p className="text-sm text-gray-700">{selectedLead.personalized_opener}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t">
              {selectedLead.stage === 'found' && (
                <Button onClick={() => { enrichSingle(selectedLead.id); setSelectedLead(null); }} className="bg-purple-600 hover:bg-purple-700 text-white text-sm">
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Research
                </Button>
              )}
              {selectedLead.stage === 'researched' && (
                <Button onClick={() => { launchSingle(selectedLead.id); setSelectedLead(null); }} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm">
                  <Send className="h-3.5 w-3.5 mr-1" /> Send via GHL
                </Button>
              )}
              {['messaged', 'replied', 'interested'].includes(selectedLead.stage) && (
                <>
                  <Button variant="outline" className="text-sm" onClick={() => { updateLead(selectedLead.id, { stage: 'replied' }); setSelectedLead(null); }}>
                    Mark Replied
                  </Button>
                  <Button variant="outline" className="text-sm" onClick={() => { updateLead(selectedLead.id, { stage: 'interested' }); setSelectedLead(null); }}>
                    Mark Interested
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white text-sm" onClick={() => { updateLead(selectedLead.id, { stage: 'booked' }); setSelectedLead(null); }}>
                    <Calendar className="h-3.5 w-3.5 mr-1" /> Mark Booked
                  </Button>
                </>
              )}
              <div className="flex-1" />
              <Button variant="outline" className="text-sm text-gray-400" onClick={() => { updateLead(selectedLead.id, { stage: 'skipped' }); setSelectedLead(null); }}>
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Single-lead actions ────────────────────────────────────────────────────
  async function enrichSingle(leadId: string) {
    setEnriching(true);
    try {
      await fetch('/api/agency/pipeline/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: [leadId] }),
      });
      await loadLeads();
    } finally {
      setEnriching(false);
    }
  }

  async function launchSingle(leadId: string) {
    setLaunching(true);
    try {
      await fetch('/api/agency/pipeline/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: [leadId] }),
      });
      await loadLeads();
    } finally {
      setLaunching(false);
    }
  }
}
