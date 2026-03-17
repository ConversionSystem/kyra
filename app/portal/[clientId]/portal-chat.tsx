'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Bot, RefreshCw } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PortalChatProps {
  clientName: string;
  agencyName?: string;
  gatewayUrl: string;
  gatewayToken: string;
  accentColor?: string;
  showPoweredByKyra?: boolean;
  companyName?: string;
  logoUrl?: string;
  primaryColor?: string;
}

function timeStr(d: Date) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function PortalChat({
  clientName,
  agencyName,
  gatewayUrl,
  gatewayToken,
  accentColor = '#4f46e5',
  showPoweredByKyra = false,
  companyName,
  logoUrl,
  primaryColor,
}: PortalChatProps) {
  const displayName = companyName || agencyName || 'AI Assistant';
  const headerColor = primaryColor || accentColor;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setError(null);

    // Create assistant placeholder for streaming
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: new Date() }]);

    abortRef.current = new AbortController();

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gatewayToken}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: history,
          stream: true,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`Gateway responded ${res.status}`);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') break;
            try {
              const parsed = JSON.parse(raw);
              const delta = parsed?.choices?.[0]?.delta?.content || '';
              accumulated += delta;
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
              );
            } catch { /* ignore parse errors */ }
          }
        }
      }

      // Fallback: if no stream content, try non-streaming
      if (!accumulated) {
        const fallRes = await fetch(`${gatewayUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${gatewayToken}`,
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages: history,
            stream: false,
          }),
        });
        const fallData = await fallRes.json();
        const content = fallData?.choices?.[0]?.message?.content
          || fallData?.response
          || fallData?.fullResponse
          || 'I had trouble responding. Please try again.';
        accumulated = content;
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: accumulated } : m)
        );
      }

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError('Could not reach the AI. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }, [messages, streaming, gatewayUrl, gatewayToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={displayName} className="h-9 w-9 rounded-full object-contain shrink-0" />
        ) : (
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: headerColor }}
          >
            <Bot className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{clientName} AI</p>
          <p className="text-xs text-gray-400">via {displayName}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-green-600">
          <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse inline-block" />
          Online
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={displayName} className="h-16 w-16 rounded-full object-contain" />
            ) : (
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: headerColor }}
              >
                <Bot className="h-8 w-8" />
              </div>
            )}
            <div>
              <p className="font-semibold text-gray-700">{clientName} AI</p>
              <p className="text-sm text-gray-400 mt-1">How can I help you today?</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="max-w-[80%] space-y-0.5">
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'text-white rounded-tr-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                }`}
                style={msg.role === 'user' ? { backgroundColor: accentColor } : undefined}
              >
                {msg.content || (
                  <span className="flex gap-1 items-center text-gray-400">
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
              <p className={`text-[10px] text-gray-400 ${msg.role === 'user' ? 'text-right' : 'text-left'} px-1`}>
                {timeStr(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {error && (
          <div className="flex justify-center">
            <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
              {error}
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={streaming}
            className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-50 disabled:text-gray-400"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim() || streaming}
            className="h-10 w-10 rounded-full flex items-center justify-center text-white transition disabled:opacity-50 shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            {streaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
        {!companyName && (
          showPoweredByKyra ? (
            <a
              href="https://kyra.conversionsystem.com/solo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 mt-2 py-1 text-[10px] text-gray-400 hover:text-gray-600 transition group"
            >
              <span className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5 group-hover:bg-gray-200 transition">
                <span className="font-semibold text-gray-500">Powered by Kyra</span>
                <span className="text-gray-400">— AI for business</span>
              </span>
            </a>
          ) : (
            <p className="text-center text-[10px] text-gray-300 mt-2">Powered by Kyra AI</p>
          )
        )}
      </div>
    </div>
  );
}
