'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Target, Plus, Search, Sparkles, Send, Loader2,
  Users, Mail, MessageSquare, Calendar, CheckCircle2, X,
  Zap, Building2, MapPin, Briefcase, Globe, Phone,
  Activity, TrendingUp, ChevronRight, RefreshCw, Bot,
  Rocket, Eye, Clock, Check, Edit3, ArrowRight,
  Settings, Webhook, AlertTriangle, ChevronDown, Trash2,
  UserCheck, XCircle, FileEdit, Play, Square,
  Map, Upload, Star, Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Campaign {
  id: string; name: string; target_industry: string | null; target_location: string | null;
  status: string; leads_found: number; leads_messaged: number; leads_replied: number; leads_booked: number;
  stage_counts: Record<string, number>; created_at: string; value_prop: string | null;
}

interface Lead {
  id: string; campaign_id: string; first_name: string | null; last_name: string | null;
  full_name: string | null; title: string | null; company: string | null; industry: string | null;
  company_size: string | null; location: string | null; email: string | null; phone: string | null;
  website: string | null; enrichment_data: Record<string, unknown>;
  personalized_subject: string | null; personalized_email: string | null; personalized_opener: string | null;
  stage: string; ghl_contact_id: string | null; messaged_at: string | null; replied_at: string | null;
  notes: string | null; created_at: string;
}

interface ConvoMsg { id: string; direction: 'inbound' | 'outbound'; body: string; type: string; dateAdded: string; }

interface RunEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

const STAGE_BADGE: Record<string, string> = {
  found: 'bg-blue-100 text-blue-700', approved: 'bg-cyan-100 text-cyan-700',
  researched: 'bg-purple-100 text-purple-700', outreach_approved: 'bg-indigo-100 text-indigo-700',
  messaged: 'bg-amber-100 text-amber-700', replied: 'bg-orange-100 text-orange-700',
  interested: 'bg-orange-200 text-orange-800', booked: 'bg-green-100 text-green-700',
  closed: 'bg-emerald-100 text-emerald-700', skipped: 'bg-gray-100 text-gray-500',
};

// Pipeline stages (tabs)
const STAGES = [
  { key: 'create', label: 'Create', icon: Plus, num: 1 },
  { key: 'review_leads', label: 'Review Leads', icon: Search, num: 2 },
  { key: 'review_outreach', label: 'Review Outreach', icon: Sparkles, num: 3 },
  { key: 'launch', label: 'Launch', icon: Send, num: 4 },
  { key: 'closer', label: 'AI Closer', icon: Bot, num: 5 },
] as const;

type StageKey = typeof STAGES[number]['key'];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PipelineClient() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<StageKey>('create');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [runEvents, setRunEvents] = useState<RunEvent[]>([]);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Enriching state
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0 });

  // Launch state
  const [isLaunching, setIsLaunching] = useState(false);

  // Approve state
  const [isApproving, setIsApproving] = useState(false);

  // Lead detail / conversation
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [conversation, setConversation] = useState<ConvoMsg[]>([]);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const [manualMsg, setManualMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const convoEndRef = useRef<HTMLDivElement>(null);

  // Inline editing
  const [editingLead, setEditingLead] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ subject: string; email: string; opener: string }>({ subject: '', email: '', opener: '' });

  // Follow-up stats
  const [followUpStats, setFollowUpStats] = useState<{ total: number; pending: number; sent: number; cancelled: number; failed: number } | null>(null);
  const [leadFollowUps, setLeadFollowUps] = useState<Array<{ id: string; follow_up_number: number; status: string; channel: string; scheduled_at: string; sent_at: string | null; message: string | null; subject: string | null }>>([]);

  // Form
  const [form, setForm] = useState({
    name: '', target_industry: '', target_role: 'Owner', target_company_size: '11-50',
    target_location: '', target_pain_points: '', value_prop: '', lead_count: 10,
    lead_source: 'google_maps' as 'google_maps' | 'ai_discovery' | 'csv_upload',
    csv_data: '',
    enrich_model: 'gpt-4o',
    follow_up_count: 3,
    follow_up_delay_days: 3,
    follow_up_channel: 'same' as 'same' | 'email' | 'sms' | 'both',
  });

  // ─── Load data ──────────────────────────────────────────────────────────────
  const loadCampaigns = useCallback(async () => {
    const res = await fetch('/api/agency/pipeline/campaigns');
    const data = await res.json();
    setCampaigns(data.campaigns ?? []);
    if (!activeCampaign && data.campaigns?.length > 0) {
      setActiveCampaign(data.campaigns[0]);
      setActiveStage('review_leads');
    }
    setLoading(false);
  }, [activeCampaign]);

  const loadLeads = useCallback(async () => {
    if (!activeCampaign) return;
    const res = await fetch(`/api/agency/pipeline/leads?campaign_id=${activeCampaign.id}`);
    const data = await res.json();
    setLeads(data.leads ?? []);
    setSelectedIds(new Set());
  }, [activeCampaign]);

  // Load follow-up stats when on closer tab
  const loadFollowUpStats = useCallback(async () => {
    if (!activeCampaign || activeStage !== 'closer') return;
    try {
      const res = await fetch(`/api/agency/pipeline/follow-ups?campaign_id=${activeCampaign.id}`);
      const data = await res.json();
      setFollowUpStats(data.stats ?? null);
    } catch { /* ignore */ }
  }, [activeCampaign, activeStage]);

  // Load follow-ups for selected lead
  const loadLeadFollowUps = useCallback(async (leadId: string) => {
    try {
      const res = await fetch(`/api/agency/pipeline/follow-ups?lead_id=${leadId}`);
      const data = await res.json();
      setLeadFollowUps(data.follow_ups ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);
  useEffect(() => { loadLeads(); }, [loadLeads]);
  useEffect(() => { loadFollowUpStats(); }, [loadFollowUpStats]);
  useEffect(() => { eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [runEvents]);
  useEffect(() => { convoEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation]);

  // ─── Stage counts ──────────────────────────────────────────────────────────
  const stageCounts: Record<string, number> = {};
  for (const l of leads) stageCounts[l.stage] = (stageCounts[l.stage] ?? 0) + 1;

  const stageTabCounts: Record<StageKey, number> = {
    create: 0,
    review_leads: stageCounts.found ?? 0,
    review_outreach: stageCounts.researched ?? 0,
    launch: stageCounts.outreach_approved ?? 0,
    closer: (stageCounts.messaged ?? 0) + (stageCounts.replied ?? 0) + (stageCounts.interested ?? 0) + (stageCounts.booked ?? 0) + (stageCounts.closed ?? 0),
  };

  // ─── Conversation ──────────────────────────────────────────────────────────
  const loadConversation = useCallback(async (leadId: string) => {
    setLoadingConvo(true);
    try {
      const res = await fetch(`/api/agency/pipeline/conversations?lead_id=${leadId}`);
      const data = await res.json();
      setConversation(data.messages ?? []);
    } finally { setLoadingConvo(false); }
  }, []);

  // ─── THE RUN (Create + Find only) ──────────────────────────────────────────
  const startRun = async () => {
    setIsRunning(true);
    setRunEvents([]);

    try {
      const res = await fetch('/api/agency/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          lead_source: form.lead_source,
          csv_data: form.lead_source === 'csv_upload' ? form.csv_data : undefined,
          enrich_model: form.enrich_model,
        }),
      });

      if (!res.ok || !res.body) {
        let errorMsg = 'Failed to start pipeline';
        try {
          const errData = await res.json();
          if (res.status === 402) {
            errorMsg = errData.message || `Insufficient credits (${errData.balance || 0} remaining). Add credits to continue.`;
          } else {
            errorMsg = errData.error || errData.message || errorMsg;
          }
        } catch { /* use default */ }
        setRunEvents(prev => [...prev, { type: 'error', data: { error: errorMsg }, timestamp: Date.now() }]);
        setIsRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              setRunEvents(prev => [...prev, { type: eventType, data, timestamp: Date.now() }]);
              if (eventType === 'done') {
                const cid = data.campaignId as string;
                await loadCampaigns();
                const campRes = await fetch('/api/agency/pipeline/campaigns');
                const campData = await campRes.json();
                const newCamp = (campData.campaigns || []).find((c: Campaign) => c.id === cid);
                if (newCamp) {
                  setActiveCampaign(newCamp);
                  const leadRes = await fetch(`/api/agency/pipeline/leads?campaign_id=${cid}`);
                  const leadData = await leadRes.json();
                  setLeads(leadData.leads ?? []);
                }
                // Auto-switch to review tab
                setActiveStage('review_leads');
              }
            } catch { /* skip malformed */ }
            eventType = '';
          }
        }
      }
    } catch (err) {
      setRunEvents(prev => [...prev, { type: 'error', data: { error: String(err) }, timestamp: Date.now() }]);
    }

    setIsRunning(false);
  };

  // ─── Approve leads ────────────────────────────────────────────────────────
  const approveLeads = async (leadIds: string[], action: 'approve' | 'reject' | 'approve_outreach') => {
    setIsApproving(true);
    try {
      await fetch('/api/agency/pipeline/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: leadIds, action }),
      });
      await loadLeads();
      setSelectedIds(new Set());
    } finally { setIsApproving(false); }
  };

  // ─── Research leads ───────────────────────────────────────────────────────
  const researchLeads = async (leadIds: string[]) => {
    setIsEnriching(true);
    setEnrichProgress({ done: 0, total: leadIds.length });
    try {
      const res = await fetch('/api/agency/pipeline/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: leadIds }),
      });
      const data = await res.json();
      setEnrichProgress({ done: data.enriched ?? 0, total: leadIds.length });
      await loadLeads();
      // Auto-switch to review outreach
      if (data.enriched > 0) setActiveStage('review_outreach');
    } finally { setIsEnriching(false); }
  };

  // ─── Launch outreach ──────────────────────────────────────────────────────
  const launchOutreach = async (leadIds: string[], channel: string = 'both') => {
    setIsLaunching(true);
    try {
      await fetch('/api/agency/pipeline/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_ids: leadIds, channel }),
      });
      await loadLeads();
      // Auto-switch to closer
      setActiveStage('closer');
    } finally { setIsLaunching(false); }
  };

  // ─── Update lead ──────────────────────────────────────────────────────────
  const updateLead = async (leadId: string, updates: Record<string, unknown>) => {
    await fetch(`/api/agency/pipeline/leads/${leadId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await loadLeads();
  };

  // ─── Send manual message ──────────────────────────────────────────────────
  const sendManualMessage = async () => {
    if (!selectedLead || !manualMsg.trim()) return;
    setSendingMsg(true);
    try {
      await fetch(`/api/agency/pipeline/leads/${selectedLead.id}/message`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: manualMsg.trim(), type: 'SMS' }),
      });
      setManualMsg('');
      await loadConversation(selectedLead.id);
    } finally { setSendingMsg(false); }
  };

  // ─── Selection helpers ────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = (stageLeads: Lead[]) => {
    setSelectedIds(new Set(stageLeads.map(l => l.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ─── Filter leads by stage ────────────────────────────────────────────────
  const foundLeads = leads.filter(l => l.stage === 'found');
  const approvedLeads = leads.filter(l => l.stage === 'approved');
  const researchedLeads = leads.filter(l => l.stage === 'researched');
  const outreachApprovedLeads = leads.filter(l => l.stage === 'outreach_approved');
  const closerLeads = leads.filter(l => ['messaged', 'replied', 'interested', 'booked', 'closed'].includes(l.stage));

  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl space-y-6">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-500" />
            AI Sales Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Human-in-the-loop: you review every stage before AI acts.
          </p>
        </div>
      </div>

      {/* ═══ CAMPAIGN SELECTOR ═══ */}
      {campaigns.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {campaigns.map((c) => (
            <button key={c.id} onClick={() => { setActiveCampaign(c); setActiveStage('review_leads'); }}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition ${
                activeCampaign?.id === c.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c.name}
              <span className="ml-2 text-xs opacity-60">{Object.values(c.stage_counts || {}).reduce((a: number, b: number) => a + b, 0)} leads</span>
            </button>
          ))}
          <button onClick={() => { setActiveCampaign(null); setActiveStage('create'); setLeads([]); }}
            className="shrink-0 px-3 py-2 rounded-lg text-sm font-medium border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition flex items-center gap-1">
            <Plus className="h-3 w-3" /> New
          </button>
        </div>
      )}

      {/* ═══ STAGE TABS (Progress Bar) ═══ */}
      <div className="bg-white border border-gray-200 rounded-xl p-1 flex items-center gap-1">
        {STAGES.map(({ key, label, icon: Icon, num }, i) => {
          const count = stageTabCounts[key];
          const isActive = activeStage === key;
          const isClickable = key === 'create' || activeCampaign;
          return (
            <button
              key={key}
              onClick={() => isClickable && setActiveStage(key)}
              disabled={!isClickable}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isClickable
                    ? 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isActive ? 'bg-white/20' : 'bg-gray-100'
              }`}>{num}</span>
              <Icon className="h-3.5 w-3.5 hidden sm:block" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden text-[10px]">{label.split(' ')[0]}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/20' : 'bg-gray-100 text-gray-600'
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══ STAGE CONTENT ═══ */}

      {/* ── STAGE 1: CREATE CAMPAIGN ── */}
      {activeStage === 'create' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-2xl mx-auto">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-1">
            <Rocket className="h-5 w-5 text-indigo-500" /> Create Campaign
          </h2>
          <p className="text-xs text-gray-500 mb-5">Find real businesses, review them, then let AI handle outreach.</p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Campaign name *</label>
              <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Cannabis Dispensaries — Los Angeles" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            {/* ═══ LEAD SOURCE SELECTOR ═══ */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Where to find leads</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: 'google_maps', icon: Map, label: 'Google Maps', desc: 'Real businesses, verified data', badge: 'Recommended', badgeColor: 'bg-green-100 text-green-700' },
                  { key: 'ai_discovery', icon: Cpu, label: 'AI Discovery', desc: 'AI-generated, may need verification', badge: 'Free', badgeColor: 'bg-blue-100 text-blue-700' },
                  { key: 'csv_upload', icon: Upload, label: 'Upload CSV', desc: 'Your own lead list', badge: 'Custom', badgeColor: 'bg-purple-100 text-purple-700' },
                ] as const).map(({ key, icon: Icon, label, desc, badge, badgeColor }) => (
                  <button key={key} onClick={() => setForm(f => ({ ...f, lead_source: key }))}
                    className={`text-left p-3 rounded-xl border-2 transition ${
                      form.lead_source === key
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${form.lead_source === key ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <span className="text-xs font-semibold text-gray-900">{label}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">{desc}</p>
                    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 ${badgeColor}`}>{badge}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Google Maps & AI Discovery fields */}
            {form.lead_source !== 'csv_upload' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Industry *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Cannabis Dispensaries" value={form.target_industry} onChange={e => setForm(f => ({ ...f, target_industry: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Location *</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Los Angeles, CA" value={form.target_location} onChange={e => setForm(f => ({ ...f, target_location: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Target role</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Owner, CEO" value={form.target_role} onChange={e => setForm(f => ({ ...f, target_role: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Company size</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.target_company_size} onChange={e => setForm(f => ({ ...f, target_company_size: e.target.value }))}>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="200+">200+ employees</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">How many leads to find</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.lead_count} onChange={e => setForm(f => ({ ...f, lead_count: Number(e.target.value) }))}>
                    <option value={5}>5 leads</option>
                    <option value={10}>10 leads</option>
                    <option value={25}>25 leads</option>
                    <option value={50}>50 leads</option>
                  </select>
                </div>
              </>
            )}

            {/* CSV Upload area */}
            {form.lead_source === 'csv_upload' && (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Paste your CSV data</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[120px]"
                  placeholder={`company,website,phone,email,industry,location\nSweet Flower,sweetflower.com,310-555-1234,info@sweetflower.com,Cannabis,Los Angeles\nMedMen,medmen.com,323-555-5678,,Cannabis,Los Angeles`}
                  value={form.csv_data}
                  onChange={e => setForm(f => ({ ...f, csv_data: e.target.value }))}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Columns: company (required), website, phone, email, industry, location, full_name, title
                </p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">What you&apos;re selling (value prop)</label>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[60px]" placeholder="e.g. AI-powered customer service that handles 80% of inquiries automatically..." value={form.value_prop} onChange={e => setForm(f => ({ ...f, value_prop: e.target.value }))} />
            </div>

            {/* ═══ FOLLOW-UP SEQUENCE SETTINGS ═══ */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-bold text-amber-900">Auto Follow-Up Sequence</h3>
                <span className="text-[9px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">NEW</span>
              </div>
              <p className="text-xs text-amber-700 mb-3">80% of sales require 5+ follow-ups. Leads who don&apos;t reply get automated, personalized follow-ups.</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-amber-700 mb-1 block">Follow-ups</label>
                  <select className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white" value={form.follow_up_count} onChange={e => setForm(f => ({ ...f, follow_up_count: Number(e.target.value) }))}>
                    <option value={0}>None (single touch)</option>
                    <option value={1}>1 follow-up</option>
                    <option value={2}>2 follow-ups</option>
                    <option value={3}>3 follow-ups (recommended)</option>
                    <option value={4}>4 follow-ups</option>
                    <option value={5}>5 follow-ups (aggressive)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-700 mb-1 block">Days between</label>
                  <select className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white" value={form.follow_up_delay_days} onChange={e => setForm(f => ({ ...f, follow_up_delay_days: Number(e.target.value) }))}>
                    <option value={2}>Every 2 days</option>
                    <option value={3}>Every 3 days (recommended)</option>
                    <option value={5}>Every 5 days</option>
                    <option value={7}>Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-700 mb-1 block">Channel</label>
                  <select className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white" value={form.follow_up_channel} onChange={e => setForm(f => ({ ...f, follow_up_channel: e.target.value as 'same' | 'email' | 'sms' | 'both' }))}>
                    <option value="same">Same as outreach</option>
                    <option value="email">Email only</option>
                    <option value="sms">SMS only</option>
                    <option value="both">Both email & SMS</option>
                  </select>
                </div>
              </div>
              {form.follow_up_count > 0 && (
                <div className="mt-2 flex items-center gap-2 text-[10px] text-amber-600">
                  <Clock className="h-3 w-3" />
                  <span>Each follow-up uses a different strategy: gentle bump → new angle → social proof → urgency → breakup</span>
                </div>
              )}
              <p className="text-[10px] text-amber-500 mt-2 flex items-center gap-1">
                <Zap className="h-2.5 w-2.5" /> 1 credit per follow-up sent · Auto-cancels when lead replies
              </p>
            </div>

            {/* ═══ ADVANCED: MODEL SELECTOR ═══ */}
            <details className="group">
              <summary className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-1">
                <Settings className="h-3 w-3" /> Advanced Settings
                <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 mb-1 block">AI MODEL FOR ENRICHMENT & EMAILS</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white" value={form.enrich_model} onChange={e => setForm(f => ({ ...f, enrich_model: e.target.value }))}>
                    <option value="gpt-4o">GPT-4o — Best quality (default)</option>
                    <option value="gpt-4o-mini">GPT-4o Mini — Faster, cheaper</option>
                    <option value="anthropic/claude-sonnet-4-20250514">Claude Sonnet — Strong reasoning (via OpenRouter)</option>
                    <option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash — Fast (via OpenRouter)</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">This model writes your personalized emails and SMS messages.</p>
                </div>
              </div>
            </details>
          </div>

          <Button onClick={startRun} disabled={!form.name.trim() || (form.lead_source !== 'csv_upload' && !form.target_industry.trim()) || (form.lead_source === 'csv_upload' && !form.csv_data.trim()) || isRunning}
            className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 text-base shadow-lg flex items-center justify-center gap-2"
          >
            {isRunning ? <><Loader2 className="h-5 w-5 animate-spin" /> Finding leads...</>
              : form.lead_source === 'google_maps' ? <><Map className="h-5 w-5" /> Search Google Maps</>
              : form.lead_source === 'csv_upload' ? <><Upload className="h-5 w-5" /> Import Leads</>
              : <><Search className="h-5 w-5" /> Discover Leads</>}
          </Button>
          <div className="text-center mt-2 space-y-1">
            <p className="text-[10px] text-gray-400">
              {form.lead_source === 'google_maps'
                ? 'Real businesses from Google Maps → you review → AI writes personalized outreach → you approve → send'
                : form.lead_source === 'csv_upload'
                  ? 'Your leads → AI enriches & writes personalized outreach → you review & approve → send'
                  : 'AI finds businesses → you review → AI writes outreach → you approve → send'}
            </p>
            <p className="text-[10px] font-medium text-indigo-500">
              Cost: 5 credits to find leads + 2 credits per lead enriched
            </p>
          </div>

          {/* Live event feed */}
          {(isRunning || runEvents.length > 0) && (
            <div className="mt-4 bg-gray-950 rounded-xl border border-gray-800 p-4 max-h-60 overflow-y-auto font-mono text-xs space-y-1">
              {runEvents.map((ev, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-gray-600 shrink-0">{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  {ev.type === 'step' && <span className={ev.data.status === 'done' ? 'text-green-400' : ev.data.status === 'running' ? 'text-indigo-400' : 'text-yellow-400'}>{ev.data.status === 'done' ? '✅' : ev.data.status === 'running' ? '⚡' : '⏸️'} {ev.data.label as string}</span>}
                  {ev.type === 'lead_found' && <span className="text-blue-400">🏢 Found <span className="text-white font-semibold">{ev.data.company as string}</span> <span className="text-gray-600">({ev.data.current as number}/{ev.data.total as number})</span></span>}
                  {ev.type === 'done' && <span className="text-emerald-400 font-semibold">🎯 {ev.data.message as string}</span>}
                  {ev.type === 'error' && <span className="text-red-400">❌ {ev.data.error as string}</span>}
                </div>
              ))}
              {isRunning && <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-3 w-3 animate-spin" /> Processing...</div>}
              <div ref={eventsEndRef} />
            </div>
          )}
        </div>
      )}

      {/* ── STAGE 2: REVIEW LEADS ── */}
      {activeStage === 'review_leads' && activeCampaign && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700">
              {foundLeads.length} leads to review
              {approvedLeads.length > 0 && <span className="text-green-600 ml-2">· {approvedLeads.length} approved</span>}
            </span>
            <div className="flex-1" />
            {selectedIds.size > 0 && (
              <>
                <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
                <Button size="sm" variant="outline" onClick={clearSelection} className="text-xs">Clear</Button>
                <Button size="sm" variant="outline" onClick={() => approveLeads([...selectedIds], 'reject')} disabled={isApproving} className="text-xs text-red-600 border-red-200 hover:bg-red-50">
                  <XCircle className="h-3 w-3 mr-1" /> Reject
                </Button>
                <Button size="sm" onClick={() => approveLeads([...selectedIds], 'approve')} disabled={isApproving} className="text-xs bg-green-600 hover:bg-green-700 text-white">
                  {isApproving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserCheck className="h-3 w-3 mr-1" />}
                  Approve ({selectedIds.size})
                </Button>
              </>
            )}
            {foundLeads.length > 0 && selectedIds.size === 0 && (
              <>
                <Button size="sm" variant="outline" onClick={() => selectAll(foundLeads)} className="text-xs">Select All</Button>
                <Button size="sm" onClick={() => approveLeads(foundLeads.map(l => l.id), 'approve')} disabled={isApproving} className="text-xs bg-green-600 hover:bg-green-700 text-white">
                  <UserCheck className="h-3 w-3 mr-1" /> Approve All ({foundLeads.length})
                </Button>
              </>
            )}
            {approvedLeads.length > 0 && (
              <Button size="sm" onClick={() => researchLeads(approvedLeads.map(l => l.id))} disabled={isEnriching} className="text-xs bg-purple-600 hover:bg-purple-700 text-white">
                {isEnriching ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Researching {enrichProgress.done}/{enrichProgress.total}...</> : <><Sparkles className="h-3 w-3 mr-1" /> Research Approved ({approvedLeads.length})</>}
              </Button>
            )}
          </div>

          {/* Lead cards */}
          {foundLeads.length === 0 && approvedLeads.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No leads to review. Create a campaign to find leads.</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...foundLeads, ...approvedLeads].map((lead) => {
              const ed = (lead.enrichment_data || {}) as Record<string, unknown>;
              const isSelected = selectedIds.has(lead.id);
              return (
                <div key={lead.id}
                  className={`bg-white border rounded-xl p-4 transition cursor-pointer ${
                    isSelected ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-md' : 'border-gray-200 hover:shadow-md'
                  }`}
                  onClick={() => toggleSelect(lead.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(lead.id)}
                        className="h-4 w-4 text-indigo-600 rounded border-gray-300" onClick={e => e.stopPropagation()} />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{lead.company || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 truncate">{lead.title} · {lead.industry}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STAGE_BADGE[lead.stage]}`}>
                      {lead.stage === 'found' ? '🔍 FOUND' : '✅ APPROVED'}
                    </span>
                  </div>
                  <div className="space-y-1 mt-2">
                    {lead.website && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Globe className="h-3 w-3 text-gray-400" />
                        <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener"
                          className="hover:underline text-indigo-600 truncate" onClick={e => e.stopPropagation()}>{lead.website}</a>
                      </div>
                    )}
                    {lead.location && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin className="h-3 w-3 text-gray-400" /> {lead.location}
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Phone className="h-3 w-3 text-green-500" /> {lead.phone}
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Mail className="h-3 w-3 text-indigo-400" /> {lead.email}
                      </div>
                    )}
                    {/* Google Maps data */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {typeof ed.rating === 'number' && ed.rating > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" /> {(ed.rating as number).toFixed(1)}
                        </span>
                      )}
                      {typeof ed.reviews_count === 'number' && ed.reviews_count > 0 && (
                        <span className="text-[10px] text-gray-400">{ed.reviews_count as number} reviews</span>
                      )}
                      {ed.source === 'google_maps' && (
                        <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">✓ Google Maps</span>
                      )}
                      {ed.source === 'csv_upload' && (
                        <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">📄 CSV</span>
                      )}
                    </div>
                    {typeof ed.why_qualified === 'string' && ed.why_qualified && (
                      <p className="text-xs text-indigo-600 italic mt-1">&ldquo;{ed.why_qualified}&rdquo;</p>
                    )}
                    {typeof ed.description === 'string' && ed.description && (
                      <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{ed.description as string}</p>
                    )}
                  </div>
                  {/* Quick action buttons */}
                  <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100" onClick={e => e.stopPropagation()}>
                    {lead.stage === 'found' && (
                      <>
                        <Button size="sm" onClick={() => approveLeads([lead.id], 'approve')} disabled={isApproving} className="text-xs bg-green-600 hover:bg-green-700 text-white flex-1">
                          <Check className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => approveLeads([lead.id], 'reject')} disabled={isApproving} className="text-xs text-red-500 border-red-200 hover:bg-red-50">
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {lead.stage === 'approved' && (
                      <Button size="sm" onClick={() => researchLeads([lead.id])} disabled={isEnriching} className="text-xs bg-purple-600 hover:bg-purple-700 text-white flex-1">
                        <Sparkles className="h-3 w-3 mr-1" /> Research
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STAGE 3: REVIEW OUTREACH ── */}
      {activeStage === 'review_outreach' && activeCampaign && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700">
              {researchedLeads.length} outreach messages to review
            </span>
            <div className="flex-1" />
            {selectedIds.size > 0 && (
              <>
                <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
                <Button size="sm" variant="outline" onClick={clearSelection} className="text-xs">Clear</Button>
                <Button size="sm" onClick={() => approveLeads([...selectedIds], 'approve_outreach')} disabled={isApproving} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isApproving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                  Approve Outreach ({selectedIds.size})
                </Button>
              </>
            )}
            {researchedLeads.length > 0 && selectedIds.size === 0 && (
              <>
                <Button size="sm" variant="outline" onClick={() => selectAll(researchedLeads)} className="text-xs">Select All</Button>
                <Button size="sm" onClick={() => approveLeads(researchedLeads.map(l => l.id), 'approve_outreach')} disabled={isApproving} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Approve All ({researchedLeads.length})
                </Button>
              </>
            )}
          </div>

          {researchedLeads.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No outreach to review. Approve leads first, then research them.</p>
            </div>
          )}

          {/* Outreach review cards */}
          <div className="space-y-4">
            {researchedLeads.map((lead) => {
              const ed = (lead.enrichment_data || {}) as Record<string, string>;
              const isEditing = editingLead === lead.id;
              const isSelected = selectedIds.has(lead.id);
              return (
                <div key={lead.id} className={`bg-white border rounded-xl overflow-hidden transition ${
                  isSelected ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200'
                }`}>
                  {/* Header */}
                  <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(lead.id)}
                      className="h-4 w-4 text-indigo-600 rounded border-gray-300" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{lead.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{lead.title} at {lead.company} · {lead.location}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {lead.email && <span className="text-xs text-indigo-600 flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.email}</span>}
                      {lead.phone && <span className="text-xs text-green-600 flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone}</span>}
                    </div>
                  </div>

                  {/* Research insights */}
                  {ed.company_context && (
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-2 gap-2">
                      <div><p className="text-[10px] font-bold text-purple-500">ABOUT</p><p className="text-xs text-gray-700">{ed.company_context}</p></div>
                      {ed.likely_pain_points && <div><p className="text-[10px] font-bold text-red-500">PAIN POINTS</p><p className="text-xs text-gray-700">{ed.likely_pain_points}</p></div>}
                    </div>
                  )}

                  {/* Outreach messages — editable */}
                  <div className="p-4 space-y-3">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="text-[10px] font-bold text-indigo-500 mb-0.5 block">SUBJECT</label>
                          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            value={editFields.subject} onChange={e => setEditFields(f => ({ ...f, subject: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-indigo-500 mb-0.5 block">EMAIL</label>
                          <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[120px]"
                            value={editFields.email} onChange={e => setEditFields(f => ({ ...f, email: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-amber-500 mb-0.5 block">SMS OPENER</label>
                          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            value={editFields.opener} onChange={e => setEditFields(f => ({ ...f, opener: e.target.value }))} />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={async () => {
                            await updateLead(lead.id, {
                              personalized_subject: editFields.subject,
                              personalized_email: editFields.email,
                              personalized_opener: editFields.opener,
                            });
                            setEditingLead(null);
                          }} className="text-xs bg-green-600 text-white">
                            <Check className="h-3 w-3 mr-1" /> Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingLead(null)} className="text-xs">Cancel</Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {lead.personalized_subject && (
                          <div className="bg-indigo-50 rounded-lg p-3">
                            <p className="text-[10px] font-bold text-indigo-400 mb-0.5">SUBJECT</p>
                            <p className="text-sm font-medium text-gray-900">{lead.personalized_subject}</p>
                          </div>
                        )}
                        {lead.personalized_email && (
                          <div className="bg-indigo-50 rounded-lg p-3">
                            <p className="text-[10px] font-bold text-indigo-400 mb-0.5">EMAIL</p>
                            <p className="text-xs text-gray-700 whitespace-pre-line">{lead.personalized_email}</p>
                          </div>
                        )}
                        {lead.personalized_opener && (
                          <div className="bg-amber-50 rounded-lg p-3">
                            <p className="text-[10px] font-bold text-amber-500 mb-0.5">SMS</p>
                            <p className="text-xs text-gray-700">{lead.personalized_opener}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
                    {!isEditing && (
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingLead(lead.id);
                        setEditFields({
                          subject: lead.personalized_subject || '',
                          email: lead.personalized_email || '',
                          opener: lead.personalized_opener || '',
                        });
                      }} className="text-xs">
                        <Edit3 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button size="sm" variant="outline" onClick={() => approveLeads([lead.id], 'reject')} disabled={isApproving} className="text-xs text-red-500 border-red-200 hover:bg-red-50">
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                    <Button size="sm" onClick={() => approveLeads([lead.id], 'approve_outreach')} disabled={isApproving} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STAGE 4: LAUNCH OUTREACH ── */}
      {activeStage === 'launch' && activeCampaign && (
        <div className="space-y-4">
          {/* Warning banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Ready to send real messages</p>
              <p className="text-xs text-amber-600">These messages will be sent to real people via email and/or SMS through GoHighLevel. Make sure you&apos;ve reviewed everything.</p>
            </div>
          </div>

          {/* Action bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-700">
              {outreachApprovedLeads.length} ready to send
            </span>
            <div className="flex-1" />
            {outreachApprovedLeads.length > 0 && (
              <Button onClick={() => launchOutreach(outreachApprovedLeads.map(l => l.id))} disabled={isLaunching}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm shadow-lg">
                {isLaunching ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</> : <><Send className="h-4 w-4 mr-2" /> Send All ({outreachApprovedLeads.length})</>}
              </Button>
            )}
          </div>

          {outreachApprovedLeads.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Send className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No approved outreach to send. Review and approve messages first.</p>
            </div>
          )}

          {/* Launch cards */}
          <div className="grid gap-3 sm:grid-cols-2">
            {outreachApprovedLeads.map((lead) => (
              <div key={lead.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{lead.full_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{lead.title} at {lead.company}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">READY</span>
                </div>
                <div className="space-y-1 mb-3 text-xs text-gray-600">
                  {lead.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3 text-indigo-400" /> {lead.email}</p>}
                  {lead.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3 text-green-500" /> {lead.phone}</p>}
                </div>
                {lead.personalized_subject && (
                  <p className="text-xs font-medium text-gray-800 mb-1">📧 {lead.personalized_subject}</p>
                )}
                {lead.personalized_opener && (
                  <p className="text-xs text-amber-700 italic">📱 {lead.personalized_opener}</p>
                )}
                <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                  <Button size="sm" onClick={() => launchOutreach([lead.id], 'email')} disabled={isLaunching || !lead.email} className="text-xs bg-cyan-600 text-white flex-1">
                    <Mail className="h-3 w-3 mr-1" /> Email
                  </Button>
                  <Button size="sm" onClick={() => launchOutreach([lead.id], 'sms')} disabled={isLaunching || !lead.phone} className="text-xs bg-green-600 text-white flex-1">
                    <Phone className="h-3 w-3 mr-1" /> SMS
                  </Button>
                  <Button size="sm" onClick={() => launchOutreach([lead.id], 'both')} disabled={isLaunching} className="text-xs bg-indigo-600 text-white flex-1">
                    <Send className="h-3 w-3 mr-1" /> Both
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STAGE 5: AI CLOSER ── */}
      {activeStage === 'closer' && activeCampaign && (
        <div className="space-y-4">
          {/* Status bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-500" />
              <span className="text-sm font-medium text-gray-700">AI Closer — Autonomous Mode</span>
            </div>
            <div className="flex-1" />
            <div className="flex gap-3 text-xs">
              <span className="text-amber-600">📨 Sent: {stageCounts.messaged ?? 0}</span>
              <span className="text-orange-600">💬 Replied: {stageCounts.replied ?? 0}</span>
              <span className="text-orange-700">🔥 Interested: {stageCounts.interested ?? 0}</span>
              <span className="text-green-600">📅 Booked: {stageCounts.booked ?? 0}</span>
              <span className="text-emerald-600">🎉 Closed: {stageCounts.closed ?? 0}</span>
            </div>
          </div>

          {/* Follow-up stats bar */}
          {followUpStats && followUpStats.total > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Follow-Up Sequence</span>
              </div>
              <div className="flex-1" />
              <div className="flex gap-3 text-xs">
                <span className="text-amber-600">⏳ Pending: {followUpStats.pending}</span>
                <span className="text-green-600">✅ Sent: {followUpStats.sent}</span>
                <span className="text-gray-500">🚫 Cancelled: {followUpStats.cancelled}</span>
                {followUpStats.failed > 0 && <span className="text-red-500">❌ Failed: {followUpStats.failed}</span>}
              </div>
            </div>
          )}

          {closerLeads.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active conversations. Send outreach first to activate the AI Closer.</p>
            </div>
          )}

          {/* Closer lead cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {closerLeads.map((lead) => {
              const ed = (lead.enrichment_data || {}) as Record<string, unknown>;
              const sentChannels = (ed.sent_channels || []) as string[];
              return (
                <div key={lead.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition cursor-pointer"
                  onClick={() => { setSelectedLead(lead); if (lead.ghl_contact_id) loadConversation(lead.id); loadLeadFollowUps(lead.id); }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{lead.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate">{lead.title} at {lead.company}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STAGE_BADGE[lead.stage]}`}>
                      {lead.stage === 'messaged' ? '📨 SENT' :
                       lead.stage === 'replied' ? '💬 REPLIED' :
                       lead.stage === 'interested' ? '🔥 INTERESTED' :
                       lead.stage === 'booked' ? '📅 BOOKED' :
                       lead.stage === 'closed' ? '🎉 CLOSED' :
                       lead.stage.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {lead.email && <p className="text-xs text-gray-600 flex items-center gap-1"><Mail className="h-3 w-3 text-indigo-400" /> {lead.email}</p>}
                    {lead.phone && <p className="text-xs text-gray-600 flex items-center gap-1"><Phone className="h-3 w-3 text-green-500" /> {lead.phone}</p>}
                  </div>
                  {sentChannels.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {sentChannels.includes('email') && <span className="text-[9px] font-medium bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded">📧 Email</span>}
                      {sentChannels.includes('sms') && <span className="text-[9px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded">📱 SMS</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 pt-2 mt-2 border-t border-gray-100 text-[10px] flex-wrap">
                    {['replied', 'interested'].includes(lead.stage) && (
                      <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1">
                        <Bot className="h-2.5 w-2.5" /> AI Closing
                      </span>
                    )}
                    {lead.stage === 'messaged' && lead.messaged_at && (
                      <>
                        <span className="text-gray-400">Sent {timeAgo(lead.messaged_at)}</span>
                        <span className="text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <RefreshCw className="h-2.5 w-2.5" /> Follow-ups active
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ LEAD DETAIL MODAL ═══ */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setSelectedLead(null); setConversation([]); }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedLead.full_name || 'Unknown'}</h2>
                  <p className="text-sm text-gray-500">{selectedLead.title} at {selectedLead.company}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STAGE_BADGE[selectedLead.stage]}`}>{selectedLead.stage.toUpperCase()}</span>
                  <button onClick={() => { setSelectedLead(null); setConversation([]); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                {selectedLead.email && <span className="flex items-center gap-1 text-indigo-600"><Mail className="h-3 w-3" /> {selectedLead.email}</span>}
                {selectedLead.phone && <span className="flex items-center gap-1 text-green-600"><Phone className="h-3 w-3" /> {selectedLead.phone}</span>}
                {selectedLead.website && <a href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`} target="_blank" rel="noopener" className="flex items-center gap-1 text-gray-600 hover:underline"><Globe className="h-3 w-3" /> {selectedLead.website}</a>}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Conversation */}
              {selectedLead.ghl_contact_id && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5" /> Live Conversation
                      {loadingConvo && <Loader2 className="h-3 w-3 animate-spin" />}
                    </h3>
                    <button onClick={() => loadConversation(selectedLead.id)} className="text-gray-400 hover:text-gray-600"><RefreshCw className="h-3 w-3" /></button>
                  </div>
                  <div className="bg-gray-50 border rounded-xl p-3 max-h-64 overflow-y-auto space-y-2">
                    {conversation.length === 0 && !loadingConvo && (
                      <p className="text-xs text-gray-400 text-center py-6">
                        {selectedLead.stage === 'messaged' ? '⏳ Waiting for reply... AI will handle it' : 'No messages yet'}
                      </p>
                    )}
                    {conversation.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${msg.direction === 'outbound' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border text-gray-900 rounded-bl-sm'}`}>
                          <p className="text-sm whitespace-pre-line">{msg.body}</p>
                          <p className={`text-[10px] mt-1 ${msg.direction === 'outbound' ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {msg.direction === 'outbound' ? '🤖 AI' : '👤'} · {new Date(msg.dateAdded).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={convoEndRef} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Jump in — send a manual message..."
                      value={manualMsg} onChange={e => setManualMsg(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendManualMessage(); } }} />
                    <Button onClick={sendManualMessage} disabled={sendingMsg || !manualMsg.trim()} className="bg-indigo-600 text-white px-3">
                      {sendingMsg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Follow-Up Timeline */}
              {leadFollowUps.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> Follow-Up Sequence
                  </h3>
                  <div className="space-y-2">
                    {leadFollowUps.map((fu) => (
                      <div key={fu.id} className={`flex items-start gap-3 p-2.5 rounded-lg border ${
                        fu.status === 'sent' ? 'bg-green-50 border-green-200' :
                        fu.status === 'pending' ? 'bg-amber-50 border-amber-200' :
                        fu.status === 'cancelled' ? 'bg-gray-50 border-gray-200 opacity-60' :
                        fu.status === 'failed' ? 'bg-red-50 border-red-200' :
                        'bg-blue-50 border-blue-200'
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          fu.status === 'sent' ? 'bg-green-200 text-green-800' :
                          fu.status === 'pending' ? 'bg-amber-200 text-amber-800' :
                          fu.status === 'cancelled' ? 'bg-gray-200 text-gray-600' :
                          fu.status === 'failed' ? 'bg-red-200 text-red-800' :
                          'bg-blue-200 text-blue-800'
                        }`}>
                          {fu.follow_up_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium text-gray-900">
                              Follow-up #{fu.follow_up_number} via {fu.channel.toUpperCase()}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              fu.status === 'sent' ? 'bg-green-200 text-green-800' :
                              fu.status === 'pending' ? 'bg-amber-200 text-amber-800' :
                              fu.status === 'cancelled' ? 'bg-gray-200 text-gray-600' :
                              fu.status === 'failed' ? 'bg-red-200 text-red-800' :
                              'bg-blue-200 text-blue-800'
                            }`}>
                              {fu.status === 'sent' ? '✅ SENT' :
                               fu.status === 'pending' ? '⏳ SCHEDULED' :
                               fu.status === 'cancelled' ? '🚫 CANCELLED' :
                               fu.status === 'failed' ? '❌ FAILED' :
                               fu.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500">
                            {fu.status === 'sent' && fu.sent_at ? `Sent ${new Date(fu.sent_at).toLocaleDateString()} at ${new Date(fu.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` :
                             fu.status === 'pending' ? `Scheduled for ${new Date(fu.scheduled_at).toLocaleDateString()} at ${new Date(fu.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` :
                             fu.status === 'cancelled' ? 'Lead replied — follow-up cancelled' : ''}
                          </p>
                          {fu.status === 'sent' && fu.message && (
                            <p className="text-xs text-gray-700 mt-1 line-clamp-2 italic">&ldquo;{fu.message.slice(0, 150)}{fu.message.length > 150 ? '...' : ''}&rdquo;</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</h3>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm min-h-[50px] focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Add notes..."
                  defaultValue={selectedLead.notes || ''}
                  onBlur={e => { if (e.target.value !== (selectedLead.notes || '')) updateLead(selectedLead.id, { notes: e.target.value }); }} />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-gray-50 flex items-center gap-2 shrink-0 flex-wrap">
              {['messaged', 'replied', 'interested'].includes(selectedLead.stage) && (
                <>
                  <Button variant="outline" className="text-xs" onClick={() => { updateLead(selectedLead.id, { stage: 'interested' }); setSelectedLead(null); }}>Mark Interested</Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white text-xs" onClick={() => { updateLead(selectedLead.id, { stage: 'booked' }); setSelectedLead(null); }}><Calendar className="h-3 w-3 mr-1" /> Booked</Button>
                </>
              )}
              {selectedLead.stage === 'booked' && (
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs" onClick={() => { updateLead(selectedLead.id, { stage: 'closed' }); setSelectedLead(null); }}><CheckCircle2 className="h-3 w-3 mr-1" /> Closed Won</Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" className="text-xs text-gray-400" onClick={() => { updateLead(selectedLead.id, { stage: 'skipped' }); setSelectedLead(null); }}>Skip</Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {!activeCampaign && campaigns.length === 0 && activeStage !== 'create' && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Target className="h-10 w-10 text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">AI Sales Pipeline</h2>
          <p className="text-sm text-gray-500 mb-2 max-w-lg mx-auto">
            You&apos;re in control. AI finds and researches leads, writes personalized outreach.
            You review and approve every step before anything is sent.
          </p>
          <Button onClick={() => setActiveStage('create')}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 text-base shadow-lg mt-4"
          >
            <Plus className="h-5 w-5 mr-2" /> Create First Campaign
          </Button>
        </div>
      )}
    </div>
  );
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
