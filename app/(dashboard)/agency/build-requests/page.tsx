'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Loader2,
  Sparkles,
  ExternalLink,
  Clock,
  Mail,
  Globe,
  DollarSign,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  StickyNote,
  Save,
  CalendarClock,
  X,
} from 'lucide-react';

interface BuildRequest {
  id: string;
  name: string;
  email: string;
  business_url: string | null;
  worker_types: string[];
  description: string | null;
  budget_range: string | null;
  status: string;
  notes: string | null;
  followup_date: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  contacted: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-gray-50 text-gray-500 border-gray-200',
  declined: 'bg-red-50 text-red-600 border-red-200',
};

const STATUS_OPTIONS = ['new', 'contacted', 'in_progress', 'completed', 'declined'];

const WORKER_LABELS: Record<string, string> = {
  'lead-generation': 'Lead Generation',
  'b2b-outreach': 'B2B Outreach',
  'appointment-booking': 'Appointment Booking',
  'sales-assistant': 'Sales Assistant',
  'geo-optimization': 'GEO Optimization',
  'social-media': 'Social Media Manager',
  'comment-marketing': 'Comment Marketing',
  'email-marketing': 'Email Strategist',
  'content-writer': 'Content Writer',
  'ad-manager': 'Ad Campaign Manager',
  'customer-support': 'Customer Support',
  'review-manager': 'Review & Reputation Manager',
  'ecommerce-optimizer': 'E-Commerce Optimizer',
  'inventory-ops': 'Inventory & Operations',
  'analytics-reporter': 'Analytics & Reporting',
  'research-analyst': 'Research Analyst',
  'workflow-automation': 'Workflow Automation',
  'data-security': 'Data & Compliance Monitor',
};

export default function BuildRequestsPage() {
  const [requests, setRequests] = useState<BuildRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Notes editing state
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const [savedNotes, setSavedNotes] = useState<string | null>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Follow-up date state
  const [editingFollowupId, setEditingFollowupId] = useState<string | null>(null);
  const [followupDraft, setFollowupDraft] = useState('');
  const [savingFollowup, setSavingFollowup] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/agency/build-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.data || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingStatus(id);
    try {
      const res = await fetch(`/api/agency/build-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        );
      }
    } catch {
      // silent
    } finally {
      setUpdatingStatus(null);
    }
  };

  const startEditingNotes = (req: BuildRequest) => {
    setEditingNotesId(req.id);
    setNotesDraft(req.notes ?? '');
    setTimeout(() => notesRef.current?.focus(), 50);
  };

  const cancelEditingNotes = () => {
    setEditingNotesId(null);
    setNotesDraft('');
  };

  const saveNotes = async (id: string) => {
    setSavingNotes(id);
    try {
      const res = await fetch(`/api/agency/build-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesDraft }),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, notes: notesDraft } : r))
        );
        setEditingNotesId(null);
        setSavedNotes(id);
        setTimeout(() => setSavedNotes(null), 2000);
      }
    } catch {
      // silent
    } finally {
      setSavingNotes(null);
    }
  };

  const saveFollowup = async (id: string, date: string) => {
    setSavingFollowup(id);
    try {
      const res = await fetch(`/api/agency/build-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followup_date: date || null }),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, followup_date: date || null } : r))
        );
        setEditingFollowupId(null);
      }
    } catch {
      // silent
    } finally {
      setSavingFollowup(null);
    }
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatFollowup = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    if (d.toDateString() === now.toDateString()) return '📅 Today';
    if (d.toDateString() === tomorrow.toDateString()) return '📅 Tomorrow';
    return `📅 ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const isFollowupOverdue = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return d < now;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Upcoming follow-ups banner
  const upcomingFollowups = requests.filter(
    (r) => r.followup_date && !['completed', 'declined'].includes(r.status)
  ).sort((a, b) => (a.followup_date! > b.followup_date! ? 1 : -1));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            Build Requests
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Custom AI worker requests from{' '}
            <a
              href="/build"
              target="_blank"
              className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
            >
              /build <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
        <span className="text-sm text-gray-500">{requests.length} total</span>
      </div>

      {/* Follow-up reminder strip */}
      {upcomingFollowups.length > 0 && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <CalendarClock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-800 mb-1">Follow-ups scheduled</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              {upcomingFollowups.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { setExpandedId(r.id); setTimeout(() => document.getElementById(`req-${r.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100); }}
                  className={`text-xs ${isFollowupOverdue(r.followup_date!) ? 'text-red-600 font-semibold' : 'text-amber-700'} hover:underline`}
                >
                  {isFollowupOverdue(r.followup_date!) ? '⚠️ Overdue' : formatFollowup(r.followup_date!)} — {r.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="text-sm text-gray-500 mb-2">No build requests yet</p>
          <p className="text-xs text-gray-400">
            Share{' '}
            <a
              href="/build"
              target="_blank"
              className="text-indigo-600 hover:underline"
            >
              kyra.conversionsystem.com/build
            </a>{' '}
            with potential clients
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => (
            <div
              id={`req-${req.id}`}
              key={req.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Header row */}
              <button
                onClick={() =>
                  setExpandedId(expandedId === req.id ? null : req.id)
                }
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {req.name}
                    </span>
                    <span
                      className={`text-[10px] font-medium uppercase px-1.5 py-0.5 rounded border ${
                        STATUS_COLORS[req.status] || STATUS_COLORS.new
                      }`}
                    >
                      {req.status.replace('_', ' ')}
                    </span>
                    {req.budget_range && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
                        {req.budget_range}
                      </span>
                    )}
                    {req.followup_date && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                        isFollowupOverdue(req.followup_date)
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {isFollowupOverdue(req.followup_date) ? '⚠️ Overdue' : formatFollowup(req.followup_date)}
                      </span>
                    )}
                    {req.notes && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                        <StickyNote className="h-2.5 w-2.5" /> note
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {req.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeAgo(req.created_at)}
                    </span>
                  </div>
                </div>
                {expandedId === req.id ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                )}
              </button>

              {/* Expanded details */}
              {expandedId === req.id && (
                <div className="px-4 pb-4 border-t border-gray-100 space-y-3 pt-3">
                  {/* Contact */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => copyEmail(req.email)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      {copiedEmail === req.email ? (
                        <><Check className="h-3 w-3 text-emerald-500" /> Copied</>
                      ) : (
                        <><Copy className="h-3 w-3" /> Copy Email</>
                      )}
                    </button>
                    {req.business_url && (
                      <a
                        href={req.business_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition"
                      >
                        <Globe className="h-3 w-3" />
                        Visit Website
                      </a>
                    )}
                    <a
                      href={`mailto:${req.email}?subject=Your Kyra AI Worker Request&body=Hi ${req.name.split(' ')[0]},%0D%0A%0D%0AThanks for your interest in a custom AI worker! I'd love to learn more about your needs.%0D%0A%0D%0A`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition"
                    >
                      <Mail className="h-3 w-3" />
                      Send Email
                    </a>
                  </div>

                  {/* Worker types */}
                  {req.worker_types.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium uppercase text-gray-400 tracking-wide mb-1.5">
                        Requested Workers
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {req.worker_types.map((w) => (
                          <span
                            key={w}
                            className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-medium"
                          >
                            {WORKER_LABELS[w] || w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {req.description && (
                    <div>
                      <p className="text-[10px] font-medium uppercase text-gray-400 tracking-wide mb-1">
                        Description
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {req.description}
                      </p>
                    </div>
                  )}

                  {/* Budget */}
                  {req.budget_range && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm text-gray-600 font-medium">
                        {req.budget_range}
                      </span>
                    </div>
                  )}

                  {/* ── Notes ── */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-medium uppercase text-gray-400 tracking-wide flex items-center gap-1">
                        <StickyNote className="h-3 w-3" /> Notes
                      </p>
                      {editingNotesId !== req.id && (
                        <button
                          onClick={() => startEditingNotes(req)}
                          className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium"
                        >
                          {req.notes ? 'Edit' : '+ Add note'}
                        </button>
                      )}
                    </div>

                    {editingNotesId === req.id ? (
                      <div className="space-y-2">
                        <textarea
                          ref={notesRef}
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          placeholder="Add follow-up notes, call summary, pricing discussed…"
                          rows={3}
                          className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 placeholder-gray-300"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                              saveNotes(req.id);
                            }
                            if (e.key === 'Escape') cancelEditingNotes();
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => saveNotes(req.id)}
                            disabled={savingNotes === req.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                          >
                            {savingNotes === req.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                            Save
                          </button>
                          <button
                            onClick={cancelEditingNotes}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
                          >
                            <X className="h-3 w-3" />
                            Cancel
                          </button>
                          <span className="text-[10px] text-gray-300 hidden sm:inline">⌘↵ to save</span>
                        </div>
                      </div>
                    ) : req.notes ? (
                      <div
                        className="text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-amber-100 transition"
                        onClick={() => startEditingNotes(req)}
                      >
                        {savedNotes === req.id ? (
                          <span className="text-emerald-600 text-xs flex items-center gap-1">
                            <Check className="h-3 w-3" /> Saved
                          </span>
                        ) : req.notes}
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditingNotes(req)}
                        className="w-full text-left text-xs text-gray-300 border border-dashed border-gray-200 rounded-lg px-3 py-2 hover:border-gray-300 hover:text-gray-400 transition"
                      >
                        Click to add notes…
                      </button>
                    )}
                  </div>

                  {/* ── Follow-up Date ── */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-medium uppercase text-gray-400 tracking-wide flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" /> Follow-up date
                      </p>
                      {editingFollowupId !== req.id && req.followup_date && (
                        <button
                          onClick={() => { setEditingFollowupId(req.id); setFollowupDraft(req.followup_date ?? ''); }}
                          className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium"
                        >
                          Edit
                        </button>
                      )}
                    </div>

                    {editingFollowupId === req.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={followupDraft}
                          onChange={(e) => setFollowupDraft(e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                        />
                        <button
                          onClick={() => saveFollowup(req.id, followupDraft)}
                          disabled={savingFollowup === req.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                          {savingFollowup === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          Save
                        </button>
                        {req.followup_date && (
                          <button
                            onClick={() => saveFollowup(req.id, '')}
                            className="text-xs text-red-400 hover:text-red-600"
                          >
                            Clear
                          </button>
                        )}
                        <button
                          onClick={() => setEditingFollowupId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : req.followup_date ? (
                      <div
                        className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border cursor-pointer ${
                          isFollowupOverdue(req.followup_date)
                            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        } transition`}
                        onClick={() => { setEditingFollowupId(req.id); setFollowupDraft(req.followup_date ?? ''); }}
                      >
                        <CalendarClock className="h-3.5 w-3.5" />
                        {new Date(req.followup_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {isFollowupOverdue(req.followup_date) && <span className="text-[10px] ml-1">overdue</span>}
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingFollowupId(req.id); setFollowupDraft(''); }}
                        className="text-xs text-gray-300 border border-dashed border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-300 hover:text-gray-400 transition"
                      >
                        + Schedule follow-up
                      </button>
                    )}
                  </div>

                  {/* Status update */}
                  <div>
                    <p className="text-[10px] font-medium uppercase text-gray-400 tracking-wide mb-1.5">
                      Update Status
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => updateStatus(req.id, s)}
                          disabled={req.status === s || updatingStatus === req.id}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${
                            req.status === s
                              ? STATUS_COLORS[s] + ' cursor-default'
                              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          } disabled:opacity-50`}
                        >
                          {updatingStatus === req.id && req.status !== s ? (
                            <Loader2 className="h-3 w-3 animate-spin inline" />
                          ) : (
                            s.replace('_', ' ')
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submitted time */}
                  <p className="text-xs text-gray-400">
                    Submitted{' '}
                    {new Date(req.created_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
