'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, ArrowUp } from 'lucide-react';

interface Message { role: 'user' | 'assistant'; content: string; }

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}

function AssistantAvatar({ name }: { name: string }) {
  return (
    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function PortalChat({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Hi! I'm ${clientName}. How can I help you today?` },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setSending(true);

    try {
      const res = await fetch(`/api/portal/${clientId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('no reader');

      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.type === 'content' && parsed.content) {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') updated[updated.length - 1] = { ...last, content: last.content + parsed.content };
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant' && !last.content) updated[updated.length - 1] = { ...last, content: '⚠️ Could not reach the AI. Try again.' };
        return updated;
      });
    }

    setSending(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[280px] max-h-[420px]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start gap-2.5'}`}>
            {m.role === 'assistant' && <AssistantAvatar name={clientName} />}
            <div className="max-w-[78%]">
              <div className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-white/5 border border-gray-700/50 text-gray-100 shadow-sm rounded-bl-md'
              }`}>
                {m.content || (sending && i === messages.length - 1 ? (
                  <TypingIndicator />
                ) : '')}
              </div>
              {m.role === 'assistant' && i === 0 && (
                <p className="text-[10px] text-gray-600 mt-1 ml-1">AI Employee · Powered by Kyra</p>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input — sticky bottom */}
      <div className="border-t border-gray-800 bg-gray-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type your message..."
            disabled={sending}
            className="flex-1 rounded-full border border-gray-700 bg-gray-800 text-white placeholder-gray-500 px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <ArrowUp className="h-4 w-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}
