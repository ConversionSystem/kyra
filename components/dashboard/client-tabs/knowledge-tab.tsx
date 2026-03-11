'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Globe, Loader2, Trash2, UploadCloud } from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';

interface KnowledgeSource {
  id: string;
  type: 'file' | 'url';
  name: string;
  url?: string;
  size?: number;
  addedAt: string;
}

interface KnowledgeTabProps {
  client: AgencyClient;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['pdf', 'txt', 'md', 'docx', 'csv'];
const ACCEPTED_FILE_INPUT = '.pdf,.txt,.md,.docx,.csv';

function formatFileSize(size?: number) {
  if (!size) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function KnowledgeTab({ client }: KnowledgeTabProps) {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initial = (client.settings?.knowledge_sources as KnowledgeSource[] | undefined) ?? [];
    setSources(initial);
    setError(null);
    setLoading(false);
  }, [client.id, client.settings]);

  const persistSources = async (nextSources: KnowledgeSource[]) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/agency/clients/${client.id}/knowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledge_sources: nextSources }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Failed to save knowledge sources');
      }

      setSources(nextSources);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save knowledge sources');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelection = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newItems: KnowledgeSource[] = [];

    Array.from(fileList).forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        setError(`Unsupported file type: ${file.name}`);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`File too large: ${file.name} (max 10MB)`);
        return;
      }

      newItems.push({
        id: crypto.randomUUID(),
        type: 'file',
        name: file.name,
        size: file.size,
        addedAt: new Date().toISOString(),
      });
    });

    if (!newItems.length) return;

    void persistSources([...sources, ...newItems]);
  };

  const addUrl = async () => {
    const raw = urlInput.trim();
    if (!raw) return;

    try {
      const parsed = new URL(raw);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setError('Only HTTP and HTTPS URLs are allowed.');
        return;
      }

      const nextSources: KnowledgeSource[] = [
        ...sources,
        {
          id: crypto.randomUUID(),
          type: 'url',
          name: parsed.hostname,
          url: parsed.toString(),
          addedAt: new Date().toISOString(),
        },
      ];

      await persistSources(nextSources);
      setUrlInput('');
    } catch {
      setError('Please enter a valid URL (e.g. https://example.com).');
    }
  };

  const deleteSource = async (id: string) => {
    await persistSources(sources.filter((source) => source.id !== id));
  };

  const fileSources = sources.filter((source) => source.type === 'file');
  const urlSources = sources.filter((source) => source.type === 'url');

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">Knowledge Base</h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload documents and website links so your AI worker can learn from your business context.
        </p>
      </div>

      {(loading || saving) && (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
          {loading ? 'Loading knowledge sources...' : 'Saving changes...'}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <FileText className="h-4 w-4 text-indigo-600" />
          Training Documents
        </h3>

        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            handleFileSelection(event.dataTransfer.files);
          }}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:border-indigo-300'
          }`}
        >
          <UploadCloud className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm font-medium text-gray-700">Drag & drop files here or click to upload</p>
          <p className="mt-1 text-xs text-gray-500">Accepted: PDF, TXT, MD, DOCX, CSV (max 10MB each)</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_INPUT}
          multiple
          onChange={(event) => handleFileSelection(event.target.files)}
          className="hidden"
        />

        {fileSources.length > 0 && (
          <div className="space-y-2">
            {fileSources.map((source) => (
              <div key={source.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <FileText className="h-4 w-4 shrink-0 text-gray-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{source.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(source.size)} • {formatDate(source.addedAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteSource(source.id)}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-red-600"
                  aria-label={`Delete ${source.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Globe className="h-4 w-4 text-indigo-600" />
          Website Knowledge
        </h3>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void addUrl();
              }
            }}
            placeholder="https://example.com"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="button"
            onClick={() => void addUrl()}
            disabled={!urlInput.trim() || saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Add URL
          </button>
        </div>

        {urlSources.length > 0 && (
          <div className="space-y-2">
            {urlSources.map((source) => (
              <div key={source.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                <Globe className="h-4 w-4 shrink-0 text-gray-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{source.url}</p>
                  <p className="text-xs text-gray-500">Added {formatDate(source.addedAt)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteSource(source.id)}
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-red-600"
                  aria-label={`Delete ${source.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {!loading && sources.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600">
          No training documents yet. Upload files or add website URLs to expand your AI worker&apos;s knowledge.
        </div>
      )}
    </div>
  );
}
