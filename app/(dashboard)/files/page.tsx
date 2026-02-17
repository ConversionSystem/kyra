'use client';

import { useState, useEffect } from 'react';
import { UserFile } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  Trash2,
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  Loader2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <File className="h-5 w-5" />;
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-600" />;
  if (mimeType === 'text/csv') return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('typescript'))
    return <FileCode className="h-5 w-5 text-yellow-600" />;
  if (mimeType.startsWith('text/')) return <FileText className="h-5 w-5 text-blue-600" />;
  return <File className="h-5 w-5 text-gray-500" />;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
  const [files, setFiles] = useState<UserFile[]>([]);
  const [limit, setLimit] = useState(5);
  const [plan, setPlan] = useState('free');
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
        setLimit(data.limit || 5);
        setPlan(data.plan || 'free');
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const newFile = await response.json();
        setFiles((prev) => [newFile, ...prev]);
      } else {
        const err = await response.json();
        alert(err.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this file?')) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/files?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/chat">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Files</h1>
              <p className="text-sm text-gray-500">
                {files.length} of {limit} files ({plan} plan)
              </p>
            </div>
          </div>
          <label>
            <input
              type="file"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading || files.length >= limit}
            />
            <Button asChild disabled={uploading || files.length >= limit}>
              <span className="cursor-pointer">
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload File
              </span>
            </Button>
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Usage bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>Storage used</span>
            <span>{files.length} / {limit} files</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${Math.min(100, (files.length / limit) * 100)}%` }}
            />
          </div>
        </div>

        {/* File list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center">
            <File className="mx-auto mb-4 h-12 w-12 text-gray-500" />
            <h3 className="mb-2 text-lg font-medium text-gray-700">No files uploaded</h3>
            <p className="text-sm text-gray-400">
              Upload files to reference them in your conversations with Kyra.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <Card key={file.id} className="group">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="shrink-0">
                    {getFileIcon(file.mime_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span>{formatFileSize(file.size_bytes)}</span>
                      <span>{file.mime_type?.split('/').pop() || 'file'}</span>
                      <span>{formatDate(file.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={`/api/files/download?id=${file.id}`}
                      className="flex items-center justify-center h-10 w-10 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-[44px] min-w-[44px] text-gray-500 hover:text-red-600"
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingId === file.id}
                    >
                      {deletingId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
