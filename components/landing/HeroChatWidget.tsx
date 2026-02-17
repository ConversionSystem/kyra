'use client';

import { useState, useRef, useEffect } from 'react';
import { SendIcon, SparklesIcon, Loader2Icon } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  "What can you do?",
  "How are you different from ChatGPT?",
  "What's the weather in New York?",
  "Help me plan my day",
];

export default function HeroChatWidget() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hey! I'm Kyra — your personal AI that remembers everything about you. Unlike other AI chatbots, I learn who you are and get better over time. Try asking me anything 👇" }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isStreaming) return;

    setInput('');
    const userMsg: Message = { role: 'user', content: msg };
    const history = [...messages, userMsg];
    setMessages(history);
    setIsStreaming(true);

    try {
      const res = await fetch('/api/chat/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) !== 0), // skip initial greeting
        }),
      });

      if (res.status === 429) {
        const data = await res.json() as any;
        setRateLimited(true);
        setMessages(prev => [...prev, { role: 'assistant', content: data.message || "You've reached the demo limit! Sign up free to keep chatting." }]);
        setIsStreaming(false);
        return;
      }

      if (!res.ok || !res.body) {
        setMessages(prev => [...prev, { role: 'assistant', content: "Something went wrong. Try again or sign up for the full experience!" }]);
        setIsStreaming(false);
        return;
      }

      // Stream the response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content' && parsed.content) {
              assistantContent += parsed.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection error. Try again!" }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const showSuggestions = messages.length <= 1 && !isStreaming;

  return (
    <div className="bg-gray-950 rounded-2xl border border-gray-800 shadow-2xl shadow-indigo-900/20 overflow-hidden flex flex-col h-[360px]">
      {/* Window bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800/80 bg-gray-900/50 shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs text-gray-400 font-medium flex items-center justify-center gap-1.5">
            <SparklesIcon className="h-3 w-3 text-indigo-400" />
            Try Kyra — Live Demo
          </span>
        </div>
        <div className="w-12" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-indigo-600 rounded-br-md text-white'
                : 'bg-gray-800/80 rounded-bl-md text-gray-200'
            }`}>
              {msg.content || (isStreaming && i === messages.length - 1 ? (
                <span className="flex items-center gap-2 text-gray-400">
                  <Loader2Icon className="h-3 w-3 animate-spin" />
                  Thinking...
                </span>
              ) : null)}
            </div>
          </div>
        ))}

        {/* Suggestion chips */}
        {showSuggestions && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => sendMessage(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-indigo-700/40 bg-indigo-900/20 text-indigo-300 hover:bg-indigo-900/40 hover:border-indigo-600/60 transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 md:px-5 pb-4 md:pb-5 shrink-0">
        {rateLimited ? (
          <a
            href="/signup"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 transition font-semibold text-sm"
          >
            Sign Up Free — 100 Credits/Month
            <SparklesIcon className="h-4 w-4" />
          </a>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex items-center gap-2 bg-gray-800/60 rounded-xl border border-gray-700/50 focus-within:border-indigo-600/50 transition px-4 py-2.5"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Kyra..."
              disabled={isStreaming}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none disabled:opacity-50"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="text-indigo-400 hover:text-indigo-300 disabled:text-gray-600 transition"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
