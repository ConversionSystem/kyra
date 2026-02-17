'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, Loader2, Paperclip, X, FileText } from 'lucide-react';
import { UserFile } from '@/types';

interface AttachedFile {
  file?: File;       // local file not yet uploaded
  uploaded?: UserFile; // file that was uploaded
  uploading?: boolean;
}

interface ChatInputProps {
  onSend: (message: string, attachedFiles?: UserFile[]) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const uploadFile = useCallback(async (file: File): Promise<UserFile | null> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/files', { method: 'POST', body: formData });
      if (response.ok) {
        return await response.json();
      }
      const err = await response.json().catch(() => null);
      console.error('Upload failed:', err?.error || response.status);
      return null;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  }, []);

  const handleFiles = useCallback(async (fileList: FileList) => {
    const newFiles = Array.from(fileList).slice(0, 5); // max 5 at a time
    const pending: AttachedFile[] = newFiles.map(f => ({ file: f, uploading: true }));
    setAttachments(prev => [...prev, ...pending]);

    for (let i = 0; i < newFiles.length; i++) {
      const uploaded = await uploadFile(newFiles[i]);
      setAttachments(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(a => a.file === newFiles[i] && a.uploading);
        if (idx !== -1) {
          if (uploaded) {
            updated[idx] = { uploaded };
          } else {
            updated.splice(idx, 1); // remove failed upload
          }
        }
        return updated;
      });
    }
  }, [uploadFile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const uploadedFiles = attachments
      .filter(a => a.uploaded)
      .map(a => a.uploaded!);
    const hasContent = message.trim() || uploadedFiles.length > 0;
    const stillUploading = attachments.some(a => a.uploading);

    if (hasContent && !isLoading && !disabled && !stillUploading) {
      onSend(message.trim(), uploadedFiles.length > 0 ? uploadedFiles : undefined);
      setMessage('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const stillUploading = attachments.some(a => a.uploading);

  return (
    <form
      onSubmit={handleSubmit}
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`flex flex-col rounded-2xl border bg-zinc-900 p-2 shadow-lg transition-colors focus-within:border-zinc-600 ${
        dragOver ? 'border-indigo-500 bg-indigo-500/5' : 'border-zinc-700'
      }`}>
        {/* Attached files chips */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-2 pt-1 pb-2">
            {attachments.map((att, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-300"
              >
                {att.uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
                ) : (
                  <FileText className="h-3 w-3 text-indigo-400" />
                )}
                <span className="max-w-[120px] truncate">
                  {att.uploaded?.name || att.file?.name || 'file'}
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-zinc-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Paperclip button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || disabled}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-30"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            multiple
          />

          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Kyra..."
            disabled={isLoading || disabled}
            className="min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent p-2 text-base md:text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={(!message.trim() && attachments.length === 0) || isLoading || disabled || stillUploading}
            className="h-10 w-10 shrink-0 rounded-full bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-30"
          >
            {isLoading || stillUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Drag overlay hint */}
      {dragOver && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-dashed border-indigo-500 bg-indigo-500/10 pointer-events-none">
          <span className="text-sm font-medium text-indigo-400">Drop file to attach</span>
        </div>
      )}
    </form>
  );
}
