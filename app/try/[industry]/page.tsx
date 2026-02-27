'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { Send, Zap, ArrowRight, Loader2, Share2, Copy, Check as CheckIcon, Linkedin, Mail } from 'lucide-react';
import { pixel } from '@/components/analytics/MetaPixel';

// ── Industry config ───────────────────────────────────────────────────────────
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
const INDUSTRIES: Record<string, {
  name: string; emoji: string; color: string; gradient: string;
  businessName: string; greeting: string;
}> = {
  dental: {
    name: 'Dental', emoji: '🦷', color: '#4f46e5', gradient: 'from-indigo-600 to-violet-600',
    businessName: 'Smile Dental Clinic',
    greeting: "Hi! 👋 I'm Kyra, the AI assistant for Smile Dental. How can I help you today — looking to book an appointment, or have a question about our services?",
  },
  realestate: {
    name: 'Real Estate', emoji: '🏡', color: '#0891b2', gradient: 'from-cyan-600 to-blue-600',
    businessName: 'Summit Realty Group',
    greeting: "Hi there! 🏡 I'm Kyra from Summit Realty. Are you looking to buy, sell, or just exploring the market? I'm here to help!",
  },
  auto: {
    name: 'Auto', emoji: '🚗', color: '#dc2626', gradient: 'from-red-600 to-rose-600',
    businessName: 'AutoMax Dealership',
    greeting: "Hey! 🚗 I'm Kyra at AutoMax. Looking for a specific vehicle, want to schedule a test drive, or just browsing? I'll help you find your perfect car!",
  },
  cannabis: {
    name: 'Cannabis', emoji: '🌿', color: '#16a34a', gradient: 'from-green-600 to-emerald-600',
    businessName: 'Green Leaf Dispensary',
    greeting: "Hi! 🌿 Welcome to Green Leaf. I'm Kyra, your AI budtender. Looking for product recommendations, checking hours, or have a question? I'm here!",
  },
  restaurant: {
    name: 'Restaurant', emoji: '🍽️', color: '#d97706', gradient: 'from-amber-500 to-orange-600',
    businessName: 'The Oak Room',
    greeting: "Welcome to The Oak Room! 🍽️ I'm Kyra. Interested in making a reservation, checking our menu, or planning a special event? Happy to help!",
  },
  medspa: {
    name: 'Med Spa', emoji: '✨', color: '#db2777', gradient: 'from-pink-600 to-rose-600',
    businessName: 'Glow Aesthetic Studio',
    greeting: "Hi! ✨ I'm Kyra at Glow Aesthetic Studio. Curious about our treatments, pricing, or ready to book a consultation? Let's chat!",
  },
  law: {
    name: 'Legal', emoji: '⚖️', color: '#7c3aed', gradient: 'from-violet-600 to-purple-700',
    businessName: 'Sterling Law Group',
    greeting: "Hello, thank you for reaching out to Sterling Law Group. ⚖️ I'm Kyra, our intake assistant. Could you briefly describe what you're dealing with so I can see how we might help?",
  },
  fitness: {
    name: 'Fitness', emoji: '💪', color: '#2563eb', gradient: 'from-blue-600 to-indigo-600',
    businessName: 'Iron Peak Fitness',
    greeting: "Hey! 💪 Welcome to Iron Peak Fitness. I'm Kyra. Interested in membership options, class schedules, or personal training? Let's get you started!",
  },
};

const DEFAULT = INDUSTRIES.dental;

type Message = { role: 'user' | 'assistant'; content: string };

const SUGGESTED: Record<string, string[]> = {
  dental: ["How much is a cleaning?", "Do you accept Delta Dental insurance?", "Can I book for next Tuesday?"],
  realestate: ["I'm looking for a 3-bed home under $500K", "What areas do you cover?", "I want to schedule a showing"],
  auto: ["Show me your SUVs", "What financing options do you have?", "Can I book a test drive?"],
  cannabis: ["What do you recommend for sleep?", "Are you open today?", "Do you have CBD products?"],
  restaurant: ["I need a table for 4 on Saturday", "Do you have vegetarian options?", "What are your hours?"],
  medspa: ["How much is Botox?", "Do you offer free consultations?", "I'd like to book an appointment"],
  law: ["I was in a car accident", "I need help with a divorce", "I have an employment dispute"],
  fitness: ["What's your membership cost?", "Do you offer personal training?", "What classes do you have?"],
};

export default function TryPage({ params }: { params: Promise<{ industry: string }> }) {
  const { industry: initialIndustry } = use(params);
  const [activeIndustry, setActiveIndustry] = useState(initialIndustry in INDUSTRIES ? initialIndustry : 'dental');
  const config = INDUSTRIES[activeIndustry] ?? DEFAULT;
  const suggestions = SUGGESTED[activeIndustry] ?? SUGGESTED.dental;

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: config.greeting },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const [showShare, setShowShare] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Switch industry: reset conversation with new greeting
  const switchIndustry = (ind: string) => {
    if (ind === activeIndustry || sending) return;
    setActiveIndustry(ind);
    setMessages([{ role: 'assistant', content: INDUSTRIES[ind].greeting }]);
    setMsgCount(0);
    setShowShare(false);
    setInput('');
    window.history.replaceState(null, '', `/try/${ind}`);
  };
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fire ViewContent when demo loads — high-intent signal for Meta ads
  useEffect(() => {
    pixel.viewContent(`Demo: ${activeIndustry}`, { content_category: 'Live Demo' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput('');
    setSending(true);
    setMsgCount(c => c + 1);

    const history = messages.slice(-6);
    setMessages(prev => [...prev, { role: 'user', content: msg }, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/try', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: activeIndustry, message: msg, history }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Something went wrong' }));
        setMessages(prev => {
          const upd = [...prev];
          upd[upd.length - 1] = { role: 'assistant', content: err.error ?? 'Something went wrong. Try again!' };
          return upd;
        });
        return;
      }

      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      if (!reader) return;

      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const data = t.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const { content } = JSON.parse(data);
            if (content) {
              setMessages(prev => {
                const upd = [...prev];
                const last = upd[upd.length - 1];
                if (last?.role === 'assistant') upd[upd.length - 1] = { ...last, content: last.content + content };
                return upd;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages(prev => {
        const upd = [...prev];
        upd[upd.length - 1] = { role: 'assistant', content: "Sorry, I'm having trouble connecting. Try again in a moment!" };
        return upd;
      });
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const showSignupNudge = msgCount >= 3;
  const showShareButton = msgCount >= 3;

  const demoUrl = typeof window !== 'undefined' ? window.location.href : `https://kyra.conversionsystem.com/try/${activeIndustry}`;
  const shareText = `I just tried this AI for ${config.businessName} — it answered like a real employee. Try it: ${demoUrl}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(demoUrl)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const emailHref = `mailto:?subject=${encodeURIComponent(`AI that actually works for ${config.businessName}`)}&body=${encodeURIComponent(`Hey,\n\nI just tried this live AI demo — it responds like a real employee (not a chatbot).\n\nTry it here: ${demoUrl}\n\nThis is built on Kyra — an AI platform for GHL agencies. Could be interesting for your clients.`)}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(demoUrl);
    setLinkCopied(true);
    setTimeout(() => { setLinkCopied(false); setShowShare(false); }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <PublicNav />
      {/* Industry switcher */}
      <div className="bg-gray-900 border-b border-white/10 overflow-x-auto">
        <div className="flex items-center gap-1 px-3 py-2 max-w-2xl mx-auto min-w-max">
          {Object.entries(INDUSTRIES).map(([key, ind]) => (
            <button key={key} onClick={() => switchIndustry(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                key === activeIndustry
                  ? 'bg-white/15 text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}>
              <span>{ind.emoji}</span> {ind.name}
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <header className={`bg-gradient-to-r ${config.gradient} px-4 py-4 shadow-lg`}>
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl shrink-0">
              {config.emoji}
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">{config.businessName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                <span className="text-white/80 text-xs">Kyra AI · online</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {showShareButton && (
              <div className="relative">
                <button type="button" onClick={() => setShowShare(s => !s)}
                  className="bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition">
                  <Share2 className="h-3 w-3" />
                  Share
                </button>
                {showShare && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-white/10">
                      <p className="text-xs text-gray-400 font-medium">Share this demo</p>
                    </div>
                    <button type="button" onClick={copyLink}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition text-left">
                      {linkCopied ? <CheckIcon className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-gray-400" />}
                      {linkCopied ? 'Copied!' : 'Copy link'}
                    </button>
                    <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition">
                      <Linkedin className="h-4 w-4 text-[#0077b5]" />
                      Share on LinkedIn
                    </a>
                    <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition">
                      <span className="h-4 w-4 text-center text-xs font-black text-gray-400">𝕏</span>
                      Share on X (Twitter)
                    </a>
                    <a href={emailHref}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition">
                      <Mail className="h-4 w-4 text-gray-400" />
                      Email to team
                    </a>
                  </div>
                )}
              </div>
            )}
            <Link
              href="/signup/agency"
              className="bg-white text-gray-900 font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 hover:bg-gray-100 transition"
            >
              <Zap className="h-3 w-3" style={{ color: config.color }} />
              Deploy for my clients
            </Link>
          </div>
        </div>
      </header>

      {/* Info bar */}
      <div className="bg-gray-900/80 border-b border-white/5 px-4 py-2">
        <p className="text-center text-xs text-gray-400 max-w-2xl mx-auto">
          💬 This is a <strong className="text-white">live AI demo</strong> — type anything a real customer would say.{' '}
          <Link href="/demo/dental" className="text-indigo-400 hover:underline">See animated demo →</Link>
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br shrink-0 mr-2 mt-1 flex items-center justify-center text-sm"
                  style={{ background: `linear-gradient(135deg, ${config.color}40, ${config.color})` }}>
                  {config.emoji}
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-gray-100 rounded-bl-sm'
              }`}>
                {m.content || (sending && i === messages.length - 1 ? (
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Typing…
                  </span>
                ) : '')}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {/* Suggested questions (first message only) */}
      {messages.length === 1 && (
        <div className="px-4 pb-2">
          <div className="max-w-2xl mx-auto">
            <p className="text-xs text-gray-500 mb-2 ml-10">Try asking:</p>
            <div className="flex flex-wrap gap-2 ml-10">
              {suggestions.map(s => (
                <button key={s} type="button" onClick={() => send(s)}
                  className="text-xs bg-gray-800 hover:bg-gray-700 border border-white/10 text-gray-300 px-3 py-1.5 rounded-full transition">
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Signup nudge after 3 messages */}
      {showSignupNudge && (
        <div className="px-4 py-2">
          <div className="max-w-2xl mx-auto">
            <div className="bg-indigo-950/80 border border-indigo-500/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <p className="text-sm text-indigo-200">
                🎯 <strong>Like how this works?</strong> Deploy this AI for your clients in minutes.
              </p>
              <Link href="/signup/agency"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 shrink-0 transition">
                Try free <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/10 bg-gray-900 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Message ${config.businessName}…`}
            className="flex-1 bg-gray-800 border border-white/10 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-indigo-500 transition"
            autoFocus
            disabled={sending}
          />
          <button type="button" onClick={() => send()} disabled={sending || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl p-3 transition shrink-0">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        <p className="text-center text-xs text-gray-600 mt-2">
          Powered by <Link href="/" className="text-indigo-400 hover:underline">Kyra AI</Link> ·{' '}
          <Link href="/pricing" className="hover:text-gray-400">See plans</Link> ·{' '}
          <Link href="/demo/dental" className="hover:text-gray-400">More demos</Link>
        </p>
      </div>
      <PublicFooter />
    </div>
  );
}
