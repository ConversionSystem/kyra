'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock3, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';

interface ScheduledTask {
  id: string;
  name: string;
  prompt: string;
  schedule: string;
  scheduleLabel: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string;
}

interface ScheduledTasksTabProps {
  client: AgencyClient;
}

const SCHEDULE_OPTIONS = [
  { value: '0 * * * *', label: 'Every hour' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 9 * * *', label: 'Daily at 9am' },
  { value: '0 18 * * *', label: 'Daily at 6pm' },
  { value: '0 9 * * 1', label: 'Weekly Monday 9am' },
  { value: '0 17 * * 5', label: 'Weekly Friday 5pm' },
] as const;

function formatLastRun(iso?: string) {
  if (!iso) return 'Never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ScheduledTasksTab({ client }: ScheduledTasksTabProps) {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [taskName, setTaskName] = useState('');
  const [taskPrompt, setTaskPrompt] = useState('');
  const [taskSchedule, setTaskSchedule] = useState<string>(SCHEDULE_OPTIONS[0].value);
  const [taskEnabled, setTaskEnabled] = useState(true);

  useEffect(() => {
    const initial = (client.settings?.scheduled_tasks as ScheduledTask[] | undefined) ?? [];
    setTasks(initial);
    setError(null);
    setLoading(false);
  }, [client.id, client.settings]);

  const scheduleLabelByValue = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of SCHEDULE_OPTIONS) map.set(option.value, option.label);
    return map;
  }, []);

  const persistTasks = async (nextTasks: ScheduledTask[]) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/agency/clients/${client.id}/scheduled-tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_tasks: nextTasks }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Failed to save scheduled tasks');
      }

      setTasks(nextTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scheduled tasks');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTaskName('');
    setTaskPrompt('');
    setTaskSchedule(SCHEDULE_OPTIONS[0].value);
    setTaskEnabled(true);
    setEditingTaskId(null);
    setShowForm(false);
  };

  const handleCreateOrUpdate = async () => {
    const name = taskName.trim();
    const prompt = taskPrompt.trim();

    if (!name || !prompt) {
      setError('Task name and prompt are required.');
      return;
    }

    const label = scheduleLabelByValue.get(taskSchedule) ?? taskSchedule;

    if (editingTaskId) {
      const nextTasks = tasks.map((task) =>
        task.id === editingTaskId
          ? { ...task, name, prompt, schedule: taskSchedule, scheduleLabel: label, enabled: taskEnabled }
          : task
      );
      await persistTasks(nextTasks);
      resetForm();
      return;
    }

    const nextTask: ScheduledTask = {
      id: crypto.randomUUID(),
      name,
      prompt,
      schedule: taskSchedule,
      scheduleLabel: label,
      enabled: taskEnabled,
      createdAt: new Date().toISOString(),
    };

    await persistTasks([...tasks, nextTask]);
    resetForm();
  };

  const startEdit = (task: ScheduledTask) => {
    setTaskName(task.name);
    setTaskPrompt(task.prompt);
    setTaskSchedule(task.schedule);
    setTaskEnabled(task.enabled);
    setEditingTaskId(task.id);
    setShowForm(true);
  };

  const toggleTask = async (taskId: string) => {
    const nextTasks = tasks.map((task) =>
      task.id === taskId ? { ...task, enabled: !task.enabled } : task
    );
    await persistTasks(nextTasks);
  };

  const deleteTask = async (taskId: string) => {
    await persistTasks(tasks.filter((task) => task.id !== taskId));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Scheduled Tasks</h2>
            <p className="mt-1 text-sm text-gray-500">Set recurring automations for this client&apos;s AI worker.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingTaskId(null);
              setShowForm((prev) => !prev);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </button>
        </div>
      </div>

      {(loading || saving) && (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
          {loading ? 'Loading tasks...' : 'Saving tasks...'}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showForm && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="text-sm font-semibold text-gray-900">{editingTaskId ? 'Edit Task' : 'New Task'}</h3>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Task Name</label>
            <input
              type="text"
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
              placeholder="e.g. Daily lead summary"
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Prompt / Instruction</label>
            <textarea
              value={taskPrompt}
              onChange={(event) => setTaskPrompt(event.target.value)}
              rows={4}
              placeholder="Describe exactly what the AI should do when this task runs..."
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Schedule</label>
            <select
              value={taskSchedule}
              onChange={(event) => setTaskSchedule(event.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              {SCHEDULE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-900">Enabled</p>
              <p className="text-xs text-gray-500">Toggle whether this task should run automatically.</p>
            </div>
            <button
              type="button"
              onClick={() => setTaskEnabled((prev) => !prev)}
              aria-pressed={taskEnabled}
              className={`relative h-6 w-11 rounded-full transition-colors ${taskEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  taskEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleCreateOrUpdate()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingTaskId ? 'Save Changes' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!loading && tasks.length === 0 && !showForm && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600">
          No scheduled tasks yet. Automate your AI worker with recurring tasks like daily reports, follow-up reminders, or weekly summaries.
        </div>
      )}

      {tasks.length > 0 && (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${task.enabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    <h3 className="text-sm font-semibold text-gray-900">{task.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        task.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {task.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600">{task.prompt}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" />
                      {task.scheduleLabel}
                    </span>
                    <span>Last run: {formatLastRun(task.lastRunAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleTask(task.id)}
                    aria-pressed={task.enabled}
                    aria-label={`Toggle ${task.name}`}
                    className={`relative h-6 w-11 rounded-full transition-colors ${task.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        task.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => startEdit(task)}
                    className="rounded-lg p-2 text-gray-500 transition hover:bg-indigo-50 hover:text-indigo-700"
                    aria-label={`Edit ${task.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => void deleteTask(task.id)}
                    className="rounded-lg p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${task.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
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
