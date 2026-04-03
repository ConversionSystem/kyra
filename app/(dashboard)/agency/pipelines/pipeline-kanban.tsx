'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, Filter, DollarSign, TrendingUp, BarChart3,
  Target, Loader2, GripVertical, Calendar, User, Building2,
  ChevronDown, X, MoreHorizontal, Trophy, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getInitials, getAvatarColor } from '@/lib/crm/types';
import type { CrmDeal } from '@/lib/crm/types';
import { DealSlideOver } from './deal-slide-over';

// ─── Types ──────────────────────────────────────────────────────────────

interface DealWithRelations extends CrmDeal {
  contact: { id: string; first_name: string | null; last_name: string | null; email: string | null; avatar_color: string | null } | null;
  company: { id: string; name: string } | null;
}

interface StageConfig {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface PipelineStats {
  total: number;
  totalValue: number;
  byStage: Record<string, { count: number; value: number }>;
  winRate: number;
  avgDealSize: number;
  wonCount: number;
  lostCount: number;
}

// ─── Stage Config ───────────────────────────────────────────────────────

const STAGES: StageConfig[] = [
  { id: 'prospect', label: 'Prospect', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'qualified', label: 'Qualified', color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  { id: 'proposal', label: 'Proposal', color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
  { id: 'negotiation', label: 'Negotiation', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  { id: 'won', label: 'Won', color: 'text-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' },
  { id: 'lost', label: 'Lost', color: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
];

// ─── Helpers ────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function contactName(deal: DealWithRelations): string {
  if (!deal.contact) return 'No contact';
  const f = deal.contact.first_name || '';
  const l = deal.contact.last_name || '';
  return (f + ' ' + l).trim() || deal.contact.email || 'Unknown';
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── Quick Add Form ─────────────────────────────────────────────────────

function QuickAddDeal({ stage, onAdd, onCancel }: { stage: string; onAdd: (name: string, value: number) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), parseFloat(value) || 0);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2 shadow-sm">
      <input
        ref={inputRef}
        type="text"
        placeholder="Deal name..."
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
      />
      <input
        type="number"
        placeholder="Value ($)"
        value={value}
        onChange={e => setValue(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs flex-1">Add</Button>
        <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// ─── Deal Card ──────────────────────────────────────────────────────────

function DealCard({
  deal,
  onDragStart,
  onClick,
}: {
  deal: DealWithRelations;
  onDragStart: (e: React.DragEvent, dealId: string) => void;
  onClick: () => void;
}) {
  const initials = deal.contact ? getInitials(deal.contact.first_name, deal.contact.last_name) : '?';
  const avatarColor = deal.contact?.avatar_color || getAvatarColor(deal.contact?.first_name, deal.contact?.last_name);

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, deal.id)}
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300 transition-all duration-150 group"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-900 truncate flex-1">{deal.name}</h4>
        <span className="text-sm font-semibold text-gray-900 shrink-0">
          {formatCurrency(Number(deal.value))}
        </span>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <div className={`w-6 h-6 rounded-full ${avatarColor} flex items-center justify-center shrink-0`}>
          <span className="text-[10px] font-bold text-white">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-600 truncate">{contactName(deal)}</p>
          {deal.company && (
            <p className="text-[10px] text-gray-400 truncate">{deal.company.name}</p>
          )}
        </div>
      </div>

      {(deal.close_date || deal.updated_at) && (
        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
          {deal.close_date && (
            <span className="flex items-center gap-0.5">
              <Calendar className="h-3 w-3" />
              {new Date(deal.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          <span>{timeAgo(deal.updated_at)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Kanban Column ──────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  deals,
  dragOverStage,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDealClick,
  onQuickAdd,
}: {
  stage: StageConfig;
  deals: DealWithRelations[];
  dragOverStage: string | null;
  onDragOver: (e: React.DragEvent, stageId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onDragStart: (e: React.DragEvent, dealId: string) => void;
  onDealClick: (deal: DealWithRelations) => void;
  onQuickAdd: (stageId: string, name: string, value: number) => void;
}) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const isDragOver = dragOverStage === stage.id;
  const totalValue = deals.reduce((sum, d) => sum + Number(d.value), 0);

  return (
    <div
      onDragOver={e => onDragOver(e, stage.id)}
      onDragLeave={onDragLeave}
      onDrop={e => onDrop(e, stage.id)}
      className={`flex flex-col min-w-[280px] w-[280px] shrink-0 rounded-xl transition-colors duration-150 ${
        isDragOver ? `${stage.bgColor} ${stage.borderColor} border-2` : 'bg-gray-50/50 border-2 border-transparent'
      }`}
    >
      {/* Column Header */}
      <div className="px-3 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${stage.color}`}>{stage.label}</span>
          <span className="text-xs text-gray-400 bg-gray-200/60 rounded-full px-1.5 py-0.5 font-medium">
            {deals.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 font-medium">{formatCurrency(totalValue)}</span>
          <button
            onClick={() => setShowQuickAdd(true)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 transition"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Add */}
      {showQuickAdd && (
        <div className="px-2 pb-2">
          <QuickAddDeal
            stage={stage.id}
            onAdd={(name, value) => {
              onQuickAdd(stage.id, name, value);
              setShowQuickAdd(false);
            }}
            onCancel={() => setShowQuickAdd(false)}
          />
        </div>
      )}

      {/* Cards */}
      <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-hide">
        {deals.map(deal => (
          <DealCard
            key={deal.id}
            deal={deal}
            onDragStart={onDragStart}
            onClick={() => onDealClick(deal)}
          />
        ))}
        {deals.length === 0 && !showQuickAdd && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-xs">No deals</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stats Bar ──────────────────────────────────────────────────────────

function StatsBar({ stats, loading }: { stats: PipelineStats | null; loading: boolean }) {
  if (loading || !stats) {
    return (
      <div className="flex gap-4 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-100 rounded-lg h-16 w-40" />
        ))}
      </div>
    );
  }

  const statCards = [
    { label: 'Pipeline Value', value: formatCurrency(stats.totalValue), icon: DollarSign, iconColor: 'text-emerald-500' },
    { label: 'Active Deals', value: stats.total.toString(), icon: Target, iconColor: 'text-indigo-500' },
    { label: 'Win Rate', value: `${stats.winRate}%`, icon: TrendingUp, iconColor: 'text-amber-500' },
    { label: 'Avg Deal Size', value: formatCurrency(stats.avgDealSize), icon: BarChart3, iconColor: 'text-purple-500' },
  ];

  return (
    <div className="flex gap-3 flex-wrap">
      {statCards.map(stat => (
        <div key={stat.label} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 min-w-[160px]">
          <div className={`p-2 rounded-lg bg-gray-50 ${stat.iconColor}`}>
            <stat.icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{stat.value}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wide">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Kanban Component ──────────────────────────────────────────────

export function PipelineKanban() {
  const [deals, setDeals] = useState<DealWithRelations[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<DealWithRelations | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch deals
  const fetchDeals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/agency/crm/deals?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDeals(data.deals || []);
      }
    } catch (err) {
      console.error('[kanban] fetch deals failed:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/crm/deals/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.data || null);
      }
    } catch (err) {
      console.error('[kanban] fetch stats failed:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDeals(); }, [fetchDeals]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  // ── Drag & Drop ────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedDealId(dealId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const dealId = e.dataTransfer.getData('text/plain');
    if (!dealId) return;

    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage === newStage) {
      setDraggedDealId(null);
      return;
    }

    // Optimistic update
    setDeals(prev =>
      prev.map(d => d.id === dealId ? { ...d, stage: newStage as CrmDeal['stage'] } : d)
    );
    setDraggedDealId(null);

    try {
      const res = await fetch(`/api/agency/crm/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) {
        // Revert on failure
        setDeals(prev =>
          prev.map(d => d.id === dealId ? { ...d, stage: deal.stage } : d)
        );
      } else {
        fetchStats();
      }
    } catch {
      setDeals(prev =>
        prev.map(d => d.id === dealId ? { ...d, stage: deal.stage } : d)
      );
    }
  };

  // ── Quick Add ──────────────────────────────────────────────────────

  const handleQuickAdd = async (stageId: string, name: string, value: number) => {
    try {
      const res = await fetch('/api/agency/crm/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, value, stage: stageId }),
      });
      if (res.ok) {
        fetchDeals();
        fetchStats();
      }
    } catch (err) {
      console.error('[kanban] quick add failed:', err);
    }
  };

  // ── Deal Update from Slide-Over ────────────────────────────────────

  const handleDealUpdate = async (dealId: string, updates: Partial<CrmDeal>) => {
    try {
      const res = await fetch(`/api/agency/crm/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setDeals(prev => prev.map(d => d.id === dealId ? { ...d, ...updated } : d));
        setSelectedDeal(prev => prev && prev.id === dealId ? { ...prev, ...updated } : prev);
        fetchStats();
      }
    } catch (err) {
      console.error('[kanban] update failed:', err);
    }
  };

  const handleDealDelete = async (dealId: string) => {
    try {
      const res = await fetch(`/api/agency/crm/deals/${dealId}`, { method: 'DELETE' });
      if (res.ok) {
        setDeals(prev => prev.filter(d => d.id !== dealId));
        setSelectedDeal(null);
        fetchStats();
      }
    } catch (err) {
      console.error('[kanban] delete failed:', err);
    }
  };

  // ── Group deals by stage ───────────────────────────────────────────

  const dealsByStage = STAGES.reduce<Record<string, DealWithRelations[]>>((acc, stage) => {
    acc[stage.id] = deals.filter(d => d.stage === stage.id);
    return acc;
  }, {});

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-8 py-5 border-b border-gray-200 bg-white">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Target className="h-6 w-6 text-indigo-600" />
              Pipeline
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Drag deals between stages to update their status</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search deals..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 w-52"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <StatsBar stats={stats} loading={statsLoading} />
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto px-4 sm:px-6 md:px-8 py-4">
          <div className="flex gap-4 min-w-max">
            {STAGES.map(stage => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStage[stage.id] || []}
                dragOverStage={dragOverStage}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                onDealClick={deal => setSelectedDeal(deal)}
                onQuickAdd={handleQuickAdd}
              />
            ))}
          </div>
        </div>
      )}

      {/* Deal Slide-Over */}
      {selectedDeal && (
        <DealSlideOver
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdate={handleDealUpdate}
          onDelete={handleDealDelete}
        />
      )}
    </div>
  );
}
