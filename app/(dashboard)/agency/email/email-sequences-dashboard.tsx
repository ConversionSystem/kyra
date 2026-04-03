'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail, Plus, Play, Pause, FileText,
  TrendingUp, Users, Send, BarChart3,
  Loader2, MoreHorizontal, Trash2, Eye,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SequenceBuilder } from './sequence-builder';

// ─── Types ──────────────────────────────────────────────────────────────

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused';
  total_enrolled: number;
  total_completed: number;
  step_count: number;
  active_enrollments: number;
  created_at: string;
  updated_at: string;
}

interface QuickStats {
  totalSequences: number;
  totalEnrolled: number;
  avgOpenRate: number;
  emailsSentToday: number;
}

// ─── Status Badge ───────────────────────────────────────────────────────

const statusConfig = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  paused: { label: 'Paused', className: 'bg-amber-50 text-amber-700 border-amber-200' },
};

// ─── Dashboard ──────────────────────────────────────────────────────────

export function EmailSequencesDashboard() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSequences = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/email/sequences');
      if (res.ok) {
        const data = await res.json();
        setSequences(data.sequences || []);
      }
    } catch (err) {
      console.error('Failed to fetch sequences:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  // Close menus on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => setMenuOpen(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  const stats: QuickStats = {
    totalSequences: sequences.length,
    totalEnrolled: sequences.reduce((sum, s) => sum + (s.active_enrollments || 0), 0),
    avgOpenRate: 0, // computed from analytics when available
    emailsSentToday: 0,
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/agency/email/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowNewForm(false);
        setNewName('');
        setNewDescription('');
        setSelectedSequenceId(data.sequence.id);
        fetchSequences();
      }
    } catch (err) {
      console.error('Failed to create sequence:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/agency/email/sequences/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSequences(prev => prev.filter(s => s.id !== id));
        if (selectedSequenceId === id) setSelectedSequenceId(null);
      }
    } catch (err) {
      console.error('Failed to delete sequence:', err);
    } finally {
      setDeletingId(null);
      setMenuOpen(null);
    }
  };

  const handleToggleStatus = async (seq: Sequence) => {
    const newStatus = seq.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`/api/agency/email/sequences/${seq.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setSequences(prev =>
          prev.map(s => (s.id === seq.id ? { ...s, status: newStatus } : s)),
        );
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // ─── Sequence Builder View ────────────────────────────────────────────

  if (selectedSequenceId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="border-b bg-white px-6 py-3">
          <button
            onClick={() => {
              setSelectedSequenceId(null);
              fetchSequences();
            }}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sequences
          </button>
        </div>
        <SequenceBuilder sequenceId={selectedSequenceId} />
      </div>
    );
  }

  // ─── Dashboard View ───────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-500" />
              Email Sequences
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Automated email flows to nurture leads and close deals
            </p>
          </div>
          <Button
            onClick={() => setShowNewForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Sequence
          </Button>
        </div>
      </div>

      <div className="px-6 py-6 max-w-6xl">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Sequences', value: stats.totalSequences, icon: FileText, color: 'text-indigo-500' },
            { label: 'Active Contacts', value: stats.totalEnrolled, icon: Users, color: 'text-emerald-500' },
            { label: 'Avg Open Rate', value: `${stats.avgOpenRate}%`, icon: TrendingUp, color: 'text-blue-500' },
            { label: 'Sent Today', value: stats.emailsSentToday, icon: Send, color: 'text-purple-500' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={cn('h-4 w-4', stat.color)} />
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* New Sequence Form */}
        {showNewForm && (
          <div className="bg-white rounded-xl border border-indigo-200 p-5 mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Create New Sequence</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Sequence name (e.g., New Client Welcome)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                  Create
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowNewForm(false); setNewName(''); setNewDescription(''); }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}

        {/* Empty State */}
        {!loading && sequences.length === 0 && (
          <div className="text-center py-20">
            <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No sequences yet</h3>
            <p className="text-sm text-gray-500 mb-4">
              Create your first email sequence to start nurturing leads automatically.
            </p>
            <Button
              onClick={() => setShowNewForm(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Sequence
            </Button>
          </div>
        )}

        {/* Sequences List */}
        {!loading && sequences.length > 0 && (
          <div className="space-y-3">
            {sequences.map((seq) => {
              const config = statusConfig[seq.status];
              return (
                <div
                  key={seq.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors cursor-pointer group"
                  onClick={() => setSelectedSequenceId(seq.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {seq.name}
                        </h3>
                        <Badge className={cn('text-[10px] px-1.5 py-0 border', config.className)}>
                          {config.label}
                        </Badge>
                      </div>
                      {seq.description && (
                        <p className="text-xs text-gray-500 mb-2 truncate">{seq.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {seq.step_count} step{seq.step_count !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {seq.active_enrollments} enrolled
                        </span>
                        <span className="flex items-center gap-1">
                          <Send className="h-3.5 w-3.5" />
                          {seq.total_enrolled || 0} total
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 ml-4">
                      {seq.status !== 'draft' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleStatus(seq); }}
                          className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            seq.status === 'active'
                              ? 'text-amber-500 hover:bg-amber-50'
                              : 'text-emerald-500 hover:bg-emerald-50',
                          )}
                          title={seq.status === 'active' ? 'Pause' : 'Activate'}
                        >
                          {seq.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                      )}
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === seq.id ? null : seq.id); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuOpen === seq.id && (
                          <div className="absolute right-0 top-8 z-10 bg-white rounded-lg border shadow-lg py-1 w-40">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedSequenceId(seq.id); setMenuOpen(null); }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View / Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedSequenceId(seq.id); setMenuOpen(null); }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <BarChart3 className="h-3.5 w-3.5" />
                              Analytics
                            </button>
                            <hr className="my-1" />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(seq.id); }}
                              disabled={deletingId === seq.id}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              {deletingId === seq.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
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
