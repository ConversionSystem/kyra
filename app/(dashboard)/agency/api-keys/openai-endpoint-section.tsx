'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink, Terminal, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  agencyId: string;
  clients: Array<{ id: string; name: string }>;
}

const INTEGRATIONS = [
  { name: 'n8n', icon: '⚙️', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { name: 'LangChain', icon: '🦜', color: 'bg-green-50 border-green-200 text-green-700' },
  { name: 'Make.com', icon: '🔄', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { name: 'LiteLLM', icon: '🚀', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { name: 'OpenRouter', icon: '🌐', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { name: 'Any OpenAI SDK', icon: '🐍', color: 'bg-gray-50 border-gray-200 text-gray-700' },
];

export function OpenAIEndpointSection({ clients }: Props) {
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? '');
  const [copied, setCopied] = useState<string | null>(null);

  const endpoint = `https://kyra.conversionsystem.com/api/openai/${selectedClientId}/v1`;

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const curlExample = [
    `curl ${endpoint}/chat/completions \\`,
    `  -H "Authorization: Bearer YOUR_KYRA_API_KEY" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"model":"kyra-worker","messages":[{"role":"user","content":"Hello!"}]}'`,
  ].join('\n');

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
          <Terminal className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900">OpenAI-Compatible Endpoint</h3>
            <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">New</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Use any Kyra AI worker as a drop-in replacement for OpenAI in any tool that supports it.
          </p>
        </div>
      </div>

      {clients.length > 1 && (
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select AI Worker</label>
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Base URL</label>
          <div className="flex gap-2">
            <code className="flex-1 px-3 py-2.5 text-xs bg-gray-950 text-emerald-400 rounded-xl font-mono truncate">
              {endpoint}
            </code>
            <button onClick={() => copy(endpoint, 'endpoint')} className="p-2.5 bg-gray-800 text-white rounded-xl hover:bg-gray-700 shrink-0">
              {copied === 'endpoint' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Model Name</label>
          <code className="block px-3 py-2.5 text-xs bg-gray-100 text-gray-800 rounded-xl font-mono">kyra-worker</code>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-gray-700">Example Request</label>
          <button onClick={() => copy(curlExample, 'curl')} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700">
            {copied === 'curl' ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
          </button>
        </div>
        <pre className="bg-gray-950 text-emerald-400 text-[11px] p-4 rounded-xl font-mono leading-relaxed overflow-x-auto">{curlExample}</pre>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">Works with</p>
        <div className="flex flex-wrap gap-2">
          {INTEGRATIONS.map(i => (
            <span key={i.name} className={cn('flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl border', i.color)}>
              <span>{i.icon}</span> {i.name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
        <Zap className="h-3 w-3" />
        Persona, memory, GHL tools — all available via this endpoint
        <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
      </div>
    </div>
  );
}
