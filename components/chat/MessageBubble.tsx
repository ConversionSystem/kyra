'use client';

import { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Sparkles, Copy, Check } from 'lucide-react';
import { VoiceButton } from './VoiceButton';
import { SearchResults, parseSearchContext, stripSearchContext } from './SearchResults';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useCallback, useMemo } from 'react';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const searchContext = useMemo(
    () => (!isUser ? parseSearchContext(message.content) : null),
    [isUser, message.content]
  );
  const displayContent = useMemo(
    () => (searchContext ? stripSearchContext(message.content) : message.content),
    [searchContext, message.content]
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [displayContent]);

  if (isUser) {
    return (
      <div className="group py-4 md:py-6">
        <div className="mx-auto max-w-3xl px-4 md:px-0">
          <div className="mb-1 text-xs font-medium text-zinc-500">You</div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group py-4 md:py-6">
      <div className="mx-auto max-w-3xl px-4 md:px-0">
        <div className="mb-1 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-medium text-zinc-500">Kyra</span>
        </div>

        {searchContext && (
          <SearchResults query={searchContext.query} sources={searchContext.sources} />
        )}

        <div className="prose prose-invert prose-sm max-w-none
          prose-p:leading-relaxed prose-p:my-2
          prose-headings:text-zinc-100 prose-headings:font-semibold
          prose-h1:text-xl prose-h1:mt-6 prose-h1:mb-3
          prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-2
          prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
          prose-strong:text-zinc-100 prose-strong:font-semibold
          prose-code:text-violet-300 prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-700 prose-pre:rounded-xl prose-pre:my-3
          prose-a:text-violet-400 prose-a:no-underline hover:prose-a:underline
          prose-ul:my-2 prose-ol:my-2
          prose-li:my-0.5 prose-li:text-zinc-300
          prose-blockquote:border-violet-500 prose-blockquote:text-zinc-400 prose-blockquote:not-italic
          prose-table:text-sm
          prose-th:text-zinc-300 prose-th:border-zinc-700 prose-th:px-3 prose-th:py-2
          prose-td:border-zinc-700 prose-td:px-3 prose-td:py-2
          prose-hr:border-zinc-700
          text-zinc-300"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              pre({ children }) {
                return <pre className="relative group/code overflow-x-auto">{children}</pre>;
              },
              table({ children }) {
                return <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0"><table>{children}</table></div>;
              },
              ul({ children }) {
                return <ul className="space-y-1">{children}</ul>;
              },
              ol({ children }) {
                return <ol className="space-y-1">{children}</ol>;
              },
            }}
          >
            {displayContent}
          </ReactMarkdown>
          {isStreaming && (
            <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-violet-400" />
          )}
        </div>

        {!isStreaming && message.content.length > 10 && (
          <div className="mt-2 flex items-center gap-1 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300 min-h-[44px] md:min-h-0"
            >
              {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
            </button>
            <VoiceButton text={message.content} />
          </div>
        )}
      </div>
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="py-4 md:py-6">
      <div className="mx-auto max-w-3xl px-4 md:px-0">
        <div className="mb-1 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-medium text-zinc-500">Kyra</span>
        </div>
        <div className="flex items-center gap-1 pt-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-600 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-600 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-600" />
        </div>
      </div>
    </div>
  );
}
