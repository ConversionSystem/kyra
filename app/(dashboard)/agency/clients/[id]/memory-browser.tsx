'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Database, Save, RefreshCw, Loader2, FileText, AlertTriangle,
  CheckCircle2, Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MemoryFile {
  name: string;
  path: string;
  content: string;
  exists: boolean;
}

interface MemoryBrowserProps {
  clientId: string;
  clientName: string;
}

export function MemoryBrowser({ clientId, clientName }: MemoryBrowserProps) {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});

  const fetchMemory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/memory`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load memory (${res.status})`);
      }
      const data = await res.json();
      setFiles(data.files || []);
      setEditedContent({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load memory');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchMemory(); }, [fetchMemory]);

  const handleSave = async (file: MemoryFile) => {
    const content = editedContent[file.path] ?? file.content;
    setSaving(file.path);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/agency/clients/${clientId}/memory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: file.path, content }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Save failed');
      }

      setSuccess(`${file.name} saved successfully`);
      // Clear edited state for this file
      setEditedContent((prev) => {
        const next = { ...prev };
        delete next[file.path];
        return next;
      });
      // Refresh
      await fetchMemory();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(null);
    }
  };

  const hasChanges = (file: MemoryFile) =>
    editedContent[file.path] !== undefined && editedContent[file.path] !== file.content;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading AI memory...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            AI Memory — {clientName}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            View and edit what this client&apos;s AI worker remembers. Changes are saved directly to the container.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMemory} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-800 rounded-lg text-green-300 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Memory files */}
      {files.length === 0 && !error && (
        <div className="text-center py-12 text-gray-400">
          <Database className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No memory files found for this client&apos;s container.</p>
          <p className="text-sm mt-1">
            The container may not be provisioned yet, or the provisioner doesn&apos;t support memory access.
          </p>
        </div>
      )}

      {files.map((file) => (
        <div key={file.path} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {/* File header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-750 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-white">{file.name}</span>
              <span className="text-xs text-gray-500">{file.path}</span>
              {!file.exists && (
                <span className="text-xs text-yellow-500 bg-yellow-900/30 px-2 py-0.5 rounded">
                  Not created yet
                </span>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => handleSave(file)}
              disabled={saving === file.path || !hasChanges(file)}
              className={hasChanges(file) ? 'bg-indigo-600 hover:bg-indigo-500' : ''}
            >
              {saving === file.path ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Save className="w-3 h-3 mr-1" />
              )}
              {hasChanges(file) ? 'Save Changes' : 'Saved'}
            </Button>
          </div>

          {/* Editor */}
          <textarea
            className="w-full bg-gray-900 text-gray-200 text-sm font-mono p-4 border-0 focus:ring-0 focus:outline-none resize-y"
            rows={Math.max(8, Math.min(25, (editedContent[file.path] ?? file.content).split('\n').length + 2))}
            value={editedContent[file.path] ?? file.content}
            onChange={(e) =>
              setEditedContent((prev) => ({ ...prev, [file.path]: e.target.value }))
            }
            placeholder={`${file.name} content will appear here...`}
            spellCheck={false}
          />
        </div>
      ))}
    </div>
  );
}
