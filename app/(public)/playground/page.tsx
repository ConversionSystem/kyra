'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

// Inline template list to avoid importing server module in client component
const TEMPLATES = [
  { id: 'dental', emoji: '🦷', name: 'Dental Practice', industry: 'Dental' },
  { id: 'real-estate', emoji: '🏡', name: 'Real Estate Agent', industry: 'Real Estate' },
  { id: 'cannabis', emoji: '🌿', name: 'Cannabis Dispensary', industry: 'Cannabis' },
  { id: 'law-firm', emoji: '⚖️', name: 'Law Firm', industry: 'Legal' },
  { id: 'restaurant', emoji: '🍽️', name: 'Restaurant', industry: 'Restaurant' },
  { id: 'hvac', emoji: '❄️', name: 'HVAC Company', industry: 'HVAC' },
  { id: 'salon', emoji: '💇', name: 'Hair Salon', industry: 'Salon' },
  { id: 'auto-repair', emoji: '🔧', name: 'Auto Repair Shop', industry: 'Auto Repair' },
  { id: 'gym', emoji: '💪', name: 'Gym & Fitness', industry: 'Fitness' },
  { id: 'plumbing', emoji: '🔧', name: 'Plumbing Company', industry: 'Plumbing' },
  { id: 'medspa', emoji: '💆', name: 'Med Spa', industry: 'Med Spa' },
  { id: 'veterinary', emoji: '🐾', name: 'Veterinary Clinic', industry: 'Veterinary' },
  { id: 'insurance', emoji: '🛡️', name: 'Insurance Agency', industry: 'Insurance' },
  { id: 'roofing', emoji: '🏠', name: 'Roofing Company', industry: 'Roofing' },
  { id: 'cleaning', emoji: '🧹', name: 'Cleaning Service', industry: 'Cleaning' },
  { id: 'photography', emoji: '📸', name: 'Photography Studio', industry: 'Photography' },
  { id: 'accounting', emoji: '📊', name: 'Accounting Firm', industry: 'Accounting' },
  { id: 'mortgage', emoji: '🏦', name: 'Mortgage Broker', industry: 'Mortgage' },
  { id: 'solar', emoji: '☀️', name: 'Solar Company', industry: 'Solar' },
  { id: 'construction', emoji: '🏗️', name: 'Construction Company', industry: 'Construction' },
  { id: 'therapy', emoji: '🧠', name: 'Therapy Practice', industry: 'Therapy' },
  { id: 'tattoo', emoji: '🎨', name: 'Tattoo Studio', industry: 'Tattoo' },
  { id: 'yoga-studio', emoji: '🧘', name: 'Yoga Studio', industry: 'Yoga' },
  { id: 'catering', emoji: '🍱', name: 'Catering Service', industry: 'Catering' },
  { id: 'electrician', emoji: '⚡', name: 'Electrician', industry: 'Electrical' },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function PlaygroundPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof TEMPLATES)[number] | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messagesLeft, setMessagesLeft] = useState(20);
  const [showShare, setShowShare] = useState(false);
  const [search, setSearch] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const filteredTemplates = TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.industry.toLowerCase().includes(search.toLowerCase()),
  );

  const sendMessage = async () => {
    if (!input.trim() || !selectedTemplate || loading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/playground/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          messages: newMessages,
        }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: '⚡ You\'ve reached the demo limit! Sign up at kyra.conversionsystem.com for unlimited AI worker conversations.',
          },
        ]);
        setMessagesLeft(0);
        return;
      }

      if (data.reply) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
        setMessagesLeft(data.messagesLeft ?? messagesLeft - 1);

        // Show share prompt after 3 exchanges
        if (newMessages.length >= 5 && !showShare) {
          setShowShare(true);
        }
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Sorry, something went wrong. Try again!' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getShareText = () => {
    if (!selectedTemplate) return '';
    return `I just talked to an AI ${selectedTemplate.industry.toLowerCase()} worker and it was incredible 🤯\n\nIt handled my questions like a real employee. Try it yourself — pick your industry and chat live:\n\nhttps://kyra.conversionsystem.com/playground`;
  };

  const shareOnX = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareText())}`,
      '_blank',
    );
  };

  const shareOnLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://kyra.conversionsystem.com/playground')}`,
      '_blank',
    );
  };

  const copyLink = () => {
    navigator.clipboard.writeText('https://kyra.conversionsystem.com/playground');
  };

  // Template selection view
  if (!selectedTemplate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
        <PublicNav />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-1.5 text-sm font-medium text-emerald-300 mb-6">
              🎮 Live AI Playground — No signup required
            </div>
            <h1 className="text-4xl sm:text-5xl font-black mb-4">
              Talk to an AI worker. <span className="text-indigo-400">Right now.</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Pick your industry. Chat live with an AI worker trained for your business.
              See exactly what it can do — then deploy your own in minutes.
            </p>
          </div>

          {/* Search */}
          <div className="max-w-md mx-auto mb-8">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search industries..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Template grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {filteredTemplates.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTemplate(t);
                  setMessages([]);
                  setShowShare(false);
                }}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-indigo-400/50 hover:bg-white/[0.07] transition-all text-left group"
              >
                <div className="text-2xl mb-2">{t.emoji}</div>
                <div className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors leading-tight">
                  {t.name}
                </div>
              </button>
            ))}
          </div>

          <p className="text-center text-slate-500 text-sm mt-6">
            25 industries shown · <Link href="/ai-for" className="text-indigo-400 underline">browse all 50+</Link>
          </p>
        </div>
        <PublicFooter />
      </div>
    );
  }

  // Chat view
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white flex flex-col">
      <PublicNav />

      {/* Header */}
      <div className="border-b border-white/10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSelectedTemplate(null); setMessages([]); }}
              className="text-slate-400 hover:text-white transition"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedTemplate.emoji}</span>
              <div>
                <h2 className="font-bold text-sm">{selectedTemplate.name} AI Worker</h2>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-slate-400">Online · Powered by Kyra</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{messagesLeft} msgs left</span>
            <button
              onClick={shareOnX}
              className="bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg text-xs font-medium transition"
            >
              Share ↗
            </button>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Welcome message */}
          <div className="flex gap-3">
            <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm">
              {selectedTemplate.emoji}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[80%]">
              <p className="text-sm text-slate-300">
                Hi! 👋 I&apos;m the AI worker for <strong>{selectedTemplate.name}</strong>. Ask me anything — I can answer questions, book appointments, handle customer inquiries, and more. Try me out!
              </p>
            </div>
          </div>

          {/* Suggestion chips */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 ml-11">
              {getSuggestions(selectedTemplate.id).map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); }}
                  className="bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs px-3 py-1.5 rounded-full hover:bg-indigo-600/30 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  msg.role === 'user' ? 'bg-slate-600' : 'bg-indigo-600'
                }`}
              >
                {msg.role === 'user' ? '👤' : selectedTemplate.emoji}
              </div>
              <div
                className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 rounded-tr-sm'
                    : 'bg-white/5 border border-white/10 rounded-tl-sm'
                }`}
              >
                <p className="text-sm text-slate-100 whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm">
                {selectedTemplate.emoji}
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Share banner */}
      {showShare && (
        <div className="border-t border-indigo-500/30 bg-indigo-950/60 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-sm text-indigo-300">
              🔥 Impressed? Share this with your network!
            </p>
            <div className="flex gap-2">
              <button onClick={shareOnX} className="bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                Share on X
              </button>
              <button onClick={shareOnLinkedIn} className="bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                LinkedIn
              </button>
              <button onClick={copyLink} className="bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg text-xs font-medium transition">
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deploy CTA */}
      {messages.length >= 4 && (
        <div className="border-t border-emerald-500/30 bg-emerald-950/40 px-4 py-2.5">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-sm text-emerald-300">
              ⚡ Want this AI worker for YOUR {selectedTemplate.industry.toLowerCase()} business?
            </p>
            <Link
              href="/solo"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
            >
              Deploy Free →
            </Link>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask the ${selectedTemplate.industry.toLowerCase()} AI worker anything...`}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
              disabled={messagesLeft <= 0}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || messagesLeft <= 0}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-xl transition"
            >
              Send
            </button>
          </form>
          <p className="text-xs text-slate-600 mt-2 text-center">
            Live demo · {messagesLeft} messages remaining · <Link href="/solo" className="text-indigo-400">Deploy your own →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function getSuggestions(templateId: string): string[] {
  const suggestions: Record<string, string[]> = {
    dental: ['What services do you offer?', 'I need to book a cleaning', 'Do you accept insurance?'],
    'real-estate': ['I\'m looking for a 3-bed house', 'What\'s the market like right now?', 'Can you schedule a showing?'],
    cannabis: ['What strains do you have?', 'Do you deliver?', 'What are your hours?'],
    'law-firm': ['I need help with a contract', 'Do you offer free consultations?', 'What areas of law do you practice?'],
    restaurant: ['Can I make a reservation?', 'Do you have vegetarian options?', 'What are your hours?'],
    hvac: ['My AC isn\'t cooling', 'How much for a new furnace?', 'Do you offer maintenance plans?'],
    salon: ['I need a haircut appointment', 'Do you do color?', 'What are your prices?'],
    'auto-repair': ['My check engine light is on', 'How much for an oil change?', 'Do you work on Teslas?'],
    gym: ['What memberships do you offer?', 'Do you have personal trainers?', 'Can I get a free trial?'],
    plumbing: ['I have a leaky faucet', 'My toilet is clogged', 'Do you do emergency calls?'],
  };
  return suggestions[templateId] || ['What services do you offer?', 'How much does it cost?', 'Can I book an appointment?'];
}
