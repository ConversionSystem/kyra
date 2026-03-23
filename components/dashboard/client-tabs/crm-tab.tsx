'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Mail, DollarSign, BarChart3, Activity, Plus, Search, Upload,
  Trash2, Send, Clock, CheckCircle2, AlertTriangle, Loader2,
  ArrowLeft, X, FileText, ChevronDown, Edit3, Phone, Tag, Star,
  Calendar, Download, Filter, MessageSquare, Target,
  TrendingUp, Zap, CheckSquare, Square, Briefcase, Eye,
  MoreHorizontal, RefreshCw, ChevronLeft, ChevronRight,
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

type Section = 'contacts' | 'campaigns' | 'deals' | 'tasks' | 'analytics' | 'activity';

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
                  <div className="flex justify-center" title={scoreTitle[c.score_label] || 'New'}>
                    <span className={`w-2.5 h-2.5 rounded-full inline-block ${scoreDot[c.score_label] || 'bg-gray-300'}`} />
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

function DealsSection() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const loadDeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agency/crm/deals?sort=value&order=desc');
      if (res.ok) { const data = await res.json(); setDeals(Array.isArray(data) ? data : data.deals || []); }
    } catch (err) { console.error('[crm-tab]', err); } finally { setLoading(false); }
  }, []);

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

      {/* Add button */}
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className={btnPrimary}><Plus className="w-4 h-4 mr-1 inline" />Add Deal</button>
      </div>

      {/* Pipeline columns */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {DEAL_STAGES.map(stage => {
          const stageDeals = dealsByStage(stage);
          return (
            <div key={stage} className="min-w-[220px] flex-shrink-0">
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
                    <div key={d.id} onClick={() => setEditDeal(d)}
                      className="bg-white border border-gray-100 rounded-lg p-3 hover:border-gray-300 cursor-pointer transition-colors shadow-sm">
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. CAMPAIGNS SECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CampaignsSection({ client }: { client: AgencyClient }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [editMode, setEditMode] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agency/clients/${client.id}/email/campaigns`);
      if (res.ok) { const data = await res.json(); setCampaigns(Array.isArray(data) ? data : data.campaigns || []); }
    } catch (err) { console.error('[crm-tab]', err); } finally { setLoading(false); }
  }, [client.id]);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/clients/${client.id}/email/templates`);
      if (res.ok) { const data = await res.json(); setTemplates(Array.isArray(data) ? data : data.templates || []); }
    } catch (err) { console.error('[crm-tab]', err); }
  }, [client.id]);

  useEffect(() => { loadCampaigns(); loadTemplates(); }, [loadCampaigns, loadTemplates]);

  const handleSend = async (campaignId: string) => {
    if (!window.confirm('Send this campaign now?')) return;
    await fetch(`/api/agency/clients/${client.id}/email/campaigns/${campaignId}/send`, { method: 'POST' });
    loadCampaigns();
  };

  const handleDelete = async (campaignId: string) => {
    if (!window.confirm('Delete this campaign?')) return;
    await fetch(`/api/agency/clients/${client.id}/email/campaigns/${campaignId}`, { method: 'DELETE' });
    if (selectedCampaign?.id === campaignId) setSelectedCampaign(null);
    loadCampaigns();
  };

  const campaignStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600', scheduled: 'bg-blue-50 text-blue-700',
      sending: 'bg-amber-50 text-amber-700', sent: 'bg-emerald-50 text-emerald-700',
      failed: 'bg-red-50 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  if (selectedCampaign) {
    return (
      <CampaignDetail
        campaign={selectedCampaign}
        clientId={client.id}
        onBack={() => { setSelectedCampaign(null); loadCampaigns(); }}
        onSend={() => handleSend(selectedCampaign.id)}
        onDelete={() => handleDelete(selectedCampaign.id)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">{campaigns.length} campaigns</h3>
        <button onClick={() => setShowCreate(true)} className={btnPrimary}><Plus className="w-4 h-4 mr-1 inline" />New Campaign</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center py-20 text-gray-400">
          <Mail className="w-10 h-10 mb-2 opacity-50" /><p className="text-sm">No campaigns yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {campaigns.map(c => (
            <div key={c.id} onClick={() => setSelectedCampaign(c)} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{c.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${campaignStatusBadge(c.status)}`}>{c.status}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{c.subject}</div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {c.status === 'sent' && (
                  <div className="flex items-center gap-3">
                    <span>Sent: {c.total_sent}</span>
                    <span>Opened: {c.total_opened}</span>
                    <span>Clicked: {c.total_clicked}</span>
                  </div>
                )}
                <span>{timeAgo(c.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCampaignModal
          clientId={client.id}
          templates={templates}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); loadCampaigns(); }}
        />
      )}
    </div>
  );
}

// ── Campaign Detail ────────────────────────────────────────────────────────────

function CampaignDetail({ campaign, clientId, onBack, onSend, onDelete }: {
  campaign: Campaign; clientId: string; onBack: () => void; onSend: () => void; onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: campaign.name, subject: campaign.subject, from_name: campaign.from_name,
    from_email: campaign.from_email, html_body: campaign.html_body,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/agency/clients/${clientId}/email/campaigns/${campaign.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      setEditing(false);
      onBack();
    } finally { setSaving(false); }
  };

  const openRate = campaign.total_sent > 0 ? ((campaign.total_opened / campaign.total_sent) * 100).toFixed(1) : '0';
  const clickRate = campaign.total_sent > 0 ? ((campaign.total_clicked / campaign.total_sent) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to campaigns
      </button>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{campaign.name}</h2>
          <div className="flex items-center gap-2">
            {campaign.status === 'draft' && (
              <>
                <button onClick={() => setEditing(!editing)} className={btnSecondary}><Edit3 className="w-4 h-4 mr-1 inline" />Edit</button>
                <button onClick={onSend} className={btnPrimary}><Send className="w-4 h-4 mr-1 inline" />Send Now</button>
              </>
            )}
            <button onClick={onDelete} className="text-red-500 hover:text-red-700 text-sm">Delete</button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <FormField label="Name"><input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
            <FormField label="Subject"><input className={inputClass} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></FormField>
            <FormField label="From Name"><input className={inputClass} value={form.from_name} onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))} /></FormField>
            <FormField label="From Email"><input className={inputClass} value={form.from_email} onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))} /></FormField>
            <FormField label="HTML Body"><textarea className={inputClass + ' h-40 resize-none font-mono text-xs'} value={form.html_body} onChange={e => setForm(f => ({ ...f, html_body: e.target.value }))} /></FormField>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className={btnPrimary}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}</button>
              <button onClick={() => setEditing(false)} className={btnSecondary}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Subject:</span> <span className="text-gray-900">{campaign.subject}</span></div>
              <div><span className="text-gray-500">From:</span> <span className="text-gray-900">{campaign.from_name} &lt;{campaign.from_email}&gt;</span></div>
              <div><span className="text-gray-500">Status:</span> <span className="text-gray-900">{campaign.status}</span></div>
              <div><span className="text-gray-500">Created:</span> <span className="text-gray-900">{timeAgo(campaign.created_at)}</span></div>
            </div>

            {campaign.status === 'sent' && (
              <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
                {[
                  { label: 'Sent', value: campaign.total_sent },
                  { label: 'Opened', value: `${campaign.total_opened} (${openRate}%)` },
                  { label: 'Clicked', value: `${campaign.total_clicked} (${clickRate}%)` },
                  { label: 'Bounced', value: campaign.total_bounced },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="text-lg font-semibold text-gray-900">{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Create Campaign Modal ──────────────────────────────────────────────────────

function CreateCampaignModal({ clientId, templates, onClose, onSaved }: {
  clientId: string; templates: Template[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: '', subject: '', from_name: '', from_email: '', html_body: '', template_id: '' });
  const [saving, setSaving] = useState(false);

  const applyTemplate = (templateId: string) => {
    const t = templates.find(t => t.id === templateId);
    if (t) setForm(f => ({ ...f, subject: t.subject, html_body: t.html_body, template_id: templateId }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/email/campaigns`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (res.ok) onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="New Campaign" onClose={onClose} />
      <div className="p-5 space-y-4">
        {templates.length > 0 && (
          <FormField label="Template (optional)">
            <select className={inputClass} value={form.template_id} onChange={e => applyTemplate(e.target.value)}>
              <option value="">Start from scratch</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </FormField>
        )}
        <FormField label="Campaign Name"><input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></FormField>
        <FormField label="Subject Line"><input className={inputClass} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="From Name"><input className={inputClass} value={form.from_name} onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))} /></FormField>
          <FormField label="From Email"><input className={inputClass} value={form.from_email} onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))} /></FormField>
        </div>
        <FormField label="Email Body (HTML)"><textarea className={inputClass + ' h-40 resize-none font-mono text-xs'} value={form.html_body} onChange={e => setForm(f => ({ ...f, html_body: e.target.value }))} /></FormField>
      </div>
      <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
        <button onClick={onClose} className={btnSecondary}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !form.name.trim()} className={btnPrimary}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Campaign'}
        </button>
      </div>
    </Modal>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
      {/* Attention items */}
      {feed.attention_items.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-amber-500" />Needs Attention</h3>
          {feed.attention_items.map(a => (
            <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
              {activityIcon(a.type)}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-amber-900">{a.subject || a.type}</div>
                {a.body && <div className="text-sm text-amber-700 mt-0.5 line-clamp-2">{a.body}</div>}
                <div className="flex items-center gap-2 mt-1 text-xs text-amber-600">
                  {a.contact_name && <span>{a.contact_name}</span>}
                  <span>{timeAgo(a.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
// MAIN CRM TAB COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SECTIONS: { key: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'contacts', label: 'Contacts', icon: Users },
  { key: 'deals', label: 'Deals', icon: DollarSign },
  { key: 'campaigns', label: 'Campaigns', icon: Mail },
  { key: 'tasks', label: 'Tasks', icon: CheckSquare },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'activity', label: 'Activity', icon: Activity },
];

export default function CrmTab({ client, clientId }: { client: AgencyClient; clientId?: string }) {
  const [section, setSection] = useState<Section>('contacts');
  const scopedClientId = clientId ?? client.id;

  return (
    <div className="space-y-6">
      {/* Section pills */}
      <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 w-fit">
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setSection(s.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
              section === s.key ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <s.icon className="w-4 h-4" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      {section === 'contacts' && <ContactsSection client={client} clientId={scopedClientId} />}
      {section === 'deals' && <DealsSection />}
      {section === 'campaigns' && <CampaignsSection client={client} />}
      {section === 'tasks' && <TasksSection />}
      {section === 'analytics' && <AnalyticsSection />}
      {section === 'activity' && <ActivitySection />}
    </div>
  );
}
