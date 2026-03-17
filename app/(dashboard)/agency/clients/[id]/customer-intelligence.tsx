'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Brain, RefreshCw, Loader2, Plus, ChevronDown, ChevronRight,
  MessageSquare, Calendar, Star, TrendingUp, TrendingDown, Minus,
  Tag, Clock, Sparkles, X, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CustomerFact {
  fact: string;
  source: 'conversation' | 'manual' | 'ai-extracted';
  date: string;
}

interface CustomerAppointment {
  date: string;
  service: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
}

interface CustomerMemory {
  contactId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  firstContact: string;
  lastContact: string;
  totalInteractions: number;
  tags: string[];
  facts: CustomerFact[];
  appointments: CustomerAppointment[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'unknown';
  lifetimeValue: number;
  notes: string;
  updatedAt?: string;
}

// ── Sentiment helpers ─────────────────────────────────────────────────────────

const SENTIMENT_ICON = {
  positive: <TrendingUp className="h-4 w-4 text-emerald-500" />,
  neutral: <Minus className="h-4 w-4 text-gray-400" />,
  negative: <TrendingDown className="h-4 w-4 text-red-500" />,
  unknown: <Minus className="h-4 w-4 text-gray-300" />,
};

const SENTIMENT_BADGE: Record<string, string> = {
  positive: 'bg-emerald-50 text-emerald-700',
  neutral:  'bg-gray-100 text-gray-600',
  negative: 'bg-red-50 text-red-600',
  unknown:  'bg-gray-100 text-gray-400',
};

const STATUS_BADGE: Record<string, string> = {
  scheduled:  'bg-blue-50 text-blue-700',
  completed:  'bg-emerald-50 text-emerald-700',
  cancelled:  'bg-gray-100 text-gray-500',
  'no-show':  'bg-red-50 text-red-600',
};

const SOURCE_BADGE: Record<string, string> = {
  conversation:   'bg-indigo-50 text-indigo-600',
  manual:         'bg-amber-50 text-amber-700',
  'ai-extracted': 'bg-violet-50 text-violet-700',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeSince(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CustomerIntelligence({ clientId }: { clientId: string }) {
  const [memories, setMemories] = useState<CustomerMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [addingFact, setAddingFact] = useState<string | null>(null);
  const [newFact, setNewFact] = useState('');
  const [savingFact, setSavingFact] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/customers/memory?clientId=${clientId}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to load');
      }
      const data = await res.json();
      setMemories(data.memories || []);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load customer memory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const addFact = async (contactId: string) => {
    if (!newFact.trim()) return;
    setSavingFact(true);
    try {
      const res = await fetch(`/api/agency/customers/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, contactId, fact: newFact.trim(), source: 'manual' }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setNewFact('');
      setAddingFact(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add fact');
    } finally {
      setSavingFact(false);
    }
  };

  const filtered = memories.filter(m =>
    !search ||
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search) ||
    m.facts.some(f => f.fact.toLowerCase().includes(search.toLowerCase()))
  );

  // Summary stats
  const total = memories.length;
  const totalFacts = memories.reduce((s, m) => s + m.facts.length, 0);
  const positiveCount = memories.filter(m => m.sentiment === 'positive').length;
  const activeThis30d = memories.filter(m => {
    const d = Date.now() - new Date(m.lastContact).getTime();
    return d < 30 * 86400000;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Brain className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Customer Intelligence</h2>
            <p className="text-xs text-gray-500">What your AI has learned about each customer</p>
          </div>
        </div>
        <button
          onClick={() => { setRefreshing(true); load(); }}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Customers Tracked', value: total, icon: '👥', color: 'text-indigo-600' },
          { label: 'Facts Learned', value: totalFacts, icon: '🧠', color: 'text-violet-600' },
          { label: 'Happy Customers', value: positiveCount, icon: '😊', color: 'text-emerald-600' },
          { label: 'Active (30d)', value: activeThis30d, icon: '📊', color: 'text-blue-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="text-xl mb-1">{stat.icon}</div>
            <div className={cn('text-2xl font-bold', stat.color)}>{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          ⚠️ {error}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {memories.length === 0 && !error && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-7 w-7 text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No customer memory yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            As your AI worker has conversations, it automatically learns and remembers things about
            each customer — preferences, history, sentiment, and more.
          </p>
        </div>
      )}

      {/* ── Search ────────────────────────────────────────────────────────── */}
      {memories.length > 0 && (
        <input
          type="text"
          placeholder="Search customers or facts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      )}

      {/* ── Customer list ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.map(mem => {
          const isOpen = expanded === mem.contactId;
          return (
            <div
              key={mem.contactId}
              className={cn(
                'bg-white rounded-2xl border transition-all',
                isOpen ? 'border-indigo-200 shadow-sm' : 'border-gray-200 hover:border-gray-300'
              )}
            >
              {/* Row header */}
              <button
                onClick={() => setExpanded(isOpen ? null : mem.contactId)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {(mem.name || mem.phone || '?').charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900 truncate">
                        {mem.name || mem.phone || mem.email || mem.contactId.slice(0, 8)}
                      </span>
                      <span className={cn('flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize', SENTIMENT_BADGE[mem.sentiment])}>
                        {SENTIMENT_ICON[mem.sentiment]}
                        {mem.sentiment}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <MessageSquare className="h-3 w-3" />
                        {mem.totalInteractions} conversation{mem.totalInteractions !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Brain className="h-3 w-3" />
                        {mem.facts.length} fact{mem.facts.length !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {timeSince(mem.lastContact)}
                      </span>
                    </div>
                  </div>
                </div>

                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                )}
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="px-4 pb-5 space-y-5 border-t border-gray-100 pt-4">

                  {/* Contact info */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {mem.phone && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-gray-400 mb-0.5">Phone</div>
                        <div className="font-medium text-gray-800">{mem.phone}</div>
                      </div>
                    )}
                    {mem.email && (
                      <div className="bg-gray-50 rounded-xl p-3">
                        <div className="text-gray-400 mb-0.5">Email</div>
                        <div className="font-medium text-gray-800 truncate">{mem.email}</div>
                      </div>
                    )}
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-gray-400 mb-0.5">First Contact</div>
                      <div className="font-medium text-gray-800">{formatDate(mem.firstContact)}</div>
                    </div>
                  </div>

                  {/* Tags */}
                  {mem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {mem.tags.map(tag => (
                        <span key={tag} className="flex items-center gap-1 text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Facts */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">What the AI knows</h4>
                      <button
                        onClick={() => setAddingFact(mem.contactId)}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        <Plus className="h-3 w-3" /> Add fact
                      </button>
                    </div>

                    {addingFact === mem.contactId && (
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={newFact}
                          onChange={e => setNewFact(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addFact(mem.contactId)}
                          placeholder="e.g. Prefers afternoon appointments"
                          autoFocus
                          className="flex-1 px-3 py-2 text-xs border border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => addFact(mem.contactId)}
                          disabled={savingFact || !newFact.trim()}
                          className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {savingFact ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => { setAddingFact(null); setNewFact(''); }} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}

                    {mem.facts.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No facts learned yet. Facts appear automatically after conversations.</p>
                    ) : (
                      <div className="space-y-2">
                        {mem.facts.map((fact, i) => (
                          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50">
                            <div className="mt-0.5 text-indigo-400">
                              <Sparkles className="h-3 w-3" />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-gray-700 leading-relaxed">{fact.fact}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-md capitalize', SOURCE_BADGE[fact.source])}>
                                  {fact.source.replace('-', ' ')}
                                </span>
                                <span className="text-[10px] text-gray-400">{formatDate(fact.date)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Appointments */}
                  {mem.appointments.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Appointment History</h4>
                      <div className="space-y-1.5">
                        {mem.appointments.slice(0, 5).map((appt, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 text-xs">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span className="font-medium text-gray-700">{appt.service}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">{formatDate(appt.date)}</span>
                              <span className={cn('px-1.5 py-0.5 rounded-md font-medium capitalize', STATUS_BADGE[appt.status])}>
                                {appt.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {mem.notes && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
                      <Star className="h-3 w-3 inline mr-1 text-amber-500" />
                      {mem.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {memories.length > 0 && (
        <p className="text-center text-xs text-gray-400 pt-2">
          <Brain className="h-3 w-3 inline mr-1" />
          Memory updates automatically after each conversation
        </p>
      )}
    </div>
  );
}
