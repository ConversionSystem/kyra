'use client';

import { useCallback, useEffect, useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Trash2, Loader2 } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface KnowledgeEntry {
  id: string;
  category: string;
  key: string;
  value: string;
  confidence: number;
  source_type: string;
  times_confirmed: number;
  last_confirmed_at: string;
  created_at: string;
}

interface KnowledgeEngineCardProps {
  clientId: string;
}

// ── Category Display Config ───────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  business_fact: { label: 'Business Facts', emoji: '📋', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  customer_pattern: { label: 'Customer Patterns', emoji: '📊', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  conversation_outcome: { label: 'Conversation Insights', emoji: '💬', color: 'bg-green-50 text-green-700 border-green-200' },
  contact_preference: { label: 'Contact Preferences', emoji: '👤', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  product_knowledge: { label: 'Product/Service Details', emoji: '📦', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  correction: { label: 'Corrections', emoji: '✏️', color: 'bg-red-50 text-red-700 border-red-200' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function confidenceBadge(confidence: number): string {
  if (confidence >= 0.9) return 'bg-green-100 text-green-800';
  if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-600';
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function KnowledgeEngineCard({ clientId }: KnowledgeEngineCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/knowledge-engine?limit=100`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (expanded && entries.length === 0 && !loading) {
      fetchEntries();
    }
  }, [expanded, entries.length, loading, fetchEntries]);

  const handleDelete = async (entryId: string, entryValue: string) => {
    // Confirm before destroying an extracted knowledge entry — these are
    // non-trivial to rebuild (they come from conversation history + LLM
    // extraction). A misclick on the small trash icon shouldn't lose them.
    const preview = entryValue.length > 80 ? `${entryValue.slice(0, 80)}…` : entryValue;
    if (!window.confirm(`Remove this knowledge entry?\n\n"${preview}"\n\nYour AI worker will forget this until it re-extracts from a future conversation.`)) {
      return;
    }

    setDeleting(entryId);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/knowledge-engine`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      setTotal((prev) => prev - 1);
    } catch {
      setError('Failed to delete entry');
    } finally {
      setDeleting(null);
    }
  };

  // Group by category
  const grouped = entries.reduce(
    (acc, entry) => {
      if (!acc[entry.category]) acc[entry.category] = [];
      acc[entry.category].push(entry);
      return acc;
    },
    {} as Record<string, KnowledgeEntry[]>,
  );

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm">
      {/* Header (always visible) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-indigo-600" />
          <span className="text-sm font-semibold text-gray-900">Knowledge Engine</span>
          {total > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              {total} {total === 1 ? 'insight' : 'insights'}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mt-3 mb-4">
            Structured knowledge automatically extracted from AI conversations. Your AI worker uses
            these insights to give more consistent, accurate answers over time.
          </p>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading knowledge...</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 p-3 mb-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!loading && entries.length === 0 && !error && (
            <div className="text-center py-8">
              <Brain className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No knowledge extracted yet.</p>
              <p className="text-xs text-gray-400 mt-1">
                Knowledge is automatically extracted from AI conversations with customers.
              </p>
            </div>
          )}

          {!loading && Object.keys(grouped).length > 0 && (
            <div className="space-y-4">
              {Object.entries(grouped).map(([category, items]) => {
                const config = CATEGORY_CONFIG[category] || {
                  label: category,
                  emoji: '📌',
                  color: 'bg-gray-50 text-gray-700 border-gray-200',
                };

                return (
                  <div key={category}>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <span>{config.emoji}</span> {config.label}
                    </h4>
                    <div className="space-y-2">
                      {items.map((entry) => (
                        <div
                          key={entry.id}
                          className={`flex items-start justify-between rounded-lg border px-3 py-2 ${config.color}`}
                        >
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="text-sm font-medium">{entry.value}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${confidenceBadge(entry.confidence)}`}
                              >
                                {Math.round(entry.confidence * 100)}% confident
                              </span>
                              {entry.times_confirmed > 1 && (
                                <span className="text-[10px] text-gray-500">
                                  Confirmed {entry.times_confirmed}×
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400">
                                {formatDate(entry.last_confirmed_at)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(entry.id, entry.value)}
                            disabled={deleting === entry.id}
                            className="p-1 rounded hover:bg-white/50 transition-colors flex-shrink-0"
                            title="Remove this knowledge entry"
                          >
                            {deleting === entry.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
