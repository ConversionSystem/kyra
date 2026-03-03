'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare, Plus, Calendar, Clock, AlertTriangle, Filter,
  List, LayoutGrid, Loader2, Trash2, X, Flag, User, ChevronDown,
  ArrowRight, Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AISuggestButton } from '@/components/ai/suggest-button';
import type { CrmTask } from '@/lib/crm/tasks';

const STATUS_COLS = [
  { key: 'todo', label: 'To Do', color: 'border-t-gray-400', bg: 'bg-gray-50' },
  { key: 'in_progress', label: 'In Progress', color: 'border-t-blue-400', bg: 'bg-blue-50' },
  { key: 'done', label: 'Done', color: 'border-t-green-400', bg: 'bg-green-50' },
];

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700', icon: '🔴' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700', icon: '🟠' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
  low: { label: 'Low', color: 'bg-gray-100 text-gray-600', icon: '⚪' },
};

export function TasksBoard() {
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'board' | 'list'>('board');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addStatus, setAddStatus] = useState('todo');
  const [dragTask, setDragTask] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (priorityFilter) params.set('priority', priorityFilter);

    const res = await fetch(`/api/agency/crm/tasks?${params}`);
    if (res.ok) {
      const data = await res.json();
      setTasks(data.tasks || []);
      setCounts(data.counts || {});
    }
    setLoading(false);
  }, [statusFilter, priorityFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const updateTask = async (taskId: string, updates: Record<string, unknown>) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

    await fetch(`/api/agency/crm/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    fetchTasks();
  };

  const deleteTaskHandler = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await fetch(`/api/agency/crm/tasks/${taskId}`, { method: 'DELETE' });
    fetchTasks();
  };

  const handleDrop = (statusKey: string) => {
    if (!dragTask) return;
    updateTask(dragTask, { status: statusKey });
    setDragTask(null);
    setDragOver(null);
  };

  const today = new Date().toISOString().split('T')[0];
  const overdue = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < today);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-indigo-600" /> Tasks
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {counts.todo || 0} to do · {counts.in_progress || 0} in progress · {counts.done || 0} done
            {(counts.overdue || 0) > 0 && (
              <span className="text-red-600 ml-2">· {counts.overdue} overdue</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView('board')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view === 'board' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">All priorities</option>
            <option value="urgent">🔴 Urgent</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">⚪ Low</option>
          </select>

          <AISuggestButton
            type="tasks"
            label="Suggest Tasks"
            onSelect={(s) => { setAddStatus('todo'); setShowAdd(true); }}
          />
          <Button size="sm" onClick={() => { setAddStatus('todo'); setShowAdd(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Task
          </Button>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">{overdue.length} overdue task{overdue.length > 1 ? 's' : ''}</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {overdue.slice(0, 5).map(t => (
                <span key={t.id} className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  {t.title}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Board View */}
      {view === 'board' && (
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          {STATUS_COLS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            return (
              <div
                key={col.key}
                className={`flex-shrink-0 w-72 sm:w-80 rounded-xl border-t-4 ${col.color} ${col.bg} transition ${
                  dragOver === col.key ? 'ring-2 ring-indigo-400' : ''
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(col.key); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(col.key)}
              >
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900">{col.label}</h3>
                    <span className="text-xs bg-white text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                      {colTasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => { setAddStatus(col.key); setShowAdd(true); }}
                    className="text-gray-400 hover:text-indigo-600 transition"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div className="px-3 pb-3 space-y-2 min-h-[100px]">
                  {colTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDragStart={() => setDragTask(task.id)}
                      onUpdate={(u) => updateTask(task.id, u)}
                      onDelete={() => deleteTaskHandler(task.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <CheckSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>No tasks yet. Create your first task to get started.</p>
            </div>
          ) : (
            tasks.map(task => (
              <TaskListRow
                key={task.id}
                task={task}
                onUpdate={(u) => updateTask(task.id, u)}
                onDelete={() => deleteTaskHandler(task.id)}
              />
            ))
          )}
        </div>
      )}

      {/* Add Task Modal */}
      {showAdd && (
        <AddTaskModal
          defaultStatus={addStatus}
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); fetchTasks(); }}
        />
      )}
    </div>
  );
}

function TaskCard({ task, onDragStart, onUpdate, onDelete }: {
  task: CrmTask;
  onDragStart: () => void;
  onUpdate: (u: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = task.status !== 'done' && task.due_date && task.due_date < today;
  const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`bg-white border rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-indigo-200 hover:shadow-sm transition group ${
        isOverdue ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <button
            onClick={() => onUpdate({ status: task.status === 'done' ? 'todo' : 'done' })}
            className={`mt-0.5 shrink-0 w-4 h-4 rounded border-2 transition ${
              task.status === 'done'
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 hover:border-indigo-500'
            }`}
          >
            {task.status === 'done' && <span className="text-[10px] leading-none">✓</span>}
          </button>
          <h4 className={`text-sm font-medium leading-tight ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
            {task.title}
          </h4>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2 ml-6">{task.description}</p>
      )}

      <div className="flex items-center gap-2 ml-6 flex-wrap">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pc.color}`}>
          {pc.icon} {pc.label}
        </span>

        {task.due_date && (
          <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
            <Calendar className="h-3 w-3" />
            {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}

        {task.contact_name && (
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <User className="h-3 w-3" /> {task.contact_name}
          </span>
        )}
      </div>
    </div>
  );
}

function TaskListRow({ task, onUpdate, onDelete }: {
  task: CrmTask;
  onUpdate: (u: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = task.status !== 'done' && task.due_date && task.due_date < today;
  const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  return (
    <div className={`px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition group ${isOverdue ? 'bg-red-50/50' : ''}`}>
      <button
        onClick={() => onUpdate({ status: task.status === 'done' ? 'todo' : 'done' })}
        className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
          task.status === 'done'
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-indigo-500'
        }`}
      >
        {task.status === 'done' && <span className="text-xs">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-gray-500 truncate">{task.description}</p>
        )}
      </div>

      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${pc.color}`}>
        {pc.icon} {pc.label}
      </span>

      <select
        value={task.status}
        onChange={e => onUpdate({ status: e.target.value })}
        className="text-xs border rounded-lg px-2 py-1 shrink-0 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
      >
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>

      {task.due_date && (
        <span className={`text-xs shrink-0 flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
          <Calendar className="h-3 w-3" />
          {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}

      {task.contact_name && (
        <span className="text-xs text-gray-400 shrink-0">{task.contact_name}</span>
      )}

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AddTaskModal({ defaultStatus, onClose, onCreated }: {
  defaultStatus: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
    status: defaultStatus,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title required'); return; }
    setSaving(true);

    const res = await fetch('/api/agency/crm/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description || undefined,
        due_date: form.due_date || undefined,
        priority: form.priority,
      }),
    });

    if (res.ok) onCreated();
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to create task');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-indigo-600" /> New Task
        </h3>
        <div className="space-y-3">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Task title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            autoFocus
          />
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            rows={2}
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Priority</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              >
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">⚪ Low</option>
              </select>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <div className="flex gap-2 mt-5">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={saving}>
            {saving ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </form>
    </div>
  );
}
