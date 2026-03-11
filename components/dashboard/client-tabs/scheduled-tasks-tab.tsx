'use client';

import { useState } from 'react';
import { Plus, Trash2, Clock, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface ScheduledTask {
  id: string;
  name: string;
  prompt: string;
  schedule: string;
  scheduleLabel: string;
  enabled: boolean;
  createdAt: string;
}

const SCHEDULE_OPTIONS = [
  { value: '0 * * * *', label: 'Every hour' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 9 * * *', label: 'Daily at 9:00 AM' },
  { value: '0 18 * * *', label: 'Daily at 6:00 PM' },
  { value: '0 9 * * 1', label: 'Weekly — Monday 9:00 AM' },
  { value: '0 17 * * 5', label: 'Weekly — Friday 5:00 PM' },
];

interface Props {
  client: { id: string; settings?: Record<string, unknown> | null };
}

export default function ScheduledTasksTab({ client }: Props) {
  const initial = ((client.settings as Record<string, unknown>)?.scheduled_tasks as ScheduledTask[]) || [];
  const [tasks, setTasks] = useState<ScheduledTask[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [taskName, setTaskName] = useState('');
  const [taskPrompt, setTaskPrompt] = useState('');
  const [taskSchedule, setTaskSchedule] = useState(SCHEDULE_OPTIONS[2].value);
  const [editingId, setEditingId] = useState<string | null>(null);

  const save = async (updated: ScheduledTask[]) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/agency/clients/${client.id}/scheduled-tasks`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_tasks: updated }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setTasks(updated);
    } catch {
      setError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = () => {
    if (!taskName.trim() || !taskPrompt.trim()) {
      setError('Name and instructions are required');
      return;
    }

    const scheduleOption = SCHEDULE_OPTIONS.find(o => o.value === taskSchedule);

    if (editingId) {
      const updated = tasks.map(t =>
        t.id === editingId
          ? { ...t, name: taskName.trim(), prompt: taskPrompt.trim(), schedule: taskSchedule, scheduleLabel: scheduleOption?.label || taskSchedule }
          : t
      );
      save(updated);
    } else {
      const newTask: ScheduledTask = {
        id: crypto.randomUUID(),
        name: taskName.trim(),
        prompt: taskPrompt.trim(),
        schedule: taskSchedule,
        scheduleLabel: scheduleOption?.label || taskSchedule,
        enabled: true,
        createdAt: new Date().toISOString(),
      };
      save([...tasks, newTask]);
    }

    resetForm();
  };

  const resetForm = () => {
    setTaskName('');
    setTaskPrompt('');
    setTaskSchedule(SCHEDULE_OPTIONS[2].value);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (task: ScheduledTask) => {
    setTaskName(task.name);
    setTaskPrompt(task.prompt);
    setTaskSchedule(task.schedule);
    setEditingId(task.id);
    setShowForm(true);
  };

  const toggleEnabled = (id: string) => {
    const updated = tasks.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t);
    save(updated);
  };

  const deleteTask = (id: string) => {
    save(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Scheduled Tasks</h2>
          <p className="text-sm text-gray-500">Automate your AI worker with recurring tasks</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-xl hover:bg-indigo-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl">
          {error}
        </div>
      )}

      {/* Create/Edit form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {editingId ? 'Edit Task' : 'New Task'}
          </h3>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Task Name</label>
            <input
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. Daily Summary Report"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Instructions</label>
            <textarea
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              placeholder="What should the AI do? e.g. 'Summarize all customer conversations from today and send a report...'"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Schedule</label>
            <select
              value={taskSchedule}
              onChange={(e) => setTaskSchedule(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
            >
              {SCHEDULE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? 'Save Changes' : 'Create Task'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      {tasks.length > 0 ? (
        <div className="space-y-3">
          {tasks.map(task => (
            <div key={task.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleEnabled(task.id)}
                  className="mt-0.5 flex-shrink-0"
                  title={task.enabled ? 'Disable' : 'Enable'}
                >
                  <div className={`h-3 w-3 rounded-full ${task.enabled ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{task.name}</p>
                    {!task.enabled && (
                      <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Paused</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.prompt}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {task.scheduleLabel}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(task)}
                    className="p-1.5 text-gray-400 hover:text-indigo-500 transition-colors rounded-lg hover:bg-gray-50"
                    title="Edit"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-gray-50"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !showForm ? (
        <div className="text-center py-12 text-gray-500">
          <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm">No scheduled tasks yet.</p>
          <p className="text-xs mt-1">Automate your AI worker with recurring tasks like daily reports, follow-up reminders, or weekly summaries.</p>
        </div>
      ) : null}
    </div>
  );
}
