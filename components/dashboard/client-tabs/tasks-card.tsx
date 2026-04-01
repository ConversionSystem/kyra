'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Play,
  Plus,
  Loader2,
  ChevronDown,
  ChevronRight,
  Trash2,
  Power,
  PowerOff,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import {
  TASK_TYPE_META,
  SCHEDULE_PRESETS,
  getSuggestedTasks,
  type TaskType,
  type TriggerType,
  type WorkerTask,
  type WorkerTaskRun,
  type TaskTemplate,
} from '@/lib/tasks/task-types';
import { describeCron } from '@/lib/tasks/cron-utils';

// ── Props ───────────────────────────────────────────────────────────────────

interface TasksCardProps {
  clientId: string;
  workerRoleId?: string;
}

// ── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-gray-400">Never run</span>;

  const config: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
    success: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircle2 },
    failed: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
    timeout: { bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertTriangle },
    running: { bg: 'bg-blue-50', text: 'text-blue-700', icon: Loader2 },
  };

  const c = config[status] ?? config.failed;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {status}
    </span>
  );
}

// ── Time display ────────────────────────────────────────────────────────────

function TimeAgo({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-xs text-gray-400">—</span>;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return <span className="text-xs text-gray-400">—</span>;
  const now = Date.now();
  const diff = now - d.getTime();

  if (diff < 60_000) return <span className="text-xs text-gray-500">Just now</span>;
  if (diff < 3_600_000) return <span className="text-xs text-gray-500">{Math.floor(diff / 60_000)}m ago</span>;
  if (diff < 86_400_000) return <span className="text-xs text-gray-500">{Math.floor(diff / 3_600_000)}h ago</span>;

  return (
    <span className="text-xs text-gray-500">
      {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
    </span>
  );
}

function FutureTime({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-xs text-gray-400">—</span>;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return <span className="text-xs text-gray-400">—</span>;

  return (
    <span className="text-xs text-gray-500">
      {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

// ── Create task form ────────────────────────────────────────────────────────

interface CreateFormProps {
  clientId: string;
  workerRoleId?: string;
  onCreated: () => void;
  onCancel: () => void;
  initialValues?: Partial<{
    name: string;
    task_type: TaskType;
    description: string;
    schedule_cron: string;
  }>;
}

function CreateTaskForm({ clientId, workerRoleId, onCreated, onCancel, initialValues }: CreateFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [taskType, setTaskType] = useState<TaskType>(initialValues?.task_type ?? 'custom');
  const [triggerType, setTriggerType] = useState<TriggerType>('schedule');
  const [scheduleCron, setScheduleCron] = useState(initialValues?.schedule_cron ?? '0 9 * * 1');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [customPrompt, setCustomPrompt] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/agency/clients/${clientId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          task_type: taskType,
          trigger_type: triggerType,
          schedule_cron: triggerType === 'schedule' ? scheduleCron : null,
          worker_role: workerRoleId ?? 'default',
          custom_prompt: taskType === 'custom' ? customPrompt : null,
          enabled,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create task');
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-900">Create Task</h4>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Task Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Weekly SEO Audit"
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Task Type</label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value as TaskType)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
          >
            {TASK_TYPE_META.map((t) => (
              <option key={t.id} value={t.id}>
                {t.emoji} {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Trigger</label>
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value as TriggerType)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="schedule">⏰ Schedule</option>
            <option value="manual">👆 Manual only</option>
            <option value="event">⚡ Event</option>
          </select>
        </div>
      </div>

      {triggerType === 'schedule' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Schedule</label>
          <select
            value={scheduleCron}
            onChange={(e) => setScheduleCron(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
          >
            {SCHEDULE_PRESETS.map((p) => (
              <option key={p.cron} value={p.cron}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this task does..."
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {taskType === 'custom' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Custom Prompt</label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Instructions for the AI to execute..."
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="task-enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="task-enabled" className="text-sm text-gray-700">Enabled</label>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create Task
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Run results viewer ──────────────────────────────────────────────────────

function RunResultsViewer({ taskId, clientId }: { taskId: string; clientId: string }) {
  const [runs, setRuns] = useState<WorkerTaskRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRuns() {
      try {
        const res = await fetch(`/api/agency/clients/${clientId}/tasks/${taskId}`);
        if (res.ok) {
          const data = await res.json();
          setRuns(data.runs ?? []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchRuns();
  }, [taskId, clientId]);

  if (loading) return <div className="text-xs text-gray-400 py-2">Loading runs...</div>;
  if (runs.length === 0) return <div className="text-xs text-gray-400 py-2">No runs yet</div>;

  return (
    <div className="space-y-2 mt-2">
      {runs.slice(0, 5).map((run) => (
        <div key={run.id} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge status={run.status} />
              <span className="text-xs text-gray-500">
                {new Date(run.started_at).toLocaleString(undefined, {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {run.duration_ms != null && <span>{(run.duration_ms / 1000).toFixed(1)}s</span>}
              {run.tokens_used > 0 && <span>{run.tokens_used} tokens</span>}
            </div>
          </div>
          {run.result_summary && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{run.result_summary}</p>
          )}
          {run.error_message && (
            <p className="text-xs text-red-600 mt-1 line-clamp-2">Error: {run.error_message}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Task row ────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: WorkerTask;
  clientId: string;
  onUpdate: () => void;
}

function TaskRow({ task, clientId, onUpdate }: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const meta = TASK_TYPE_META.find((t) => t.id === task.task_type);

  const handleRun = async () => {
    setRunning(true);
    try {
      await fetch(`/api/agency/clients/${clientId}/tasks/${task.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run' }),
      });
      onUpdate();
    } catch { /* ignore */ }
    setRunning(false);
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      await fetch(`/api/agency/clients/${clientId}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !task.enabled }),
      });
      onUpdate();
    } catch { /* ignore */ }
    setToggling(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete task "${task.name}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/agency/clients/${clientId}/tasks/${task.id}`, {
        method: 'DELETE',
      });
      onUpdate();
    } catch { /* ignore */ }
    setDeleting(false);
  };

  return (
    <div className={`border rounded-xl transition-colors ${task.enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-70'}`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
            <span className="text-lg shrink-0">{meta?.emoji ?? '⚙️'}</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{task.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{meta?.label ?? task.task_type}</span>
                {task.schedule_cron && (
                  <>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {describeCron(task.schedule_cron)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            <StatusBadge status={task.last_run_status} />

            <button
              onClick={handleRun}
              disabled={running}
              title="Run now"
              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            </button>

            <button
              onClick={handleToggle}
              disabled={toggling}
              title={task.enabled ? 'Disable' : 'Enable'}
              className={`p-1.5 rounded-lg transition-colors ${
                task.enabled
                  ? 'text-green-600 hover:bg-green-50'
                  : 'text-gray-400 hover:bg-gray-100'
              }`}
            >
              {task.enabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
            </button>

            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Delete"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Run info row */}
        <div className="flex items-center gap-4 mt-2 ml-10 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <span>Last run:</span>
            <TimeAgo iso={task.last_run_at} />
          </div>
          {task.next_run_at && task.enabled && (
            <div className="flex items-center gap-1">
              <span>Next:</span>
              <FutureTime iso={task.next_run_at} />
            </div>
          )}
          <span>Runs: {task.run_count}</span>
        </div>
      </div>

      {/* Expanded: run history */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-gray-100 pt-3">
          <p className="text-xs font-medium text-gray-500 mb-2">Recent Runs</p>
          <RunResultsViewer taskId={task.id} clientId={clientId} />
        </div>
      )}
    </div>
  );
}

// ── Suggested tasks section ─────────────────────────────────────────────────

interface SuggestedTasksProps {
  suggestions: TaskTemplate[];
  onActivate: (template: TaskTemplate) => void;
}

function SuggestedTasks({ suggestions, onActivate }: SuggestedTasksProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-indigo-600" />
        <h4 className="text-sm font-semibold text-indigo-900">Suggested Tasks</h4>
      </div>
      <div className="space-y-2">
        {suggestions.map((s) => {
          const meta = TASK_TYPE_META.find((t) => t.id === s.task_type);
          return (
            <div
              key={s.name}
              className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-indigo-100"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span>{meta?.emoji ?? '⚙️'}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-500 truncate">{s.description}</p>
                </div>
              </div>
              <button
                onClick={() => onActivate(s)}
                className="shrink-0 px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                + Activate
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function TasksCard({ clientId, workerRoleId }: TasksCardProps) {
  const [tasks, setTasks] = useState<WorkerTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formInitial, setFormInitial] = useState<Partial<{ name: string; task_type: TaskType; description: string; schedule_cron: string }>>({});

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Compute suggestions: filter out task types that already exist
  const existingTypes = new Set(tasks.map((t) => t.task_type));
  const suggestions = getSuggestedTasks(workerRoleId ?? '_default').filter(
    (s) => !existingTypes.has(s.task_type)
  );

  const handleActivateSuggestion = (template: TaskTemplate) => {
    setFormInitial({
      name: template.name,
      task_type: template.task_type,
      description: template.description,
      schedule_cron: template.schedule_cron,
    });
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading tasks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Autonomous Tasks</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Scheduled tasks that run automatically — SEO audits, follow-ups, reports, and more.
          </p>
        </div>
        <button
          onClick={() => { setFormInitial({}); setShowForm(true); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Task
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <CreateTaskForm
          clientId={clientId}
          workerRoleId={workerRoleId}
          initialValues={formInitial}
          onCreated={() => { setShowForm(false); fetchTasks(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Suggested tasks */}
      {!showForm && suggestions.length > 0 && tasks.length === 0 && (
        <SuggestedTasks suggestions={suggestions} onActivate={handleActivateSuggestion} />
      )}

      {/* Task list */}
      {tasks.length === 0 && !showForm ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
            <Clock className="h-6 w-6 text-indigo-400" />
          </div>
          <p className="text-sm font-medium text-gray-900">No tasks configured</p>
          <p className="text-xs text-gray-500 mt-1">
            Create autonomous tasks to have your AI worker proactively do work.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} clientId={clientId} onUpdate={fetchTasks} />
          ))}
        </div>
      )}

      {/* Inline suggestions when tasks exist */}
      {!showForm && suggestions.length > 0 && tasks.length > 0 && (
        <SuggestedTasks suggestions={suggestions} onActivate={handleActivateSuggestion} />
      )}
    </div>
  );
}
