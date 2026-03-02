'use client';

import { useState } from 'react';
import { Sparkles, Loader2, X, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuggestButtonProps {
  type: string;
  context?: Record<string, string>;
  label?: string;
  onSelect?: (suggestion: string) => void;
  className?: string;
}

export function AISuggestButton({ type, context, label, onSelect, className }: SuggestButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  const fetchSuggestions = async () => {
    if (suggestions.length > 0) {
      setOpen(!open);
      return;
    }
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch('/api/agency/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSelect = (text: string) => {
    if (onSelect) {
      onSelect(text);
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${className || ''}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={fetchSuggestions}
        className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
      >
        <Sparkles className="h-3.5 w-3.5 mr-1" />
        {label || 'AI Suggest'}
      </Button>

      {open && (
        <div className="absolute z-50 mt-2 w-[400px] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden right-0 sm:left-0 sm:right-auto">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
            <span className="text-sm font-semibold text-indigo-700 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" /> AI Suggestions
            </span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <div className="py-8 text-center text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                <span className="text-xs">Generating suggestions...</span>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">No suggestions available</div>
            ) : (
              <div className="space-y-1">
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="group p-3 rounded-lg hover:bg-gray-50 transition cursor-pointer flex items-start gap-2"
                    onClick={() => handleSelect(s)}
                  >
                    <span className="text-xs text-gray-400 font-mono mt-0.5 shrink-0">{i + 1}.</span>
                    <p className="text-sm text-gray-700 flex-1 whitespace-pre-wrap line-clamp-3">{s}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopy(s, i); }}
                      className="opacity-0 group-hover:opacity-100 transition shrink-0 mt-0.5"
                      title="Copy"
                    >
                      {copied === i ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/60">
            <p className="text-[10px] text-gray-400">Click a suggestion to use it, or copy to clipboard</p>
          </div>
        </div>
      )}
    </div>
  );
}
