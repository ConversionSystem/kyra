'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Zap, ChevronDown, ChevronUp, Clock, Users, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutopilotAction {
  id: string;
  name: string;
  emoji: string;
  description: string;
  dayOfWeek: number;
  timeHour: number;
  timeMinute: number;
  enabled: boolean;
  messageTemplate: string;
  targetAudience: string;
  category: string;
}

interface DayOverview {
  day: string;
  count: number;
  actions: string[];
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CATEGORY_COLORS: Record<string, string> = {
  'follow-up': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'reminder': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'review': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'report': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'nurture': 'bg-green-500/20 text-green-400 border-green-500/30',
};

function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m} ${ampm}`;
}

export function AutopilotClient() {
  const [enabled, setEnabled] = useState(false);
  const [schedule, setSchedule] = useState<AutopilotAction[]>([]);
  const [overview, setOverview] = useState<DayOverview[]>([]);
  const [stats, setStats] = useState({ actionsRun: 0, enabledCount: 0, totalCount: 0, lastRunAt: null as string | null });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());

  const load = () => {
    fetch('/api/agency/autopilot')
      .then(r => r.json())
      .then(d => {
        setEnabled(d.enabled ?? false);
        setSchedule(d.schedule ?? []);
        setOverview(d.overview ?? []);
        setStats(d.stats ?? { actionsRun: 0, enabledCount: 0, totalCount: 0, lastRunAt: null });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleAutopilot = async (val: boolean) => {
    setEnabled(val);
    await fetch('/api/agency/autopilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', enabled: val }),
    });
  };

  const toggleAction = async (actionId: string, val: boolean) => {
    setSchedule(prev => prev.map(a => a.id === actionId ? { ...a, enabled: val } : a));
    await fetch('/api/agency/autopilot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_action', actionId, enabled: val }),
    });
  };

  const saveMessage = async (actionId: string) => {
    setSaving(true);
    const act = schedule.find(a => a.id === actionId);
    if (act) {
      const updated = { ...act, messageTemplate: editMessage };
      await fetch('/api/agency/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_action', actionData: updated }),
      });
      setSchedule(prev => prev.map(a => a.id === actionId ? updated : a));
    }
    setEditingId(null);
    setSaving(false);
  };

  const dayActions = schedule.filter(a => a.dayOfWeek === selectedDay)
    .sort((a, b) => a.timeHour * 60 + a.timeMinute - (b.timeHour * 60 + b.timeMinute));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" /> Autopilot
          </h1>
          <p className="text-gray-400 mt-1">
            Your AI worker acts on its own — follow-ups, reminders, reviews, reports. Set it and forget it.
          </p>
        </div>
      </div>

      {/* Master toggle + stats */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={cn('w-3 h-3 rounded-full', enabled ? 'bg-green-400 animate-pulse' : 'bg-gray-600')} />
              <div>
                <p className="text-white font-medium">{enabled ? 'Autopilot Active' : 'Autopilot Off'}</p>
                <p className="text-gray-500 text-sm">
                  {enabled ? `${stats.enabledCount} of ${stats.totalCount} actions enabled` : 'Enable to start automated outreach'}
                </p>
              </div>
            </div>
            <Switch checked={enabled} onCheckedChange={toggleAutopilot} />
          </div>
          {enabled && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{stats.enabledCount}</p>
                <p className="text-gray-500 text-xs">Active Actions</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{stats.actionsRun}</p>
                <p className="text-gray-500 text-xs">Actions Run</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-white">{stats.lastRunAt ? 'Active' : 'Waiting'}</p>
                <p className="text-gray-500 text-xs">Status</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Overview — pill bar */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-400">Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1.5">
            {overview.map((day, i) => (
              <button
                key={day.day}
                onClick={() => setSelectedDay(i)}
                className={cn(
                  'flex-1 rounded-lg py-2 px-1 text-center transition-all',
                  selectedDay === i
                    ? 'bg-blue-600 text-white'
                    : day.count > 0
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-750'
                      : 'bg-gray-800/50 text-gray-600',
                )}
              >
                <p className="text-xs font-medium">{DAY_SHORT[i]}</p>
                <p className={cn('text-lg font-bold', selectedDay === i ? 'text-white' : day.count > 0 ? 'text-gray-200' : 'text-gray-600')}>
                  {day.count}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Day detail */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">
          {DAY_NAMES[selectedDay]} — {dayActions.length === 0 ? 'No actions' : `${dayActions.length} action${dayActions.length > 1 ? 's' : ''}`}
        </h2>

        {dayActions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No actions scheduled for {DAY_NAMES[selectedDay]}</p>
            <p className="text-sm mt-1">Your AI worker rests this day 😴</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayActions.map(act => {
              const isExpanded = expandedId === act.id;
              const isEditing = editingId === act.id;
              return (
                <Card key={act.id} className={cn(
                  'bg-gray-900 border-gray-800 transition-all',
                  act.enabled && 'border-gray-700',
                  !act.enabled && 'opacity-60',
                )}>
                  <CardContent className="py-4">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl">{act.emoji}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{act.name}</p>
                            <Badge variant="outline" className={cn('text-xs border', CATEGORY_COLORS[act.category] ?? 'border-gray-700 text-gray-400')}>
                              {act.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-500 text-xs">{formatTime(act.timeHour, act.timeMinute)}</span>
                            <span className="text-gray-700">·</span>
                            <Users className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-500 text-xs truncate">{act.targetAudience}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Switch checked={act.enabled} onCheckedChange={v => toggleAction(act.id, v)} />
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : act.id)}
                          className="text-gray-500 hover:text-gray-300"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Description</p>
                          <p className="text-gray-300 text-sm">{act.description}</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-gray-500">Message Template</p>
                            <button
                              onClick={() => { setEditingId(isEditing ? null : act.id); setEditMessage(act.messageTemplate); }}
                              className="text-gray-500 hover:text-gray-300"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </div>
                          {isEditing ? (
                            <div className="space-y-2">
                              <textarea
                                value={editMessage}
                                onChange={e => setEditMessage(e.target.value)}
                                rows={4}
                                className="w-full bg-gray-800 border border-gray-700 text-white rounded-md p-2 text-sm resize-y"
                              />
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="outline" className="border-gray-700 text-gray-400" onClick={() => setEditingId(null)}>
                                  Cancel
                                </Button>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => saveMessage(act.id)} disabled={saving}>
                                  {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                  Save
                                </Button>
                              </div>
                              <p className="text-gray-600 text-xs">
                                Variables: {'{{first_name}}'}, {'{{service}}'}, {'{{time}}'}, {'{{amount}}'}, {'{{payment_link}}'}, {'{{review_link}}'}
                              </p>
                            </div>
                          ) : (
                            <div className="bg-gray-800 rounded-lg p-3">
                              <p className="text-gray-300 text-sm whitespace-pre-wrap">{act.messageTemplate}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
