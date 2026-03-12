'use client';

import { useState, useEffect } from 'react';

interface Message {
  from: 'contact' | 'ai';
  text: string;
  delay: number;
}

interface DemoChatProps {
  conversation: Message[];
  contactName: string;
  businessName: string;
  accentColor: string;
}

export default function DemoChat({ conversation, contactName, businessName, accentColor }: DemoChatProps) {
  const [visible, setVisible] = useState<number[]>([]);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    let totalDelay = 1200;
    conversation.forEach((_, i) => {
      const delay = totalDelay;
      totalDelay += conversation[i].delay + 600;

      // Show typing indicator before AI messages
      if (conversation[i].from === 'ai') {
        const typingStart = delay - 600;
        setTimeout(() => setTyping(true), typingStart);
        setTimeout(() => {
          setTyping(false);
          setVisible(prev => [...prev, i]);
        }, delay);
      } else {
        setTimeout(() => setVisible(prev => [...prev, i]), delay);
      }
    });
  }, []); // eslint-disable-line

  const initials = contactName.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div className="relative">
      {/* Phone frame */}
      <div className="bg-slate-800 rounded-[2.5rem] p-3 shadow-2xl border border-white/10 max-w-sm mx-auto">
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 text-xs text-slate-400">
          <span>9:41 AM</span>
          <div className="flex gap-1">
            <span>●●●●</span>
            <span>WiFi</span>
            <span>🔋</span>
          </div>
        </div>

        {/* Chat header */}
        <div className="flex items-center gap-3 px-4 pb-3 border-b border-white/10">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: accentColor }}
          >
            {initials}
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{contactName}</p>
            <p className="text-xs text-slate-400">{businessName} • SMS</p>
          </div>
        </div>

        {/* Messages */}
        <div className="p-3 space-y-2 min-h-[400px] overflow-hidden">
          {conversation.map((msg, i) => {
            const isVisible = visible.includes(i);
            const isAI = msg.from === 'ai';
            if (!isVisible) return null;

            return (
              <div
                key={i}
                className={`flex ${isAI ? 'justify-start' : 'justify-end'} animate-fade-in`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isAI
                      ? 'bg-slate-600 text-white rounded-tl-sm'
                      : 'text-white rounded-tr-sm'
                  }`}
                  style={!isAI ? { backgroundColor: accentColor } : undefined}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {typing && (
            <div className="flex justify-start">
              <div className="bg-slate-600 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Kyra badge */}
        <div className="text-center py-2 text-[10px] text-slate-500 flex items-center justify-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Kyra AI · Powered by OpenClaw
        </div>
      </div>

      {/* Replay button */}
      <div className="text-center mt-4">
        <button
          onClick={() => { setVisible([]); setTyping(false); setTimeout(() => window.location.reload(), 50); }}
          className="text-sm text-slate-400 hover:text-white transition underline"
        >
          ↺ Replay demo
        </button>
      </div>
    </div>
  );
}
