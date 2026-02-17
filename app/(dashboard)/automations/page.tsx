'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Plus, Loader2, Trash2, Clock, Zap, Play, Pause, X,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AUTOMATION_TEMPLATES, cronToHuman } from '@/lib/automations/types';

interface Automation {
  id: string;
  name: string;
  schedule: string;
  schedule_human: string;
  prompt: string;
  delivery_channel: string;
  timezone: string;
  enabled: boolean;
  last_run_at?: string;
  created_at: string;
}

export default function AutomationsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [automations, setAutomations] = useState<Automation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newScheduleType, setNewScheduleType] = useState<'daily' | 'weekdays' | 'weekly'>('daily');
  const [newHour, setNewHour] = useState(8);
  const [newMinute, setNewMinute] = useState(0);
  const [newDow, setNewDow] = useState(1);
  const [newPrompt, setNewPrompt] = useState('');
  const [newChannel, setNewChannel] = useState('web');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => { loadAutomations(); }, []);

  async function loadAutomations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    try {
      const res = await fetch('/api/automations');
      if (res.ok) {
        const data = await res.json();
        setAutomations(data.automations);
      }
    } catch (e) {
      console.error('Failed to load automations:', e);
    }
    setIsLoading(false);
  }

  async function createAutomation() {
    setIsCreating(true);
    setMessage(null);

    let schedule: string;
    switch (newScheduleType) {
      case 'daily': schedule = `${newMinute} ${newHour} * * *`; break;
      case 'weekdays': schedule = `${newMinute} ${newHour} * * 1-5`; break;
      case 'weekly': schedule = `${newMinute} ${newHour} * * ${newDow}`; break;
    }

    try {
      const res = await fetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          schedule,
          prompt: newPrompt,
          delivery_channel: newChannel,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setAutomations(prev => [data.automation, ...prev]);
        setShowCreate(false);
        resetForm();
        setMessage({ type: 'success', text: 'Automation created!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    }

    setIsCreating(false);
  }

  async function toggleAutomation(id: string, enabled: boolean) {
    setToggling(id);
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled } : a));
      }
    } catch { /* ignore */ }
    setToggling(null);
  }

  async function deleteAutomation(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAutomations(prev => prev.filter(a => a.id !== id));
        setMessage({ type: 'success', text: 'Automation deleted' });
      }
    } catch { /* ignore */ }
    setDeleting(null);
  }

  async function runNow(id: string) {
    setRunning(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/automations/${id}/run`, { method: 'POST' });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Automation triggered!' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Failed to trigger' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    }
    setRunning(null);
  }

  function applyTemplate(template: typeof AUTOMATION_TEMPLATES[0]) {
    setNewName(template.name);
    setNewPrompt(template.prompt);
    const parts = template.schedule.split(' ');
    setNewMinute(parseInt(parts[0]));
    setNewHour(parseInt(parts[1]));
    if (parts[4] === '1-5') setNewScheduleType('weekdays');
    else if (/^\d$/.test(parts[4])) {
      setNewScheduleType('weekly');
      setNewDow(parseInt(parts[4]));
    } else {
      setNewScheduleType('daily');
    }
    setShowCreate(true);
  }

  function resetForm() {
    setNewName('');
    setNewPrompt('');
    setNewHour(8);
    setNewMinute(0);
    setNewScheduleType('daily');
    setNewDow(1);
    setNewChannel('web');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/chat">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Automations</h1>
              <p className="text-sm text-gray-400">Scheduled tasks your AI runs automatically</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => { resetForm(); setShowCreate(true); }}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {message && (
          <div className={`rounded-md px-4 py-3 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {message.text}
          </div>
        )}

        {/* Create form */}
        {showCreate && (
          <Card className="border-indigo-500/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">New Automation</CardTitle>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Name</label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Morning Briefing"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Schedule</label>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={newScheduleType}
                    onChange={(e) => setNewScheduleType(e.target.value as any)}
                    className="rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900 min-h-[44px]"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekdays">Weekdays</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  {newScheduleType === 'weekly' && (
                    <select
                      value={newDow}
                      onChange={(e) => setNewDow(parseInt(e.target.value))}
                      className="rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900 min-h-[44px]"
                    >
                      <option value={1}>Monday</option>
                      <option value={2}>Tuesday</option>
                      <option value={3}>Wednesday</option>
                      <option value={4}>Thursday</option>
                      <option value={5}>Friday</option>
                      <option value={6}>Saturday</option>
                      <option value={0}>Sunday</option>
                    </select>
                  )}
                  <span className="text-gray-400 self-center">at</span>
                  <div className="flex items-center gap-1">
                    <select
                      value={newHour}
                      onChange={(e) => setNewHour(parseInt(e.target.value))}
                      className="rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900 min-h-[44px]"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                    <span className="text-gray-400">:</span>
                    <select
                      value={newMinute}
                      onChange={(e) => setNewMinute(parseInt(e.target.value))}
                      className="rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900 min-h-[44px]"
                    >
                      {[0, 15, 30, 45].map(m => (
                        <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">What should your AI do?</label>
                <Textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="e.g., Check my email and give me a summary of anything important..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Deliver to</label>
                <select
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900"
                >
                  <option value="web">Web (Kyra Dashboard)</option>
                  <option value="telegram">Telegram</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>

              <Button
                onClick={createAutomation}
                disabled={isCreating || !newName || !newPrompt}
                className="w-full"
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                Create Automation
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Templates (show when no automations or creating) */}
        {(automations.length === 0 || showCreate) && !showCreate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Start Templates</CardTitle>
              <CardDescription>One-click to set up common automations</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {AUTOMATION_TEMPLATES.slice(0, 4).map(template => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template)}
                  className="rounded-lg border border-gray-200 bg-gray-100 p-4 text-left hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{template.icon}</span>
                    <span className="font-medium text-gray-900 text-sm">{template.name}</span>
                  </div>
                  <p className="text-xs text-gray-400">{template.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Existing automations */}
        {automations.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-gray-500">
              Your Automations ({automations.length})
            </h2>
            {automations.map(auto => (
              <Card key={auto.id} className={auto.enabled ? '' : 'opacity-60'}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className={`h-4 w-4 ${auto.enabled ? 'text-indigo-600' : 'text-gray-500'}`} />
                        <span className="font-medium text-gray-900">{auto.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {auto.delivery_channel}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                        <Clock className="h-3 w-3" />
                        {auto.schedule_human}
                        {auto.timezone !== 'UTC' && ` (${auto.timezone})`}
                      </p>
                      <p className="text-sm text-gray-500 line-clamp-2">{auto.prompt}</p>
                      {auto.last_run_at && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last run: {new Date(auto.last_run_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <button
                        onClick={() => runNow(auto.id)}
                        disabled={running === auto.id}
                        title="Run now"
                        className="p-1 text-gray-500 hover:text-indigo-600 transition-colors"
                      >
                        {running === auto.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Play className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => toggleAutomation(auto.id, !auto.enabled)}
                        disabled={toggling === auto.id}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          auto.enabled ? 'bg-indigo-500' : 'bg-gray-500'
                        }`}
                      >
                        {toggling === auto.id ? (
                          <Loader2 className="h-3 w-3 animate-spin absolute top-1.5 left-4 text-gray-900" />
                        ) : (
                          <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            auto.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this automation?')) deleteAutomation(auto.id);
                        }}
                        disabled={deleting === auto.id}
                        className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                      >
                        {deleting === auto.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {automations.length === 0 && !showCreate && (
          <div className="text-center py-12">
            <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No automations yet</h3>
            <p className="text-sm text-gray-400 mb-6">
              Set up scheduled tasks and your AI will handle them automatically.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Your First Automation
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
