'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Upload,
  Globe,
  FileText,
  Trash2,
  RefreshCw,
  Search,
  X,
  ExternalLink,
  Check,
  AlertCircle,
  ChevronDown,
  Zap,
  Eye,
  EyeOff,
  Link,
} from 'lucide-react';

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  source_type: 'text' | 'url' | 'file';
  source_url: string | null;
  file_name: string | null;
  char_count: number;
  client_id: string | null;
  clientName: string;
  enabled: boolean;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total: number;
  enabled: number;
  totalChars: number;
  synced: number;
  unsynced: number;
}

interface Client {
  id: string;
  name: string;
}

function formatChars(n: number): string {
  if (n < 1000) return `${n} chars`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K chars`;
  return `${(n / 1_000_000).toFixed(1)}M chars`;
}

function formatTimeAgo(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function KnowledgeClient({ clients }: { clients: Client[] }) {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<'text' | 'url'>('text');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [saving, setSaving] = useState(false);

  // Expanded doc
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (clientFilter) params.set('client', clientFilter);
      const res = await fetch(`/api/agency/knowledge?${params}`);
      if (!res.ok) throw new Error('Failed to fetch knowledge base');
      const data = await res.json();
      setDocuments(data.documents || []);
      setStats(data.stats || null);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientFilter]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleCreateText = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/agency/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          clientId: newClientId || null,
          sourceType: 'text',
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create');
      }
      resetCreate();
      fetchDocs();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImportUrl = async () => {
    if (!newUrl.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/agency/knowledge/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newUrl.trim(),
          title: newTitle.trim() || undefined,
          clientId: newClientId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to import');
      }
      const data = await res.json();
      resetCreate();
      fetchDocs();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (doc: KnowledgeDoc) => {
    try {
      const res = await fetch('/api/agency/knowledge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id, enabled: !doc.enabled }),
      });
      if (res.ok) {
        setDocuments(prev => prev.map(d =>
          d.id === doc.id ? { ...d, enabled: !d.enabled } : d
        ));
      }
    } catch { /* ignore */ }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
      await fetch(`/api/agency/knowledge?id=${docId}`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch { /* ignore */ }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/agency/knowledge/sync', { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSyncResult(`Synced ${data.synced} documents (${formatChars(data.totalChars)}) to gateway`);
      fetchDocs();
    } catch (err: any) {
      setSyncResult(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const resetCreate = () => {
    setShowCreate(false);
    setNewTitle('');
    setNewContent('');
    setNewUrl('');
    setNewClientId('');
  };

  const filteredDocs = documents.filter(doc => {
    if (search) {
      const q = search.toLowerCase();
      return doc.title.toLowerCase().includes(q) || doc.content.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      {stats && stats.total > 0 && (
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-gray-500">
            <span className="font-semibold text-gray-900">{stats.total}</span> documents
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">
            <span className="font-semibold text-gray-900">{formatChars(stats.totalChars)}</span> total
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">
            <span className="font-semibold text-green-600">{stats.synced}</span> synced
          </span>
          {stats.unsynced > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-amber-600 font-medium">
                {stats.unsynced} pending sync
              </span>
            </>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          {clients.length > 0 && (
            <select
              value={clientFilter}
              onChange={e => { setClientFilter(e.target.value); setLoading(true); }}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={handleSync}
            disabled={syncing || !documents.length}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <Zap className={`h-3.5 w-3.5 ${syncing ? 'animate-pulse' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync to AI'}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Knowledge
          </button>
        </div>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className={`rounded-lg p-3 text-sm ${
          syncResult.includes('failed')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {syncResult}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Add Knowledge</h3>
            <button onClick={resetCreate} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setCreateMode('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border ${
                createMode === 'text'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Text / FAQ
            </button>
            <button
              onClick={() => setCreateMode('url')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border ${
                createMode === 'url'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              <Link className="h-3.5 w-3.5" />
              Import from URL
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder={createMode === 'url' ? 'Auto-detected from page (optional)' : 'e.g., Business Hours, Pricing, FAQ...'}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {clients.length > 0 && (
                <div className="w-48">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Assign to</label>
                  <select
                    value={newClientId}
                    onChange={e => setNewClientId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Clients (shared)</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {createMode === 'text' ? (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  rows={8}
                  placeholder={"Paste your business knowledge here...\n\nExamples:\n• FAQ answers\n• Product details\n• Business hours & policies\n• Service descriptions\n• Pricing information"}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">{newContent.length.toLocaleString()} characters</p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">URL to import</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://example.com/about"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  We&apos;ll extract the text content from this page. Works best with about pages, FAQs, docs.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={resetCreate} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={createMode === 'text' ? handleCreateText : handleImportUrl}
                disabled={saving || (createMode === 'text' ? (!newTitle.trim() || !newContent.trim()) : !newUrl.trim())}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? (createMode === 'url' ? 'Importing...' : 'Saving...') : (createMode === 'url' ? 'Import Page' : 'Add Document')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documents List */}
      {filteredDocs.length === 0 && !showCreate ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-emerald-50 rounded-xl mb-4">
            <BookOpen className="h-10 w-10 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {search ? 'No matching documents' : 'No knowledge yet'}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mb-4">
            {search
              ? 'Try a different search term'
              : 'Add business knowledge so your AI workers can answer customer questions accurately.'
            }
          </p>
          {!search && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add Your First Document
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map(doc => (
            <div
              key={doc.id}
              className={`rounded-xl border bg-white transition-colors ${
                doc.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}
            >
              {/* Header */}
              <div
                className="flex items-start justify-between gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {doc.source_type === 'url' ? (
                      <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                    <h4 className="text-sm font-semibold text-gray-900 truncate">{doc.title}</h4>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{formatChars(doc.char_count)}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className={`text-xs ${
                      doc.client_id ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {doc.clientName}
                    </span>
                    {doc.synced_at && (
                      <>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="flex items-center gap-0.5 text-xs text-green-600">
                          <Check className="h-3 w-3" />
                          Synced {formatTimeAgo(doc.synced_at)}
                        </span>
                      </>
                    )}
                    {!doc.synced_at && (
                      <>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-amber-500">Not synced</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); handleToggle(doc); }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title={doc.enabled ? 'Disable' : 'Enable'}
                  >
                    {doc.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(doc.id); }}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
                    expandedId === doc.id ? 'rotate-180' : ''
                  }`} />
                </div>
              </div>

              {/* Expanded Content */}
              {expandedId === doc.id && (
                <div className="border-t border-gray-100 px-4 py-3">
                  {doc.source_url && (
                    <a
                      href={doc.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-500 hover:underline mb-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {doc.source_url}
                    </a>
                  )}
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap max-h-80 overflow-y-auto font-mono bg-gray-50 rounded-lg p-3">
                    {doc.content.length > 5000
                      ? doc.content.substring(0, 5000) + '\n\n... [truncated]'
                      : doc.content
                    }
                  </pre>
                  <p className="text-xs text-gray-400 mt-2">
                    Created {new Date(doc.created_at).toLocaleString()} · Updated {formatTimeAgo(doc.updated_at)}
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
