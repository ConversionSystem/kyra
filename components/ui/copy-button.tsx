'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Clipboard copy button — single source of truth. Replaces 5 near-identical
 * copies previously inlined in marketing-tab, reviews-sub-tab,
 * campaigns-sub-tab, funnels-sub-tab, sms-campaigns-sub-tab.
 */
export function CopyButton({
  text,
  title = 'Copy to clipboard',
  className = 'inline-flex items-center gap-1 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors',
}: {
  text: string;
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={className}
      title={title}
      aria-label={title}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}
