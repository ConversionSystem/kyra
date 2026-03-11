'use client';

import { useState, useRef } from 'react';
import { Upload, Trash2, Globe, FileText, Plus, Loader2 } from 'lucide-react';

interface KnowledgeSource {
  id: string;
  type: 'file' | 'url';
  name: string;
  url?: string;
  size?: number;
  addedAt: string;
}

interface Props {
  client: { id: string; settings?: Record<string, unknown> | null };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ACCEPTED = '.pdf,.txt,.md,.docx,.csv';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function KnowledgeTab({ client }: Props) {
  const initial = ((client.settings as Record<string, unknown>)?.knowledge_sources as KnowledgeSource[]) || [];
  const [sources, setSources] = useState<KnowledgeSource[]>(initial);
  const [urlInput, setUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async (updated: KnowledgeSource[]) => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/agency/clients/${client.id}/knowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledge_sources: updated }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSources(updated);
    } catch {
      setError('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newSources: KnowledgeSource[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > MAX_SIZE) {
        setError(`${f.name} exceeds 10MB limit`);
        continue;
      }
      newSources.push({
        id: crypto.randomUUID(),
        type: 'file',
        name: f.name,
        size: f.size,
        addedAt: new Date().toISOString(),
      });
    }
    if (newSources.length > 0) {
      save([...sources, ...newSources]);
    }
  };

  const addUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must start with http:// or https://');
      return;
    }
    const newSource: KnowledgeSource = {
      id: crypto.randomUUID(),
      type: 'url',
      name: new URL(url).hostname,
      url,
      addedAt: new Date().toISOString(),
    };
    save([...sources, newSource]);
    setUrlInput('');
  };

  const remove = (id: string) => {
    save(sources.filter(s => s.id !== id));
  };

  const files = sources.filter(s => s.type === 'file');
  const urls = sources.filter(s => s.type === 'url');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Knowledge Base</h2>
        <p className="text-sm text-gray-500">Upload documents and add website URLs to expand your AI worker&apos;s knowledge</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2 rounded-xl">
          {error}
        </div>
      )}

      {/* Training Documents */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400" />
          Training Documents
        </h3>

        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
        >
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">Drop files here or click to upload</p>
          <p className="text-xs text-gray-500 mt-1">PDF, TXT, MD, DOCX, CSV — max 10MB each</p>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPTED}
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                  <p className="text-xs text-gray-500">{f.size ? formatBytes(f.size) : '—'} · {timeAgo(f.addedAt)}</p>
                </div>
                <button onClick={() => remove(f.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Website Knowledge */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="h-4 w-4 text-gray-400" />
          Website Knowledge
        </h3>

        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addUrl()}
            placeholder="https://example.com/about"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            onClick={addUrl}
            disabled={!urlInput.trim() || isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-xl hover:bg-indigo-600 disabled:opacity-50 transition-colors"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </button>
        </div>

        {urls.length > 0 && (
          <div className="space-y-2">
            {urls.map(u => (
              <div key={u.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
                <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u.url}</p>
                  <p className="text-xs text-gray-500">{u.name} · {timeAgo(u.addedAt)}</p>
                </div>
                <button onClick={() => remove(u.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {sources.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm">No training documents yet.</p>
          <p className="text-xs mt-1">Upload files or add website URLs to expand your AI worker&apos;s knowledge.</p>
        </div>
      )}
    </div>
  );
}
