'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  DollarSign, Plus, Search, GripVertical, User, Building2,
  Calendar, TrendingUp, Trophy, X, ChevronDown, MoreHorizontal,
  Trash2, ArrowRight, Sparkles, Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getInitials, getAvatarColor } from '@/lib/crm/types';

const STAGES = [
  { key: 'prospect', label: 'Prospect', color: 'border-t-indigo-400', bg: 'bg-indigo-50' },
  { key: 'qualified', label: 'Qualified', color: 'border-t-blue-400', bg: 'bg-blue-50' },
  { key: 'proposal', label: 'Proposal', color: 'border-t-purple-400', bg: 'bg-purple-50' },
  { key: 'negotiation', label: 'Negotiation', color: 'border-t-amber-400', bg: 'bg-amber-50' },
  { key: 'won', label: 'Won', color: 'border-t-green-400', bg: 'bg-green-50' },
  { key: 'lost', label: 'Lost', color: 'border-t-gray-400', bg: 'bg-gray-50' },
];

interface Deal {
  id: string;
  name: string;
  value: number;
  stage: string;
  probability: number;
  close_date: string | null;
  contact_id: string | null;
  company_id: string | null;
  notes: string | null;
  source: string | null;
  created_at: string;
  contact?: { id: string; first_name: string | null; last_name: string | null; email: string | null; avatar_color: string | null } | null;
  company?: { id: string; name: string } | null;
}

export function DealsKanban() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ total: number; totalValue: number; byStage: Record<string, { count: number; value: number }> } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addStage, setAddStage] = useState('prospect');
  const [dragDeal, setDragDeal] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const fetchDeals = useCallback(async () => {
    const [dealsRes, statsRes] = await Promise.all([
      fetch('/api/agency/crm/deals'),
      fetch('/api/agency/crm/deals?stats=true'),
    ]);
    if (dealsRes.ok) {
      const data = await dealsRes.json();
      setDeals(data.deals || []);
    }
    if (statsRes.ok) {
      const data = await statsRes.json();
      setStats(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);

  const handleDragStart = (dealId: string) => setDragDeal(dealId);
  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    setDragOver(stageKey);
  };
  const handleDragLeave = () => setDragOver(null);
  const handleDrop = async (stageKey: string) => {
    if (!dragDeal) return;
    const deal = deals.find(d => d.id === dragDeal);
    if (!deal || deal.stage === stageKey) {
      setDragDeal(null);
      setDragOver(null);
      return;
    }

    // Optimistic update
    setDeals(prev => prev.map(d => d.id === dragDeal ? { ...d, stage: stageKey } : d));
    setDragDeal(null);
    setDragOver(null);

    await fetch(`/api/agency/crm/deals/${dragDeal}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: stageKey }),
    });

    fetchDeals();
  };

  const handleDelete = async (dealId: string) => {
    if (!confirm('Delete this deal?')) return;
    setDeals(prev => prev.filter(d => d.id !== dealId));
    await fetch(`/api/agency/crm/deals/${dealId}`, { method: 'DELETE' });
    fetchDeals();
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-400 flex items-center gap-2">
          <Target className="h-5 w-5" /> Loading deals...
        </div>
      </div>
    );
  }

  const activeValue = stats?.totalValue || 0;
  const wonValue = stats?.byStage?.won?.value || 0;

  return (
    <div className="p-6 space-y-5 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-600" /> Deals
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {deals.length} deals · ${activeValue.toLocaleString()} pipeline · ${wonValue.toLocaleString()} won
          </p>
        </div>
        <Button size="sm" onClick={() => { setAddStage('prospect'); setShowAdd(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="h-4 w-4 mr-1" /> New Deal
        </Button>
      </div>

      {/* Stage Summary Bar */}
      <div className="flex gap-2">
        {STAGES.filter(s => s.key !== 'lost').map(stage => {
          const stageData = stats?.byStage?.[stage.key];
          return (
            <div key={stage.key} className={`flex-1 rounded-xl p-3 ${stage.bg} text-center`}>
              <p className="text-xs font-medium text-gray-600">{stage.label}</p>
              <p className="text-lg font-bold text-gray-900">${(stageData?.value || 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">{stageData?.count || 0} deals</p>
            </div>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage.key);
          const isDragTarget = dragOver === stage.key;

          return (
            <div
              key={stage.key}
              className={`flex-shrink-0 w-72 rounded-xl border-t-4 ${stage.color} bg-gray-50 transition ${
                isDragTarget ? 'ring-2 ring-indigo-400 bg-indigo-50' : ''
              }`}
              onDragOver={e => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(stage.key)}
            >
              {/* Column Header */}
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900">{stage.label}</h3>
                  <span className="text-xs bg-white text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                    {stageDeals.length}
                  </span>
                </div>
                <button
                  onClick={() => { setAddStage(stage.key); setShowAdd(true); }}
                  className="text-gray-400 hover:text-indigo-600 transition"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Deal Cards */}
              <div className="px-3 pb-3 space-y-2 min-h-[100px]">
                {stageDeals.map(deal => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onDragStart={() => handleDragStart(deal.id)}
                    onDelete={() => handleDelete(deal.id)}
                    onClick={() => deal.contact_id && router.push(`/agency/crm/contacts/${deal.contact_id}`)}
                  />
                ))}
                {stageDeals.length === 0 && (
                  <div className="text-center py-6 text-xs text-gray-400">
                    {isDragTarget ? 'Drop here' : 'No deals'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Deal Modal */}
      {showAdd && (
        <AddDealModal
          defaultStage={addStage}
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); fetchDeals(); }}
        />
      )}
    </div>
  );
}

function DealCard({ deal, onDragStart, onDelete, onClick }: {
  deal: Deal;
  onDragStart: () => void;
  onDelete: () => void;
  onClick: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const contactName = deal.contact
    ? `${deal.contact.first_name || ''} ${deal.contact.last_name || ''}`.trim()
    : null;
  const initials = deal.contact ? getInitials(deal.contact.first_name, deal.contact.last_name) : null;
  const color = deal.contact?.avatar_color || getAvatarColor(deal.contact?.first_name, deal.contact?.last_name);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-indigo-200 hover:shadow-sm transition group"
    >
      <div className="flex items-start justify-between mb-1.5">
        <h4 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">{deal.name}</h4>
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-gray-600"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-5 bg-white border rounded-lg shadow-lg z-10 py-1">
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 w-full"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-lg font-bold text-gray-900 mb-2">
        ${Number(deal.value).toLocaleString()}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {initials && (
            <div className={`w-6 h-6 rounded-full ${color} flex items-center justify-center text-white text-[10px] font-bold`}>
              {initials}
            </div>
          )}
          {contactName && <span className="text-xs text-gray-600">{contactName}</span>}
          {!contactName && deal.company?.name && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Building2 className="h-3 w-3" /> {deal.company.name}
            </span>
          )}
        </div>
        {deal.close_date && (
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <Calendar className="h-3 w-3" /> {new Date(deal.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Probability bar */}
      <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            deal.probability >= 75 ? 'bg-green-500' :
            deal.probability >= 50 ? 'bg-amber-500' :
            deal.probability >= 25 ? 'bg-blue-500' : 'bg-gray-300'
          }`}
          style={{ width: `${deal.probability}%` }}
        />
      </div>
    </div>
  );
}

function AddDealModal({ defaultStage, onClose, onCreated }: {
  defaultStage: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: '', value: '', stage: defaultStage, close_date: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Deal name required'); return; }
    setSaving(true); setError('');

    const res = await fetch('/api/agency/crm/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        value: Number(form.value) || 0,
        stage: form.stage,
        close_date: form.close_date || undefined,
        notes: form.notes || undefined,
      }),
    });

    if (res.ok) { onCreated(); }
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to create deal');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-indigo-600" /> New Deal
        </h3>
        <div className="space-y-3">
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Deal name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Value" type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            </div>
            <select className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            value={form.close_date} onChange={e => setForm(f => ({ ...f, close_date: e.target.value }))} />
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            rows={2} placeholder="Notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <div className="flex gap-2 mt-5">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={saving}>
            {saving ? 'Creating...' : 'Create Deal'}
          </Button>
        </div>
      </form>
    </div>
  );
}
