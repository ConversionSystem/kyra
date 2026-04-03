'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Mail, DollarSign, BarChart3, Activity, Plus, Search, Upload,
  Trash2, Send, Clock, CheckCircle2, AlertTriangle, Loader2,
  ArrowLeft, X, FileText, ChevronDown, ChevronRight, Edit3, Phone, Tag, Star,
  Calendar, Download, Filter, MessageSquare, Target,
  TrendingUp, Zap, CheckSquare, Square, Briefcase, Eye,
  MoreHorizontal, RefreshCw, ChevronLeft, Sparkles, Flame, Bot, Bell,
  Sliders, GitMerge, Layers, PhoneCall, GitBranch,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  subject: string;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  html_body: string;
  text_body: string | null;
  template_id: string | null;
  status: string;
  segment_tags: string[];
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_complained: number;
  total_unsubscribed: number;
  created_at: string;
}

interface Contact {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  title: string | null;
  company_name?: string | null;
  tags: string[];
  source: string;
  stage: string;
  score: number;
  score_label: string;
  status?: string;
  ai_summary: string | null;
  ai_next_action: string | null;
  last_contacted_at: string | null;
  last_activity_at: string | null;
  crm_companies?: { id: string; name: string; website: string | null; industry: string | null } | null;
  created_at: string;
  updated_at: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  category: string;
  is_system: boolean;
  created_at: string;
}

interface Deal {
  id: string;
  agency_id: string;
  contact_id: string | null;
  name: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  close_date: string | null;
  notes: string | null;
  contact?: { first_name: string | null; last_name: string | null } | null;
  created_at: string;
  updated_at: string;
}

interface ActivityItem {
  id: string;
  type: string;
  subject: string | null;
  body: string | null;
  actor: string;
  actor_name: string | null;
  contact_id?: string | null;
  contact_name?: string;
  company_name?: string;
  needs_attention?: boolean;
  direction?: string | null;
  created_at: string;
}

interface CrmTask {
  id: string;
  contact_id: string | null;
  title: string;
  description: string | null;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'pending' | 'completed';
  due_date: string | null;
  completed_at: string | null;
  contact?: { first_name: string | null; last_name: string | null } | null;
  created_at: string;
  updated_at: string;
}

interface FeedResponse {
  attention_items: ActivityItem[];
  ai_handled_today: ActivityItem[];
  recent_activities: ActivityItem[];
  stats: {
    total_contacts: number;
    pipeline_value: number;
    hot_leads: number;
    ai_handled_count: number;
  };
}

interface AnalyticsData {
  total_contacts: number;
  hot_leads: number;
  pipeline_value: number;
  deals_won: number;
  tasks_pending: number;
  email_open_rate: number;
  pipeline_funnel: { stage: string; count: number; value: number }[];
  source_breakdown: { source: string; count: number }[];
  recent_activities: ActivityItem[];
}

type Section = 'ai' | 'contacts' | 'deals' | 'tasks' | 'analytics' | 'activity' | 'segments' | 'scoring' | 'merge';

// CommandFeedItem for AI Insights section
interface CommandFeedItem {
  id: string;
  attention_type: string;
  subject: string | null;
  body: string | null;
  created_at: string;
  contact_id: string | null;
  metadata: Record<string, unknown> | null;
  contact?: { first_name: string | null; last_name: string | null; company_name?: string | null } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500',
  'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500',
  'bg-cyan-500', 'bg-blue-500',
];

function getAvatarColor(firstName?: string | null, lastName?: string | null): string {
  const str = `${firstName || ''}${lastName || ''}`;
  if (!str) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(firstName?: string | null, lastName?: string | null): string {
  const f = firstName?.charAt(0)?.toUpperCase() || '';
  const l = lastName?.charAt(0)?.toUpperCase() || '';
  return f + l || '?';
}

function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function contactName(c: { first_name?: string | null; last_name?: string | null }): string {
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed';
}

function stageBadge(stage: string) {
  const map: Record<string, string> = {
    lead: 'bg-blue-50 text-blue-700', contact: 'bg-indigo-50 text-indigo-700',
    customer: 'bg-emerald-50 text-emerald-700', churned: 'bg-gray-100 text-gray-600',
    prospect: 'bg-blue-50 text-blue-700', qualified: 'bg-indigo-50 text-indigo-700',
    proposal: 'bg-purple-50 text-purple-700', negotiation: 'bg-amber-50 text-amber-700',
    won: 'bg-emerald-50 text-emerald-700', lost: 'bg-red-50 text-red-700',
  };
  return map[stage] || 'bg-gray-100 text-gray-600';
}

function scoreBadge(label: string) {
  const map: Record<string, string> = {
    hot: 'bg-red-50 text-red-700', warm: 'bg-orange-50 text-orange-700',
    cold: 'bg-blue-50 text-blue-700', new: 'bg-gray-100 text-gray-600',
  };
  return map[label] || 'bg-gray-100 text-gray-600';
}

function AIScoreButton({ clientId, onComplete }: { clientId: string; onComplete: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ scored: number; errors: number } | null>(null);

  const handleScore = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/ai-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'batch' }),
      });
      if (res.ok) {
        const data = await res.json() as { scored: number; errors: number };
        setResult(data);
        onComplete();
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleScore}
        disabled={loading}
        className="flex items-center gap-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-lg h-8 px-2.5 text-xs font-medium hover:bg-indigo-100 disabled:opacity-50 transition-colors"
        title="AI Score All Leads"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        AI Score
      </button>
      {result && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-3 min-w-[180px]">
          <p className="text-xs text-gray-700">✅ Scored {result.scored} leads</p>
          {result.errors > 0 && <p className="text-xs text-red-500 mt-0.5">⚠️ {result.errors} errors</p>}
          <button onClick={() => setResult(null)} className="text-xs text-indigo-600 mt-1 hover:underline">Dismiss</button>
        </div>
      )}
    </div>
  );
}

function priorityBadge(p: string) {
  const map: Record<string, string> = {
    urgent: 'bg-red-50 text-red-700', high: 'bg-orange-50 text-orange-700',
    medium: 'bg-blue-50 text-blue-700', low: 'bg-gray-50 text-gray-600',
  };
  return map[p] || 'bg-gray-100 text-gray-600';
}

function activityIcon(type: string) {
  switch (type) {
    case 'note': return <FileText className="w-4 h-4 text-gray-500" />;
    case 'email': return <Mail className="w-4 h-4 text-blue-500" />;
    case 'call': return <Phone className="w-4 h-4 text-green-500" />;
    case 'sms': return <MessageSquare className="w-4 h-4 text-purple-500" />;
    case 'meeting': return <Calendar className="w-4 h-4 text-indigo-500" />;
    case 'ai': case 'ai_auto': return <Zap className="w-4 h-4 text-amber-500" />;
    case 'deal': return <DollarSign className="w-4 h-4 text-emerald-500" />;
    case 'task': return <CheckSquare className="w-4 h-4 text-indigo-500" />;
    default: return <Activity className="w-4 h-4 text-gray-400" />;
  }
}

const DEAL_STAGES = ['prospect', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const CONTACT_STAGES = ['lead', 'contact', 'customer', 'churned'];
const PRIORITIES: CrmTask['priority'][] = ['urgent', 'high', 'medium', 'low'];

// ── Modal Wrapper ──────────────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between p-5 border-b border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
const btnPrimary = 'bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50';
const btnSecondary = 'border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. CONTACTS SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ContactsSection({ client, clientId }: { client: AgencyClient; clientId: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [tagFilter, setTagFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const [importing, setImporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const limit = 50;

  const getDateRange = useCallback((): { startDate?: string; endDate?: string } => {
    if (dateFilter === 'all') return {};
    const now = new Date();
    const endDate = now.toISOString();
    const d = new Date(now);
    if (dateFilter === 'today') d.setHours(0, 0, 0, 0);
    else if (dateFilter === '7d') d.setDate(d.getDate() - 7);
    else if (dateFilter === '30d') d.setDate(d.getDate() - 30);
    else if (dateFilter === '90d') d.setDate(d.getDate() - 90);
    return { startDate: d.toISOString(), endDate };
  }, [dateFilter]);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, sort: sortBy, order: sortOrder, page: String(page), limit: String(limit) });
      if (stageFilter !== 'all') params.set('stage', stageFilter);
      if (scoreFilter !== 'all') params.set('score_label', scoreFilter);
      if (tagFilter !== 'all') params.set('tag', tagFilter);
      const { startDate, endDate } = getDateRange();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('clientId', clientId);
      const res = await fetch(`/api/agency/crm/contacts?${params}`);
      if (!res.ok) throw new Error('Failed to load contacts');
      const data = await res.json();
      const loaded: Contact[] = Array.isArray(data) ? data : data.contacts || [];
      setContacts(loaded);
      setTotalCount(data.total ?? (Array.isArray(data) ? data.length : 0));
      // Collect unique tags from loaded contacts for the tag filter
      const tags = new Set<string>();
      loaded.forEach(c => c.tags?.forEach(t => tags.add(t)));
      setAllTags(prev => {
        const merged = new Set([...prev, ...tags]);
        return Array.from(merged).sort();
      });
    } catch { setContacts([]); } finally { setLoading(false); }
  }, [clientId, search, stageFilter, scoreFilter, tagFilter, sortBy, sortOrder, page, getDateRange]);

  useEffect(() => { loadContacts(); }, [loadContacts]);
  useEffect(() => { setPage(1); }, [search, stageFilter, scoreFilter, tagFilter, dateFilter, sortBy, sortOrder]);

  const handleExport = async () => {
    try {
      const res = await fetch('/api/agency/crm/export');
      if (!res.ok) { setActionError('Export failed. Please try again.'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'crm-contacts.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { setActionError('Export failed. Please try again.'); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      // Parse CSV client-side then send as JSON (server expects { source: 'csv', rows: [...] })
      const text = await file.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) { setActionError('CSV must have a header row and at least one data row.'); return; }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']));
      });
      const res = await fetch('/api/agency/crm/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'csv', rows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setActionError((data as { error?: string }).error || 'Import failed.'); return; }
      setActionError(null);
      loadContacts();
    } catch {
      setActionError('Import failed. Please check your CSV format.');
    } finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleBulk = async () => {
    if (selected.size === 0 || !bulkAction) return;
    if (bulkAction === 'delete' && !window.confirm(`Delete ${selected.size} contacts? This cannot be undone.`)) return;
    try {
      const res = await fetch('/api/agency/crm/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Server expects 'contact_ids' not 'ids'
        body: JSON.stringify({ action: bulkAction, contact_ids: Array.from(selected), payload: bulkValue ? { tag: bulkValue, stage: bulkValue } : undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError((data as { error?: string }).error || 'Bulk action failed.');
        return;
      }
    } catch { setActionError('Bulk action failed. Please try again.'); }
    setSelected(new Set());
    setBulkAction('');
    setBulkValue('');
    loadContacts();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    if (selected.size === contacts.length) setSelected(new Set());
    else setSelected(new Set(contacts.map(c => c.id)));
  };

  if (selectedContact) {
    return (
      <ContactDetailPanel
        contact={selectedContact}
        onBack={() => { setSelectedContact(null); loadContacts(); }}
        client={client}
      />
    );
  }

  const totalPages = Math.ceil(totalCount / limit) || 1;

  const compactSelect = 'border border-gray-200 rounded-lg px-2 h-8 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';

  return (
    <div className="space-y-3">
      {/* Row 1: Stage tabs + Add Contact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {['all', ...CONTACT_STAGES].map(s => (
            <button key={s} onClick={() => setStageFilter(s)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${stageFilter === s ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}s
            </button>
          ))}
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg px-3 h-8 text-xs font-medium transition-colors flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />Add Contact
        </button>
      </div>

      {/* Row 2: Search + filters + sort + actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative min-w-[180px] max-w-[280px] flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input className="w-full border border-gray-200 rounded-lg pl-8 pr-2 h-8 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={compactSelect} value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
          <option value="all">All Tags</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={compactSelect} value={scoreFilter} onChange={e => setScoreFilter(e.target.value)}>
          <option value="all">All Scores</option>
          <option value="hot">Hot</option><option value="warm">Warm</option>
          <option value="cold">Cold</option><option value="new">New</option>
        </select>
        <select className={compactSelect} value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
        <select className={compactSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="name">Name</option><option value="score">Score</option>
          <option value="last_activity">Activity</option><option value="created">Created</option>
        </select>
        <button onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')} className="border border-gray-200 rounded-lg h-8 w-8 flex items-center justify-center text-xs text-gray-600 hover:bg-gray-50">
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
        <button onClick={handleExport} className="border border-gray-200 rounded-lg h-8 w-8 flex items-center justify-center text-gray-600 hover:bg-gray-50" title="Export CSV">
          <Download className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="border border-gray-200 rounded-lg h-8 w-8 flex items-center justify-center text-gray-600 hover:bg-gray-50" disabled={importing} title="Import CSV">
          {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        <AIScoreButton clientId={clientId} onComplete={() => loadContacts()} />
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 flex items-center justify-between">
          {actionError}
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700 ml-2">&times;</button>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-indigo-50 rounded-lg px-4 py-2 text-sm">
          <span className="text-indigo-700 font-medium">{selected.size} selected</span>
          <select className={inputClass + ' w-auto'} value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
            <option value="">Action...</option>
            <option value="delete">Delete Selected</option>
            <option value="stage">Change Stage</option>
            <option value="tag">Add Tag</option>
          </select>
          {bulkAction === 'stage' && (
            <select className={inputClass + ' w-auto'} value={bulkValue} onChange={e => setBulkValue(e.target.value)}>
              <option value="">Select stage...</option>
              {CONTACT_STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          )}
          {bulkAction === 'tag' && (
            <input className={inputClass + ' w-40'} placeholder="Tag name..." value={bulkValue} onChange={e => setBulkValue(e.target.value)} />
          )}
          <button onClick={handleBulk} className={btnPrimary} disabled={!bulkAction}>Apply</button>
          <button onClick={() => { setSelected(new Set()); setBulkAction(''); }} className="text-gray-500 hover:text-gray-700 ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Contact list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Users className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">No contacts found</p>
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className="grid grid-cols-[32px_1fr_1fr_100px_80px_28px_90px_80px] gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div><button onClick={toggleAll} className="text-gray-400 hover:text-gray-600">
                {selected.size === contacts.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              </button></div>
              <div>Contact</div><div>Email / Phone</div><div>Company</div><div>Stage</div><div></div><div>Tags</div><div>Activity</div>
            </div>
            {contacts.map(c => {
              const scoreDot: Record<string, string> = { hot: 'bg-green-500', warm: 'bg-yellow-400', cold: 'bg-gray-400', new: 'bg-blue-400' };
              const scoreTitle: Record<string, string> = { hot: 'Hot', warm: 'Warm', cold: 'Cold', new: 'New' };
              return (
                <div key={c.id}
                  className="grid grid-cols-[32px_1fr_1fr_100px_80px_28px_90px_80px] gap-1.5 px-3 py-2 border-b border-gray-50 hover:bg-gray-50 cursor-pointer items-center text-sm"
                  onClick={() => setSelectedContact(c)}>
                  <div onClick={e => { e.stopPropagation(); toggleSelect(c.id); }}>
                    {selected.has(c.id) ? <CheckSquare className="w-3.5 h-3.5 text-indigo-600" /> : <Square className="w-3.5 h-3.5 text-gray-300" />}
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0 ${getAvatarColor(c.first_name, c.last_name)}`}>
                      {getInitials(c.first_name, c.last_name)}
                    </div>
                    <div className="min-w-0">
                      <button className="font-medium text-gray-900 truncate hover:text-indigo-600 text-left block max-w-full" onClick={e => { e.stopPropagation(); setSelectedContact(c); }}>{contactName(c)}</button>
                      {c.title && <div className="text-[11px] text-gray-500 truncate">{c.title}</div>}
                    </div>
                  </div>
                  <div className="min-w-0">
                    {c.email && <div className="text-xs text-gray-700 truncate">{c.email}</div>}
                    {c.phone && <div className="text-[11px] text-gray-500">{c.phone}</div>}
                  </div>
                  <div className="text-gray-600 truncate text-xs">{c.crm_companies?.name || c.company_name || '—'}</div>
                  <div><span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${stageBadge(c.stage)}`}>{c.stage}</span></div>
                  <div className="flex items-center justify-center gap-1" title={`${scoreTitle[c.score_label] || 'New'} (${c.score || 0})`}>
                    <span className={`w-2.5 h-2.5 rounded-full inline-block ${scoreDot[c.score_label] || 'bg-gray-300'}`} />
                    {c.score > 0 && <span className="text-[10px] text-gray-500">{c.score}</span>}
                  </div>
                  <div className="flex gap-0.5 flex-wrap">
                    {c.tags.slice(0, 2).map(t => (
                      <span key={t} className="bg-gray-100 text-gray-600 px-1 py-0.5 rounded text-[10px] leading-tight">{t}</span>
                    ))}
                    {c.tags.length > 2 && <span className="text-[10px] text-gray-400">+{c.tags.length - 2}</span>}
                  </div>
                  <div className="text-[11px] text-gray-500">{c.last_activity_at ? timeAgo(c.last_activity_at) : '—'}</div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{totalCount} contacts total</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className={btnSecondary + ' px-2 py-1 disabled:opacity-40'}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className={btnSecondary + ' px-2 py-1 disabled:opacity-40'}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAdd && <AddContactModal clientId={clientId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadContacts(); }} />}
    </div>
  );
}

// ── Add Contact Modal ──────────────────────────────────────────────────────────

function AddContactModal({ clientId, onClose, onSaved }: { clientId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', title: '', company_name: '', stage: 'lead', tags: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.first_name && !form.email) return;
    setSaving(true);
    try {
      const body = { ...form, clientId, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [] };
      const res = await fetch('/api/agency/crm/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Add Contact" onClose={onClose} />
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name"><input className={inputClass} value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} /></FormField>
          <FormField label="Last Name"><input className={inputClass} value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} /></FormField>
        </div>
        <FormField label="Email"><input className={inputClass} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></FormField>
        <FormField label="Phone"><input className={inputClass} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></FormField>
        <FormField label="Title"><input className={inputClass} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></FormField>
        <FormField label="Company"><input className={inputClass} value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></FormField>
        <FormField label="Stage">
          <select className={inputClass} value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
            {CONTACT_STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </FormField>
        <FormField label="Tags (comma separated)"><input className={inputClass} value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="vip, enterprise" /></FormField>
      </div>
      <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
        <button onClick={onClose} className={btnSecondary}>Cancel</button>
        <button onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Contact'}
        </button>
      </div>
    </Modal>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. CONTACT DETAIL PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ContactDetailPanel({ contact: initial, onBack, client }: { contact: Contact; onBack: () => void; client: AgencyClient }) {
  const [contact, setContact] = useState<Contact>(initial);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', email: '', phone: '', title: '', stage: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [subTab, setSubTab] = useState<'timeline' | 'tasks' | 'deals'>('timeline');
  const [showSendEmail, setShowSendEmail] = useState(false);
  const [showSendSms, setShowSendSms] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showLogCall, setShowLogCall] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [activityFilter, setActivityFilter] = useState('all');
  const [newTag, setNewTag] = useState('');
  const [panelError, setPanelError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/crm/contacts/${contact.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.contact) setContact(data.contact);
        if (data.activities) setActivities(data.activities);
        if (data.deals) setDeals(data.deals);
      }
    } catch (err) { console.error('[crm-tab]', err); }
  }, [contact.id]);

  const loadActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const params = new URLSearchParams({ contact_id: contact.id, limit: '50' });
      if (activityFilter !== 'all') params.set('type', activityFilter);
      const res = await fetch(`/api/agency/crm/activities?${params}`);
      if (res.ok) { const data = await res.json(); setActivities(Array.isArray(data) ? data : data.activities || []); }
    } catch (err) { console.error('[crm-tab]', err); } finally { setLoadingActivities(false); }
  }, [contact.id, activityFilter]);

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch(`/api/agency/crm/tasks?contact_id=${contact.id}`);
      if (res.ok) { const data = await res.json(); setTasks(Array.isArray(data) ? data : data.tasks || []); }
    } catch (err) { console.error('[crm-tab]', err); } finally { setLoadingTasks(false); }
  }, [contact.id]);

  const loadDeals = useCallback(async () => {
    setLoadingDeals(true);
    try {
      const res = await fetch(`/api/agency/crm/deals?contact_id=${contact.id}`);
      if (res.ok) { const data = await res.json(); setDeals(Array.isArray(data) ? data : data.deals || []); }
    } catch (err) { console.error('[crm-tab]', err); } finally { setLoadingDeals(false); }
  }, [contact.id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);
  useEffect(() => { loadActivities(); }, [loadActivities]);
  useEffect(() => { loadTasks(); }, [loadTasks]);
  useEffect(() => { loadDeals(); }, [loadDeals]);

  const startEdit = () => {
    setEditForm({
      first_name: contact.first_name || '', last_name: contact.last_name || '',
      email: contact.email || '', phone: contact.phone || '', title: contact.title || '',
      stage: contact.stage, tags: contact.tags.join(', '),
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const body = { ...editForm, tags: editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [] };
      const res = await fetch(`/api/agency/crm/contacts/${contact.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) { const data = await res.json(); setContact(data.contact || { ...contact, ...body }); setEditing(false); }
    } finally { setSaving(false); }
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    const tags = [...contact.tags, newTag.trim()];
    const res = await fetch(`/api/agency/crm/contacts/${contact.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags }) });
    if (res.ok) { setContact(c => ({ ...c, tags })); setNewTag(''); }
  };

  const removeTag = async (tag: string) => {
    const tags = contact.tags.filter(t => t !== tag);
    const res = await fetch(`/api/agency/crm/contacts/${contact.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tags }) });
    if (res.ok) setContact(c => ({ ...c, tags }));
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${contactName(contact)}? This cannot be undone.`)) return;
    const res = await fetch(`/api/agency/crm/contacts/${contact.id}`, { method: 'DELETE' });
    if (!res.ok) { setPanelError('Failed to delete contact. Please try again.'); return; }
    onBack();
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to contacts
      </button>

      {panelError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 flex items-center justify-between">
          {panelError}
          <button onClick={() => setPanelError(null)} className="text-red-500 hover:text-red-700 ml-2">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-semibold flex-shrink-0 ${getAvatarColor(contact.first_name, contact.last_name)}`}>
            {getInitials(contact.first_name, contact.last_name)}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input className={inputClass} placeholder="First name" value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
                  <input className={inputClass} placeholder="Last name" value={editForm.last_name} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
                </div>
                <input className={inputClass} placeholder="Email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                <input className={inputClass} placeholder="Phone" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                <input className={inputClass} placeholder="Title" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
                <select className={inputClass} value={editForm.stage} onChange={e => setEditForm(f => ({ ...f, stage: e.target.value }))}>
                  {CONTACT_STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                <input className={inputClass} placeholder="Tags (comma separated)" value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} />
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={saving} className={btnPrimary}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</button>
                  <button onClick={() => setEditing(false)} className={btnSecondary}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-gray-900">{contactName(contact)}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageBadge(contact.stage)}`}>{contact.stage}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${scoreBadge(contact.score_label)}`}>{contact.score_label}</span>
                </div>
                {contact.title && <p className="text-sm text-gray-500 mt-0.5">{contact.title}{contact.crm_companies?.name ? ` at ${contact.crm_companies.name}` : ''}</p>}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  {contact.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{contact.email}</span>}
                  {contact.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{contact.phone}</span>}
                </div>
              </>
            )}
          </div>
          {!editing && (
            <button onClick={startEdit} className={btnSecondary + ' flex items-center gap-1'}>
              <Edit3 className="w-4 h-4" /> Edit
            </button>
          )}
        </div>

        {/* Quick actions */}
        {!editing && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <button onClick={() => setShowSendEmail(true)} className={btnSecondary + ' text-xs px-3 py-1.5'}><Mail className="w-3.5 h-3.5 mr-1 inline" />Send Email</button>
            <button onClick={() => setShowSendSms(true)} className={btnSecondary + ' text-xs px-3 py-1.5'}><MessageSquare className="w-3.5 h-3.5 mr-1 inline" />Send SMS</button>
            <button onClick={() => setShowLogCall(true)} className={btnSecondary + ' text-xs px-3 py-1.5'}><PhoneCall className="w-3.5 h-3.5 mr-1 inline" />Log Call</button>
            <button onClick={() => setShowAddNote(true)} className={btnSecondary + ' text-xs px-3 py-1.5'}><FileText className="w-3.5 h-3.5 mr-1 inline" />Add Note</button>
            <button onClick={() => setShowAddTask(true)} className={btnSecondary + ' text-xs px-3 py-1.5'}><CheckSquare className="w-3.5 h-3.5 mr-1 inline" />Add Task</button>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {contact.tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs">
              {t}
              <button onClick={() => removeTag(t)} className="text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
            </span>
          ))}
          <div className="flex items-center gap-1">
            <input className="border border-gray-200 rounded-md px-2 py-1 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Add tag..." value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} />
            <button onClick={addTag} className="text-indigo-600 hover:text-indigo-700"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      {(contact.ai_summary || contact.ai_next_action) && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <h3 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1"><Zap className="w-4 h-4" />AI Insights</h3>
          {contact.ai_summary && <p className="text-sm text-amber-700 mb-1">{contact.ai_summary}</p>}
          {contact.ai_next_action && <p className="text-sm text-amber-600"><strong>Next:</strong> {contact.ai_next_action}</p>}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 w-fit">
        {(['timeline', 'tasks', 'deals'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${subTab === t ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {subTab === 'timeline' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-1 p-3 border-b border-gray-100 flex-wrap">
            {['all', 'note', 'email', 'call', 'sms', 'meeting', 'ai'].map(f => (
              <button key={f} onClick={() => setActivityFilter(f)}
                className={`px-2 py-1 text-xs rounded-md ${activityFilter === f ? 'bg-gray-200 text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          {loadingActivities ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400"><Activity className="w-8 h-8 mb-2 opacity-50" /><p className="text-sm">No activities yet</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activities.map(a => (
                <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="mt-0.5">{activityIcon(a.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{a.subject || a.type}</span>
                      <span className="text-xs text-gray-400">{timeAgo(a.created_at)}</span>
                    </div>
                    {a.body && <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{a.body}</p>}
                    {a.actor_name && <p className="text-xs text-gray-400 mt-0.5">by {a.actor_name}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks sub-tab */}
      {subTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-700">Tasks</h3>
            <button onClick={() => setShowAddTask(true)} className={btnPrimary + ' text-xs px-2 py-1'}><Plus className="w-3.5 h-3.5 mr-1 inline" />Add</button>
          </div>
          {loadingTasks ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400"><CheckSquare className="w-8 h-8 mb-2 opacity-50" /><p className="text-sm">No tasks</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {tasks.map(t => (
                <ContactTaskRow key={t.id} task={t} onUpdate={loadTasks} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deals sub-tab */}
      {subTab === 'deals' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-700">Deals</h3>
          </div>
          {loadingDeals ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : deals.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-gray-400"><DollarSign className="w-8 h-8 mb-2 opacity-50" /><p className="text-sm">No deals</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {deals.map(d => (
                <div key={d.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{d.name}</div>
                    {d.close_date && <div className="text-xs text-gray-500">Close: {new Date(d.close_date).toLocaleDateString()}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(d.value, d.currency)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageBadge(d.stage)}`}>{d.stage}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete */}
      <div className="flex justify-end">
        <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700">Delete this contact</button>
      </div>

      {/* Modals */}
      {showSendEmail && <SendMessageModal channel="email" contactId={contact.id} contactName={contactName(contact)} onClose={() => setShowSendEmail(false)} onSent={loadActivities} />}
      {showSendSms && <SendMessageModal channel="sms" contactId={contact.id} contactName={contactName(contact)} onClose={() => setShowSendSms(false)} onSent={loadActivities} />}
      {showLogCall && <LogCallModal contactId={contact.id} onClose={() => setShowLogCall(false)} onSaved={loadActivities} />}
      {showAddNote && <AddNoteModal contactId={contact.id} onClose={() => setShowAddNote(false)} onSaved={loadActivities} />}
      {showAddTask && <AddTaskModal contactId={contact.id} onClose={() => setShowAddTask(false)} onSaved={loadTasks} />}
    </div>
  );
}

// ── Contact Task Row ───────────────────────────────────────────────────────────

function ContactTaskRow({ task, onUpdate }: { task: CrmTask; onUpdate: () => void }) {
  const toggleComplete = async () => {
    const status = task.status === 'completed' ? 'pending' : 'completed';
    await fetch(`/api/agency/crm/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    onUpdate();
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    await fetch(`/api/agency/crm/tasks/${task.id}`, { method: 'DELETE' });
    onUpdate();
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button onClick={toggleComplete} className="flex-shrink-0">
        {task.status === 'completed' ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4 text-gray-300" />}
      </button>
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{task.title}</span>
      </div>
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge(task.priority)}`}>{task.priority}</span>
      {task.due_date && <span className="text-xs text-gray-500">{new Date(task.due_date).toLocaleDateString()}</span>}
      <button onClick={handleDelete} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// ── Send Message Modal ─────────────────────────────────────────────────────────

function SendMessageModal({ channel, contactId, contactName: cName, onClose, onSent }: {
  channel: 'email' | 'sms'; contactId: string; contactName: string; onClose: () => void; onSent: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const body: Record<string, string> = { channel, message };
      if (channel === 'email' && subject) body.subject = subject;
      const res = await fetch(`/api/agency/crm/contacts/${contactId}/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSendError((data as { error?: string }).error || 'Send failed. Check GHL integration.');
        return;
      }
      onSent();
      onClose();
    } catch { setSendError('Network error. Please try again.'); }
    finally { setSending(false); }
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader title={`Send ${channel === 'email' ? 'Email' : 'SMS'} to ${cName}`} onClose={onClose} />
      <div className="p-5 space-y-4">
        {channel === 'email' && (
          <FormField label="Subject"><input className={inputClass} value={subject} onChange={e => setSubject(e.target.value)} /></FormField>
        )}
        <FormField label="Message"><textarea className={inputClass + ' h-32 resize-none'} value={message} onChange={e => setMessage(e.target.value)} /></FormField>
        {sendError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{sendError}</p>}
      </div>
      <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
        <button onClick={onClose} className={btnSecondary}>Cancel</button>
        <button onClick={handleSend} disabled={sending || !message.trim()} className={btnPrimary}>
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1 inline" />Send</>}
        </button>
      </div>
    </Modal>
  );
}

// ── Add Note Modal ─────────────────────────────────────────────────────────────

function AddNoteModal({ contactId, onClose, onSaved }: { contactId: string; onClose: () => void; onSaved: () => void }) {
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!body.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/agency/crm/activities', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId, type: 'note', subject: 'Note', body, actor: 'human' }),
      });
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Add Note" onClose={onClose} />
      <div className="p-5">
        <textarea className={inputClass + ' h-32 resize-none'} placeholder="Write a note..." value={body} onChange={e => setBody(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
        <button onClick={onClose} className={btnSecondary}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !body.trim()} className={btnPrimary}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Note'}
        </button>
      </div>
    </Modal>
  );
}

// ── Log Call Modal (Sprint 4) ──────────────────────────────────────────────────

function LogCallModal({ contactId, onClose, onSaved }: { contactId: string; onClose: () => void; onSaved: () => void }) {
  const [duration, setDuration] = useState('');
  const [outcome, setOutcome] = useState('connected');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/agency/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
          type: 'call',
          actor: 'human',
          direction: 'outbound',
          subject: `Call — ${outcome}${duration ? ` (${duration} min)` : ''}`,
          body: notes || null,
          metadata: { duration_minutes: duration ? parseInt(duration) : null, outcome },
        }),
      });
      onSaved();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Log Call" onClose={onClose} />
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Outcome">
            <select className={inputClass} value={outcome} onChange={e => setOutcome(e.target.value)}>
              <option value="connected">Connected</option>
              <option value="voicemail">Left Voicemail</option>
              <option value="no_answer">No Answer</option>
              <option value="busy">Busy</option>
              <option value="wrong_number">Wrong Number</option>
            </select>
          </FormField>
          <FormField label="Duration (minutes)">
            <input
              className={inputClass}
              type="number"
              placeholder="e.g. 5"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              min="0"
            />
          </FormField>
        </div>
        <FormField label="Notes (optional)">
          <textarea
            className={inputClass + ' h-24 resize-none'}
            placeholder="What was discussed?"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </FormField>
      </div>
      <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
        <button onClick={onClose} className={btnSecondary}>Cancel</button>
        <button onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><PhoneCall className="w-4 h-4 inline mr-1" />Log Call</>}
        </button>
      </div>
    </Modal>
  );
}

// ── Add Task Modal ─────────────────────────────────────────────────────────────

function AddTaskModal({ contactId, onClose, onSaved }: { contactId?: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' as CrmTask['priority'], due_date: '', contact_id: contactId || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, contact_id: form.contact_id || null, due_date: form.due_date || null };
      await fetch('/api/agency/crm/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Add Task" onClose={onClose} />
      <div className="p-5 space-y-4">
        <FormField label="Title"><input className={inputClass} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></FormField>
        <FormField label="Description"><textarea className={inputClass + ' h-20 resize-none'} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Priority">
            <select className={inputClass} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as CrmTask['priority'] }))}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </FormField>
          <FormField label="Due Date"><input className={inputClass} type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></FormField>
        </div>
      </div>
      <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
        <button onClick={onClose} className={btnSecondary}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !form.title.trim()} className={btnPrimary}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Task'}
        </button>
      </div>
    </Modal>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. DEALS SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DealsSection({ clientId }: { clientId?: string }) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('board');
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: 'value', order: 'desc' });
      if (clientId) params.set('clientId', clientId);
      const res = await fetch(`/api/agency/crm/deals?${params}`);
      if (res.ok) { const data = await res.json(); setDeals(Array.isArray(data) ? data : data.deals || []); }
    } catch (err) { console.error('[crm-tab]', err); } finally { setLoading(false); }
  }, [clientId]);

  const loadContacts = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/crm/contacts?limit=200');
      if (res.ok) { const data = await res.json(); setContacts(Array.isArray(data) ? data : data.contacts || []); }
    } catch (err) { console.error('[crm-tab]', err); }
  }, []);

  useEffect(() => { loadDeals(); loadContacts(); }, [loadDeals, loadContacts]);

  const totalValue = deals.reduce((s, d) => s + d.value, 0);
  const wonValue = deals.filter(d => d.stage === 'won').reduce((s, d) => s + d.value, 0);
  const avgSize = deals.length > 0 ? totalValue / deals.length : 0;

  const dealsByStage = (stage: string) => deals.filter(d => d.stage === stage);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Deals', value: deals.length, icon: Briefcase },
          { label: 'Pipeline Value', value: formatCurrency(totalValue), icon: TrendingUp },
          { label: 'Won Value', value: formatCurrency(wonValue), icon: DollarSign },
          { label: 'Avg Deal Size', value: formatCurrency(avgSize), icon: Target },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><s.icon className="w-4 h-4" />{s.label}</div>
            <div className="text-lg font-semibold text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5" />
          Stage automations in <button className="text-indigo-600 hover:underline">Tools → Scoring</button>
        </p>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 font-medium transition-colors ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>List View</button>
            <button onClick={() => setViewMode('board')} className={`px-3 py-1.5 font-medium transition-colors ${viewMode === 'board' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Board View</button>
          </div>
          <button onClick={() => setShowAdd(true)} className={btnPrimary}><Plus className="w-4 h-4 mr-1 inline" />Add Deal</button>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {deals.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">No deals</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Deal</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Stage</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Value</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Close Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deals.map(d => (
                  <tr key={d.id} onClick={() => setEditDeal(d)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                    <td className="px-4 py-3 text-gray-500">{d.contact ? contactName(d.contact) : '—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${stageBadge(d.stage)}`}>{d.stage.charAt(0).toUpperCase() + d.stage.slice(1)}</span></td>
                    <td className="px-4 py-3 text-right font-semibold text-indigo-600">{formatCurrency(d.value, d.currency)}</td>
                    <td className="px-4 py-3 text-gray-400">{d.close_date ? new Date(d.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Board View — Kanban with drag and drop */}
      {viewMode === 'board' && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {DEAL_STAGES.map(stage => {
            const stageDeals = dealsByStage(stage);
            return (
              <div key={stage} className="min-w-[220px] flex-shrink-0"
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (!draggingId) return;
                  const deal = deals.find(d => d.id === draggingId);
                  if (!deal || deal.stage === stage) { setDraggingId(null); return; }
                  setDeals(prev => prev.map(d => d.id === draggingId ? { ...d, stage } : d));
                  const id = draggingId;
                  setDraggingId(null);
                  fetch(`/api/agency/crm/deals/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stage }),
                  });
                }}
              >
                <div className="bg-gray-50 rounded-t-lg px-3 py-2 border border-gray-200 border-b-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stageBadge(stage)}`}>{stage.charAt(0).toUpperCase() + stage.slice(1)}</span>
                    <span className="text-xs text-gray-400">{stageDeals.length}</span>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-b-lg min-h-[200px] space-y-2 p-2">
                  {stageDeals.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-gray-300 text-xs">No deals</div>
                  ) : (
                    stageDeals.map(d => (
                      <div key={d.id}
                        draggable
                        onDragStart={() => setDraggingId(d.id)}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={() => setEditDeal(d)}
                        className={`bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-gray-300 transition-colors shadow-sm ${draggingId === d.id ? 'opacity-50 border-indigo-300' : 'border-gray-100'}`}
                      >
                        <div className="text-sm font-medium text-gray-900 mb-1">{d.name}</div>
                        {d.contact && <div className="text-xs text-gray-500 mb-1">{contactName(d.contact)}</div>}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-indigo-600">{formatCurrency(d.value, d.currency)}</span>
                          {d.close_date && <span className="text-xs text-gray-400">{new Date(d.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Deal Modal */}
      {(showAdd || editDeal) && (
        <DealModal
          deal={editDeal}
          contacts={contacts}
          onClose={() => { setShowAdd(false); setEditDeal(null); }}
          onSaved={() => { setShowAdd(false); setEditDeal(null); loadDeals(); }}
        />
      )}
    </div>
  );
}

// ── Deal Modal ─────────────────────────────────────────────────────────────────

function DealModal({ deal, contacts, onClose, onSaved }: { deal: Deal | null; contacts: Contact[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: deal?.name || '', value: deal?.value?.toString() || '', currency: deal?.currency || 'USD',
    stage: deal?.stage || 'prospect', contact_id: deal?.contact_id || '', close_date: deal?.close_date?.split('T')[0] || '', notes: deal?.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = { ...form, value: parseFloat(form.value) || 0, contact_id: form.contact_id || null, close_date: form.close_date || null };
      const url = deal ? `/api/agency/crm/deals/${deal.id}` : '/api/agency/crm/deals';
      const method = deal ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) onSaved();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deal || !window.confirm('Delete this deal?')) return;
    await fetch(`/api/agency/crm/deals/${deal.id}`, { method: 'DELETE' });
    onSaved();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader title={deal ? 'Edit Deal' : 'Add Deal'} onClose={onClose} />
      <div className="p-5 space-y-4">
        <FormField label="Deal Name"><input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Value"><input className={inputClass} type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></FormField>
          <FormField label="Stage">
            <select className={inputClass} value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
              {DEAL_STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Contact">
          <select className={inputClass} value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}>
            <option value="">No contact linked</option>
            {contacts.map(c => <option key={c.id} value={c.id}>{contactName(c)}</option>)}
          </select>
        </FormField>
        <FormField label="Close Date"><input className={inputClass} type="date" value={form.close_date} onChange={e => setForm(f => ({ ...f, close_date: e.target.value }))} /></FormField>
        <FormField label="Notes"><textarea className={inputClass + ' h-20 resize-none'} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></FormField>
      </div>
      <div className="flex items-center justify-between p-5 border-t border-gray-100">
        {deal ? <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700">Delete</button> : <div />}
        <div className="flex gap-2">
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name.trim()} className={btnPrimary}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : deal ? 'Save Changes' : 'Create Deal'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// 5. TASKS SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TasksSection() {
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState<CrmTask | null>(null);
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created_at'>('due_date');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'completed') params.set('status', 'completed');
      else if (filter !== 'all') params.set('status', 'pending');
      const res = await fetch(`/api/agency/crm/tasks?${params}`);
      if (res.ok) { const data = await res.json(); setTasks(Array.isArray(data) ? data : data.tasks || []); }
    } catch (err) { console.error('[crm-tab]', err); } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000).toISOString().split('T')[0];

  const filtered = tasks.filter(t => {
    if (filter === 'overdue') return t.status === 'pending' && t.due_date && t.due_date < today;
    if (filter === 'today') return t.due_date?.startsWith(today);
    if (filter === 'week') return t.status === 'pending' && t.due_date && t.due_date >= today && t.due_date <= weekEnd;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
    }
    if (sortBy === 'due_date') return (a.due_date || 'z').localeCompare(b.due_date || 'z');
    return b.created_at.localeCompare(a.created_at);
  });

  const overdue = tasks.filter(t => t.status === 'pending' && t.due_date && t.due_date < today).length;
  const dueToday = tasks.filter(t => t.due_date?.startsWith(today)).length;
  const completed = tasks.filter(t => t.status === 'completed').length;

  const toggleComplete = async (task: CrmTask) => {
    const status = task.status === 'completed' ? 'pending' : 'completed';
    await fetch(`/api/agency/crm/tasks/${task.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    loadTasks();
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Delete this task?')) return;
    await fetch(`/api/agency/crm/tasks/${id}`, { method: 'DELETE' });
    loadTasks();
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: tasks.length, icon: CheckSquare, color: 'text-gray-500' },
          { label: 'Overdue', value: overdue, icon: AlertTriangle, color: 'text-red-500' },
          { label: 'Due Today', value: dueToday, icon: Clock, color: 'text-amber-500' },
          { label: 'Completed', value: completed, icon: CheckCircle2, color: 'text-emerald-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className={`flex items-center gap-2 text-xs mb-1 ${s.color}`}><s.icon className="w-4 h-4" />{s.label}</div>
            <div className="text-lg font-semibold text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs + controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
          {['all', 'overdue', 'today', 'week', 'completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${filter === f ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              {f === 'all' ? 'All' : f === 'week' ? 'This Week' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select className={inputClass + ' w-auto text-xs'} value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
            <option value="due_date">Sort: Due Date</option><option value="priority">Sort: Priority</option><option value="created_at">Sort: Created</option>
          </select>
          <button onClick={() => setShowAdd(true)} className={btnPrimary}><Plus className="w-4 h-4 mr-1 inline" />Add Task</button>
        </div>
      </div>

      {/* Task list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <CheckSquare className="w-10 h-10 mb-2 opacity-50" /><p className="text-sm">No tasks</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sorted.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <button onClick={() => toggleComplete(t)} className="flex-shrink-0">
                  {t.status === 'completed' ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4 text-gray-300" />}
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setEditTask(t)}>
                  <div className={`text-sm ${t.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{t.title}</div>
                  {t.contact && <div className="text-xs text-gray-500">{contactName(t.contact)}</div>}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge(t.priority)}`}>{t.priority}</span>
                {t.due_date && (
                  <span className={`text-xs ${t.due_date < today && t.status !== 'completed' ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                    {new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                <button onClick={() => handleDeleteTask(t.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && <AddTaskModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); loadTasks(); }} />}
      {editTask && <EditTaskModal task={editTask} onClose={() => setEditTask(null)} onSaved={() => { setEditTask(null); loadTasks(); }} />}
    </div>
  );
}

// ── Edit Task Modal ────────────────────────────────────────────────────────────

function EditTaskModal({ task, onClose, onSaved }: { task: CrmTask; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: task.title, description: task.description || '', priority: task.priority,
    due_date: task.due_date?.split('T')[0] || '', status: task.status,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/agency/crm/tasks/${task.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, due_date: form.due_date || null }),
      });
      onSaved();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    await fetch(`/api/agency/crm/tasks/${task.id}`, { method: 'DELETE' });
    onSaved();
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Edit Task" onClose={onClose} />
      <div className="p-5 space-y-4">
        <FormField label="Title"><input className={inputClass} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></FormField>
        <FormField label="Description"><textarea className={inputClass + ' h-20 resize-none'} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Priority">
            <select className={inputClass} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as CrmTask['priority'] }))}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select className={inputClass} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as CrmTask['status'] }))}>
              <option value="pending">Pending</option><option value="completed">Completed</option>
            </select>
          </FormField>
          <FormField label="Due Date"><input className={inputClass} type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></FormField>
        </div>
      </div>
      <div className="flex items-center justify-between p-5 border-t border-gray-100">
        <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700">Delete</button>
        <div className="flex gap-2">
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. ANALYTICS SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AnalyticsSection() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [aRes, fRes] = await Promise.all([
          fetch('/api/agency/crm/analytics'),
          fetch('/api/agency/crm/feed'),
        ]);
        if (mounted && aRes.ok) setAnalytics(await aRes.json());
        if (mounted && fRes.ok) setFeed(await fRes.json());
      } catch (err) { console.error('[crm-tab]', err); } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;
  if (!analytics) return <div className="flex flex-col items-center py-20 text-gray-400"><BarChart3 className="w-10 h-10 mb-2 opacity-50" /><p className="text-sm">No analytics data</p></div>;

  const stats = [
    { label: 'Total Contacts', value: analytics.total_contacts, icon: Users },
    { label: 'Hot Leads', value: analytics.hot_leads, icon: Star },
    { label: 'Pipeline Value', value: formatCurrency(analytics.pipeline_value), icon: TrendingUp },
    { label: 'Deals Won', value: analytics.deals_won, icon: DollarSign },
    { label: 'Tasks Due', value: analytics.tasks_pending, icon: CheckSquare },
    { label: 'Email Open Rate', value: `${analytics.email_open_rate.toFixed(1)}%`, icon: Mail },
  ];

  const maxFunnel = Math.max(...analytics.pipeline_funnel.map(f => f.count), 1);
  const maxSource = Math.max(...analytics.source_breakdown.map(s => s.count), 1);

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><s.icon className="w-4 h-4" />{s.label}</div>
            <div className="text-xl font-semibold text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Pipeline funnel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Pipeline Funnel</h3>
          <div className="space-y-3">
            {analytics.pipeline_funnel.map(f => (
              <div key={f.stage}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">{f.stage.charAt(0).toUpperCase() + f.stage.slice(1)}</span>
                  <span className="text-gray-500">{f.count} deals &middot; {formatCurrency(f.value)}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${(f.count / maxFunnel) * 100}%` }} />
                </div>
              </div>
            ))}
            {analytics.pipeline_funnel.length === 0 && <p className="text-sm text-gray-400">No deals in pipeline</p>}
          </div>
        </div>

        {/* Contact sources */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Sources</h3>
          <div className="space-y-3">
            {analytics.source_breakdown.map(s => (
              <div key={s.source}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700">{s.source || 'Unknown'}</span>
                  <span className="text-gray-500">{s.count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(s.count / maxSource) * 100}%` }} />
                </div>
              </div>
            ))}
            {analytics.source_breakdown.length === 0 && <p className="text-sm text-gray-400">No source data</p>}
          </div>
        </div>
      </div>

      {/* Recent activities */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Activities</h3>
        {analytics.recent_activities.length === 0 ? (
          <p className="text-sm text-gray-400">No recent activities</p>
        ) : (
          <div className="space-y-2">
            {analytics.recent_activities.slice(0, 20).map(a => (
              <div key={a.id} className="flex items-center gap-3 py-2">
                {activityIcon(a.type)}
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-900">{a.subject || a.type}</span>
                  {a.contact_name && <span className="text-sm text-gray-500 ml-1">— {a.contact_name}</span>}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. ACTIVITY SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ActivitySection() {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  const loadFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/crm/feed');
      if (res.ok) setFeed(await res.json());
    } catch (err) { console.error('[crm-tab]', err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadFeed, 30_000);
    return () => clearInterval(interval);
  }, [loadFeed]);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;
  if (!feed) return <div className="flex flex-col items-center py-20 text-gray-400"><Activity className="w-10 h-10 mb-2 opacity-50" /><p className="text-sm">No activity data</p></div>;

  const filteredActivities = typeFilter === 'all'
    ? feed.recent_activities
    : feed.recent_activities.filter(a => {
        if (typeFilter === 'ai') return a.type === 'ai' || a.type === 'ai_auto';
        if (typeFilter === 'system') return a.type === 'system' || a.type === 'status_change';
        return a.type === typeFilter;
      });

  return (
    <div className="space-y-4">
      {/* AI handled today */}
      {feed.ai_handled_today.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1"><Zap className="w-4 h-4 text-amber-500" />AI Handled Today ({feed.stats.ai_handled_count})</h3>
          <div className="space-y-2">
            {feed.ai_handled_today.map(a => (
              <div key={a.id} className="flex items-center gap-3 py-1.5">
                {activityIcon(a.type)}
                <span className="text-sm text-gray-700 flex-1">{a.subject || a.type}</span>
                {a.contact_name && <span className="text-xs text-gray-500">{a.contact_name}</span>}
                <span className="text-xs text-gray-400">{timeAgo(a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Type filter */}
      <div className="flex items-center gap-1 flex-wrap">
        {['all', 'note', 'email', 'call', 'sms', 'ai', 'system'].map(f => (
          <button key={f} onClick={() => setTypeFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${typeFilter === f ? 'bg-white shadow-sm text-gray-900 font-medium border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button onClick={loadFeed} className="ml-auto text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {/* Activity feed */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filteredActivities.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400"><Activity className="w-8 h-8 mb-2 opacity-50" /><p className="text-sm">No activities</p></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredActivities.map(a => (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                <div className="mt-0.5">{activityIcon(a.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{a.subject || a.type}</span>
                    {a.contact_name && <span className="text-xs text-indigo-600">{a.contact_name}</span>}
                  </div>
                  {a.body && <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{a.body}</p>}
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    {a.actor_name && <span>{a.actor_name}</span>}
                    <span>{timeAgo(a.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AI INSIGHTS SECTION — Default CRM Home
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AIInsightsSection({ setSection }: { setSection: (s: Section) => void }) {
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiHandledOpen, setAiHandledOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/crm/feed');
      if (res.ok) setFeed(await res.json());
    } catch (err) { console.error('[crm-ai]', err); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 30_000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  const approveAndSend = async (item: CommandFeedItem) => {
    if (!item.contact_id || !item.metadata?.ai_draft) return;
    setSending(item.id);
    try {
      const res = await fetch(`/api/agency/crm/contacts/${item.contact_id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: item.metadata?.channel || 'email',
          message: item.metadata.ai_draft as string,
          subject: item.subject || 'Follow-up',
        }),
      });
      if (res.ok) {
        await fetch('/api/agency/crm/activities', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activity_id: item.id }),
        });
        fetchFeed();
      }
    } catch (err) { console.error('[crm-ai] send failed:', err); }
    setSending(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const stats = feed?.stats || { total_contacts: 0, pipeline_value: 0, hot_leads: 0, ai_handled_count: 0 };
  const attentionItems = (feed?.attention_items || []) as unknown as CommandFeedItem[];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setSection('contacts')}
          className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-indigo-200 hover:shadow-sm transition"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contacts</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.total_contacts}</div>
        </button>

        <button
          onClick={() => setSection('deals')}
          className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-purple-200 hover:shadow-sm transition"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pipeline</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            ${stats.pipeline_value >= 1000
              ? `${(stats.pipeline_value / 1000).toFixed(1)}K`
              : stats.pipeline_value}
          </div>
        </button>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Flame className="h-5 w-5 text-red-500" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hot Leads</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.hot_leads}</div>
        </div>
      </div>

      {/* Needs Attention */}
      {attentionItems.length > 0 ? (
        <div>
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-amber-500" />
            NEEDS YOUR ATTENTION
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {attentionItems.length}
            </span>
          </h2>
          <div className="space-y-2">
            {attentionItems.map(item => {
              const firstName = item.contact?.first_name;
              const lastName = item.contact?.last_name;
              const name = [firstName, lastName].filter(Boolean).join(' ') || 'Unknown Contact';
              const initials = ((firstName?.charAt(0) || '') + (lastName?.charAt(0) || '')).toUpperCase() || '?';
              const AVATAR_COLORS = ['bg-indigo-500','bg-purple-500','bg-pink-500','bg-rose-500','bg-orange-500','bg-amber-500','bg-emerald-500'];
              const colorIdx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
              return (
                <div key={item.id} className="bg-white border border-amber-200 rounded-xl p-4 hover:border-amber-300 transition">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[colorIdx]} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-gray-900">{name}</span>
                        {item.contact?.company_name && (
                          <span className="text-xs text-gray-500">· {item.contact.company_name}</span>
                        )}
                        <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(item.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{item.subject || item.body?.slice(0, 120)}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {item.attention_type === 'approval_needed' && (item.metadata?.ai_draft as string) && (
                          <button
                            disabled={sending === item.id}
                            onClick={() => approveAndSend(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                          >
                            {sending === item.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Send className="h-3 w-3" />}
                            Approve &amp; Send
                          </button>
                        )}
                        <button
                          onClick={() => setSection('activity')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                        >
                          View Activity
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-green-800">All clear!</p>
          <p className="text-sm text-green-600 mt-1">Nothing needs your attention. AI is handling everything.</p>
        </div>
      )}

      {/* AI Handled Today */}
      {stats.ai_handled_count > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setAiHandledOpen(!aiHandledOpen)}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-500" />
              AI HANDLED TODAY
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {stats.ai_handled_count}
              </span>
            </span>
            {aiHandledOpen
              ? <ChevronDown className="h-4 w-4 text-gray-400" />
              : <ChevronRight className="h-4 w-4 text-gray-400" />}
          </button>
          {aiHandledOpen && (
            <div className="px-5 pb-4 space-y-1">
              {(feed?.ai_handled_today || []).slice(0, 15).map(act => (
                <div key={act.id} className="flex items-center gap-2 py-1.5 text-xs text-gray-600">
                  <Sparkles className="h-3 w-3 text-indigo-400 shrink-0" />
                  <span>{act.subject || act.body?.slice(0, 80) || act.type}</span>
                  <span className="text-gray-400 ml-auto shrink-0">{timeAgo(act.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          onClick={() => setSection('contacts')}
          className="flex-1 py-3 px-4 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2 transition"
        >
          <Users className="h-4 w-4" /> All Contacts
        </button>
        <button
          onClick={() => setSection('deals')}
          className="flex-1 py-3 px-4 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2 transition"
        >
          <DollarSign className="h-4 w-4" /> Deals
        </button>
        <button
          onClick={() => setSection('tasks')}
          className="flex-1 py-3 px-4 text-sm font-medium border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2 transition"
        >
          <CheckSquare className="h-4 w-4" /> Tasks
        </button>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SPRINT 1A — LEAD SCORING UI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ScoringRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: { type: string; [k: string]: unknown };
  action: { type: string; [k: string]: unknown };
  requires_approval: boolean;
  created_at: string;
}

function ScoringSection() {
  const [rules, setRules] = useState<ScoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<{ scored: number; stale: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/crm/rules');
      if (res.ok) { const data = await res.json(); setRules(data.rules || []); }
    } catch (err) { console.error('[scoring]', err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const saveRules = async () => {
    setSaving(true);
    try {
      await fetch('/api/agency/crm/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules }),
      });
    } finally { setSaving(false); }
  };

  const runScoring = async () => {
    setScoring(true);
    setScoreResult(null);
    try {
      const res = await fetch('/api/agency/crm/score', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setScoreResult({ scored: data.scoring?.scored ?? 0, stale: data.stale_deals?.stale ?? 0 });
      }
    } finally { setScoring(false); }
  };

  const triggerLabel = (rule: ScoringRule): string => {
    const t = rule.trigger;
    if (t.type === 'deal_stale') return `Deal inactive for ${t.days} days`;
    if (t.type === 'score_above') return `Score above ${t.threshold}`;
    if (t.type === 'score_below') return `Score below ${t.threshold}`;
    if (t.type === 'no_activity') return `No activity for ${t.days} days`;
    if (t.type === 'inbound_message') return 'New inbound message';
    if (t.type === 'deal_won') return 'Deal won';
    if (t.type === 'deal_lost') return 'Deal lost';
    if (t.type === 'contact_stage_change') return `Contact stage → ${t.to}`;
    return t.type.replace(/_/g, ' ');
  };

  const actionLabel = (rule: ScoringRule): string => {
    const a = rule.action;
    if (a.type === 'send_follow_up') return `Send follow-up via ${a.channel}`;
    if (a.type === 'create_task') return `Create task: ${a.title}`;
    if (a.type === 'change_stage') return `Change stage to ${a.to}`;
    if (a.type === 'add_tag') return `Add tag: ${a.tag}`;
    if (a.type === 'score_contacts') return 'Re-score all contacts';
    if (a.type === 'detect_stale_deals') return 'Detect stale deals';
    if (a.type === 'notify_owner') return `Notify you: ${a.message}`;
    return a.type.replace(/_/g, ' ');
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Sliders className="h-5 w-5 text-indigo-600" /> Lead Scoring &amp; Automation Rules
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Configure when AI automatically takes action on contacts and deals.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runScoring}
            disabled={scoring}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 transition disabled:opacity-50"
          >
            {scoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Run Scoring Now
          </button>
          <button
            onClick={saveRules}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Save Rules
          </button>
        </div>
      </div>

      {scoreResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <p className="text-sm text-green-800">
            Scored <strong>{scoreResult.scored}</strong> contacts · Found <strong>{scoreResult.stale}</strong> stale deals
          </p>
          <button onClick={() => setScoreResult(null)} className="ml-auto text-green-600 hover:text-green-800"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Score legend */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Hot', range: '75–100', color: 'bg-red-50 border-red-200 text-red-700', dot: 'bg-red-500' },
          { label: 'Warm', range: '50–74', color: 'bg-orange-50 border-orange-200 text-orange-700', dot: 'bg-orange-500' },
          { label: 'Cold', range: '25–49', color: 'bg-blue-50 border-blue-200 text-blue-700', dot: 'bg-blue-500' },
          { label: 'New', range: '0–24', color: 'bg-gray-50 border-gray-200 text-gray-600', dot: 'bg-gray-400' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
              <span className="text-sm font-semibold">{s.label}</span>
            </div>
            <div className="text-xs opacity-75">Score {s.range}</div>
          </div>
        ))}
      </div>

      {/* Scoring factors */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">How Contacts Are Scored</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          {[
            { factor: 'Has email address', points: '+10' },
            { factor: 'Has phone number', points: '+10' },
            { factor: 'Has company', points: '+5' },
            { factor: 'Has been enriched', points: '+15' },
            { factor: 'Has open deal', points: '+20' },
            { factor: 'Recent activity (7 days)', points: '+30' },
            { factor: 'Inbound messages', points: '+5 each' },
            { factor: 'Outbound messages', points: '+3 each' },
          ].map(f => (
            <div key={f.factor} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-700">{f.factor}</span>
              <span className="text-sm font-medium text-indigo-600">{f.points}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Scoring runs automatically every 24h. Click "Run Scoring Now" to force-update.</p>
      </div>

      {/* Automation rules */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-indigo-500" /> Automation Rules
          <span className="text-xs text-gray-400 font-normal">— AI takes action automatically when triggers fire</span>
        </h3>
        {rules.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400">
            <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No rules yet. Rules are loaded from your agency defaults.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => (
              <div key={rule.id} className={`bg-white border rounded-xl p-4 transition ${rule.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${rule.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full mx-auto shadow transition-transform ${rule.enabled ? 'translate-x-2' : '-translate-x-0'}`} style={{ transform: rule.enabled ? 'translateX(4px)' : 'translateX(-4px)' }} />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                        <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">When: {triggerLabel(rule)}</span>
                        <span className="text-gray-300">→</span>
                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">Then: {actionLabel(rule)}</span>
                        {rule.requires_approval && (
                          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Needs approval</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SPRINT 1B — SMART SEGMENTS UI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface Segment {
  id: string;
  name: string;
  emoji: string;
  filters: Array<{ field: string; operator: string; value: string | string[] | number | boolean }>;
  count?: number;
  created_at: string;
}

const SEGMENT_FIELDS = [
  { value: 'stage', label: 'Stage' },
  { value: 'score_label', label: 'Score' },
  { value: 'tags', label: 'Tag' },
  { value: 'source', label: 'Source' },
  { value: 'last_contacted_days', label: 'Days Since Contact' },
  { value: 'has_deal', label: 'Has Deal' },
];

const SEGMENT_OPERATORS: Record<string, { value: string; label: string }[]> = {
  stage: [{ value: 'eq', label: 'is' }, { value: 'neq', label: 'is not' }],
  score_label: [{ value: 'eq', label: 'is' }, { value: 'neq', label: 'is not' }],
  tags: [{ value: 'contains', label: 'contains' }, { value: 'not_in', label: 'does not contain' }],
  source: [{ value: 'eq', label: 'is' }, { value: 'neq', label: 'is not' }],
  last_contacted_days: [{ value: 'gt', label: 'more than' }, { value: 'lt', label: 'less than' }],
  has_deal: [{ value: 'eq', label: 'is' }],
};

const SEGMENT_VALUE_OPTIONS: Record<string, string[]> = {
  stage: ['lead', 'contact', 'customer', 'churned'],
  score_label: ['hot', 'warm', 'cold', 'new'],
  has_deal: ['true', 'false'],
};

function SegmentsSection({ setSection }: { setSection: (s: Section) => void }) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editSegment, setEditSegment] = useState<Segment | null>(null);
  const [bulkSmsTarget, setBulkSmsTarget] = useState<Segment | null>(null);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<string | null>(null);

  const loadSegments = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/crm/segments');
      if (res.ok) { const data = await res.json(); setSegments(data.segments || []); }
    } catch (err) { console.error('[segments]', err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadSegments(); }, [loadSegments]);

  const deleteSegment = async (id: string) => {
    if (!window.confirm('Delete this segment?')) return;
    await fetch('/api/agency/crm/segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', segmentId: id }),
    });
    loadSegments();
  };

  // Sprint 4: Bulk SMS from segment
  const sendBulkSms = async () => {
    if (!bulkSmsTarget || !smsMessage.trim()) return;
    setSmsSending(true);
    setSmsResult(null);
    try {
      const res = await fetch('/api/agency/crm/contacts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sms',
          segment_id: bulkSmsTarget.id,
          payload: { message: smsMessage },
        }),
      });
      const data = await res.json();
      setSmsResult(res.ok ? `✅ SMS queued for ${data.count ?? '?'} contacts` : `❌ ${data.error || 'Failed'}`);
      if (res.ok) setSmsMessage('');
    } finally { setSmsSending(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" /> Smart Segments
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Save filter presets. Click any segment to view its contacts or send a bulk SMS.</p>
        </div>
        <button
          onClick={() => { setEditSegment(null); setShowCreate(true); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" /> New Segment
        </button>
      </div>

      {segments.length === 0 && !showCreate ? (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-10 text-center">
          <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900">No segments yet</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">Create a saved filter like "Hot leads with no reply in 7 days"</p>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
            <Plus className="w-4 h-4" /> Create First Segment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {segments.map(seg => (
            <div key={seg.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{seg.emoji || '📋'}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{seg.name}</p>
                    <p className="text-xs text-gray-500">{seg.filters.length} filter{seg.filters.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditSegment(seg); setShowCreate(true); }}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteSegment(seg.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {seg.filters.map((f, i) => (
                  <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                    {f.field} {f.operator} {String(f.value)}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSection('contacts')}
                  className="flex-1 text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600"
                >
                  View Contacts
                </button>
                <button
                  onClick={() => setBulkSmsTarget(seg)}
                  className="flex-1 text-xs py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition font-medium"
                >
                  📱 Bulk SMS
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Segment Create/Edit Modal */}
      {showCreate && (
        <SegmentEditor
          segment={editSegment}
          onClose={() => { setShowCreate(false); setEditSegment(null); }}
          onSaved={() => { setShowCreate(false); setEditSegment(null); loadSegments(); }}
        />
      )}

      {/* Bulk SMS Modal */}
      {bulkSmsTarget && (
        <Modal onClose={() => { setBulkSmsTarget(null); setSmsMessage(''); setSmsResult(null); }}>
          <ModalHeader title={`Bulk SMS — ${bulkSmsTarget.name}`} onClose={() => { setBulkSmsTarget(null); setSmsMessage(''); setSmsResult(null); }} />
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-600">Send an SMS to all contacts in this segment who have a phone number.</p>
            <FormField label="Message">
              <textarea
                className={inputClass + ' h-28 resize-none'}
                placeholder="Hi {{first_name}}, just checking in..."
                value={smsMessage}
                onChange={e => setSmsMessage(e.target.value)}
              />
            </FormField>
            <p className="text-xs text-gray-400">You can use {'{{first_name}}'} as a merge tag.</p>
            {smsResult && (
              <div className={`rounded-lg px-3 py-2 text-sm ${smsResult.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {smsResult}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
            <button onClick={() => setBulkSmsTarget(null)} className={btnSecondary}>Cancel</button>
            <button
              onClick={sendBulkSms}
              disabled={smsSending || !smsMessage.trim()}
              className={btnPrimary}
            >
              {smsSending ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Sending...</> : 'Send SMS'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SegmentEditor({ segment, onClose, onSaved }: {
  segment: Segment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(segment?.name || '');
  const [emoji, setEmoji] = useState(segment?.emoji || '📋');
  const [filters, setFilters] = useState<Segment['filters']>(
    segment?.filters || [{ field: 'stage', operator: 'eq', value: 'lead' }]
  );
  const [saving, setSaving] = useState(false);

  const addFilter = () => setFilters(f => [...f, { field: 'stage', operator: 'eq', value: 'lead' }]);
  const removeFilter = (i: number) => setFilters(f => f.filter((_, idx) => idx !== i));
  const updateFilter = (i: number, patch: Partial<Segment['filters'][0]>) => {
    setFilters(f => f.map((fi, idx) => idx === i ? { ...fi, ...patch } : fi));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/agency/crm/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', segment: { ...segment, name, emoji, filters, id: segment?.id } }),
      });
      onSaved();
    } finally { setSaving(false); }
  };

  const EMOJIS = ['📋', '🔥', '💎', '⭐', '🏆', '📊', '🎯', '💼', '🌱', '❄️'];

  return (
    <Modal onClose={onClose}>
      <ModalHeader title={segment ? 'Edit Segment' : 'New Segment'} onClose={onClose} />
      <div className="p-5 space-y-4">
        <div className="flex gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Emoji</label>
            <select className="border border-gray-200 rounded-lg px-2 py-2 text-lg w-14" value={emoji} onChange={e => setEmoji(e.target.value)}>
              {EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Segment Name</label>
            <input className={inputClass} placeholder="e.g. Hot leads, No reply 7d…" value={name} onChange={e => setName(e.target.value)} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-600">Filters (all must match)</label>
            <button onClick={addFilter} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Filter
            </button>
          </div>
          <div className="space-y-2">
            {filters.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm flex-1" value={f.field} onChange={e => updateFilter(i, { field: e.target.value, operator: 'eq', value: '' })}>
                  {SEGMENT_FIELDS.map(sf => <option key={sf.value} value={sf.value}>{sf.label}</option>)}
                </select>
                <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-28" value={f.operator} onChange={e => updateFilter(i, { operator: e.target.value })}>
                  {(SEGMENT_OPERATORS[f.field] || [{ value: 'eq', label: 'is' }]).map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
                {SEGMENT_VALUE_OPTIONS[f.field] ? (
                  <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm flex-1" value={String(f.value)} onChange={e => updateFilter(i, { value: e.target.value })}>
                    {SEGMENT_VALUE_OPTIONS[f.field].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : (
                  <input className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm flex-1" placeholder="value" value={String(f.value)} onChange={e => updateFilter(i, { value: e.target.value })} />
                )}
                <button onClick={() => removeFilter(i)} className="text-gray-400 hover:text-red-600 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
        <button onClick={onClose} className={btnSecondary}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !name.trim()} className={btnPrimary}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Segment'}
        </button>
      </div>
    </Modal>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SPRINT 2A — CONTACT MERGE UI
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface DuplicateGroup {
  key: string;
  matchType: 'email' | 'phone';
  contacts: Array<{
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    score: number;
    stage: string;
    created_at: string;
    activity_count: number;
  }>;
}

function MergeSection() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [merged, setMerged] = useState<Set<string>>(new Set());

  const loadDuplicates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agency/crm/merge');
      if (res.ok) { const data = await res.json(); setGroups(data.groups || []); }
    } catch (err) { console.error('[merge]', err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDuplicates(); }, [loadDuplicates]);

  const merge = async (group: DuplicateGroup, primaryId: string) => {
    const secondaryId = group.contacts.find(c => c.id !== primaryId)?.id;
    if (!secondaryId) return;
    setMerging(group.key);
    try {
      const res = await fetch('/api/agency/crm/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_id: primaryId, secondary_id: secondaryId }),
      });
      if (res.ok) {
        setMerged(prev => new Set([...prev, group.key]));
        setGroups(prev => prev.filter(g => g.key !== group.key));
      }
    } finally { setMerging(null); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-indigo-600" /> Contact Deduplication
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Merge duplicate contacts that share the same email or phone.</p>
        </div>
        <button onClick={loadDuplicates} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {merged.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <p className="text-sm text-green-800">Merged <strong>{merged.size}</strong> duplicate group{merged.size !== 1 ? 's' : ''}. Activities and deals were transferred to the primary contact.</p>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-10 text-center">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-green-800">No duplicates found!</p>
          <p className="text-xs text-green-600 mt-1">Your contact database looks clean.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ Found <strong>{groups.length}</strong> duplicate group{groups.length !== 1 ? 's' : ''}. Choose which contact to keep as primary — its data will be preserved and the other will be deleted.
          </p>
          {groups.map(group => (
            <div key={group.key} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Duplicate by {group.matchType}: {group.key.split(':')[1]}
                </span>
                <span className="text-xs text-gray-400">{group.contacts.length} records</span>
              </div>
              <div className="divide-y divide-gray-50">
                {group.contacts.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                        {((c.first_name?.charAt(0) || '') + (c.last_name?.charAt(0) || '')).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {[c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {c.email && <span>{c.email}</span>}
                          {c.phone && <span>{c.phone}</span>}
                          <span className={`px-1.5 py-0.5 rounded-full ${stageBadge(c.stage)}`}>{c.stage}</span>
                          <span>{c.activity_count} activities</span>
                          <span>Score: {c.score}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => merge(group, c.id)}
                      disabled={merging === group.key}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      {merging === group.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitMerge className="w-3.5 h-3.5" />}
                      Keep This
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SPRINT 2B — DEAL STAGE AUTOMATIONS (added inside DealsSection header)
// Sprint 4 — Call Logging (added inside ContactDetailPanel)
// Both handled inline in their respective sections below via new buttons/modals.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN CRM TAB COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAIN_SECTIONS: { key: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'ai', label: 'AI Insights', icon: Sparkles },
  { key: 'contacts', label: 'Contacts', icon: Users },
  { key: 'deals', label: 'Deals', icon: DollarSign },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'activity', label: 'Activity', icon: Activity },
];

const TOOLS_SECTIONS: { key: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'segments', label: 'Segments', icon: Layers },
  { key: 'scoring', label: 'Scoring', icon: Sliders },
  { key: 'merge', label: 'Duplicates', icon: GitMerge },
];

export default function CrmTab({ client, clientId }: { client: AgencyClient; clientId?: string }) {
  const [section, setSection] = useState<Section>('ai');
  const [showTools, setShowTools] = useState(false);
  const scopedClientId = clientId ?? client.id;

  const allSections = [...MAIN_SECTIONS, ...TOOLS_SECTIONS];
  const activeSection = allSections.find(s => s.key === section);
  const isToolsSection = TOOLS_SECTIONS.some(s => s.key === section);

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Main section pills */}
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 overflow-x-auto flex-1 min-w-0">
          {MAIN_SECTIONS.map(s => (
            <button key={s.key} onClick={() => { setSection(s.key); setShowTools(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
                section === s.key ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Tools dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowTools(t => !t)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition whitespace-nowrap ${
              isToolsSection
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Tools
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showTools && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[160px]">
              {TOOLS_SECTIONS.map(s => (
                <button
                  key={s.key}
                  onClick={() => { setSection(s.key); setShowTools(false); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 transition ${section === s.key ? 'text-indigo-600 font-medium' : 'text-gray-700'}`}
                >
                  <s.icon className="w-4 h-4" />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section content */}
      {section === 'ai' && <AIInsightsSection setSection={setSection} />}
      {section === 'contacts' && <ContactsSection client={client} clientId={scopedClientId} />}
      {section === 'deals' && <DealsSection clientId={scopedClientId} />}
      {section === 'tasks' && <TasksSection />}
      {section === 'analytics' && <AnalyticsSection />}
      {section === 'activity' && <ActivitySection />}
      {section === 'segments' && <SegmentsSection setSection={setSection} />}
      {section === 'scoring' && <ScoringSection />}
      {section === 'merge' && <MergeSection />}
    </div>
  );
}
