'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Target, Plus, Search, Sparkles, Send, Loader2,
  Users, Mail, MessageSquare, Calendar, CheckCircle2, X,
  Zap, Building2, MapPin, Briefcase, Globe, Phone,
  Activity, TrendingUp, ChevronRight, RefreshCw, Bot,
  Rocket, Eye, Clock, Check, Edit3, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Campaign {
  id: string; name: string; target_industry: string | null; target_location: string | null;
  status: string; leads_found: number; leads_messaged: number; leads_replied: number; leads_booked: number;
  stage_counts: Record<string, number>; created_at: string;
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
  found: 'bg-blue-100 text-blue-700', researched: 'bg-purple-100 text-purple-700',
  approved: 'bg-cyan-100 text-cyan-700', messaged: 'bg-indigo-100 text-indigo-700',
  replied: 'bg-amber-100 text-amber-700', interested: 'bg-orange-100 text-orange-700',
  booked: 'bg-green-100 text-green-700', closed: 'bg-emerald-100 text-emerald-700',
  skipped: 'bg-gray-100 text-gray-500',
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PipelineClient() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Autonomous run state
  const [isRunning, setIsRunning] = useState(false);
  const [runEvents, setRunEvents] = useState<RunEvent[]>([]);
  const [runStep, setRunStep] = useState(0);
  const [runSteps, setRunSteps] = useState<Record<number, { label: string; status: string }>>({});
  const [showCreate, setShowCreate] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Conversation
  const [conversation, setConversation] = useState<ConvoMsg[]>([]);
  const [loadingConvo, setLoadingConvo] = useState(false);
  const [manualMsg, setManualMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const convoEndRef = useRef<HTMLDivElement>(null);

  // Form
  const [form, setForm] = useState({
    name: '', target_industry: '', target_role: 'Owner', target_company_size: '11-50',
    target_location: '', target_pain_points: '', value_prop: '', lead_count: 10, channel: 'both',
  });

  // ─── Load data ──────────────────────────────────────────────────────────────
  const loadCampaigns = useCallback(async () => {
    const res = await fetch('/api/agency/pipeline/campaigns');
    const data = await res.json();
    setCampaigns(data.campaigns ?? []);
    if (!activeCampaign && data.campaigns?.length > 0) setActiveCampaign(data.campaigns[0]);
    setLoading(false);
  }, [activeCampaign]);

  const loadLeads = useCallback(async () => {
    if (!activeCampaign) return;
    const res = await fetch(`/api/agency/pipeline/leads?campaign_id=${activeCampaign.id}`);
    const data = await res.json();
    setLeads(data.leads ?? []);
  }, [activeCampaign]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);
  useEffect(() => { loadLeads(); }, [loadLeads]);

  // ─── Conversation ──────────────────────────────────────────────────────────
  const loadConversation = useCallback(async (leadId: string) => {
    setLoadingConvo(true);
    try {
      const res = await fetch(`/api/agency/pipeline/conversations?lead_id=${leadId}`);
      const data = await res.json();
      setConversation(data.messages ?? []);
    } finally { setLoadingConvo(false); }
  }, []);

  useEffect(() => {
    if (selectedLead?.ghl_contact_id) loadConversation(selectedLead.id);
    else setConversation([]);
  }, [selectedLead, loadConversation]);

  useEffect(() => { convoEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation]);

  // Auto-scroll events
  useEffect(() => { eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [runEvents]);

  // ─── THE AUTONOMOUS RUN ─────────────────────────────────────────────────────
  const startAutonomousRun = async () => {
    setIsRunning(true);
    setRunEvents([]);
    setRunSteps({});
    setRunStep(0);
    setShowCreate(false);

    try {
      const res = await fetch('/api/agency/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, auto_launch: true }),
      });

      if (!res.ok || !res.body) {
        setRunEvents(prev => [...prev, { type: 'error', data: { error: 'Failed to start pipeline' }, timestamp: Date.now() }]);
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
              const event = { type: eventType, data, timestamp: Date.now() };
              setRunEvents(prev => [...prev, event]);

              // Update step status
              if (eventType === 'step') {
                const step = data.step as number;
                setRunStep(step);
                setRunSteps(prev => ({ ...prev, [step]: { label: data.label as string, status: data.status as string } }));
              }

              // When done, reload data
              if (eventType === 'done') {
                const cid = data.campaignId as string;
                await loadCampaigns();
                // Set active campaign to the new one
                const campRes = await fetch('/api/agency/pipeline/campaigns');
                const campData = await campRes.json();
                const newCamp = (campData.campaigns || []).find((c: Campaign) => c.id === cid);
                if (newCamp) {
                  setActiveCampaign(newCamp);
                  // Load leads
                  const leadRes = await fetch(`/api/agency/pipeline/leads?campaign_id=${cid}`);
                  const leadData = await leadRes.json();
                  setLeads(leadData.leads ?? []);
                }
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

  // ─── Update lead ──────────────────────────────────────────────────────────
  const updateLead = async (leadId: string, updates: Record<string, unknown>) => {
    await fetch(`/api/agency/pipeline/leads/${leadId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    await loadLeads();
  };

  // ─── Stage counts ──────────────────────────────────────────────────────────
  const stageCounts: Record<string, number> = {};
  for (const l of leads) stageCounts[l.stage] = (stageCounts[l.stage] ?? 0) + 1;

  const totalActive = (stageCounts.messaged ?? 0) + (stageCounts.replied ?? 0) + (stageCounts.interested ?? 0) + (stageCounts.booked ?? 0) + (stageCounts.closed ?? 0);
  const totalReplied = (stageCounts.replied ?? 0) + (stageCounts.interested ?? 0) + (stageCounts.booked ?? 0) + (stageCounts.closed ?? 0);
  const totalBooked = (stageCounts.booked ?? 0) + (stageCounts.closed ?? 0);

  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl space-y-6">

      {/* ═══ HEADER ═══ */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="h-6 w-6 text-indigo-500" />
            AI Sales Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            One click. AI finds leads, researches, personalizes, sends outreach, and closes deals.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm flex items-center gap-2 px-6 py-2.5 shadow-lg">
          <Rocket className="h-4 w-4" /> Launch New Campaign
        </Button>
      </div>

      {/* ═══ AUTONOMOUS RUN VIEW ═══ */}
      {(isRunning || runEvents.length > 0) && (
        <div className="bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden">
          {/* Steps progress bar */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              {[
                { n: 1, label: 'Create', icon: Plus },
                { n: 2, label: 'Find Leads', icon: Search },
                { n: 3, label: 'Research & Personalize', icon: Sparkles },
                { n: 4, label: 'Launch Outreach', icon: Send },
                { n: 5, label: 'AI Closer', icon: Bot },
              ].map(({ n, label, icon: Icon }, i) => {
                const stepData = runSteps[n];
                const isDone = stepData?.status === 'done' || stepData?.status === 'active';
                const isActive = stepData?.status === 'running';
                const isWaiting = !stepData;
                return (
                  <div key={n} className="flex items-center gap-2 flex-1">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isDone ? 'bg-green-500/20 text-green-400' :
                      isActive ? 'bg-indigo-500/30 text-indigo-300 animate-pulse' :
                      'bg-gray-800 text-gray-500'
                    }`}>
                      {isDone ? <CheckCircle2 className="h-3 w-3" /> :
                       isActive ? <Loader2 className="h-3 w-3 animate-spin" /> :
                       <Icon className="h-3 w-3" />}
                      <span className="hidden sm:inline">{label}</span>
                    </div>
                    {i < 4 && <ChevronRight className="h-3 w-3 text-gray-700 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live event feed */}
          <div className="p-4 max-h-80 overflow-y-auto font-mono text-xs space-y-1">
            {runEvents.map((ev, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-gray-600 shrink-0">{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                {ev.type === 'step' && (
                  <span className={ev.data.status === 'done' ? 'text-green-400' : ev.data.status === 'running' ? 'text-indigo-400' : ev.data.status === 'active' ? 'text-emerald-400' : 'text-yellow-400'}>
                    {ev.data.status === 'done' ? '✅' : ev.data.status === 'running' ? '⚡' : ev.data.status === 'active' ? '🤖' : '⏳'} {ev.data.label as string}
                  </span>
                )}
                {ev.type === 'lead_found' && (
                  <span className="text-blue-400">
                    🏢 Found <span className="text-white font-semibold">{ev.data.company as string}</span>
                    <span className="text-gray-500"> — {ev.data.website as string}</span>
                    <span className="text-gray-600"> ({ev.data.current as number}/{ev.data.total as number})</span>
                  </span>
                )}
                {ev.type === 'researching' && (
                  <span className="text-purple-400">
                    🔍 Researching <span className="text-white">{ev.data.company as string}</span>
                    <span className="text-gray-600"> ({ev.data.current as number}/{ev.data.total as number})</span>
                  </span>
                )}
                {ev.type === 'lead_researched' && (
                  <span className="text-purple-300">
                    ✨ <span className="text-white font-semibold">{ev.data.name as string}</span>
                    <span className="text-gray-400"> at {ev.data.company as string}</span>
                    {ev.data.email ? <span className="text-cyan-400"> 📧 {String(ev.data.email)}</span> : null}
                    {ev.data.phone ? <span className="text-green-400"> 📱 {String(ev.data.phone)}</span> : null}
                    {(ev.data.socials as string[])?.length > 0 && <span className="text-gray-500"> +{(ev.data.socials as string[]).length} social</span>}
                  </span>
                )}
                {ev.type === 'lead_launched' && (
                  <span className="text-indigo-300">
                    🚀 Sent to <span className="text-white font-semibold">{ev.data.name as string}</span>
                    <span className="text-gray-400"> at {ev.data.company as string}</span>
                    {(ev.data.channels as string[])?.map((c: string) => (
                      <span key={c} className={c === 'email' ? 'text-cyan-400' : 'text-green-400'}> {c === 'email' ? '📧' : '📱'}</span>
                    ))}
                  </span>
                )}
                {ev.type === 'done' && (
                  <span className="text-emerald-400 font-semibold">
                    🎯 {ev.data.message as string}
                  </span>
                )}
                {ev.type === 'error' && (
                  <span className="text-red-400">❌ {ev.data.error as string}</span>
                )}
              </div>
            ))}
            {isRunning && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" /> Processing...
              </div>
            )}
            <div ref={eventsEndRef} />
          </div>

          {/* Dismiss button when done */}
          {!isRunning && runEvents.length > 0 && (
            <div className="p-3 border-t border-gray-800 flex justify-end">
              <button onClick={() => setRunEvents([])} className="text-xs text-gray-500 hover:text-gray-300">
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ CAMPAIGN SELECTOR ═══ */}
      {campaigns.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {campaigns.map((c) => (
            <button key={c.id} onClick={() => setActiveCampaign(c)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition ${
                activeCampaign?.id === c.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c.name}
              <span className="ml-2 text-xs opacity-60">{Object.values(c.stage_counts).reduce((a, b) => a + b, 0)} leads</span>
            </button>
          ))}
        </div>
      )}

      {/* ═══ METRICS DASHBOARD ═══ */}
      {activeCampaign && leads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: 'Found', count: stageCounts.found ?? 0, color: 'text-blue-600 bg-blue-50', icon: Search },
            { label: 'Researched', count: stageCounts.researched ?? 0, color: 'text-purple-600 bg-purple-50', icon: Sparkles },
            { label: 'Sent', count: stageCounts.messaged ?? 0, color: 'text-indigo-600 bg-indigo-50', icon: Send },
            { label: 'Replied', count: stageCounts.replied ?? 0, color: 'text-amber-600 bg-amber-50', icon: MessageSquare },
            { label: 'Interested', count: stageCounts.interested ?? 0, color: 'text-orange-600 bg-orange-50', icon: Zap },
            { label: 'Booked', count: stageCounts.booked ?? 0, color: 'text-green-600 bg-green-50', icon: Calendar },
            { label: 'Closed', count: stageCounts.closed ?? 0, color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2 },
            { label: 'Reply Rate', count: totalActive > 0 ? Math.round(totalReplied / totalActive * 100) : 0, color: 'text-pink-600 bg-pink-50', icon: TrendingUp, suffix: '%' },
          ].map(({ label, count, color, icon: Icon, suffix }) => (
            <div key={label} className={`rounded-xl border px-3 py-2 ${color}`}>
              <div className="flex items-center gap-1"><Icon className="h-3 w-3" /><span className="text-[10px] font-medium">{label}</span></div>
              <p className="text-lg font-bold">{count}{suffix}</p>
            </div>
          ))}
        </div>
      )}

      {/* ═══ LEAD CARDS ═══ */}
      {activeCampaign && leads.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leads.map((lead) => {
            const ed = (lead.enrichment_data || {}) as Record<string, unknown>;
            const sentChannels = (ed.sent_channels || []) as string[];
            return (
              <div key={lead.id} onClick={() => setSelectedLead(lead)}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{lead.full_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 truncate">{lead.title} at {lead.company}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STAGE_BADGE[lead.stage] || 'bg-gray-100'}`}>
                    {lead.stage === 'messaged' ? '📨 SENT' :
                     lead.stage === 'replied' ? '💬 REPLIED' :
                     lead.stage === 'interested' ? '🔥 INTERESTED' :
                     lead.stage === 'booked' ? '📅 BOOKED' :
                     lead.stage === 'closed' ? '🎉 CLOSED' :
                     lead.stage.toUpperCase()}
                  </span>
                </div>

                {/* Contact info - always visible when available */}
                <div className="space-y-1 mb-2">
                  {lead.email && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-700">
                      <Mail className="h-3 w-3 text-indigo-400" /> {lead.email}
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-700">
                      <Phone className="h-3 w-3 text-green-500" /> {lead.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Building2 className="h-3 w-3 text-gray-400" />
                    {lead.company} {lead.location && `· ${lead.location}`}
                  </div>
                </div>

                {/* Channel badges */}
                {sentChannels.length > 0 && (
                  <div className="flex gap-1 mb-2">
                    {sentChannels.includes('email') && <span className="text-[9px] font-medium bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded">📧 Email sent</span>}
                    {sentChannels.includes('sms') && <span className="text-[9px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded">📱 SMS sent</span>}
                  </div>
                )}

                {/* Personalized opener preview */}
                {lead.personalized_opener && (
                  <p className="text-xs text-indigo-600 italic line-clamp-2 mb-2">&ldquo;{lead.personalized_opener}&rdquo;</p>
                )}

                {/* Status indicator */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 text-[10px]">
                  {lead.website && (
                    <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener"
                      onClick={e => e.stopPropagation()} className="text-gray-400 hover:text-gray-600"><Globe className="h-3 w-3" /></a>
                  )}
                  <div className="flex-1" />
                  {['replied', 'interested'].includes(lead.stage) && (
                    <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded flex items-center gap-1">
                      <Bot className="h-2.5 w-2.5" /> AI Closing
                    </span>
                  )}
                  {lead.stage === 'booked' && <span className="font-semibold text-green-600">📅 Demo scheduled</span>}
                  {lead.stage === 'closed' && <span className="font-semibold text-emerald-600">🎉 Won!</span>}
                  {lead.stage === 'messaged' && lead.messaged_at && (
                    <span className="text-gray-400">Sent {timeAgo(lead.messaged_at)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {!activeCampaign && campaigns.length === 0 && !isRunning && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bot className="h-10 w-10 text-indigo-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Your AI Sales Team</h2>
          <p className="text-sm text-gray-500 mb-2 max-w-lg mx-auto">
            Launch a campaign and watch your AI worker find leads, research their businesses,
            write personalized outreach, send messages, and close deals — all automatically.
          </p>
          <p className="text-xs text-gray-400 mb-8">Like Tesla Optimus, but for sales.</p>
          <Button onClick={() => setShowCreate(true)}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-3 text-base shadow-lg"
          >
            <Rocket className="h-5 w-5 mr-2" /> Launch First Campaign
          </Button>
        </div>
      )}

      {/* ═══ CREATE CAMPAIGN MODAL ═══ */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => !isRunning && setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2"><Rocket className="h-5 w-5 text-indigo-500" /> Launch Campaign</h2>
                <p className="text-xs text-gray-500 mt-0.5">AI handles everything after you click launch</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Campaign name *</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="e.g. Cannabis Dispensaries — Los Angeles" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
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
                <label className="text-xs font-medium text-gray-600 mb-1 block">What you&apos;re selling (value prop)</label>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[60px]" placeholder="e.g. AI-powered customer service that handles 80% of inquiries automatically..." value={form.value_prop} onChange={e => setForm(f => ({ ...f, value_prop: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Leads</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.lead_count} onChange={e => setForm(f => ({ ...f, lead_count: Number(e.target.value) }))}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Channel</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>
                    <option value="both">📧📱 Both</option>
                    <option value="email">📧 Email</option>
                    <option value="sms">📱 SMS</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Button onClick={startAutonomousRun} disabled={!form.name.trim() || !form.target_industry.trim() || isRunning}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 text-base shadow-lg flex items-center justify-center gap-2"
              >
                {isRunning ? <><Loader2 className="h-5 w-5 animate-spin" /> Running...</> : <><Rocket className="h-5 w-5" /> Launch Autonomous Campaign</>}
              </Button>
              <p className="text-[10px] text-gray-400 text-center mt-2">
                AI will find → research → personalize → send outreach → close deals automatically
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LEAD DETAIL MODAL ═══ */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setSelectedLead(null); setConversation([]); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
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
                {selectedLead.location && <span className="flex items-center gap-1 text-gray-500"><MapPin className="h-3 w-3" /> {selectedLead.location}</span>}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Enrichment */}
              {(() => {
                const ed = (selectedLead.enrichment_data || {}) as Record<string, string>;
                if (!ed.company_context) return null;
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="bg-purple-50 rounded-lg p-3"><p className="text-[10px] font-bold text-purple-500 mb-1">ABOUT</p><p className="text-xs text-gray-700">{ed.company_context}</p></div>
                    {ed.services_offered && <div className="bg-slate-50 rounded-lg p-3"><p className="text-[10px] font-bold text-slate-500 mb-1">SERVICES</p><p className="text-xs text-gray-700">{ed.services_offered}</p></div>}
                    {ed.likely_pain_points && <div className="bg-red-50 rounded-lg p-3"><p className="text-[10px] font-bold text-red-500 mb-1">PAIN POINTS</p><p className="text-xs text-gray-700">{ed.likely_pain_points}</p></div>}
                    {ed.opportunity_angle && <div className="bg-green-50 rounded-lg p-3"><p className="text-[10px] font-bold text-green-500 mb-1">OPPORTUNITY</p><p className="text-xs text-gray-700">{ed.opportunity_angle}</p></div>}
                  </div>
                );
              })()}

              {/* Outreach message */}
              {selectedLead.personalized_subject && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Outreach Sent</h3>
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-indigo-400 mb-0.5">SUBJECT</p>
                    <p className="text-sm font-medium text-gray-900">{selectedLead.personalized_subject}</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-indigo-400 mb-0.5">EMAIL</p>
                    <p className="text-xs text-gray-700 whitespace-pre-line">{selectedLead.personalized_email}</p>
                  </div>
                  {selectedLead.personalized_opener && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-[10px] font-bold text-amber-500 mb-0.5">SMS</p>
                      <p className="text-xs text-gray-700">{selectedLead.personalized_opener}</p>
                    </div>
                  )}
                </div>
              )}

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
                        {selectedLead.stage === 'messaged' ? '⏳ Waiting for reply... AI will handle it automatically' : 'No messages yet'}
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
                    <input className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Jump in — send a manual message..." value={manualMsg} onChange={e => setManualMsg(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendManualMessage(); } }} />
                    <Button onClick={sendManualMessage} disabled={sendingMsg || !manualMsg.trim()} className="bg-indigo-600 text-white px-3">
                      {sendingMsg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notes</h3>
                <textarea className="w-full border rounded-lg px-3 py-2 text-sm min-h-[50px] focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Add notes..." defaultValue={selectedLead.notes || ''}
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
