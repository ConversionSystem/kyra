'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Plus,
  Clock,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  X,
  ChevronRight,
  Sparkles,
  Bell,
  MessageSquare,
  BarChart2,
  Star,
  UserPlus,
  Timer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface CronJob {
  id: string;
  name: string;
  schedule: {
    kind?: string;
    expr?: string;
    everyMs?: number;
    at?: string;
    tz?: string;
  };
  task?: string;
  payload?: { kind?: string; message?: string };
  enabled: boolean;
  lastRun: string | null;
  nextRun?: string | null;
  createdAt?: string;
}

interface AutomationTemplate {
  id: string;
  icon: React.ReactNode;
  name: string;
  subtitle: string;
  description: string;
  color: string;       // gradient
  iconBg: string;      // icon bg
  defaultTask: string;
  defaultSchedule: string;
  scheduleLabel: string;
}

// ── Templates ─────────────────────────────────────────────────────────────────
// Pre-built automation starting points that agencies can activate in one click.

const TEMPLATES: AutomationTemplate[] = [
  {
    id: 'lead-followup',
    icon: <UserPlus className="h-5 w-5" />,
    name: 'Lead Follow-Up',
    subtitle: 'Daily at 9am',
    description: 'Checks new GHL leads and sends a personalized first message to anyone not yet contacted.',
    color: 'from-indigo-500 to-indigo-600',
    iconBg: 'bg-indigo-50 text-indigo-600',
    defaultTask: 'Check for new leads in GHL that haven\'t been contacted yet. For each one, send a friendly, personalized intro message via SMS introducing yourself as their AI assistant. Keep it short — under 3 sentences. Log what you sent.',
    defaultSchedule: '0 9 * * *',
    scheduleLabel: 'Every day at 9am',
  },
  {
    id: 'appointment-reminder',
    icon: <Bell className="h-5 w-5" />,
    name: 'Appointment Reminders',
    subtitle: 'Daily at 8am',
    description: 'Reminds contacts with upcoming appointments — reduces no-shows by up to 40%.',
    color: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-50 text-violet-600',
    defaultTask: 'Check GHL for contacts with appointments scheduled in the next 24 hours. Send each one a friendly reminder SMS with the appointment time, date, and a prompt to confirm or reschedule. Be warm and professional.',
    defaultSchedule: '0 8 * * *',
    scheduleLabel: 'Every day at 8am',
  },
  {
    id: 'win-back',
    icon: <MessageSquare className="h-5 w-5" />,
    name: 'Win-Back Campaign',
    subtitle: 'Every Monday 10am',
    description: 'Re-engages contacts who have gone quiet. Brings cold leads back into the conversation.',
    color: 'from-orange-500 to-amber-500',
    iconBg: 'bg-orange-50 text-orange-600',
    defaultTask: 'Find GHL contacts who haven\'t replied in the last 7 days and were previously engaged. Send a short, friendly check-in message — no sales pitch, just genuine re-engagement. Ask a simple question to spark a reply.',
    defaultSchedule: '0 10 * * 1',
    scheduleLabel: 'Every Monday at 10am',
  },
  {
    id: 'weekly-report',
    icon: <BarChart2 className="h-5 w-5" />,
    name: 'Weekly Performance Report',
    subtitle: 'Every Monday 8am',
    description: 'Sends the agency a weekly summary of AI activity, conversations, and leads generated.',
    color: 'from-blue-500 to-cyan-500',
    iconBg: 'bg-blue-50 text-blue-600',
    defaultTask: 'Generate a weekly performance summary: total conversations this week, new leads captured, response rate, top questions asked. Send it as a formatted report to the agency owner via the primary channel.',
    defaultSchedule: '0 8 * * 1',
    scheduleLabel: 'Every Monday at 8am',
  },
  {
    id: 'review-request',
    icon: <Star className="h-5 w-5" />,
    name: 'Review Request',
    subtitle: 'Weekdays at 5pm',
    description: 'Asks satisfied customers for a Google review at the right moment — after a service.',
    color: 'from-yellow-400 to-amber-500',
    iconBg: 'bg-yellow-50 text-yellow-600',
    defaultTask: 'Find GHL contacts who had an appointment or service completed today and haven\'t already left a review. Send a polite, short message asking them to share their experience on Google. Include a direct link if available.',
    defaultSchedule: '0 17 * * 1-5',
    scheduleLabel: 'Weekdays at 5pm',
  },
  {
    id: 'new-lead-alert',
    icon: <Zap className="h-5 w-5" />,
    name: 'New Lead Alert',
    subtitle: 'Every 30 minutes',
    description: 'Instantly notifies you when a new lead comes in, with a summary and suggested action.',
    color: 'from-emerald-500 to-green-500',
    iconBg: 'bg-emerald-50 text-emerald-600',
    defaultTask: 'Check for new leads added to GHL in the last 30 minutes. For each new lead, send a brief alert with their name, source, and one suggested next action. Keep it to 2 sentences.',
    defaultSchedule: '*/30 * * * *',
    scheduleLabel: 'Every 30 minutes',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const SCHEDULE_PRESETS = [
  { label: 'Every 30 min',    type: 'cron', value: '*/30 * * * *' },
  { label: 'Every hour',      type: 'cron', value: '0 * * * *' },
  { label: 'Daily at 9am',    type: 'cron', value: '0 9 * * *' },
  { label: 'Daily at 5pm',    type: 'cron', value: '0 17 * * *' },
  { label: 'Weekdays 9am',    type: 'cron', value: '0 9 * * 1-5' },
  { label: 'Mondays 8am',     type: 'cron', value: '0 8 * * 1' },
  { label: 'Custom cron',     type: 'cron', value: '' },
];

function formatSchedule(schedule: CronJob['schedule']): string {
  if (schedule.kind === 'every' && schedule.everyMs) {
    const ms = schedule.everyMs;
    if (ms < 60000) return `Every ${ms / 1000}s`;
    if (ms < 3600000) return `Every ${ms / 60000}m`;
    if (ms < 86400000) return `Every ${ms / 3600000}h`;
    return `Every ${ms / 86400000}d`;
  }
  if (schedule.kind === 'cron' && schedule.expr) return cronToHuman(schedule.expr);
  if (schedule.kind === 'at' && schedule.at) return `Once at ${new Date(schedule.at).toLocaleString()}`;
  return 'Scheduled';
}

function cronToHuman(expr: string): string {
  const p = expr.split(' ');
  if (p.length !== 5) return expr;
  const [min, hour, , , dow] = p;
  const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  if (min === '*/30') return 'Every 30 min';
  if (min === '*/15') return 'Every 15 min';
  if (dow === '*') return `Daily at ${time}`;
  if (dow === '1-5') return `Weekdays at ${time}`;
  if (dow === '0,6') return `Weekends at ${time}`;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (dow.match(/^\d$/)) return `${days[parseInt(dow)]}s at ${time}`;
  return expr;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 0) return `in ${Math.abs(mins)}m`;
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AutomationsClient() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'custom'>('templates');

  // Create form
  const [newName, setNewName] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newSchedulePreset, setNewSchedulePreset] = useState(SCHEDULE_PRESETS[2]); // daily 9am
  const [newCronExpr, setNewCronExpr] = useState('0 9 * * *');

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/automations');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setJobs(data.jobs || []);
      if (data.error && !data.jobs?.length) setError(data.error);
      else setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load automations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const createFromTemplate = (template: AutomationTemplate) => {
    setNewName(template.name);
    setNewTask(template.defaultTask);
    const preset = SCHEDULE_PRESETS.find(p => p.value === template.defaultSchedule)
      || { label: 'Custom cron', type: 'cron', value: template.defaultSchedule };
    setNewSchedulePreset(preset);
    setNewCronExpr(template.defaultSchedule);
    setActiveTab('custom');
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newTask.trim()) return;
    setSaving(true);
    try {
      const scheduleValue = newSchedulePreset.value || newCronExpr;
      const res = await fetch('/api/agency/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          task: newTask.trim(),
          schedule: 'cron',
          scheduleValue,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create');
      }
      setShowCreate(false);
      setNewName('');
      setNewTask('');
      fetchJobs();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to create automation');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (job: CronJob) => {
    try {
      const res = await fetch('/api/agency/automations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id, enabled: !job.enabled }),
      });
      if (res.ok) setJobs(prev => prev.map(j => j.id === job.id ? { ...j, enabled: !j.enabled } : j));
    } catch { /* ignore */ }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Delete this automation?')) return;
    setDeleting(jobId);
    try {
      await fetch(`/api/agency/automations?jobId=${jobId}`, { method: 'DELETE' });
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch { /* ignore */ }
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 max-w-5xl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <h1 className="text-2xl font-bold text-gray-900">Proactive AI</h1>
          </div>
          <p className="text-sm text-gray-500">
            Your AI worker doesn&apos;t just respond — it initiates. Set it up once, let it run forever.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setRefreshing(true); fetchJobs(); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={() => { setActiveTab('templates'); setShowCreate(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Automation
          </button>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          ⚠️ {error}
        </div>
      )}

      {/* ── Active automations ───────────────────────────────────────────── */}
      {jobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Automations</h2>
            <span className="text-xs text-gray-400">{jobs.filter(j => j.enabled).length}/{jobs.length} running</span>
          </div>
          <div className="space-y-2">
            {jobs.map(job => (
              <div
                key={job.id}
                className={cn(
                  'rounded-2xl border bg-white p-4 transition-all',
                  job.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-gray-900">{job.name}</h4>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full',
                        job.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      )}>
                        {job.enabled ? '● Running' : '⏸ Paused'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatSchedule(job.schedule)}
                      </span>
                      {job.lastRun && (
                        <span className="text-xs text-gray-400">Last: {formatTimeAgo(job.lastRun)}</span>
                      )}
                      {job.nextRun && (
                        <span className="text-xs text-gray-400">Next: {formatTimeAgo(job.nextRun)}</span>
                      )}
                    </div>
                    {(job.task || job.payload?.message) && (
                      <p className="text-xs text-gray-400 mt-2 line-clamp-1">
                        {job.task || job.payload?.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(job)}
                      title={job.enabled ? 'Pause' : 'Resume'}
                      className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      {job.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      disabled={deleting === job.id}
                      title="Delete"
                      className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className={cn('h-4 w-4', deleting === job.id && 'animate-pulse')} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {jobs.length === 0 && !showCreate && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-7 w-7 text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Your AI is ready to work</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            Set up proactive automations — lead follow-ups, appointment reminders, weekly reports, and more.
            Your AI runs them automatically, 24/7.
          </p>
          <button
            onClick={() => { setActiveTab('templates'); setShowCreate(true); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 font-semibold transition-colors"
          >
            <Zap className="h-4 w-4" />
            Start with a Template
          </button>
        </div>
      )}

      {/* ── Template gallery (always visible, below jobs if any) ─────────── */}
      {!showCreate && jobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Start Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => createFromTemplate(t)}
                className="group flex flex-col p-4 bg-white border border-gray-200 rounded-2xl hover:border-indigo-200 hover:shadow-md text-left transition-all"
              >
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', t.iconBg)}>
                  {t.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-900">{t.name}</h4>
                  <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1 mb-1.5">
                    <Timer className="h-2.5 w-2.5" />
                    {t.subtitle}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">{t.description}</p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:gap-2 transition-all">
                  Use template <ChevronRight className="h-3 w-3" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Create / Edit modal ──────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">New Automation</h2>
                <p className="text-xs text-gray-500 mt-0.5">Tell your AI what to do and when</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4">
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                <button
                  onClick={() => setActiveTab('templates')}
                  className={cn(
                    'flex-1 py-2 text-xs font-semibold rounded-lg transition-all',
                    activeTab === 'templates' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  Templates
                </button>
                <button
                  onClick={() => setActiveTab('custom')}
                  className={cn(
                    'flex-1 py-2 text-xs font-semibold rounded-lg transition-all',
                    activeTab === 'custom' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Templates tab */}
            {activeTab === 'templates' && (
              <div className="px-6 pb-6 pt-4 space-y-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => createFromTemplate(t)}
                    className="w-full flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30 text-left transition-all group"
                  >
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', t.iconBg)}>
                      {t.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">{t.name}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{t.subtitle}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">{t.description}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 shrink-0 mt-1 transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {/* Custom tab */}
            {activeTab === 'custom' && (
              <div className="px-6 pb-6 pt-4 space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Automation Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g., Daily Lead Follow-Up, Morning Reminders..."
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* Schedule */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Schedule</label>
                  <div className="flex flex-wrap gap-2">
                    {SCHEDULE_PRESETS.map(preset => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          setNewSchedulePreset(preset);
                          if (preset.value) setNewCronExpr(preset.value);
                        }}
                        className={cn(
                          'px-3 py-1.5 text-xs rounded-xl border font-medium transition-colors',
                          newSchedulePreset.label === preset.label
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {newSchedulePreset.label === 'Custom cron' && (
                    <input
                      type="text"
                      value={newCronExpr}
                      onChange={e => setNewCronExpr(e.target.value)}
                      placeholder="0 9 * * 1-5"
                      className="mt-2 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    />
                  )}
                </div>

                {/* Task */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    What should the AI do?
                  </label>
                  <textarea
                    value={newTask}
                    onChange={e => setNewTask(e.target.value)}
                    rows={5}
                    placeholder="Describe the task in natural language. E.g., 'Check for new leads in GHL and send a friendly intro message to anyone who signed up in the last hour...'"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none leading-relaxed"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Write in plain English. Your AI worker will execute this as a fully autonomous task.
                  </p>
                </div>

                {/* Preview */}
                {newName && newTask && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-700 leading-relaxed">
                    <span className="font-bold">Preview:</span> &quot;{newName}&quot; will run{' '}
                    <span className="font-semibold">{cronToHuman(newSchedulePreset.value || newCronExpr)}</span> and tell your AI worker to:{' '}
                    {newTask.slice(0, 100)}{newTask.length > 100 ? '...' : ''}
                  </div>
                )}

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100">
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={saving || !newName.trim() || !newTask.trim()}
                    className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    {saving ? (
                      <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Creating...</>
                    ) : (
                      <><Zap className="h-3.5 w-3.5" /> Activate</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
