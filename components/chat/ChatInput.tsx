'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, Loader2, Paperclip, X } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string, imageUrl?: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !imageUrl) || isLoading || disabled) return;
    onSend(message.trim() || 'What is this image?', imageUrl || undefined);
    setMessage('');
    setImagePreview(null);
    setImageUrl(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);

    // Upload to server
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/files/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setImageUrl(data.url);
    } catch {
      setImagePreview(null);
      setImageUrl(null);
    } finally {
      setUploading(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageUrl(null);
  };

  const canSend = (message.trim() || imageUrl) && !isLoading && !disabled && !uploading;

  return (
    <form onSubmit={handleSubmit} className="relative">
      {imagePreview && (
        <div className="mb-2 flex items-start gap-2">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 w-20 rounded-lg object-cover border border-zinc-700"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
            <button
              type="button"
              onClick={removeImage}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
      <div className="flex items-end gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 p-2 shadow-lg focus-within:border-zinc-600">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || disabled || uploading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors disabled:opacity-30"
          aria-label="Attach image"
        >
          <Paperclip className="h-5 w-5" />
        </button>
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
          disabled={!canSend}
          className="h-10 w-10 shrink-0 rounded-full bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-30"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
