'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Target, Plus, Search, Sparkles, Send, Loader2,
  Users, Mail, MessageSquare, Calendar, CheckCircle2, X,
  Zap, Building2, MapPin, Briefcase, Globe,
  BarChart3, RefreshCw, Phone, Edit3, Check, ChevronRight,
  Activity, TrendingUp, ArrowRight, Eye, Clock,
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
    sent_channels?: string[];
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

interface ConversationMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  type: string;
  dateAdded: string;
  status?: string;
}

interface ActivityItem {
  id: string;
  type: string;
  leadId: string;
  name: string;
  company: string;
  timestamp: string;
  message: string;
  icon: string;
}

type Stage = 'all' | 'found' | 'researched' | 'approved' | 'messaged' | 'replied' | 'interested' | 'booked' | 'closed';
type ViewMode = 'pipeline' | 'activity' | 'funnel';

const STAGES: { id: Stage; label: string; color: string; icon: typeof Search }[] = [
  { id: 'all', label: 'All', color: 'bg-gray-100 text-gray-700', icon: Users },
  { id: 'found', label: 'Found', color: 'bg-blue-100 text-blue-700', icon: Search },
  { id: 'researched', label: 'Researched', color: 'bg-purple-100 text-purple-700', icon: Sparkles },
  { id: 'approved', label: 'Approved', color: 'bg-cyan-100 text-cyan-700', icon: Check },
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
  const [viewMode, setViewMode] = useState<ViewMode>('pipeline');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launchProgress, setLaunchProgress] = useState<{ current: number; total: number; results: Array<{ name: string; status: string; channels: string[] }> } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [launchChannel, setLaunchChannel] = useState<'both' | 'email' | 'sms'>('both');

  // Activity feed
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // Conversation view
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const [manualMsg, setManualMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const convoEndRef = useRef<HTMLDivElement>(null);

  // Inline editing
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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

  // ─── Load activity feed ────────
  const loadActivity = useCallback(async () => {
    setLoadingActivity(true);
    try {
      const res = await fetch('/api/agency/pipeline/activity?hours=48');
      const data = await res.json();
      setActivities(data.activities ?? []);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  // Auto-refresh activity feed
  useEffect(() => {
    if (viewMode === 'activity') {
      loadActivity();
      const interval = setInterval(loadActivity, 30_000);
      return () => clearInterval(interval);
    }
  }, [viewMode, loadActivity]);

  // ─── Load conversation for a lead ────────
  const loadConversation = useCallback(async (leadId: string) => {
    setLoadingConvo(true);
    try {
      const res = await fetch(`/api/agency/pipeline/conversations?lead_id=${leadId}`);
      const data = await res.json();
      setConversation(data.messages ?? []);
    } finally {
      setLoadingConvo(false);
    }
  }, []);

  // Load convo when selecting a lead that has been messaged
  useEffect(() => {
    if (selectedLead?.ghl_contact_id) {
      loadConversation(selectedLead.id);
    } else {
      setConversation([]);
    }
  }, [selectedLead, loadConversation]);

  // Scroll to bottom of convo
  useEffect(() => {
    convoEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

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
    const foundLeads = leads.filter(l => l.stage === 'found');
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

  // ─── Approve leads (move researched → approved) ────────
  const approveLeads = async (leadIds: string[]) => {
    for (const id of leadIds) {
      await fetch(`/api/agency/pipeline/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'approved' }),
      });
    }
    await loadLeads();
    await loadCampaigns();
  };

  // ─── Launch all approved leads ────────
  const launchAll = async () => {
    const ready = leads.filter(l => l.stage === 'approved' || l.stage === 'researched');
    if (!ready.length) return;
    setLaunching(true);
    setLaunchProgress({ current: 0, total: ready.length, results: [] });
    try {
      const res = await fetch('/api/agency/pipeline/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: ready.map(l => l.id), channel: launchChannel }),
      });
      const data = await res.json();
      setLaunchProgress({
        current: data.sent + data.errors + data.skipped,
        total: ready.length,
        results: (data.results || []).map((r: { name: string; status: string; channels: string[] }) => ({
          name: r.name, status: r.status, channels: r.channels || [],
        })),
      });
      await loadLeads();
      await loadCampaigns();
    } finally {
      setLaunching(false);
    }
  };

  // ─── Send manual message ────────
  const sendManualMessage = async () => {
    if (!selectedLead || !manualMsg.trim()) return;
    setSendingMsg(true);
    try {
      await fetch(`/api/agency/pipeline/leads/${selectedLead.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: manualMsg.trim(), type: 'SMS' }),
      });
      setManualMsg('');
      // Reload conversation
      await loadConversation(selectedLead.id);
    } finally {
      setSendingMsg(false);
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

  // ─── Inline edit save ────────
  const saveInlineEdit = async (leadId: string, field: string) => {
    await updateLead(leadId, { [field]: editValue });
    setEditingField(null);
    setEditValue('');
    // Refresh selectedLead
    const res = await fetch(`/api/agency/pipeline/leads?campaign_id=${activeCampaign?.id}`);
    const data = await res.json();
    const updated = (data.leads || []).find((l: Lead) => l.id === leadId);
    if (updated) setSelectedLead(updated);
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

  // ─── Funnel calculations ────────
  const totalMessaged = stageCounts.messaged ?? 0;
  const totalReplied = (stageCounts.replied ?? 0) + (stageCounts.interested ?? 0) + (stageCounts.booked ?? 0) + (stageCounts.closed ?? 0);
  const totalInterested = (stageCounts.interested ?? 0) + (stageCounts.booked ?? 0) + (stageCounts.closed ?? 0);
  const totalBooked = (stageCounts.booked ?? 0) + (stageCounts.closed ?? 0);
  const totalClosed = stageCounts.closed ?? 0;
  const allMessaged = totalMessaged + totalReplied;

  // ─── Single-lead actions ────────
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
        body: JSON.stringify({ lead_ids: [leadId], channel: launchChannel }),
      });
      await loadLeads();
    } finally {
      setLaunching(false);
    }
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
            Find → Research → Approve → Launch → <span className="text-green-600 font-semibold">AI Closes</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden mr-2">
            {[
              { id: 'pipeline' as ViewMode, label: 'Pipeline', icon: Target },
              { id: 'activity' as ViewMode, label: 'Live', icon: Activity },
              { id: 'funnel' as ViewMode, label: 'Funnel', icon: TrendingUp },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition ${
                  viewMode === id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-3 w-3" /> {label}
              </button>
            ))}
          </div>

          {activeCampaign && viewMode === 'pipeline' && (
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
              {(stageCounts.researched ?? 0) > 0 && (
                <Button
                  onClick={() => approveLeads(leads.filter(l => l.stage === 'researched').map(l => l.id))}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve All ({stageCounts.researched ?? 0})
                </Button>
              )}
              {((stageCounts.approved ?? 0) + (stageCounts.researched ?? 0)) > 0 && (
                <div className="flex items-center gap-1">
                  <select
                    value={launchChannel}
                    onChange={e => setLaunchChannel(e.target.value as typeof launchChannel)}
                    className="text-xs border rounded-lg px-2 py-2 bg-white"
                  >
                    <option value="both">📧+📱 Both</option>
                    <option value="email">📧 Email Only</option>
                    <option value="sms">📱 SMS Only</option>
                  </select>
                  <Button
                    onClick={launchAll}
                    disabled={launching}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm flex items-center gap-1.5"
                  >
                    {launching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Launch ({(stageCounts.approved ?? 0) + (stageCounts.researched ?? 0)})
                  </Button>
                </div>
              )}
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

      {/* ─── Launch Progress Banner ─── */}
      {launchProgress && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-indigo-700">
              {launching ? '🚀 Launching outreach...' : '✅ Launch complete!'}
            </p>
            {!launching && (
              <button onClick={() => setLaunchProgress(null)} className="text-indigo-400 hover:text-indigo-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="w-full bg-indigo-200 rounded-full h-2 mb-3">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${launchProgress.total > 0 ? (launchProgress.current / launchProgress.total) * 100 : 0}%` }}
            />
          </div>
          {launchProgress.results.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {launchProgress.results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {r.status === 'sent' ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : r.status === 'skipped' ? (
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                  ) : (
                    <X className="h-3 w-3 text-red-500" />
                  )}
                  <span className={r.status === 'sent' ? 'text-green-700' : r.status === 'skipped' ? 'text-gray-500' : 'text-red-600'}>
                    {r.name}
                  </span>
                  {r.channels?.length > 0 && (
                    <span className="text-indigo-500">
                      via {r.channels.map(c => c === 'email' ? '📧' : '📱').join(' ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Stats strip ─── */}
      {activeCampaign && (
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {[
            { label: 'Found', count: stageCounts.found ?? 0, icon: Search, color: 'text-blue-600 bg-blue-50' },
            { label: 'Researched', count: stageCounts.researched ?? 0, icon: Sparkles, color: 'text-purple-600 bg-purple-50' },
            { label: 'Approved', count: stageCounts.approved ?? 0, icon: Check, color: 'text-cyan-600 bg-cyan-50' },
            { label: 'Messaged', count: stageCounts.messaged ?? 0, icon: Send, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Replied', count: stageCounts.replied ?? 0, icon: MessageSquare, color: 'text-amber-600 bg-amber-50' },
            { label: 'Interested', count: stageCounts.interested ?? 0, icon: Zap, color: 'text-orange-600 bg-orange-50' },
            { label: 'Booked', count: stageCounts.booked ?? 0, icon: Calendar, color: 'text-green-600 bg-green-50' },
            { label: 'Closed', count: stageCounts.closed ?? 0, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Skipped', count: stageCounts.skipped ?? 0, icon: X, color: 'text-gray-500 bg-gray-50' },
          ].map(({ label, count, icon: Icon, color }) => (
            <button
              key={label}
              onClick={() => { setStageFilter(label.toLowerCase() as Stage); setViewMode('pipeline'); }}
              className={`rounded-xl border px-3 py-2 ${color} text-left hover:shadow-sm transition`}
            >
              <div className="flex items-center gap-1">
                <Icon className="h-3 w-3" />
                <span className="text-[10px] font-medium">{label}</span>
              </div>
              <p className="text-lg font-bold">{count}</p>
            </button>
          ))}
        </div>
      )}

      {/* ═══════════ PIPELINE VIEW ═══════════ */}
      {viewMode === 'pipeline' && (
        <>
          {/* Stage filter tabs */}
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

          {/* Lead cards grid */}
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
                      <p className="font-semibold text-gray-900 text-sm">{lead.full_name || 'Unknown Contact'}</p>
                      <p className="text-xs text-gray-500">{lead.title} at {lead.company}</p>
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
                  {/* Sent channels badges */}
                  {lead.enrichment_data?.sent_channels && lead.enrichment_data.sent_channels.length > 0 && (
                    <div className="flex gap-1 mb-2">
                      {lead.enrichment_data.sent_channels.includes('email') && (
                        <span className="text-[9px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded">📧 Email ✓</span>
                      )}
                      {lead.enrichment_data.sent_channels.includes('sms') && (
                        <span className="text-[9px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded">📱 SMS ✓</span>
                      )}
                    </div>
                  )}
                  {lead.personalized_opener && (
                    <p className="text-xs text-indigo-600 italic line-clamp-2 mb-2">
                      &ldquo;{lead.personalized_opener}&rdquo;
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-gray-100">
                    {lead.website && (
                      <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} className="text-gray-400 hover:text-gray-600" title={lead.website}>
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
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                    {lead.enrichment_data?.socials && Object.keys(lead.enrichment_data.socials).length > 0 && (
                      <span className="text-[9px] text-gray-400 font-medium">+{Object.keys(lead.enrichment_data.socials).length} social</span>
                    )}
                    <div className="flex-1" />
                    {lead.stage === 'found' && (
                      <button onClick={(e) => { e.stopPropagation(); enrichSingle(lead.id); }} className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded hover:bg-purple-100">Research</button>
                    )}
                    {lead.stage === 'researched' && (
                      <button onClick={(e) => { e.stopPropagation(); approveLeads([lead.id]); }} className="text-[10px] font-semibold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded hover:bg-cyan-100">Approve</button>
                    )}
                    {lead.stage === 'approved' && (
                      <button onClick={(e) => { e.stopPropagation(); launchSingle(lead.id); }} className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded hover:bg-indigo-100">Launch</button>
                    )}
                    {['replied', 'interested'].includes(lead.stage) && (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <Activity className="h-2.5 w-2.5" /> AI Closing
                      </span>
                    )}
                    {lead.stage === 'booked' && (
                      <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">📅 Demo Set</span>
                    )}
                    {lead.messaged_at && !['replied', 'interested', 'booked', 'closed'].includes(lead.stage) && (
                      <span className="text-[10px] text-gray-400">Sent {new Date(lead.messaged_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty states */}
          {!activeCampaign && campaigns.length === 0 && (
            <div className="text-center py-16">
              <Target className="h-12 w-12 text-indigo-300 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-gray-900 mb-2">Launch Your First Campaign</h2>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                Create a campaign to find qualified leads, research them with AI,
                personalize outreach, and let the AI close deals — all hands-off.
              </p>
              <Button onClick={() => setShowCreate(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                <Plus className="h-4 w-4 mr-1" /> Create Campaign
              </Button>
            </div>
          )}

          {activeCampaign && filteredLeads.length === 0 && !searching && (
            <div className="text-center py-12">
              <Search className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                {stageFilter === 'all' ? 'No leads yet. Click "Find 25 More" to start.' : `No leads in ${stageFilter} stage.`}
              </p>
            </div>
          )}
        </>
      )}

      {/* ═══════════ ACTIVITY FEED VIEW ═══════════ */}
      {viewMode === 'activity' && (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Live Activity
            </h2>
            <button onClick={loadActivity} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <RefreshCw className={`h-3 w-3 ${loadingActivity ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          {activities.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <Activity className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No activity yet. Launch a campaign to see real-time updates.</p>
              <p className="text-xs text-gray-400 mt-1">Auto-refreshes every 30 seconds</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg px-4 py-3 hover:shadow-sm transition cursor-pointer"
                  onClick={() => {
                    const lead = leads.find(l => l.id === a.leadId);
                    if (lead) { setSelectedLead(lead); setViewMode('pipeline'); }
                  }}
                >
                  <span className="text-lg">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-semibold">{a.name}</span>
                      {a.company && <span className="text-gray-500"> at {a.company}</span>}
                      {' '}<span className="text-gray-600">{a.message}</span>
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {timeAgo(a.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ FUNNEL VIEW ═══════════ */}
      {viewMode === 'funnel' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            Conversion Funnel
          </h2>

          {allMessaged === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Launch your first campaign to see conversion metrics.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Messaged', count: allMessaged, total: allMessaged, color: 'bg-indigo-500', textColor: 'text-indigo-700' },
                { label: 'Replied', count: totalReplied, total: allMessaged, color: 'bg-amber-500', textColor: 'text-amber-700' },
                { label: 'Interested', count: totalInterested, total: allMessaged, color: 'bg-orange-500', textColor: 'text-orange-700' },
                { label: 'Booked', count: totalBooked, total: allMessaged, color: 'bg-green-500', textColor: 'text-green-700' },
                { label: 'Closed', count: totalClosed, total: allMessaged, color: 'bg-emerald-500', textColor: 'text-emerald-700' },
              ].map(({ label, count, total, color, textColor }, i) => {
                const pct = total > 0 ? (count / total * 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold ${textColor}`}>{label}</span>
                      <span className="text-sm text-gray-600">{count} <span className="text-gray-400">({pct.toFixed(1)}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-8 relative overflow-hidden">
                      <div
                        className={`${color} h-8 rounded-full transition-all duration-700 flex items-center justify-end pr-3`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      >
                        {pct > 15 && <span className="text-white text-xs font-bold">{pct.toFixed(0)}%</span>}
                      </div>
                    </div>
                    {i < 4 && (
                      <div className="flex items-center justify-center py-1">
                        <ChevronRight className="h-4 w-4 text-gray-300 rotate-90" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-amber-600">{allMessaged > 0 ? (totalReplied / allMessaged * 100).toFixed(1) : 0}%</p>
                  <p className="text-xs text-amber-700 font-medium mt-1">Reply Rate</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{allMessaged > 0 ? (totalBooked / allMessaged * 100).toFixed(1) : 0}%</p>
                  <p className="text-xs text-green-700 font-medium mt-1">Booking Rate</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ CREATE CAMPAIGN MODAL ═══════════ */}
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
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. GHL Agency Owners — Q1 2026" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Target industry</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Marketing Agencies" value={form.target_industry} onChange={e => setForm(f => ({ ...f, target_industry: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Target role/title</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Agency Owner, CEO" value={form.target_role} onChange={e => setForm(f => ({ ...f, target_role: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Company size</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.target_company_size} onChange={e => setForm(f => ({ ...f, target_company_size: e.target.value }))}>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="200+">200+ employees</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Location</label>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Los Angeles, CA" value={form.target_location} onChange={e => setForm(f => ({ ...f, target_location: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Pain points</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[60px]" placeholder="e.g. struggling to add AI services for clients..." value={form.target_pain_points} onChange={e => setForm(f => ({ ...f, target_pain_points: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Value proposition</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[60px]" placeholder="e.g. Deploy AI workers for your clients in 5 minutes..." value={form.value_prop} onChange={e => setForm(f => ({ ...f, value_prop: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">How many leads to find?</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.lead_count} onChange={e => setForm(f => ({ ...f, lead_count: Number(e.target.value) }))}>
                  <option value={10}>10 leads</option>
                  <option value={25}>25 leads</option>
                  <option value={50}>50 leads</option>
                  <option value={100}>100 leads</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={createCampaign} disabled={!form.name.trim() || searching} className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5">
                {searching ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : <><Sparkles className="h-4 w-4" /> Create & Find Leads</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ LEAD DETAIL MODAL ═══════════ */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setSelectedLead(null); setConversation([]); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedLead.full_name || 'Unknown Contact'}</h2>
                  <p className="text-sm text-gray-500">{selectedLead.title} at {selectedLead.company}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STAGE_BADGE[selectedLead.stage] || 'bg-gray-100'}`}>
                    {selectedLead.stage.toUpperCase()}
                  </span>
                  <button onClick={() => { setSelectedLead(null); setConversation([]); }} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Contact info row */}
              <div className="flex flex-wrap gap-3 mt-3">
                {selectedLead.email && (
                  <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline">
                    <Mail className="h-3.5 w-3.5" /> {selectedLead.email}
                  </a>
                )}
                {selectedLead.phone && (
                  <a href={`tel:${selectedLead.phone}`} className="flex items-center gap-1.5 text-xs text-green-600 hover:underline">
                    <Phone className="h-3.5 w-3.5" /> {selectedLead.phone}
                  </a>
                )}
                {selectedLead.website && (
                  <a href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-xs text-gray-600 hover:underline">
                    <Globe className="h-3.5 w-3.5" /> {selectedLead.website}
                  </a>
                )}
                {selectedLead.location && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <MapPin className="h-3.5 w-3.5" /> {selectedLead.location}
                  </span>
                )}
              </div>

              {/* Social badges */}
              {selectedLead.enrichment_data?.socials && Object.keys(selectedLead.enrichment_data.socials).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(selectedLead.enrichment_data.socials).map(([platform, url]) => (
                    <a key={platform} href={url} target="_blank" rel="noopener"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
                      {platform === 'facebook' ? '📘' : platform === 'instagram' ? '📸' : platform === 'twitter' ? '🐦' : platform === 'youtube' ? '▶️' : platform === 'yelp' ? '⭐' : '🔗'}
                      {' '}{platform.charAt(0).toUpperCase() + platform.slice(1).replace('_', ' ')}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {/* Enrichment data */}
              {selectedLead.enrichment_data?.company_context && (
                <div className="space-y-3">
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
                  {selectedLead.enrichment_data.likely_pain_points && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                      <p className="text-xs font-bold text-red-700 mb-1">🔥 Pain Points</p>
                      <p className="text-sm text-gray-700">{selectedLead.enrichment_data.likely_pain_points}</p>
                    </div>
                  )}
                  {selectedLead.enrichment_data.opportunity_angle && (
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                      <p className="text-xs font-bold text-green-700 mb-1">💡 Opportunity</p>
                      <p className="text-sm text-gray-700">{selectedLead.enrichment_data.opportunity_angle}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Personalized messaging preview (editable) */}
              {selectedLead.personalized_subject && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                    <Mail className="h-4 w-4" /> Outreach Message
                    {selectedLead.stage === 'researched' && <span className="text-[10px] text-gray-400 font-normal ml-1">(click to edit)</span>}
                  </h3>
                  {/* Subject */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-indigo-500 mb-1">SUBJECT</p>
                    {editingField === `${selectedLead.id}-subject` ? (
                      <div className="flex gap-2">
                        <input className="flex-1 text-sm border rounded px-2 py-1" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                        <button onClick={() => saveInlineEdit(selectedLead.id, 'personalized_subject')} className="text-green-600"><Check className="h-4 w-4" /></button>
                        <button onClick={() => setEditingField(null)} className="text-gray-400"><X className="h-4 w-4" /></button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-900 font-medium cursor-pointer hover:text-indigo-700" onClick={() => { if (selectedLead.stage === 'researched') { setEditingField(`${selectedLead.id}-subject`); setEditValue(selectedLead.personalized_subject || ''); } }}>
                        {selectedLead.personalized_subject}
                        {selectedLead.stage === 'researched' && <Edit3 className="h-3 w-3 inline ml-1 text-gray-400" />}
                      </p>
                    )}
                  </div>
                  {/* Email body */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-indigo-500 mb-1">EMAIL</p>
                    {editingField === `${selectedLead.id}-email` ? (
                      <div className="space-y-2">
                        <textarea className="w-full text-sm border rounded px-2 py-1 min-h-[100px]" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                        <div className="flex gap-2">
                          <button onClick={() => saveInlineEdit(selectedLead.id, 'personalized_email')} className="text-xs bg-green-600 text-white px-2 py-1 rounded">Save</button>
                          <button onClick={() => setEditingField(null)} className="text-xs text-gray-400">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 whitespace-pre-line cursor-pointer hover:text-indigo-700" onClick={() => { if (selectedLead.stage === 'researched') { setEditingField(`${selectedLead.id}-email`); setEditValue(selectedLead.personalized_email || ''); } }}>
                        {selectedLead.personalized_email}
                        {selectedLead.stage === 'researched' && <Edit3 className="h-3 w-3 inline ml-1 text-gray-400" />}
                      </p>
                    )}
                  </div>
                  {/* SMS opener */}
                  {selectedLead.personalized_opener && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                      <p className="text-[10px] font-bold text-amber-500 mb-1">SMS OPENER</p>
                      {editingField === `${selectedLead.id}-opener` ? (
                        <div className="flex gap-2">
                          <input className="flex-1 text-sm border rounded px-2 py-1" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                          <button onClick={() => saveInlineEdit(selectedLead.id, 'personalized_opener')} className="text-green-600"><Check className="h-4 w-4" /></button>
                          <button onClick={() => setEditingField(null)} className="text-gray-400"><X className="h-4 w-4" /></button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700 cursor-pointer hover:text-amber-700" onClick={() => { if (selectedLead.stage === 'researched') { setEditingField(`${selectedLead.id}-opener`); setEditValue(selectedLead.personalized_opener || ''); } }}>
                          {selectedLead.personalized_opener}
                          {selectedLead.stage === 'researched' && <Edit3 className="h-3 w-3 inline ml-1 text-gray-400" />}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── LIVE CONVERSATION ─── */}
              {selectedLead.ghl_contact_id && (
                <div>
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-3">
                    <MessageSquare className="h-4 w-4" /> Conversation
                    {loadingConvo && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
                    <button onClick={() => loadConversation(selectedLead.id)} className="ml-auto text-gray-400 hover:text-gray-600">
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-h-72 overflow-y-auto space-y-2">
                    {conversation.length === 0 && !loadingConvo && (
                      <p className="text-xs text-gray-400 text-center py-4">
                        {selectedLead.stage === 'messaged' ? 'Waiting for reply... AI will handle it automatically ⏳' : 'No messages yet'}
                      </p>
                    )}
                    {conversation.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                          msg.direction === 'outbound'
                            ? 'bg-indigo-600 text-white rounded-br-sm'
                            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-sm'
                        }`}>
                          <p className="text-sm whitespace-pre-line">{msg.body}</p>
                          <p className={`text-[10px] mt-1 ${msg.direction === 'outbound' ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {msg.direction === 'outbound' ? '🤖 AI' : '👤 Lead'} · {new Date(msg.dateAdded).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {msg.type !== 'SMS' && ` · ${msg.type}`}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={convoEndRef} />
                  </div>

                  {/* Manual message input */}
                  <div className="flex gap-2 mt-2">
                    <input
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="Send a manual message..."
                      value={manualMsg}
                      onChange={e => setManualMsg(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendManualMessage(); } }}
                    />
                    <Button
                      onClick={sendManualMessage}
                      disabled={sendingMsg || !manualMsg.trim()}
                      className="bg-indigo-600 text-white text-sm px-3"
                    >
                      {sendingMsg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-2">📝 Notes</h3>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm min-h-[60px] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Add notes about this lead..."
                  defaultValue={selectedLead.notes || ''}
                  onBlur={e => {
                    if (e.target.value !== (selectedLead.notes || '')) {
                      updateLead(selectedLead.id, { notes: e.target.value });
                    }
                  }}
                />
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t bg-gray-50 flex items-center gap-2 shrink-0">
              {selectedLead.stage === 'found' && (
                <Button onClick={() => { enrichSingle(selectedLead.id); setSelectedLead(null); }} className="bg-purple-600 hover:bg-purple-700 text-white text-sm">
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Research
                </Button>
              )}
              {selectedLead.stage === 'researched' && (
                <>
                  <Button onClick={() => { approveLeads([selectedLead.id]); setSelectedLead(null); }} className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm">
                    <Check className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                  <Button onClick={() => { launchSingle(selectedLead.id); setSelectedLead(null); }} className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm">
                    <Send className="h-3.5 w-3.5 mr-1" /> Approve & Launch
                  </Button>
                </>
              )}
              {selectedLead.stage === 'approved' && (
                <Button onClick={() => { launchSingle(selectedLead.id); setSelectedLead(null); }} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm">
                  <Send className="h-3.5 w-3.5 mr-1" /> Launch Now
                </Button>
              )}
              {['messaged', 'replied', 'interested'].includes(selectedLead.stage) && (
                <>
                  {selectedLead.stage === 'messaged' && (
                    <Button variant="outline" className="text-sm" onClick={() => { updateLead(selectedLead.id, { stage: 'replied' }); setSelectedLead(null); }}>
                      Mark Replied
                    </Button>
                  )}
                  <Button variant="outline" className="text-sm" onClick={() => { updateLead(selectedLead.id, { stage: 'interested' }); setSelectedLead(null); }}>
                    Mark Interested
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white text-sm" onClick={() => { updateLead(selectedLead.id, { stage: 'booked' }); setSelectedLead(null); }}>
                    <Calendar className="h-3.5 w-3.5 mr-1" /> Mark Booked
                  </Button>
                </>
              )}
              {selectedLead.stage === 'booked' && (
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm" onClick={() => { updateLead(selectedLead.id, { stage: 'closed' }); setSelectedLead(null); }}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Closed Won
                </Button>
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
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
