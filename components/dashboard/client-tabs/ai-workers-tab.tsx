'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  ArrowRight, Loader2, X, ChevronDown, CheckCircle2, AlertTriangle,
  ChevronRight, Users, User, Plus, Trash2, Sparkles,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import { ROLE_WORKERS, type RoleWorker } from '@/lib/ai-workers/role-workers';
import { TEAM_TEMPLATES } from '@/lib/ai-workers/team-templates';
import SkillsTab from './skills-tab';

// ── Team types ───────────────────────────────────────────────────────────────

interface TeamMember {
  worker_id: string;
  role: 'specialist' | 'background';
  triggers: string[];
}

interface TeamConfig {
  enabled: boolean;
  primary_worker_id: string;
  members: TeamMember[];
  handoff_style: 'seamless' | 'announced';
}

// ── Channel badge colors ─────────────────────────────────────────────────────

const CHANNEL_STYLES: Record<string, string> = {
  sms: 'bg-green-50 text-green-700 border-green-200',
  voice: 'bg-blue-50 text-blue-700 border-blue-200',
  chat: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  telegram: 'bg-sky-50 text-sky-700 border-sky-200',
};

const CHANNEL_LABELS: Record<string, string> = {
  sms: 'SMS',
  voice: 'Voice',
  chat: 'Chat',
  telegram: 'Telegram',
};

// ── Props ────────────────────────────────────────────────────────────────────

interface AIWorkersTabProps {
  client: AgencyClient;
  agencyId: string;
  plan?: string;
}

type WorkerCategory = 'all' | 'customer-facing' | 'internal' | 'sales' | 'marketing' | 'operations' | 'industry';

const WORKER_CATEGORIES: { key: WorkerCategory; label: string; emoji: string }[] = [
  { key: 'all',              label: 'All',               emoji: '⚡' },
  { key: 'customer-facing',  label: 'Customer Facing',   emoji: '👥' },
  { key: 'internal',         label: 'Internal Use',      emoji: '🏢' },
  { key: 'sales',            label: 'Sales & Outreach',  emoji: '🎯' },
  { key: 'marketing',        label: 'Marketing',         emoji: '📣' },
  { key: 'operations',       label: 'Operations',        emoji: '📊' },
  { key: 'industry',         label: 'Industry',          emoji: '🏭' },
];

const INDUSTRY_BADGES = ['Real Estate', 'Healthcare & Wellness', 'Food & Beverage', 'Retail & E-Commerce', 'Legal Services'];

function matchesCategory(worker: RoleWorker, category: WorkerCategory): boolean {
  if (category === 'all') return true;
  if (category === 'customer-facing') return worker.useCase === 'customer-facing';
  if (category === 'internal') return worker.useCase === 'internal';
  if (category === 'sales') return worker.tags.some(t => ['leads', 'qualification', 'outreach', 'prospecting', 'booking'].includes(t));
  if (category === 'marketing') return worker.tags.some(t => ['content', 'social', 'seo', 'newsletter', 'email', 'branding'].includes(t));
  if (category === 'operations') return worker.tags.some(t => ['reports', 'analytics', 'scheduling', 'crm', 'pipeline', 'retention'].includes(t));
  if (category === 'industry') return INDUSTRY_BADGES.includes(worker.roleBadge);
  return true;
}

const MASTER_AGENCY_IDS = ['1511e077-77ef-4c47-81fd-06a3bc9f1dbb'];

export default function AIWorkersTab({ client, agencyId, plan }: AIWorkersTabProps) {
  const [view, setView] = useState<'workers' | 'skills'>('workers');
  const isMasterAgency = MASTER_AGENCY_IDS.includes(agencyId);
  const canUseMarketingWorker = isMasterAgency || plan === 'pro' || plan === 'scale';
  // Filter workers by visibility — private workers shown to allowed agencies + master admin
  const visibleWorkers = ROLE_WORKERS.filter(w => {
    if (!w.visibility || w.visibility === 'public') return true;
    if (w.visibility === 'private') {
      if (w.allowedAgencies?.includes(agencyId)) return true;
      if (isMasterAgency) return true;
    }
    return false;
  });

  const [activeCategory, setActiveCategory] = useState<WorkerCategory>('all');
  const [applyWorker, setApplyWorker] = useState<RoleWorker | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{
    success: boolean;
    message: string;
    warning?: string;
  } | null>(null);
  const [industryExpanded, setIndustryExpanded] = useState(false);
  const [industryTemplates, setIndustryTemplates] = useState<{
    id: string; emoji: string; name: string; description: string; industry: string; tags: string[];
  }[]>([]);
  const [loadingIndustry, setLoadingIndustry] = useState(false);
  const [industryLoaded, setIndustryLoaded] = useState(false);

  // Detect currently active worker from container config
  const cc = (client.container_config as Record<string, unknown>) ?? {};
  const activeWorkerId = cc.active_worker_id as string | undefined;
  const activeWorker = activeWorkerId
    ? ROLE_WORKERS.find(w => w.id === activeWorkerId)
    : undefined;

  // ── Team state ─────────────────────────────────────────────────────
  const existingTeam = cc.worker_team as TeamConfig | undefined;
  const [teamMode, setTeamMode] = useState(!!existingTeam?.enabled);
  const [editingTeam, setEditingTeam] = useState(false);
  const [teamPrimary, setTeamPrimary] = useState(existingTeam?.primary_worker_id || '');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(existingTeam?.members || []);
  const [handoffStyle, setHandoffStyle] = useState<'seamless' | 'announced'>(existingTeam?.handoff_style || 'seamless');
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamResult, setTeamResult] = useState<{ success: boolean; message: string } | null>(null);
  const [addingSpecialist, setAddingSpecialist] = useState(false);
  const [triggerInput, setTriggerInput] = useState<Record<string, string>>({});
  const [planLimit, setPlanLimit] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/agency/ai-setup/team?clientId=${client.id}`)
      .then(r => r.json())
      .then(d => { if (typeof d.planLimit === 'number') setPlanLimit(d.planLimit); })
      .catch(() => {});
  }, [client.id]);

  const saveTeam = async () => {
    if (!teamPrimary) return;
    setSavingTeam(true);
    setTeamResult(null);
    try {
      const res = await fetch('/api/agency/ai-setup/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          team: { enabled: true, primary_worker_id: teamPrimary, members: teamMembers, handoff_style: handoffStyle },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        let msg: string;
        if (data.containerPushed) {
          msg = `AI Team is live! ${teamMembers.length + 1} workers active in the terminal.`;
        } else if (data.warning) {
          msg = `Team saved. ${data.warning}`;
        } else {
          msg = `Team saved with ${teamMembers.length + 1} members. Re-apply the primary worker to go live.`;
        }
        setTeamResult({ success: true, message: msg });
        setEditingTeam(false);
      } else {
        setTeamResult({ success: false, message: data.error || 'Failed to save team' });
      }
    } catch {
      setTeamResult({ success: false, message: 'Network error' });
    } finally {
      setSavingTeam(false);
    }
  };

  const disableTeam = async () => {
    setSavingTeam(true);
    try {
      const res = await fetch('/api/agency/ai-setup/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, team: { enabled: false } }),
      });
      const data = await res.json();
      if (res.ok) {
        setTeamMode(false);
        setTeamMembers([]);
        setTeamPrimary('');
        setEditingTeam(false);
        setTeamResult({ success: true, message: 'Team disabled. Single worker mode restored.' });
      } else {
        setTeamResult({ success: false, message: data.error || 'Failed to disable team' });
      }
    } catch {
      setTeamResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setSavingTeam(false);
    }
  };

  const applyTemplate = (tpl: typeof TEAM_TEMPLATES[0]) => {
    setTeamPrimary(tpl.primary);
    setTeamMembers(tpl.members.map(m => ({ ...m })));
    setHandoffStyle(tpl.handoff_style);
    setEditingTeam(true);
    setTeamResult(null);
  };

  const addTrigger = (workerId: string) => {
    const val = (triggerInput[workerId] || '').trim();
    if (!val) return;
    setTeamMembers(prev => prev.map(m =>
      m.worker_id === workerId && !m.triggers.includes(val)
        ? { ...m, triggers: [...m.triggers, val] }
        : m
    ));
    setTriggerInput(prev => ({ ...prev, [workerId]: '' }));
  };

  const removeTrigger = (workerId: string, trigger: string) => {
    setTeamMembers(prev => prev.map(m =>
      m.worker_id === workerId
        ? { ...m, triggers: m.triggers.filter(t => t !== trigger) }
        : m
    ));
  };

  const openApply = useCallback((worker: RoleWorker) => {
    setApplyWorker(worker);
    setApplyResult(null);
    const cfg = (client.container_config as Record<string, unknown>) ?? {};
    const initVars: Record<string, string> = {};
    if (client.name) initVars.business_name = client.name;
    if (cfg.calendar_url) initVars.booking_url = cfg.calendar_url as string;
    else if (cfg.booking_url) initVars.booking_url = cfg.booking_url as string;
    if (cfg.business_hours && typeof cfg.business_hours === 'string') {
      initVars.business_hours = cfg.business_hours;
    }
    // Restore ALL previously saved role variables from container_config
    for (const [key, value] of Object.entries(cfg)) {
      if (typeof value === 'string' && value && !initVars[key]) {
        initVars[key] = value;
      }
    }
    setVariables(initVars);
  }, [client.name, client.container_config]);

  const closeApply = () => {
    setApplyWorker(null);
    setApplyResult(null);
    setVariables({});
  };

  const handleApply = async () => {
    if (!applyWorker) return;
    setApplying(true);
    setApplyResult(null);

    try {
      const res = await fetch('/api/agency/ai-setup/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          type: 'role',
          templateId: applyWorker.id,
          variables,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApplyResult({ success: false, message: data.error || 'Failed to apply worker' });
      } else {
        setApplyResult({
          success: true,
          message: `${applyWorker.name} applied to ${client.name}.${data.containerPushed ? ' AI is live now.' : ''}`,
          warning: data.warning,
        });
      }
    } catch {
      setApplyResult({ success: false, message: 'Network error. Please try again.' });
    } finally {
      setApplying(false);
    }
  };

  const loadIndustryTemplates = async () => {
    if (industryLoaded) { setIndustryExpanded(e => !e); return; }
    setIndustryExpanded(true);
    setLoadingIndustry(true);
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      setIndustryTemplates(data.templates || []);
      setIndustryLoaded(true);
    } catch { /* ignore */ }
    finally { setLoadingIndustry(false); }
  };

  if (view === 'skills') {
    return (
      <div className="space-y-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView('workers')} className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-500 hover:text-gray-700">AI Workers</button>
          <button onClick={() => setView('skills')} className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-white text-gray-900 shadow-sm">Skills</button>
        </div>
        <SkillsTab client={client} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-nav: Workers | Skills */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        <button onClick={() => setView('workers')} className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-white text-gray-900 shadow-sm">AI Workers</button>
        <button onClick={() => setView('skills')} className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-500 hover:text-gray-700">Skills</button>
      </div>

      {/* Currently Active Worker / Team */}
      {existingTeam?.enabled ? (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-indigo-600" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Team Mode</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                  {(existingTeam.members?.length || 0) + 1} workers
                </span>
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Live</span>
              </div>
              {activeWorker && <p className="text-xs text-gray-500 mt-0.5">Primary: {activeWorker.emoji} {activeWorker.name}</p>}
            </div>
          </div>
        </div>
      ) : activeWorker ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{activeWorker.emoji}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">Currently Active:</span>
                <span className="text-sm font-bold text-green-700">{activeWorker.name}</span>
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Live</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{activeWorker.roleBadge}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Team Mode Toggle — only for master/paid plans ─────────── */}
      {(canUseMarketingWorker || planLimit === null || planLimit > 0) && <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => { setTeamMode(false); setEditingTeam(false); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            !teamMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <User className="w-3.5 h-3.5" /> Single Worker
        </button>
        <button
          onClick={() => { setTeamMode(true); setTeamResult(null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            teamMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Team Mode
          <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">NEW</span>
        </button>
      </div>}

      {/* ── Team Result Banner ──────────────────────────────────────── */}
      {teamResult && (
        <div className={`rounded-xl p-3 flex items-center gap-2 text-sm ${
          teamResult.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {teamResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {teamResult.message}
        </div>
      )}

      {/* ── Team Active Card (when team is configured and not editing) ── */}
      {teamMode && existingTeam?.enabled && !editingTeam && (
        <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              AI Team Active ({(existingTeam.members?.length || 0) + 1} members)
            </h3>
            <div className="flex gap-2">
              <button onClick={() => { setEditingTeam(true); setTeamResult(null); }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white transition">
                Edit Team
              </button>
              <button onClick={disableTeam} disabled={savingTeam} className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50">
                {savingTeam ? 'Disabling...' : 'Disable'}
              </button>
            </div>
          </div>
          {/* Primary */}
          {(() => {
            const pw = ROLE_WORKERS.find(w => w.id === existingTeam.primary_worker_id);
            return pw ? (
              <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg mb-2 border border-green-100">
                <span className="text-lg">{pw.emoji}</span>
                <span className="text-sm font-medium text-gray-900">{pw.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Primary</span>
              </div>
            ) : null;
          })()}
          {/* Members */}
          {existingTeam.members?.map(m => {
            const mw = ROLE_WORKERS.find(w => w.id === m.worker_id);
            if (!mw) return null;
            return (
              <div key={m.worker_id} className="flex items-center gap-2 p-2 bg-white rounded-lg mb-1 border border-gray-100">
                <span className="text-lg">{mw.emoji}</span>
                <span className="text-sm text-gray-700">{mw.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  m.role === 'specialist' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {m.role === 'specialist' ? 'Specialist' : 'Background'}
                </span>
                {m.triggers.length > 0 ? (
                  <div className="flex gap-1 ml-auto">
                    {m.triggers.slice(0, 3).map(t => (
                      <span key={t} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">{t}</span>
                    ))}
                    {m.triggers.length > 3 && <span className="text-[10px] text-gray-400">+{m.triggers.length - 3}</span>}
                  </div>
                ) : m.role === 'background' ? (
                  <span className="text-[10px] bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded-full ml-auto">Always active</span>
                ) : null}
              </div>
            );
          })}
          <p className="text-xs text-gray-400 mt-2">Handoff: {existingTeam.handoff_style === 'seamless' ? '🔄 Seamless' : '📢 Announced'}</p>
        </div>
      )}

      {/* ── Team Builder (editing mode) ────────────────────────────── */}
      {teamMode && (editingTeam || !existingTeam?.enabled) && (
        <div className="rounded-xl border border-indigo-200 bg-white p-5 space-y-4">
          {planLimit === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              AI Teams require Lite plan ($99/mo) or above.{' '}
              <a href="/agency/billing" className="underline font-medium">Upgrade</a>
            </div>
          ) : planLimit !== null && teamMembers.length >= planLimit ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Team limit reached for your plan ({planLimit} specialists max).
            </div>
          ) : null}
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Build Your AI Team
          </h3>

          {/* Quick Start Templates */}
          {teamMembers.length === 0 && !teamPrimary && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Quick Start — pick a pre-built team:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TEAM_TEMPLATES.map(tpl => (
                  <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                    className="text-left p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{tpl.emoji}</span>
                      <span className="text-sm font-semibold text-gray-900">{tpl.name}</span>
                    </div>
                    <p className="text-xs text-gray-500">{tpl.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {[tpl.primary, ...tpl.members.map(m => m.worker_id)].map(wid => {
                        const w = ROLE_WORKERS.find(r => r.id === wid);
                        return w ? (
                          <span key={wid} className="inline-flex items-center gap-0.5 text-[9px] bg-white border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                            {w.emoji} {w.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                <div className="h-px flex-1 bg-gray-100" /> or build custom <div className="h-px flex-1 bg-gray-100" />
              </div>
            </div>
          )}

          {/* Primary Worker Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Primary Worker (handles all inbound)</label>
            <select value={teamPrimary} onChange={e => setTeamPrimary(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
              <option value="">— Select primary worker —</option>
              {visibleWorkers.map(w => (
                <option key={w.id} value={w.id}>{w.emoji} {w.name}</option>
              ))}
            </select>
          </div>

          {/* Team Members */}
          {teamMembers.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Specialists ({teamMembers.length})</label>
              <div className="space-y-2">
                {teamMembers.map(m => {
                  const mw = ROLE_WORKERS.find(w => w.id === m.worker_id);
                  if (!mw) return null;
                  return (
                    <div key={m.worker_id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>{mw.emoji}</span>
                          <span className="text-sm font-medium">{mw.name}</span>
                          <button onClick={() => setTeamMembers(prev => prev.map(p =>
                            p.worker_id === m.worker_id
                              ? { ...p, role: p.role === 'specialist' ? 'background' : 'specialist' }
                              : p
                          ))}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold cursor-pointer ${
                              m.role === 'specialist' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {m.role === 'specialist' ? 'Specialist' : 'Background'}
                          </button>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {m.role === 'specialist' ? 'Activates on trigger keywords' : 'Always active, runs silently'}
                          </p>
                        </div>
                        <button onClick={() => setTeamMembers(prev => prev.filter(p => p.worker_id !== m.worker_id))}
                          className="text-gray-400 hover:text-red-500 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Trigger chips */}
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {m.triggers.map(t => (
                          <span key={t} className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                            {t}
                            <button onClick={() => removeTrigger(m.worker_id, t)} className="hover:text-red-500">×</button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <input
                          value={triggerInput[m.worker_id] || ''}
                          onChange={e => setTriggerInput(prev => ({ ...prev, [m.worker_id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addTrigger(m.worker_id)}
                          placeholder="Add trigger keyword..."
                          className="flex-1 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                        <button onClick={() => addTrigger(m.worker_id)}
                          className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition">
                          Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Specialist */}
          {!addingSpecialist ? (
            <button onClick={() => setAddingSpecialist(true)}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              <Plus className="w-4 h-4" /> Add Specialist
            </button>
          ) : (
            <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50/30">
              <p className="text-xs font-semibold text-gray-600 mb-2">Select a specialist to add:</p>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {visibleWorkers
                  .filter(w => w.id !== teamPrimary && !teamMembers.some(m => m.worker_id === w.id))
                  .map(w => (
                    <button key={w.id} onClick={() => {
                      setTeamMembers(prev => [...prev, { worker_id: w.id, role: 'specialist', triggers: [] }]);
                      setAddingSpecialist(false);
                    }}
                      className="text-left p-2 rounded-lg border border-gray-200 bg-white hover:border-indigo-300 transition text-xs">
                      <span className="mr-1">{w.emoji}</span>{w.name}
                    </button>
                  ))}
              </div>
              <button onClick={() => setAddingSpecialist(false)} className="text-xs text-gray-400 mt-2 hover:text-gray-600">Cancel</button>
            </div>
          )}

          {/* Handoff Style */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Handoff Style</label>
            <div className="flex gap-2">
              <button onClick={() => setHandoffStyle('seamless')}
                className={`flex-1 p-2.5 rounded-lg border text-xs text-left transition ${
                  handoffStyle === 'seamless' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                <span className="font-semibold">🔄 Seamless</span>
                <p className="text-[10px] mt-0.5 opacity-70">Customer sees one smooth conversation</p>
              </button>
              <button onClick={() => setHandoffStyle('announced')}
                className={`flex-1 p-2.5 rounded-lg border text-xs text-left transition ${
                  handoffStyle === 'announced' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                <span className="font-semibold">📢 Announced</span>
                <p className="text-[10px] mt-0.5 opacity-70">AI briefly acknowledges switching areas</p>
              </button>
            </div>
          </div>

          {/* Save / Cancel */}
          <div className="flex gap-2 pt-2">
            {existingTeam?.enabled && (
              <button onClick={() => { setEditingTeam(false); setTeamResult(null); }}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition">
                Cancel
              </button>
            )}
            <button onClick={saveTeam} disabled={!teamPrimary || savingTeam}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {savingTeam ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</> : <>Deploy Team <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}

      {/* Section header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">{teamMode ? 'Available Workers' : 'AI Workers'}</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {teamMode ? 'Select workers to add to your team.' : 'Pre-built AI roles you can deploy to this client in one click.'}
        </p>
      </div>

      {/* Category filter bar */}
      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-2 flex flex-wrap gap-1.5">
        {WORKER_CATEGORIES.map(cat => {
          const count = cat.key === 'all'
            ? visibleWorkers.length
            : visibleWorkers.filter(w => matchesCategory(w, cat.key)).length;
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
              }`}
            >
              <span className="text-base leading-none">{cat.emoji}</span>
              <span>{cat.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold min-w-[20px] text-center ${
                isActive ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Worker cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {visibleWorkers.filter(w => matchesCategory(w, activeCategory)).map(worker => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            isActive={activeWorkerId === worker.id}
            locked={!canUseMarketingWorker && worker.tags.some((t: string) => ['content', 'social', 'seo', 'newsletter', 'email', 'branding'].includes(t))}
            onApply={() => openApply(worker)}
          />
        ))}
      </div>

      {/* Industry Workers — collapsible */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={loadIndustryTemplates}
          className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🏭</span>
            <span className="text-sm font-semibold text-gray-900">Industry Workers</span>
            {industryLoaded && (
              <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                {industryTemplates.length}
              </span>
            )}
          </div>
          <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${industryExpanded ? 'rotate-90' : ''}`} />
        </button>

        {industryExpanded && (
          <div className="p-4">
            {loadingIndustry ? (
              <div className="py-8 text-center text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-1" />
                <p className="text-xs">Loading industry workers...</p>
              </div>
            ) : industryTemplates.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No industry workers available yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {industryTemplates.map(t => (
                  <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-2xl">{t.emoji}</span>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">{t.name}</h4>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full">
                          {t.industry}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{t.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apply slide-over modal */}
      {applyWorker && (
        <ApplyPanel
          worker={applyWorker}
          variables={variables}
          setVariables={setVariables}
          applying={applying}
          result={applyResult}
          onApply={handleApply}
          onClose={closeApply}
        />
      )}
    </div>
  );
}

// ── Rich Worker Card ─────────────────────────────────────────────────────────

function WorkerCard({
  worker,
  isActive,
  locked = false,
  onApply,
}: {
  worker: RoleWorker;
  isActive: boolean;
  locked?: boolean;
  onApply: () => void;
}) {
  return (
    <div className={`bg-white border rounded-xl p-5 transition-all hover:shadow-sm ${
      isActive ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-200 hover:border-indigo-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{worker.emoji}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{worker.name}</h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              {worker.roleBadge}
            </span>
          </div>
        </div>
        {isActive && (
          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            Active
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{worker.description}</p>

      {/* What this worker does */}
      <div className="mb-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">What this worker does</p>
        <ul className="space-y-1">
          {worker.whatItDoes.map((item, i) => (
            <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-indigo-400 shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Use Case + Channels */}
      <div className="mb-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Works on</p>
        <div className="flex flex-wrap gap-1.5">
          {/* Use case badge — most important signal */}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            worker.useCase === 'customer-facing'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-violet-50 text-violet-700 border-violet-200'
          }`}>
            {worker.useCase === 'customer-facing' ? '👥 Customer-Facing' : '🏢 Internal Use'}
          </span>
          {/* Channel badges */}
          {worker.channels.map(ch => (
            <span key={ch} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${CHANNEL_STYLES[ch]}`}>
              {CHANNEL_LABELS[ch]}
            </span>
          ))}
        </div>
      </div>

      {/* Tools */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Tools used</p>
        <div className="flex flex-wrap gap-1.5">
          {worker.tools.map(tool => (
            <span key={tool} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
              {tool}
            </span>
          ))}
        </div>
      </div>

      {/* Apply button */}
      {locked ? (
        <div className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gray-100 text-gray-400 text-sm font-medium rounded-lg cursor-not-allowed">
          🔒 Pro or Scale plan required
        </div>
      ) : (
        <button
          onClick={onApply}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Apply to this client
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Apply Panel (slide-in modal) ─────────────────────────────────────────────

function ApplyPanel({
  worker,
  variables,
  setVariables,
  applying,
  result,
  onApply,
  onClose,
}: {
  worker: RoleWorker;
  variables: Record<string, string>;
  setVariables: (v: Record<string, string>) => void;
  applying: boolean;
  result: { success: boolean; message: string; warning?: string } | null;
  onApply: () => void;
  onClose: () => void;
}) {
  const setVar = (key: string, value: string) =>
    setVariables({ ...variables, [key]: value });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!applying ? onClose : undefined} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{worker.emoji}</span>
            <div>
              <h2 className="font-semibold text-gray-900">Deploy: {worker.name}</h2>
              <p className="text-xs text-gray-500">{worker.roleBadge}</p>
            </div>
          </div>
          {!applying && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Result */}
          {result && (
            <div className={`rounded-xl p-4 flex gap-3 ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.message}
                </p>
                {result.warning && (
                  <p className="text-xs text-amber-600 mt-1">{result.warning}</p>
                )}
              </div>
            </div>
          )}

          {/* Variables */}
          {worker.variables && worker.variables.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium">Configure</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              {worker.variables.map(v => (
                <div key={v.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {v.label}
                    {v.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {v.type === 'textarea' ? (
                    <textarea
                      value={variables[v.key] || ''}
                      onChange={e => setVar(v.key, e.target.value)}
                      placeholder={v.placeholder}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
                    />
                  ) : v.type === 'select' && v.options ? (
                    <div className="relative">
                      <select
                        value={variables[v.key] || ''}
                        onChange={e => setVar(v.key, e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none bg-white"
                      >
                        <option value="">{v.placeholder || '— Select —'}</option>
                        {v.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={variables[v.key] || ''}
                      onChange={e => setVar(v.key, e.target.value)}
                      placeholder={v.placeholder}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            {result?.success ? (
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  disabled={applying}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onApply}
                  disabled={applying}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {applying ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Deploying...</>
                  ) : (
                    <>Deploy Worker <ArrowRight className="h-4 w-4" /></>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
