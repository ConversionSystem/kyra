'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Plus, Pencil, Trash2, Clock, MapPin, Loader2 } from 'lucide-react';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  attendees?: string[];
}

type ViewRange = 'today' | 'week';

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [range, setRange] = useState<ViewRange>('today');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [connectUrl, setConnectUrl] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formSummary, setFormSummary] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('09:00');
  const [formDuration, setFormDuration] = useState('60');
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSummary, setEditSummary] = useState('');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?range=${range}`);
      const data = (await res.json()) as any;
      if (res.ok) {
        setEvents(data.events || []);
        setConnected(true);
      } else if (data.connect_url) {
        setConnected(false);
        setConnectUrl(data.connect_url);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSummary.trim()) return;
    setSubmitting(true);
    const start = new Date(`${formDate}T${formTime}:00`);
    const end = new Date(start.getTime() + parseInt(formDuration) * 60 * 1000);
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: formSummary, start: start.toISOString(), end: end.toISOString() }),
      });
      if (res.ok) {
        setFormSummary('');
        setShowForm(false);
        fetchEvents();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Delete this event?')) return;
    const res = await fetch(`/api/calendar?eventId=${eventId}`, { method: 'DELETE' });
    if (res.ok) fetchEvents();
  };

  const handleEditSave = async (eventId: string) => {
    if (!editSummary.trim()) return;
    const res = await fetch('/api/calendar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, summary: editSummary }),
    });
    if (res.ok) {
      setEditingId(null);
      fetchEvents();
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const groupedEvents = events.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const day = new Date(event.start).toDateString();
    if (!acc[day]) acc[day] = [];
    acc[day].push(event);
    return acc;
  }, {});

  if (!connected) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <CalendarDays className="h-12 w-12 text-gray-400 mx-auto" />
          <h2 className="text-xl font-semibold text-gray-900">Connect Google Calendar</h2>
          <p className="text-gray-500 text-sm max-w-sm">
            Link your Google Calendar to view, create, and manage events directly from Kyra.
          </p>
          <a
            href={connectUrl || '/api/auth/google'}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            <CalendarDays className="h-4 w-4" />
            Connect Google Calendar
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg bg-gray-100 p-0.5">
              {(['today', 'week'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    range === r ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {r === 'today' ? 'Today' : 'This Week'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Event
            </button>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="mb-6 rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <input
              type="text"
              placeholder="Event title"
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
              className="w-full rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[44px]"
              />
              <input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[44px]"
              />
              <select
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
                className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[44px]"
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !formSummary.trim()} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <CalendarDays className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">{range === 'today' ? 'No events today' : 'No events this week'}</p>
          </div>
        ) : range === 'today' ? (
          <div className="space-y-2">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                editingId={editingId}
                editSummary={editSummary}
                onEdit={(id, summary) => { setEditingId(id); setEditSummary(summary); }}
                onEditSave={handleEditSave}
                onEditCancel={() => setEditingId(null)}
                onEditSummaryChange={setEditSummary}
                onDelete={handleDelete}
                formatTime={formatTime}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([day, dayEvents]) => (
              <div key={day}>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  {formatDate(dayEvents[0].start)}
                </h3>
                <div className="space-y-2">
                  {dayEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      editingId={editingId}
                      editSummary={editSummary}
                      onEdit={(id, summary) => { setEditingId(id); setEditSummary(summary); }}
                      onEditSave={handleEditSave}
                      onEditCancel={() => setEditingId(null)}
                      onEditSummaryChange={setEditSummary}
                      onDelete={handleDelete}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({
  event, editingId, editSummary, onEdit, onEditSave, onEditCancel, onEditSummaryChange, onDelete, formatTime,
}: {
  event: CalendarEvent;
  editingId: string | null;
  editSummary: string;
  onEdit: (id: string, summary: string) => void;
  onEditSave: (id: string) => void;
  onEditCancel: () => void;
  onEditSummaryChange: (s: string) => void;
  onDelete: (id: string) => void;
  formatTime: (d: string) => string;
}) {
  const isEditing = editingId === event.id;

  return (
    <div className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 transition-colors hover:border-gray-200">
      <div className="flex-shrink-0 w-1 h-full min-h-[2.5rem] rounded-full bg-indigo-500/40" />
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              value={editSummary}
              onChange={(e) => onEditSummaryChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onEditSave(event.id); if (e.key === 'Escape') onEditCancel(); }}
              className="flex-1 rounded-md bg-gray-100 border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
            <button onClick={() => onEditSave(event.id)} className="text-xs text-indigo-600 hover:text-indigo-600">Save</button>
            <button onClick={onEditCancel} className="text-xs text-gray-400 hover:text-gray-700">Cancel</button>
          </div>
        ) : (
          <p className="text-sm font-medium text-gray-900 truncate">{event.summary}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(event.start)} – {formatTime(event.end)}
          </span>
          {event.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3" />
              {event.location}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(event.id, event.summary)} className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onDelete(event.id)} className="rounded-md p-2 text-gray-400 hover:bg-red-900/30 hover:text-red-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" title="Delete">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
