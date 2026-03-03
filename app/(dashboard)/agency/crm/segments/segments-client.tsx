'use client';

import { useState, useEffect } from 'react';
import {
  Filter, Plus, Trash2, Save, Loader2, CheckCircle2, X,
  Users, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SegmentFilter {
  field: string;
  operator: string;
  value: string;
}

interface Segment {
  id: string;
  name: string;
  emoji: string;
  filters: SegmentFilter[];
  count?: number;
  created_at: string;
}

const FILTER_FIELDS = [
  { value: 'stage', label: 'Stage' },
  { value: 'score', label: 'Score' },
  { value: 'source', label: 'Source' },
  { value: 'tags', label: 'Tags' },
  { value: 'company', label: 'Company' },
  { value: 'city', label: 'City' },
  { value: 'last_activity', label: 'Last Activity' },
];

const OPERATORS: Record<string, { value: string; label: string }[]> = {
  stage: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'in', label: 'is one of' },
  ],
  score: [
    { value: 'gt', label: 'greater than' },
    { value: 'lt', label: 'less than' },
    { value: 'eq', label: 'equals' },
  ],
  source: [
    { value: 'eq', label: 'is' },
    { value: 'neq', label: 'is not' },
    { value: 'contains', label: 'contains' },
  ],
  tags: [
    { value: 'contains', label: 'has tag' },
    { value: 'not_in', label: 'missing tag' },
  ],
  company: [
    { value: 'eq', label: 'is' },
    { value: 'contains', label: 'contains' },
    { value: 'is_set', label: 'is set' },
    { value: 'not_set', label: 'is not set' },
  ],
  city: [
    { value: 'eq', label: 'is' },
    { value: 'contains', label: 'contains' },
  ],
  last_activity: [
    { value: 'gt', label: 'within' },
    { value: 'lt', label: 'older than' },
  ],
};

const EMOJIS = ['🎯', '🔥', '⭐', '💎', '🚀', '💼', '🏆', '📊', '🎪', '🌟', '💡', '🦄'];

export function SegmentsClient() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  // New segment form
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🎯');
  const [newFilters, setNewFilters] = useState<SegmentFilter[]>([
    { field: 'stage', operator: 'eq', value: '' },
  ]);

  useEffect(() => {
    fetch('/api/agency/crm/segments')
      .then(r => r.json())
      .then(d => setSegments(d.segments || []))
      .finally(() => setLoading(false));
  }, []);

  const addFilter = () => {
    setNewFilters(prev => [...prev, { field: 'stage', operator: 'eq', value: '' }]);
  };

  const removeFilter = (idx: number) => {
    setNewFilters(prev => prev.filter((_, i) => i !== idx));
  };

  const updateFilter = (idx: number, updates: Partial<SegmentFilter>) => {
    setNewFilters(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f));
  };

  const saveSegment = async () => {
    if (!newName.trim()) return;
    setSaving(true);

    const segment: Segment = {
      id: editingId || `seg-${Date.now()}`,
      name: newName,
      emoji: newEmoji,
      filters: newFilters.filter(f => f.value || f.operator === 'is_set' || f.operator === 'not_set'),
      created_at: new Date().toISOString(),
    };

    await fetch('/api/agency/crm/segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save',
        segment,
      }),
    });

    if (editingId) {
      setSegments(prev => prev.map(s => s.id === editingId ? segment : s));
    } else {
      setSegments(prev => [...prev, segment]);
    }

    setSaving(false);
    setSaved(true);
    setShowNew(false);
    setEditingId(null);
    setNewName('');
    setNewEmoji('🎯');
    setNewFilters([{ field: 'stage', operator: 'eq', value: '' }]);
    setTimeout(() => setSaved(false), 2000);
  };

  const deleteSegment = async (id: string) => {
    await fetch('/api/agency/crm/segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', segmentId: id }),
    });
    setSegments(prev => prev.filter(s => s.id !== id));
  };

  const editSegment = (seg: Segment) => {
    setEditingId(seg.id);
    setNewName(seg.name);
    setNewEmoji(seg.emoji);
    setNewFilters(seg.filters.length > 0 ? seg.filters : [{ field: 'stage', operator: 'eq', value: '' }]);
    setShowNew(true);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Filter className="h-6 w-6 text-indigo-600" /> Saved Segments
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Save contact filters as reusable segments — quickly find hot leads, cold contacts, or any group
          </p>
        </div>
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={() => {
            setShowNew(true);
            setEditingId(null);
            setNewName('');
            setNewEmoji('🎯');
            setNewFilters([{ field: 'stage', operator: 'eq', value: '' }]);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> New Segment
        </Button>
      </div>

      {/* New/Edit Segment Form */}
      {showNew && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {editingId ? 'Edit Segment' : 'New Segment'}
            </h3>
            <button onClick={() => { setShowNew(false); setEditingId(null); }} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Name + Emoji */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={newEmoji}
                  onChange={e => setNewEmoji(e.target.value)}
                  className="text-xl bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 appearance-none cursor-pointer"
                >
                  {EMOJIS.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Segment name (e.g. Hot Leads)"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            {/* Filters */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Filters</p>
              <div className="space-y-2">
                {newFilters.map((filter, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <select
                      value={filter.field}
                      onChange={e => {
                        const field = e.target.value;
                        const ops = OPERATORS[field] || OPERATORS.stage;
                        updateFilter(idx, { field, operator: ops[0].value, value: '' });
                      }}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-full sm:w-32"
                    >
                      {FILTER_FIELDS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>

                    <select
                      value={filter.operator}
                      onChange={e => updateFilter(idx, { operator: e.target.value })}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-full sm:w-36"
                    >
                      {(OPERATORS[filter.field] || OPERATORS.stage).map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>

                    {filter.operator !== 'is_set' && filter.operator !== 'not_set' && (
                      <input
                        value={filter.value}
                        onChange={e => updateFilter(idx, { value: e.target.value })}
                        placeholder="Value"
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-full sm:w-auto"
                      />
                    )}

                    <button
                      onClick={() => removeFilter(idx)}
                      className="text-gray-400 hover:text-red-500 transition shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addFilter}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-medium"
              >
                <Plus className="h-3 w-3" /> Add filter
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => { setShowNew(false); setEditingId(null); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={saveSegment}
                disabled={saving || !newName.trim()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {editingId ? 'Update' : 'Save'} Segment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Notification */}
      {saved && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" /> Segment saved!
        </div>
      )}

      {/* Segments List */}
      {segments.length === 0 && !showNew ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Filter className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No saved segments</p>
          <p className="text-sm text-gray-400 mt-1">Create segments to quickly filter contacts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {segments.map(seg => (
            <div
              key={seg.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">{seg.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{seg.name}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {seg.filters.map((f, i) => (
                        <span key={i} className="inline-flex items-center text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {FILTER_FIELDS.find(ff => ff.value === f.field)?.label || f.field} {f.operator} {f.value}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => editSegment(seg)}
                    className="text-xs text-gray-400 hover:text-indigo-600 px-2 py-1 rounded transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteSegment(seg.id)}
                    className="text-gray-400 hover:text-red-500 p-1 rounded transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
