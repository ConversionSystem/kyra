'use client';

import { Message } from '@/types';
import { cn } from '@/lib/utils';
import { User, Sparkles } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 py-4',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      )}
      
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-zinc-800 text-zinc-100'
        )}
      >
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {message.content}
          {isStreaming && (
            <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-current" />
          )}
        </div>
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700">
          <User className="h-4 w-4 text-zinc-300" />
        </div>
      )}
    </div>
  );
}

// Skeleton for loading state
export function MessageSkeleton() {
  return (
    <div className="flex gap-3 py-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="max-w-[80%] rounded-2xl bg-zinc-800 px-4 py-2.5">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-500" />
        </div>
      </div>
    </div>
  );
}
