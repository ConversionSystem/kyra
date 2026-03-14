'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, ArrowRight, Users } from 'lucide-react';

interface Props {
  /** Source tag for Supabase/Resend notification */
  source?: string;
}

export default function LaunchEventCapture({ source = 'march16_launch' }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'loading') return;
    setStatus('loading');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          source,
        }),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="flex items-center gap-2 text-green-600 font-semibold text-lg">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>You&apos;re on the list!</span>
        </div>
        <p className="text-slate-500 text-sm text-center max-w-sm">
          We&apos;ll send you early access and a follow-up after the demo. Check your inbox.
        </p>
        <a
          href="https://twitter.com/intent/tweet?text=Just+signed+up+for+%40KyraAI+%E2%80%94+the+platform+that+turns+%40openclaw+into+agency+revenue.+Dropping+at+the+%40Jason+Launch+event+March+16!+kyra.conversionsystem.com%2Fmarch-16"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition mt-1"
        >
          𝕏 Share on X
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="w-full border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition bg-white"
        />
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="flex-1 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition bg-white"
          />
          <button
            type="submit"
            disabled={status === 'loading' || !email.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-3 rounded-xl text-sm flex items-center gap-1.5 transition disabled:opacity-50 shrink-0 whitespace-nowrap"
          >
            {status === 'loading'
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><span>Get early access</span><ArrowRight className="h-3.5 w-3.5" /></>
            }
          </button>
        </div>
        {status === 'error' && (
          <p className="text-red-500 text-xs">Something went wrong. Try again or email angel@conversionsystem.com</p>
        )}
        <p className="text-slate-400 text-xs text-center flex items-center justify-center gap-1">
          <Users className="h-3 w-3" />
          No spam. Just demo access + launch updates.
        </p>
      </form>
    </div>
  );
}
