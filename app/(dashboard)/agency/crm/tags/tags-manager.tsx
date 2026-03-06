'use client';

import { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Edit2, Save, X, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
];

interface CrmTag {
  id: string;
  name: string;
  color: string;
  count?: number;
}

export function TagsManager() {
  const [tags, setTags] = useState<CrmTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/agency/crm/tags')
      .then(r => r.json())
      .then(d => { setTags(d.tags || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const createTag = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch('/api/agency/crm/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', tag: { name: newName.trim(), color: newColor } }),
    });
    if (res.ok) {
      const tag = await res.json();
      setTags(prev => [...prev, { ...tag, count: 0 }]);
      setNewName('');
      setShowAdd(false);
    }
    setSaving(false);
  };

  const updateTag = async (id: string) => {
    setSaving(true);
    await fetch('/api/agency/crm/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', tag: { id, name: editName, color: editColor } }),
    });
    setTags(prev => prev.map(t => t.id === id ? { ...t, name: editName, color: editColor } : t));
    setEditingId(null);
    setSaving(false);
  };

  const deleteTag = async (id: string) => {
    if (!confirm('Delete this tag? It will remain on existing contacts.')) return;
    await fetch('/api/agency/crm/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', tagId: id }),
    });
    setTags(prev => prev.filter(t => t.id !== id));
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between overflow-x-hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="h-6 w-6 text-indigo-600" /> Tags
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Organize contacts with color-coded tags
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="h-4 w-4 mr-1" /> New Tag
        </Button>
      </div>

      {/* Add Tag */}
      {showAdd && (
        <div className="bg-white border border-indigo-200 rounded-xl p-4 space-y-3">
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Tag name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createTag()}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Color:</span>
            {TAG_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full transition ${newColor === c ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={!newName.trim() || saving}
              onClick={createTag}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </div>
        </div>
      )}

      {/* Tags List */}
      {tags.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <Tag className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 font-medium">No tags yet</p>
          <p className="text-sm text-gray-400 mt-1">Create tags to organize your contacts</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {tags.map(tag => (
            <div key={tag.id} className="px-5 py-3 flex items-center gap-4 group hover:bg-gray-50 transition">
              {editingId === tag.id ? (
                <>
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: editColor }} />
                  <input
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    {TAG_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`w-5 h-5 rounded-full ${editColor === c ? 'ring-2 ring-offset-1 ring-indigo-500' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={saving}
                    onClick={() => updateTag(tag.id)}>
                    <Save className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="text-sm font-medium text-gray-900 flex-1">{tag.name}</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Users className="h-3 w-3" /> {tag.count || 0}
                  </span>
                  <button
                    onClick={() => { setEditingId(tag.id); setEditName(tag.name); setEditColor(tag.color); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-indigo-600 transition"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteTag(tag.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
