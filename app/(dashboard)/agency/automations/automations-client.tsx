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
  Calendar,
  AlertTriangle,
} from 'lucide-react';

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
  payload?: {
    kind?: string;
    message?: string;
  };
  enabled: boolean;
  lastRun: string | null;
  nextRun?: string | null;
  createdAt?: string;
}

const SCHEDULE_PRESETS = [
  { label: 'Every 5 minutes', type: 'every', value: '5m' },
  { label: 'Every 30 minutes', type: 'every', value: '30m' },
  { label: 'Every hour', type: 'every', value: '1h' },
  { label: 'Every day at 9am', type: 'cron', value: '0 9 * * *' },
  { label: 'Every Monday 9am', type: 'cron', value: '0 9 * * 1' },
  { label: 'Every weekday 9am', type: 'cron', value: '0 9 * * 1-5' },
  { label: 'Custom cron', type: 'cron', value: '' },
];

function formatSchedule(schedule: CronJob['schedule']): string {
  if (schedule.kind === 'every' && schedule.everyMs) {
    const ms = schedule.everyMs;
    if (ms < 60000) return `Every ${ms / 1000}s`;
    if (ms < 3600000) return `Every ${ms / 60000}m`;
    if (ms < 86400000) return `Every ${ms / 3600000}h`;
    return `Every ${ms / 86400000}d`;
  }
  if (schedule.kind === 'cron' && schedule.expr) {
    return cronToHuman(schedule.expr);
  }
  if (schedule.kind === 'at' && schedule.at) {
    return `Once at ${new Date(schedule.at).toLocaleString()}`;
  }
  return 'Unknown';
}

function cronToHuman(expr: string): string {
  const parts = expr.split(' ');
  if (parts.length !== 5) return expr;
  const [min, hour, dom, mon, dow] = parts;

  const time = `${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;

  if (dom === '*' && mon === '*') {
    if (dow === '*') return `Daily at ${time}`;
    if (dow === '1-5') return `Weekdays at ${time}`;
    if (dow === '0,6') return `Weekends at ${time}`;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (dow.match(/^\d$/)) return `${days[parseInt(dow)]}s at ${time}`;
  }

  return expr;
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 0) return `in ${Math.abs(mins)}m`;
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AutomationsClient() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newSchedulePreset, setNewSchedulePreset] = useState(SCHEDULE_PRESETS[3]); // daily 9am
  const [newCronExpr, setNewCronExpr] = useState('0 9 * * *');
  const [newTimezone, setNewTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/automations');
      if (!res.ok) throw new Error('Failed to fetch automations');
      const data = await res.json();
      if (data.error && !data.jobs?.length) {
        setError(data.error);
      } else {
        setError(null);
      }
      setJobs(data.jobs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleCreate = async () => {
    if (!newName.trim() || !newTask.trim()) return;
    setSaving(true);

    try {
      const scheduleType = newSchedulePreset.type;
      const scheduleValue = newSchedulePreset.value || newCronExpr;

      const res = await fetch('/api/agency/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          task: newTask.trim(),
          schedule: scheduleType,
          scheduleValue,
          timezone: newTimezone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create');
      }

      setShowCreate(false);
      setNewName('');
      setNewTask('');
      fetchJobs();
    } catch (err: any) {
      alert(err.message);
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
      if (res.ok) {
        setJobs(prev => prev.map(j =>
          j.id === job.id ? { ...j, enabled: !j.enabled } : j
        ));
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Delete this automation? This cannot be undone.')) return;
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
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Gateway Issue</p>
            <p className="text-sm text-amber-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {jobs.length} automation{jobs.length !== 1 ? 's' : ''} · {jobs.filter(j => j.enabled).length} active
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => { setRefreshing(true); fetchJobs(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New Automation
          </button>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Create Automation</h3>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g., Morning Lead Check, Daily Summary..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Schedule</label>
              <div className="flex flex-wrap gap-2">
                {SCHEDULE_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setNewSchedulePreset(preset);
                      if (preset.value) setNewCronExpr(preset.value);
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      newSchedulePreset.label === preset.label
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
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
                  className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Task — What should the AI do?
              </label>
              <textarea
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                rows={3}
                placeholder="e.g., Check for new leads in GHL and send a welcome SMS to anyone who hasn't been contacted in the last 24 hours..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Write in natural language. The AI will execute this as an autonomous task.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !newName.trim() || !newTask.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Automation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jobs List */}
      {jobs.length === 0 && !showCreate ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-amber-50 rounded-xl mb-4">
            <Zap className="h-10 w-10 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No automations yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mb-4">
            Schedule proactive tasks for your AI — lead follow-ups, daily summaries,
            recurring checks, and more.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Your First Automation
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <div
              key={job.id}
              className={`rounded-xl border bg-white p-4 transition-colors ${
                job.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{job.name}</h4>
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${
                      job.enabled
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {job.enabled ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {formatSchedule(job.schedule)}
                    </span>
                    {job.lastRun && (
                      <span className="text-xs text-gray-400">
                        Last: {formatTimeAgo(job.lastRun)}
                      </span>
                    )}
                    {job.nextRun && (
                      <span className="text-xs text-gray-400">
                        Next: {formatTimeAgo(job.nextRun)}
                      </span>
                    )}
                  </div>

                  {job.task || job.payload?.message && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {job.task || job.task || job.payload?.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggle(job)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title={job.enabled ? 'Pause' : 'Resume'}
                  >
                    {job.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(job.id)}
                    disabled={deleting === job.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className={`h-4 w-4 ${deleting === job.id ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
