'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

export default function LeadCapture() {
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
        body: JSON.stringify({ email: email.trim(), source: 'hero' }),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm font-medium py-2">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>You&apos;re on the list! We&apos;ll be in touch shortly.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-sm">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="flex-1 bg-white/10 border border-white/20 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white/15 transition"
      />
      <button
        type="submit"
        disabled={status === 'loading' || !email.trim()}
        className="bg-white text-slate-900 font-bold px-4 py-3 rounded-xl text-sm flex items-center gap-1.5 hover:bg-slate-100 transition disabled:opacity-50 shrink-0"
      >
        {status === 'loading'
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <><span>Notify me</span><ArrowRight className="h-3.5 w-3.5" /></>
        }
      </button>
    </form>
  );
}
