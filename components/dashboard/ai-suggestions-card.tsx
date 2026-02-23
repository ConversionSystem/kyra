'use client';

import { useState } from 'react';
import { Sparkles, Loader2, LightbulbIcon, ChevronRight } from 'lucide-react';

interface Suggestion {
  title: string;
  problem: string;
  fix: string;
}

interface Props {
  clientId: string;
}

export default function AISuggestionsCard({ clientId }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'empty' | 'error'>('idle');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [analyzed, setAnalyzed] = useState(0);
  const [message, setMessage] = useState('');

  const analyze = async () => {
    setState('loading');
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/ai-suggestions`);
      const data = await res.json();
      if (!res.ok) { setState('error'); return; }
      if (data.suggestions?.length === 0) { setMessage(data.message ?? ''); setState('empty'); return; }
      setSuggestions(data.suggestions ?? []);
      setAnalyzed(data.analyzed ?? 0);
      setState('done');
    } catch { setState('error'); }
  };

  if (state === 'idle') {
    return (
      <button onClick={analyze}
        className="w-full flex items-center gap-3 bg-violet-50 hover:bg-violet-100 border border-violet-100 hover:border-violet-300 rounded-2xl p-4 transition group text-left">
        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-violet-900 text-sm">Analyze AI Performance</p>
          <p className="text-violet-600 text-xs mt-0.5">Scan recent conversations and get 3 specific improvement suggestions</p>
        </div>
        <ChevronRight className="h-4 w-4 text-violet-400 group-hover:text-violet-600 shrink-0 transition" />
      </button>
    );
  }

  if (state === 'loading') {
    return (
      <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-2xl p-4">
        <Loader2 className="h-5 w-5 text-violet-500 animate-spin shrink-0" />
        <p className="text-violet-700 text-sm">Analyzing conversations with AI...</p>
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <p className="text-gray-500 text-sm">{message || 'No suggestions available yet.'}</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
        <p className="text-red-600 text-sm">Analysis failed. Try again later.</p>
        <button onClick={() => setState('idle')} className="text-red-500 text-xs underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-violet-600" />
        <p className="font-bold text-violet-900 text-sm">AI Performance Analysis</p>
        <span className="ml-auto text-xs text-violet-500">{analyzed} conversations analyzed</span>
      </div>
      <div className="space-y-3">
        {suggestions.map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-violet-100 p-4">
            <div className="flex items-start gap-2.5">
              <LightbulbIcon className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900 text-sm mb-1">{s.title}</p>
                <p className="text-xs text-gray-500 mb-1.5"><span className="font-medium text-red-600">Observed:</span> {s.problem}</p>
                <p className="text-xs text-gray-700"><span className="font-medium text-green-700">Fix:</span> {s.fix}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setState('idle')} className="mt-3 text-xs text-violet-500 hover:text-violet-700 transition">
        Run analysis again →
      </button>
    </div>
  );
}
