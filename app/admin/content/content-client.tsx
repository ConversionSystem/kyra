'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Filter, CheckCircle2, Clock, SkipForward, ExternalLink, FileText, Calendar } from 'lucide-react';
import {
  PILLARS, PLATFORMS, PLATFORM_LABELS, PLATFORM_EMOJIS,
  currentPillar, weeklyPillarSchedule, type Platform, type ContentStatus,
} from '@/lib/content/pillars';

interface ContentRow {
  id: string;
  scheduled_for: string;
  platform: Platform;
  pillar: number;
  pillar_name: string;
  angle: string | null;
  status: ContentStatus;
  title: string;
  summary: string | null;
  content_url: string | null;
  pr_url: string | null;
  slug: string | null;
  cta_keyword: string | null;
  word_count: number | null;
  performance_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  posted_at: string | null;
}

const STATUS_META: Record<ContentStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  draft: { label: 'Draft', className: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved', className: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  posted: { label: 'Posted', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  skipped: { label: 'Skipped', className: 'bg-gray-100 text-gray-600', icon: SkipForward },
};

export default function ContentCalendarClient() {
  const [items, setItems] = useState<ContentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [pillarFilter, setPillarFilter] = useState<number | 'all'>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ days: '90' });
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      if (pillarFilter !== 'all') params.set('pillar', String(pillarFilter));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/content-calendar?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [platformFilter, statusFilter, pillarFilter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: ContentStatus) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/content-calendar?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusy(null);
    }
  };

  const stats = useMemo(() => {
    const draft = items.filter(i => i.status === 'draft').length;
    const approved = items.filter(i => i.status === 'approved').length;
    const posted = items.filter(i => i.status === 'posted').length;
    const blog = items.filter(i => i.platform === 'blog').length;
    const linkedin = items.filter(i => i.platform === 'linkedin').length;
    const facebook = items.filter(i => i.platform === 'facebook').length;
    const x = items.filter(i => i.platform === 'x').length;
    return { draft, approved, posted, blog, linkedin, facebook, x, total: items.length };
  }, [items]);

  const schedulePreview = weeklyPillarSchedule(6);
  const thisWeekPillar = currentPillar();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Content Calendar</h1>
            <p className="text-sm text-gray-500">
              Drafts from the scheduled routines. Review, approve, and mark as posted.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ['Drafts', stats.draft, 'amber'],
            ['Approved', stats.approved, 'blue'],
            ['Posted', stats.posted, 'emerald'],
            ['Total (90d)', stats.total, 'indigo'],
          ] as const).map(([label, value, color]) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className={`text-[11px] text-${color}-600 uppercase tracking-wider font-semibold`}>{label}</p>
            </div>
          ))}
        </div>

        {/* This week's pillar */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-100 p-2">
              <Calendar className="h-5 w-5 text-indigo-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-indigo-600 uppercase tracking-wider font-semibold">This week&apos;s pillar</p>
              <p className="text-base font-bold text-indigo-900">
                {thisWeekPillar.id}. {thisWeekPillar.name}
              </p>
              <p className="text-sm text-indigo-800">{thisWeekPillar.oneLiner}</p>
            </div>
          </div>
        </div>

        {/* 6-week preview */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Next 6 weeks</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {schedulePreview.map((s, i) => (
              <div key={i} className={`rounded-lg border p-3 ${i === 0 ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
                <p className="text-[10px] text-gray-500 uppercase">
                  {s.weekOf.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                <p className="text-xs font-bold text-gray-900 mt-1">P{s.pillar.id}</p>
                <p className="text-[11px] text-gray-600 leading-tight mt-1">{s.pillar.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value as Platform | 'all')}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900"
            >
              <option value="all">All platforms</option>
              {PLATFORMS.map(p => (
                <option key={p} value={p}>{PLATFORM_EMOJIS[p]} {PLATFORM_LABELS[p]}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as ContentStatus | 'all')}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="posted">Posted</option>
              <option value="skipped">Skipped</option>
            </select>
            <select
              value={pillarFilter === 'all' ? 'all' : String(pillarFilter)}
              onChange={e => setPillarFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900"
            >
              <option value="all">All pillars</option>
              {PILLARS.map(p => (
                <option key={p.id} value={p.id}>P{p.id}: {p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Items */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-700 text-sm">{error}</div>
        )}

        {loading && items.length === 0 ? (
          <div className="text-center py-16 text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No content yet. Routines will populate this once they fire.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(it => {
              const meta = STATUS_META[it.status];
              const Icon = meta.icon;
              return (
                <div key={it.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex-shrink-0 text-2xl">{PLATFORM_EMOJIS[it.platform]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-gray-500 uppercase tracking-wider">
                          P{it.pillar} · {PLATFORM_LABELS[it.platform]}
                        </span>
                        {it.angle && (
                          <span className="text-[11px] text-gray-400 font-mono">{it.angle}</span>
                        )}
                        <span className="text-[11px] text-gray-400 ml-auto">
                          {new Date(it.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{it.title}</p>
                      {it.summary && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{it.summary}</p>}
                      <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-2 flex-wrap">
                        {it.word_count && <span>{it.word_count.toLocaleString()} words</span>}
                        {it.cta_keyword && <span>CTA: &quot;{it.cta_keyword}&quot;</span>}
                        {it.content_url && (
                          <a href={it.content_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700">
                            Content <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {it.pr_url && (
                          <a href={it.pr_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700">
                            PR <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {it.status === 'draft' && (
                        <button
                          onClick={() => updateStatus(it.id, 'approved')}
                          disabled={busy === it.id}
                          className="rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {(it.status === 'draft' || it.status === 'approved') && (
                        <button
                          onClick={() => updateStatus(it.id, 'posted')}
                          disabled={busy === it.id}
                          className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-50"
                        >
                          Posted
                        </button>
                      )}
                      {it.status !== 'skipped' && it.status !== 'posted' && (
                        <button
                          onClick={() => updateStatus(it.id, 'skipped')}
                          disabled={busy === it.id}
                          className="rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-xs font-medium px-3 py-1.5 disabled:opacity-50"
                        >
                          Skip
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
