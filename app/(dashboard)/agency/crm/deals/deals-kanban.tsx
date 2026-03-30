'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, DollarSign, TrendingUp, Target, Loader2, X,
  MoreHorizontal, ChevronRight, Pencil, Trash2, AlertCircle,
  Briefcase, User, Calendar, Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CrmDeal } from '@/lib/crm/types';

// ─── Stage Config ─────────────────────────────────────────────────────────────
const STAGES: {
  key: CrmDeal['stage'];
  label: string;
  color: string;
  dotColor: string;
  prob: number;
}[] = [
  { key: 'prospect', label: 'Prospect', color: 'bg-gray-100', dotColor: 'bg-gray-400', prob: 10 },
  { key: 'qualified', label: 'Qualified', color: 'bg-blue-50', dotColor: 'bg-blue-400', prob: 25 },
  { key: 'proposal', label: 'Proposal', color: 'bg-yellow-50', dotColor: 'bg-yellow-400', prob: 50 },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-orange-50', dotColor: 'bg-orange-400', prob: 75 },
  { key: 'won', label: 'Won', color: 'bg-green-50', dotColor: 'bg-green-500', prob: 100 },
  { key: 'lost', label: 'Lost', color: 'bg-red-50', dotColor: 'bg-red-400', prob: 0 },
];

type DealWithMeta = CrmDeal & {
  contact?: { id: string; first_name: string | null; last_name: string | null } | null;
  company?: { id: string; name: string } | null;
};

interface Stats {
  total: number;
  totalValue: number;
  byStage: Record<string, { count: number; value: number }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
  return `$${val.toLocaleString()}`;
}

function contactName(d: DealWithMeta): string {
  if (!d.contact) return '';
  return `${d.contact.first_name || ''} ${d.contact.last_name || ''}`.trim() || '';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  const mo = Math.floor(days / 30);
  return `${mo}mo ago`;
}

// ─── Deal Card ────────────────────────────────────────────────────────────────
function DealCard({
  deal,
  onMoveStage,
  onDelete,
  onEdit,
  loading,
}: {
  deal: DealWithMeta;
  onMoveStage: (id: string, stage: CrmDeal['stage']) => void;
  onDelete: (id: string) => void;
  onEdit: (deal: DealWithMeta) => void;
  loading: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const stageIdx = STAGES.findIndex(s => s.key === deal.stage);
  const prevStage = stageIdx > 0 ? STAGES[stageIdx - 1] : null;
  const nextStage = stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : null;

  const person = contactName(deal);
  const company = deal.company?.name || '';

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition group ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-1 mb-2">
        <h4
          className="text-sm font-semibold text-gray-900 leading-tight cursor-pointer hover:text-indigo-600 transition"
          onClick={() => deal.contact?.id && router.push(`/agency/crm/contacts/${deal.contact.id}`)}
        >
          {deal.name}
        </h4>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-40">
              <button
                onClick={() => { setMenuOpen(false); onEdit(deal); }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Pencil className="h-3 w-3" /> Edit deal
              </button>
              {prevStage && (
                <button
                  onClick={() => { setMenuOpen(false); onMoveStage(deal.id, prevStage.key); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <ChevronRight className="h-3 w-3 rotate-180" /> Move to {prevStage.label}
                </button>
              )}
              {nextStage && (
                <button
                  onClick={() => { setMenuOpen(false); onMoveStage(deal.id, nextStage.key); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <ChevronRight className="h-3 w-3" /> Move to {nextStage.label}
                </button>
              )}
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => { setMenuOpen(false); onDelete(deal.id); }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Value */}
      {deal.value > 0 && (
        <div className="flex items-center gap-1 mb-2">
          <DollarSign className="h-3 w-3 text-green-500" />
          <span className="text-sm font-bold text-green-700">{formatCurrency(Number(deal.value))}</span>
          <span className="text-xs text-gray-400 ml-auto">{deal.probability}%</span>
        </div>
      )}

      {/* Contact / Company */}
      {(person || company) && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
          {person ? (
            <><User className="h-3 w-3 shrink-0" />{person}</>
          ) : (
            <><Building2 className="h-3 w-3 shrink-0" />{company}</>
          )}
        </div>
      )}

      {/* Close Date */}
      {deal.close_date && (
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
          <Calendar className="h-3 w-3" />
          {new Date(deal.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
        <span className="text-[10px] text-gray-300">{timeAgo(deal.created_at)}</span>
        {/* Quick move forward */}
        {nextStage && !['won', 'lost'].includes(nextStage.key) && (
          <button
            onClick={() => onMoveStage(deal.id, nextStage.key)}
            className="text-[10px] text-indigo-500 hover:text-indigo-700 font-medium opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5"
          >
            {nextStage.label} <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── New Deal Modal ───────────────────────────────────────────────────────────
function DealModal({
  defaultStage,
  deal,
  onSave,
  onClose,
}: {
  defaultStage?: CrmDeal['stage'];
  deal?: DealWithMeta;
  onSave: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(deal?.name || '');
  const [value, setValue] = useState(deal?.value ? String(deal.value) : '');
  const [stage, setStage] = useState<CrmDeal['stage']>(deal?.stage || defaultStage || 'prospect');
  const [closeDate, setCloseDate] = useState(deal?.close_date || '');
  const [notes, setNotes] = useState(deal?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Deal name is required'); return; }
    setSaving(true);
    setError('');

    const payload = {
      name: name.trim(),
      value: parseFloat(value) || 0,
      stage,
      close_date: closeDate || null,
      notes: notes || null,
    };

    try {
      const res = deal
        ? await fetch(`/api/agency/crm/deals/${deal.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/agency/crm/deals', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `Error ${res.status}`);
      } else {
        onSave();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save deal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">
            {deal ? 'Edit Deal' : 'New Deal'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Deal Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Acme Corp — Website Redesign"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">Value ($)</label>
              <input
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">Stage</label>
              <select
                value={stage}
                onChange={e => setStage(e.target.value as CrmDeal['stage'])}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {STAGES.map(s => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Expected Close Date</label>
            <input
              type="date"
              value={closeDate}
              onChange={e => setCloseDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Any context about this deal..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Saving...</> : deal ? 'Save Changes' : 'Create Deal'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Kanban ──────────────────────────────────────────────────────────────
export function DealsKanban() {
  const [deals, setDeals] = useState<DealWithMeta[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; stage?: CrmDeal['stage']; deal?: DealWithMeta }>({ open: false });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    try {
      const [dealsRes, statsRes] = await Promise.all([
        fetch('/api/agency/crm/deals'),
        fetch('/api/agency/crm/deals?stats=true'),
      ]);
      if (dealsRes.ok) {
        const data = await dealsRes.json();
        setDeals((data.deals || []) as DealWithMeta[]);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const moveStage = async (dealId: string, newStage: CrmDeal['stage']) => {
    setMovingId(dealId);
    try {
      const res = await fetch(`/api/agency/crm/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (res.ok) {
        // Optimistic update
        setDeals(prev =>
          prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d)
        );
        fetchDeals(); // refresh for probability / stats
      }
    } finally {
      setMovingId(null);
    }
  };

  const deleteDeal = async (dealId: string) => {
    const res = await fetch(`/api/agency/crm/deals/${dealId}`, { method: 'DELETE' });
    if (res.ok) {
      setDeals(prev => prev.filter(d => d.id !== dealId));
      fetchDeals();
    }
    setDeleteConfirm(null);
  };

  const dealsByStage = (stage: CrmDeal['stage']) =>
    deals.filter(d => d.stage === stage);

  const pipelineValue = stats?.totalValue || 0;
  const wonDeals = stats?.byStage?.won;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400 flex items-center gap-2 animate-pulse">
          <Briefcase className="h-5 w-5" /> Loading deals...
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-600" />
            Deal Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats?.total || 0} deals · {formatCurrency(pipelineValue)} pipeline
          </p>
        </div>
        <Button
          onClick={() => setModal({ open: true })}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Deal
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-indigo-600" />}
          label="Pipeline Value"
          value={formatCurrency(pipelineValue)}
          bg="bg-indigo-50"
        />
        <StatCard
          icon={<Target className="h-4 w-4 text-green-600" />}
          label="Won"
          value={wonDeals ? `${wonDeals.count} · ${formatCurrency(wonDeals.value)}` : '0'}
          bg="bg-green-50"
        />
        <StatCard
          icon={<Briefcase className="h-4 w-4 text-blue-600" />}
          label="Open Deals"
          value={String(deals.filter(d => !['won', 'lost'].includes(d.stage)).length)}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4 text-amber-600" />}
          label="Avg Deal Size"
          value={deals.length > 0 ? formatCurrency(pipelineValue / Math.max(1, deals.filter(d => d.stage !== 'lost').length)) : '$0'}
          bg="bg-amber-50"
        />
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        {STAGES.map(stage => {
          const stageDeals = dealsByStage(stage.key);
          const stageValue = stageDeals.reduce((s, d) => s + Number(d.value || 0), 0);

          return (
            <div key={stage.key} className="flex-shrink-0 w-64">
              {/* Column Header */}
              <div className={`rounded-xl p-3 mb-3 ${stage.color}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.dotColor}`} />
                    <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                      {stage.label}
                    </span>
                    <span className="text-xs bg-white/70 text-gray-600 rounded-full px-1.5 py-0.5 font-medium">
                      {stageDeals.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setModal({ open: true, stage: stage.key })}
                    className="text-gray-400 hover:text-gray-700 transition"
                    title="Add deal to this stage"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {stageValue > 0 && (
                  <p className="text-xs text-gray-500 mt-1 ml-5">{formatCurrency(stageValue)}</p>
                )}
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {stageDeals.map(deal => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onMoveStage={moveStage}
                    onDelete={(id) => setDeleteConfirm(id)}
                    onEdit={(d) => setModal({ open: true, deal: d })}
                    loading={movingId === deal.id}
                  />
                ))}
                {stageDeals.length === 0 && (
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition group"
                    onClick={() => setModal({ open: true, stage: stage.key })}
                  >
                    <Plus className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 mx-auto mb-1 transition" />
                    <span className="text-xs text-gray-400 group-hover:text-indigo-500 transition">Add deal</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {modal.open && (
        <DealModal
          defaultStage={modal.stage}
          deal={modal.deal}
          onSave={() => { setModal({ open: false }); fetchDeals(); }}
          onClose={() => setModal({ open: false })}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-2">Delete Deal?</h3>
            <p className="text-sm text-gray-500 mb-5">
              This will permanently remove the deal and its activity history.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteDeal(deleteConfirm)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
  return (
    <div className={`rounded-xl p-3 ${bg} flex items-center gap-3`}>
      <div className="p-2 bg-white/70 rounded-lg">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
