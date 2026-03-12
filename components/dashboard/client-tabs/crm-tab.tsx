'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Mail, DollarSign, BarChart3, Activity, Plus, Search, Upload,
  Trash2, Eye, Send, Clock, CheckCircle2, AlertTriangle, Loader2,
  ArrowLeft, X, FileText, ChevronDown,
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
  contact_name?: string;
  company_name?: string;
  created_at: string;
}

type Section = 'contacts' | 'campaigns' | 'deals' | 'analytics' | 'activity';

// ── Helpers ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    sent: 'bg-green-50 text-green-700 border-green-200',
    draft: 'bg-gray-50 text-gray-600 border-gray-200',
    scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
    sending: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    active: 'bg-green-50 text-green-700 border-green-200',
    unsubscribed: 'bg-gray-100 text-gray-600 border-gray-200',
    bounced: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    lead: 'bg-blue-50 text-blue-700 border-blue-200',
    contact: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    customer: 'bg-green-50 text-green-700 border-green-200',
    churned: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[stage] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {stage}
    </span>
  );
}

function ScoreBadge({ label }: { label: string }) {
  const colors: Record<string, string> = {
    hot: 'bg-red-50 text-red-700 border-red-200',
    warm: 'bg-amber-50 text-amber-700 border-amber-200',
    cold: 'bg-blue-50 text-blue-700 border-blue-200',
    new: 'bg-gray-50 text-gray-600 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[label] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {label}
    </span>
  );
}

function DealStageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    prospect: 'bg-blue-50 text-blue-700 border-blue-200',
    qualified: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    proposal: 'bg-amber-50 text-amber-700 border-amber-200',
    negotiation: 'bg-purple-50 text-purple-700 border-purple-200',
    won: 'bg-green-50 text-green-700 border-green-200',
    lost: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[stage] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {stage}
    </span>
  );
}

function pct(num: number, denom: number): string {
  if (!denom) return '0%';
  return `${((num / denom) * 100).toFixed(1)}%`;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtTime(d: string): string {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtCurrency(v: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
}

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'campaigns', label: 'Campaigns', icon: Mail },
  { id: 'deals', label: 'Deals', icon: DollarSign },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: Activity },
];

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  email: Mail,
  sms: Send,
  call: Activity,
  note: FileText,
  meeting: Users,
  ai_message: Send,
  stage_change: Activity,
  deal_created: DollarSign,
  task: CheckCircle2,
  system: AlertTriangle,
};

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CrmTab({ client }: { client: AgencyClient }) {
  const [activeSection, setActiveSection] = useState<Section>('contacts');

  return (
    <div className="space-y-6">
      {/* Sub-tab pills */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Section content */}
      {activeSection === 'contacts' && <ContactsSection clientId={client.id} />}
      {activeSection === 'campaigns' && <CampaignsSection clientId={client.id} />}
      {activeSection === 'deals' && <DealsSection />}
      {activeSection === 'analytics' && <AnalyticsSection clientId={client.id} />}
      {activeSection === 'activity' && <ActivitySection />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTACTS SECTION
// ══════════════════════════════════════════════════════════════════════════════

function ContactsSection({ clientId: _clientId }: { clientId: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [scoreFilter, setScoreFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', first_name: '', last_name: '', phone: '', tags: '' });
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Use agency-level CRM contacts API (crm_contacts table)
  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (search) params.set('search', search);
    if (stageFilter) params.set('stage', stageFilter);
    if (scoreFilter) params.set('score_label', scoreFilter);
    const res = await fetch(`/api/agency/crm/contacts?${params}`);
    const data = await res.json();
    setContacts(data.contacts || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [search, stageFilter, scoreFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const tags = addForm.tags ? addForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    await fetch('/api/agency/crm/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, tags }),
    });
    setShowAdd(false);
    setAddForm({ email: '', first_name: '', last_name: '', phone: '', tags: '' });
    load();
  };

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { setImporting(false); return; }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const emailIdx = headers.indexOf('email');
    if (emailIdx === -1) { setImporting(false); alert('CSV must have an "email" column'); return; }

    const fnIdx = headers.indexOf('first_name');
    const lnIdx = headers.indexOf('last_name');
    const phIdx = headers.indexOf('phone');
    const tagIdx = headers.indexOf('tags');

    const rows = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim());
      return {
        email: cols[emailIdx],
        first_name: fnIdx >= 0 ? cols[fnIdx] : undefined,
        last_name: lnIdx >= 0 ? cols[lnIdx] : undefined,
        phone: phIdx >= 0 ? cols[phIdx] : undefined,
        tags: tagIdx >= 0 && cols[tagIdx] ? cols[tagIdx].split(';').map(t => t.trim()) : undefined,
      };
    }).filter(r => r.email);

    // Bulk import via CRM contacts API
    for (const row of rows) {
      await fetch('/api/agency/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      });
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
    load();
  };

  const handleDelete = async (ids: string[]) => {
    // Delete via bulk endpoint
    await fetch('/api/agency/crm/contacts/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    load();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-gray-900">Contacts <span className="text-sm text-gray-400 font-normal">({total})</span></h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <input
              className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm w-48"
              placeholder="Search..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
            value={stageFilter}
            onChange={e => { setStageFilter(e.target.value); setPage(1); }}
          >
            <option value="">All stages</option>
            <option value="lead">Lead</option>
            <option value="contact">Contact</option>
            <option value="customer">Customer</option>
            <option value="churned">Churned</option>
          </select>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
            value={scoreFilter}
            onChange={e => { setScoreFilter(e.target.value); setPage(1); }}
          >
            <option value="">All scores</option>
            <option value="hot">🔥 Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
            <option value="new">New</option>
          </select>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import CSV
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Add contact modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Add Contact</h4>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Email *" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="First Name" value={addForm.first_name} onChange={e => setAddForm(f => ({ ...f, first_name: e.target.value }))} />
              <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Last Name" value={addForm.last_name} onChange={e => setAddForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Phone" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} />
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Tags (comma separated)" value={addForm.tags} onChange={e => setAddForm(f => ({ ...f, tags: e.target.value }))} />
            <button onClick={handleAdd} disabled={!addForm.email} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              Add Contact
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No contacts yet</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2">Company</th>
                  <th className="px-4 py-2">Stage</th>
                  <th className="px-4 py-2">Score</th>
                  <th className="px-4 py-2">Tags</th>
                  <th className="px-4 py-2">Last Activity</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contacts.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-900 font-medium">{[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-700">{c.email || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{c.phone || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">{c.crm_companies?.name || '—'}</td>
                    <td className="px-4 py-2.5"><StageBadge stage={c.stage} /></td>
                    <td className="px-4 py-2.5"><ScoreBadge label={c.score_label} /></td>
                    <td className="px-4 py-2.5">
                      {c.tags?.slice(0, 3).map(t => (
                        <span key={t} className="inline-block bg-indigo-50 text-indigo-700 text-xs px-1.5 py-0.5 rounded mr-1">{t}</span>
                      ))}
                      {c.tags?.length > 3 && <span className="text-xs text-gray-400">+{c.tags.length - 3}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-400">{fmtDate(c.last_activity_at || c.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleDelete([c.id])} className="text-gray-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 50 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Page {page} of {Math.ceil(total / 50)}</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50">Prev</button>
                <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CAMPAIGNS SECTION
// ══════════════════════════════════════════════════════════════════════════════

function CampaignsSection({ clientId }: { clientId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'compose' | 'detail'>('list');
  const [selected, setSelected] = useState<Campaign | null>(null);

  // Compose state
  const [form, setForm] = useState({
    name: '', subject: '', from_name: '', from_email: '', reply_to: '',
    html_body: '', text_body: '', segment_tags: [] as string[], template_id: '',
  });
  const [showPreview, setShowPreview] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendConfirm, setSendConfirm] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/agency/clients/${clientId}/email/campaigns`);
    const data = await res.json();
    setCampaigns(data.campaigns || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const loadAudience = useCallback(async () => {
    const res = await fetch('/api/agency/crm/contacts?limit=1');
    const data = await res.json();
    setAudienceCount(data.total || 0);
  }, [clientId]);

  const loadTemplates = useCallback(async () => {
    const res = await fetch(`/api/agency/clients/${clientId}/email/templates`);
    const data = await res.json();
    setTemplates(data.templates || []);
  }, [clientId]);

  const handleCompose = () => {
    setForm({ name: '', subject: '', from_name: '', from_email: '', reply_to: '', html_body: '', text_body: '', segment_tags: [], template_id: '' });
    setView('compose');
    setShowPreview(false);
    setSendConfirm(false);
    loadAudience();
    loadTemplates();
  };

  const handleTemplateSelect = (templateId: string) => {
    const t = templates.find(tpl => tpl.id === templateId);
    if (t) {
      setForm(f => ({ ...f, template_id: templateId, subject: t.subject, html_body: t.html_body }));
    }
  };

  const handleSave = async () => {
    const res = await fetch(`/api/agency/clients/${clientId}/email/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setView('list');
      load();
    }
  };

  const handleSend = async (campaignId: string) => {
    setSending(true);
    await fetch(`/api/agency/clients/${clientId}/email/campaigns/${campaignId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    setSending(false);
    setSendConfirm(false);
    setView('list');
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/agency/clients/${clientId}/email/campaigns/${id}`, { method: 'DELETE' });
    load();
  };

  // ── List View ──
  if (view === 'list') {
    return (
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Campaigns</h3>
          <button onClick={handleCompose} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No campaigns yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {campaigns.map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => { setSelected(c); setView('detail'); }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{c.subject}</p>
                </div>
                <div className="flex items-center gap-6 text-xs text-gray-500 ml-4">
                  {c.status === 'sent' && (
                    <>
                      <span>{c.total_sent} sent</span>
                      <span>{pct(c.total_opened, c.total_sent)} opens</span>
                      <span>{pct(c.total_clicked, c.total_sent)} clicks</span>
                    </>
                  )}
                  <span>{fmtDate(c.sent_at || c.created_at)}</span>
                  {c.status === 'draft' && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Detail View ──
  if (view === 'detail' && selected) {
    return (
      <div className="space-y-4">
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back to campaigns
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{selected.name}</h3>
            <StatusBadge status={selected.status} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Sent', value: selected.total_sent, color: 'text-gray-900' },
              { label: 'Delivered', value: selected.total_delivered, color: 'text-green-600' },
              { label: 'Opened', value: `${selected.total_opened} (${pct(selected.total_opened, selected.total_sent)})`, color: 'text-indigo-600' },
              { label: 'Clicked', value: `${selected.total_clicked} (${pct(selected.total_clicked, selected.total_sent)})`, color: 'text-blue-600' },
              { label: 'Bounced', value: selected.total_bounced, color: 'text-red-600' },
              { label: 'Complained', value: selected.total_complained, color: 'text-orange-600' },
              { label: 'Unsubscribed', value: selected.total_unsubscribed, color: 'text-gray-500' },
              { label: 'Recipients', value: selected.total_recipients, color: 'text-gray-900' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-lg font-semibold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500 mb-1">Subject: <span className="text-gray-900">{selected.subject}</span></p>
            <p className="text-sm text-gray-500 mb-1">From: <span className="text-gray-900">{selected.from_name} &lt;{selected.from_email}&gt;</span></p>
            {selected.sent_at && <p className="text-sm text-gray-500">Sent: <span className="text-gray-900">{fmtDate(selected.sent_at)}</span></p>}
          </div>
        </div>
      </div>
    );
  }

  // ── Compose View ──
  return (
    <div className="space-y-4">
      <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to campaigns
      </button>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">New Campaign</h3>

        {templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start from template</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
              value={form.template_id}
              onChange={e => handleTemplateSelect(e.target.value)}
            >
              <option value="">— None —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="March Newsletter" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Your monthly update" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Your Business" value={form.from_name} onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="noreply@example.com" value={form.from_email} onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Email Body (HTML)</label>
            <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700">
              <Eye className="w-3.5 h-3.5" /> {showPreview ? 'Edit' : 'Preview'}
            </button>
          </div>
          {showPreview ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <iframe srcDoc={form.html_body} className="w-full h-96 bg-white" sandbox="" title="Email preview" />
            </div>
          ) : (
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono h-64"
              placeholder="<div>Your email content here...</div>"
              value={form.html_body}
              onChange={e => setForm(f => ({ ...f, html_body: e.target.value }))}
            />
          )}
        </div>

        <div className="flex items-center gap-4 p-3 bg-indigo-50 rounded-lg">
          <Users className="w-5 h-5 text-indigo-600" />
          <div>
            <p className="text-sm font-medium text-indigo-900">
              Sending to {audienceCount !== null ? <span className="font-bold">{audienceCount}</span> : '...'} contacts
            </p>
            <p className="text-xs text-indigo-600">All active, non-unsubscribed contacts</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleSave} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
            Save as Draft
          </button>
          {!sendConfirm ? (
            <button
              onClick={async () => {
                const res = await fetch(`/api/agency/clients/${clientId}/email/campaigns`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(form),
                });
                if (res.ok) {
                  const data = await res.json();
                  setSelected(data.campaign);
                  setSendConfirm(true);
                }
              }}
              disabled={!form.name || !form.subject || !form.from_name || !form.from_email || !form.html_body}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" /> Send Campaign
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-600 font-medium">Are you sure?</span>
              <button
                onClick={() => selected && handleSend(selected.id)}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Yes, Send Now
              </button>
              <button onClick={() => setSendConfirm(false)} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DEALS SECTION
// ══════════════════════════════════════════════════════════════════════════════

function DealsSection() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', value: '', stage: 'prospect', notes: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/agency/crm/deals');
    const data = await res.json();
    setDeals(data.deals || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    await fetch('/api/agency/crm/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: addForm.name,
        value: Number(addForm.value) || 0,
        stage: addForm.stage,
        notes: addForm.notes || null,
      }),
    });
    setShowAdd(false);
    setAddForm({ name: '', value: '', stage: 'prospect', notes: '' });
    load();
  };

  const stages = ['prospect', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Deals</h3>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" /> Add Deal
        </button>
      </div>

      {/* Add deal modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Add Deal</h4>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Deal Title *" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Value ($)" type="number" value={addForm.value} onChange={e => setAddForm(f => ({ ...f, value: e.target.value }))} />
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700" value={addForm.stage} onChange={e => setAddForm(f => ({ ...f, stage: e.target.value }))}>
              {stages.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20" placeholder="Notes (optional)" value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} />
            <button onClick={handleAdd} disabled={!addForm.name} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              Create Deal
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : deals.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Track opportunities from AI conversations</p>
          <p className="text-xs mt-1">Create your first deal to start tracking your pipeline</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="px-4 py-2">Deal</th>
                <th className="px-4 py-2">Value</th>
                <th className="px-4 py-2">Stage</th>
                <th className="px-4 py-2">Probability</th>
                <th className="px-4 py-2">Close Date</th>
                <th className="px-4 py-2">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deals.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <p className="text-gray-900 font-medium">{d.name}</p>
                    {d.notes && <p className="text-xs text-gray-400 truncate max-w-xs">{d.notes}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-900 font-medium">{fmtCurrency(d.value, d.currency)}</td>
                  <td className="px-4 py-2.5"><DealStageBadge stage={d.stage} /></td>
                  <td className="px-4 py-2.5 text-gray-500">{d.probability}%</td>
                  <td className="px-4 py-2.5 text-gray-500">{fmtDate(d.close_date)}</td>
                  <td className="px-4 py-2.5 text-gray-400">{fmtDate(d.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS SECTION
// ══════════════════════════════════════════════════════════════════════════════

function AnalyticsSection({ clientId }: { clientId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contactTotal, setContactTotal] = useState(0);
  const [activeContacts, setActiveContacts] = useState(0);
  const [dealStats, setDealStats] = useState<{ total_won: number; total_value: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [campRes, contactRes, dealRes] = await Promise.all([
      fetch(`/api/agency/clients/${clientId}/email/campaigns`),
      fetch('/api/agency/crm/contacts?limit=1'),
      fetch('/api/agency/crm/deals?stats=true'),
    ]);
    const campData = await campRes.json();
    const contactData = await contactRes.json();
    const dealData = await dealRes.json();

    setCampaigns((campData.campaigns || []).filter((c: Campaign) => c.status === 'sent'));
    setContactTotal(contactData.total || 0);
    setActiveContacts(contactData.total || 0);
    setDealStats(dealData);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  const totals = campaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + c.total_sent,
      opened: acc.opened + c.total_opened,
      clicked: acc.clicked + c.total_clicked,
    }),
    { sent: 0, opened: 0, clicked: 0 },
  );

  const recent10 = campaigns.slice(0, 10);
  const maxOpenRate = Math.max(...recent10.map(c => c.total_sent ? (c.total_opened / c.total_sent) * 100 : 0), 1);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Contacts', value: contactTotal.toLocaleString(), icon: Users, color: 'text-gray-900' },
          { label: 'Active Contacts', value: activeContacts.toLocaleString(), icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Email Open Rate', value: pct(totals.opened, totals.sent), icon: Eye, color: 'text-indigo-600' },
          { label: 'Deals Won', value: String(dealStats?.total_won ?? 0), icon: DollarSign, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign performance table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Campaign Performance</h3>
        </div>
        {campaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No sent campaigns yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="px-4 py-2">Campaign</th>
                  <th className="px-4 py-2 text-right">Sent</th>
                  <th className="px-4 py-2 text-right">Opens</th>
                  <th className="px-4 py-2 text-right">Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent10.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <p className="text-gray-900 font-medium">{c.name}</p>
                      <p className="text-xs text-gray-400">{fmtDate(c.sent_at)}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{c.total_sent}</td>
                    <td className="px-4 py-2.5 text-right text-indigo-600">{c.total_opened} ({pct(c.total_opened, c.total_sent)})</td>
                    <td className="px-4 py-2.5 text-right text-blue-600">{c.total_clicked} ({pct(c.total_clicked, c.total_sent)})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bar chart — open rates */}
      {recent10.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Open Rate — Last {recent10.length} Campaigns</h3>
          <div className="flex items-end gap-2 h-40">
            {recent10.map(c => {
              const rate = c.total_sent ? (c.total_opened / c.total_sent) * 100 : 0;
              const height = (rate / maxOpenRate) * 100;
              return (
                <div key={c.id} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{rate.toFixed(0)}%</span>
                  <div className="w-full bg-indigo-100 rounded-t-md relative" style={{ height: '120px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-indigo-500 rounded-t-md transition-all"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 truncate max-w-full" title={c.name}>{c.name.slice(0, 8)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITY SECTION
// ══════════════════════════════════════════════════════════════════════════════

function ActivitySection() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/agency/crm/activities?limit=50');
    const data = await res.json();
    setActivities(data.activities || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch('/api/agency/crm/activities?limit=50');
      const data = await res.json();
      setActivities(data.activities || []);
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Activity Feed</h3>
        <span className="text-xs text-gray-400">Auto-refreshes every 30s</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No activity yet</p>
          <p className="text-xs mt-1">Events will appear here as your CRM is used</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {activities.map(a => {
            const Icon = ACTIVITY_ICONS[a.type] || Activity;
            return (
              <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                <div className="mt-0.5 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    {a.subject || a.type.replace(/_/g, ' ')}
                  </p>
                  {a.body && <p className="text-xs text-gray-500 mt-0.5 truncate">{a.body}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{fmtTime(a.created_at)}</span>
                    {a.actor_name && <span className="text-xs text-gray-400">by {a.actor_name}</span>}
                    {a.contact_name && <span className="text-xs text-indigo-600">{a.contact_name}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
