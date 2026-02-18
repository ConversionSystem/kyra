'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  Search,
  Globe,
  Brain,
  Clock,
  Bot,
  Volume2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Tool Definitions ──────────────────────────────────────────────────────────

interface ToolDef {
  id: string;
  name: string;
  icon: string;
  category: 'research' | 'automation' | 'ai' | 'communication' | 'management';
  description: string;
  quickAction?: {
    label: string;
    argName: string;
    placeholder: string;
    type?: 'input' | 'textarea';
  };
}

const TOOLS: ToolDef[] = [
  {
    id: 'web_search',
    name: 'Web Search',
    icon: '🔍',
    category: 'research',
    description: 'Search the web with AI-powered results and citations',
    quickAction: {
      label: 'Search',
      argName: 'query',
      placeholder: 'Search for anything...',
    },
  },
  {
    id: 'web_fetch',
    name: 'Web Fetch',
    icon: '🌐',
    category: 'research',
    description: 'Fetch and extract readable content from any URL',
    quickAction: {
      label: 'Fetch',
      argName: 'url',
      placeholder: 'https://example.com',
    },
  },
  {
    id: 'browser',
    name: 'Browser Control',
    icon: '🖥️',
    category: 'automation',
    description: 'Automated browser — screenshots, navigation, form filling',
    quickAction: {
      label: 'Check Status',
      argName: '_action',
      placeholder: '',
    },
  },
  {
    id: 'cron',
    name: 'Scheduler',
    icon: '⏰',
    category: 'automation',
    description: 'Create scheduled tasks, reminders, and recurring jobs',
    quickAction: {
      label: 'List Jobs',
      argName: '_action',
      placeholder: '',
    },
  },
  {
    id: 'memory_search',
    name: 'Memory Search',
    icon: '🧠',
    category: 'ai',
    description: 'Search through persistent AI memory and knowledge',
    quickAction: {
      label: 'Search Memory',
      argName: 'query',
      placeholder: 'Search memories...',
    },
  },
  {
    id: 'sessions_spawn',
    name: 'Sub-Agent',
    icon: '🤖',
    category: 'ai',
    description: 'Spawn an autonomous AI sub-agent for any task',
    quickAction: {
      label: 'Spawn Agent',
      argName: 'task',
      placeholder: 'Describe the task...',
      type: 'textarea',
    },
  },
  {
    id: 'tts',
    name: 'Text-to-Speech',
    icon: '🔊',
    category: 'communication',
    description: 'Convert text to natural-sounding speech audio',
    quickAction: {
      label: 'Generate Speech',
      argName: 'text',
      placeholder: 'Text to speak...',
      type: 'textarea',
    },
  },
  {
    id: 'sessions_list',
    name: 'Sessions',
    icon: '📋',
    category: 'management',
    description: 'View all active AI sessions and their status',
    quickAction: {
      label: 'List Sessions',
      argName: '_action',
      placeholder: '',
    },
  },
  {
    id: 'nodes',
    name: 'Devices',
    icon: '📱',
    category: 'management',
    description: 'Paired device management and control',
    quickAction: {
      label: 'Check Devices',
      argName: '_action',
      placeholder: '',
    },
  },
];

const CATEGORY_INFO = {
  research: { label: 'Research & Web', icon: Search, color: 'text-blue-400' },
  automation: { label: 'Automation', icon: Zap, color: 'text-amber-400' },
  ai: { label: 'AI & Memory', icon: Brain, color: 'text-purple-400' },
  communication: { label: 'Communication', icon: Volume2, color: 'text-green-400' },
  management: { label: 'Management', icon: Activity, color: 'text-gray-400' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ToolsClient() {
  const [gatewayStatus, setGatewayStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, { loading: boolean; data?: unknown; error?: string }>>({});

  // Check gateway health on mount
  useEffect(() => {
    fetch('/api/openclaw/health')
      .then((r) => r.json())
      .then((data) => setGatewayStatus(data.connected ? 'connected' : 'disconnected'))
      .catch(() => setGatewayStatus('disconnected'));
  }, []);

  const invokeTool = useCallback(async (toolId: string, args: Record<string, unknown>, action?: string) => {
    setResults((prev) => ({ ...prev, [toolId]: { loading: true } }));
    try {
      const body: Record<string, unknown> = { tool: toolId, args };
      if (action) body.action = action;

      const res = await fetch('/api/openclaw/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResults((prev) => ({
        ...prev,
        [toolId]: { loading: false, data: data.ok ? data.result : undefined, error: data.ok ? undefined : (data.error?.message || 'Unknown error') },
      }));
    } catch (err) {
      setResults((prev) => ({ ...prev, [toolId]: { loading: false, error: String(err) } }));
    }
  }, []);

  const handleQuickAction = useCallback((tool: ToolDef) => {
    const qa = tool.quickAction;
    if (!qa) return;

    if (qa.argName === '_action') {
      // Action-based tools (cron list, browser status, etc.)
      const actionMap: Record<string, string> = {
        browser: 'status',
        cron: 'list',
        sessions_list: 'list',
        nodes: 'status',
      };
      invokeTool(tool.id, {}, actionMap[tool.id]);
    } else {
      const value = inputValues[tool.id]?.trim();
      if (!value) return;
      const args: Record<string, unknown> = { [qa.argName]: value };
      if (tool.id === 'web_fetch') args.maxChars = 2000;
      invokeTool(tool.id, args);
    }
  }, [inputValues, invokeTool]);

  const categories = ['research', 'automation', 'ai', 'communication', 'management'] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Tools</h1>
          <p className="text-gray-400 text-sm mt-1">
            Real OpenClaw capabilities — powered by a live AI engine, not a wrapper
          </p>
        </div>
        <div className="flex items-center gap-2">
          {gatewayStatus === 'checking' ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : gatewayStatus === 'connected' ? (
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          ) : (
            <XCircle className="h-4 w-4 text-red-400" />
          )}
          <span className={cn(
            'text-xs font-medium',
            gatewayStatus === 'connected' ? 'text-green-400' : gatewayStatus === 'disconnected' ? 'text-red-400' : 'text-gray-400'
          )}>
            {gatewayStatus === 'checking' ? 'Checking...' : gatewayStatus === 'connected' ? 'OpenClaw Connected' : 'Gateway Offline'}
          </span>
        </div>
      </div>

      {/* Tool Categories */}
      {categories.map((category) => {
        const info = CATEGORY_INFO[category];
        const Icon = info.icon;
        const categoryTools = TOOLS.filter((t) => t.category === category);
        if (categoryTools.length === 0) return null;

        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className={cn('h-4 w-4', info.color)} />
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                {info.label}
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categoryTools.map((tool) => {
                const isExpanded = expandedTool === tool.id;
                const result = results[tool.id];
                const qa = tool.quickAction;

                return (
                  <Card
                    key={tool.id}
                    className={cn(
                      'bg-gray-900 border-gray-800 transition-all cursor-pointer',
                      isExpanded && 'sm:col-span-2 lg:col-span-3 border-gray-700'
                    )}
                  >
                    <CardHeader
                      className="pb-2 cursor-pointer"
                      onClick={() => setExpandedTool(isExpanded ? null : tool.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{tool.icon}</span>
                          <div>
                            <CardTitle className="text-white text-base">{tool.name}</CardTitle>
                            <CardDescription className="text-xs">{tool.description}</CardDescription>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </div>
                    </CardHeader>

                    {isExpanded && qa && (
                      <CardContent className="pt-0 space-y-3">
                        {/* Quick action input */}
                        {qa.argName !== '_action' && (
                          qa.type === 'textarea' ? (
                            <Textarea
                              placeholder={qa.placeholder}
                              value={inputValues[tool.id] || ''}
                              onChange={(e) => setInputValues((prev) => ({ ...prev, [tool.id]: e.target.value }))}
                              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 text-sm"
                              rows={3}
                            />
                          ) : (
                            <Input
                              placeholder={qa.placeholder}
                              value={inputValues[tool.id] || ''}
                              onChange={(e) => setInputValues((prev) => ({ ...prev, [tool.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && handleQuickAction(tool)}
                              className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 text-sm"
                            />
                          )
                        )}

                        <Button
                          onClick={() => handleQuickAction(tool)}
                          disabled={result?.loading || (qa.argName !== '_action' && !inputValues[tool.id]?.trim())}
                          size="sm"
                          className="w-full"
                        >
                          {result?.loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Bot className="h-4 w-4 mr-2" />
                          )}
                          {qa.label}
                        </Button>

                        {/* Results */}
                        {result && !result.loading && (
                          <div className={cn(
                            'rounded-lg p-3 text-xs font-mono overflow-auto max-h-96',
                            result.error ? 'bg-red-950/50 border border-red-900 text-red-300' : 'bg-gray-800 border border-gray-700 text-gray-300'
                          )}>
                            {result.error ? (
                              <p>{result.error}</p>
                            ) : (
                              <pre className="whitespace-pre-wrap break-words">
                                {formatToolResult(result.data)}
                              </pre>
                            )}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Info footer */}
      <div className="text-center py-6 border-t border-gray-800">
        <p className="text-gray-500 text-xs">
          Powered by real OpenClaw technology — 50+ skills, persistent memory, sub-agents
        </p>
        <p className="text-gray-600 text-xs mt-1">
          Your AI employees use these tools automatically when responding to customers
        </p>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatToolResult(data: unknown): string {
  if (!data) return 'No data';

  // Try to extract readable text from OpenClaw tool response
  if (typeof data === 'object' && data !== null) {
    const d = data as Record<string, unknown>;

    // Standard tool response with content array
    if (Array.isArray(d.content)) {
      const texts = d.content
        .filter((c: Record<string, unknown>) => c.type === 'text' && c.text)
        .map((c: Record<string, unknown>) => {
          try {
            const parsed = JSON.parse(c.text as string);
            return formatParsedResult(parsed);
          } catch {
            return String(c.text);
          }
        });
      return texts.join('\n\n') || JSON.stringify(data, null, 2);
    }

    // Direct details object
    if (d.details) {
      return formatParsedResult(d.details);
    }
  }

  return JSON.stringify(data, null, 2);
}

function formatParsedResult(obj: unknown): string {
  if (typeof obj !== 'object' || obj === null) return String(obj);
  const d = obj as Record<string, unknown>;

  // Web search results
  if (d.content && typeof d.content === 'string') {
    // Strip external content markers
    let text = d.content as string;
    text = text.replace(/<<<EXTERNAL_UNTRUSTED_CONTENT>>>\n?/g, '');
    text = text.replace(/<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>\n?/g, '');
    text = text.replace(/Source: Web (?:Search|Fetch)\n---\n?/g, '');

    if (d.citations && Array.isArray(d.citations)) {
      text += '\n\n📎 Sources:\n' + (d.citations as string[]).map((c, i) => `  ${i + 1}. ${c}`).join('\n');
    }
    return text.trim();
  }

  // Web fetch results
  if (d.text && typeof d.text === 'string') {
    let text = d.text as string;
    text = text.replace(/<<<EXTERNAL_UNTRUSTED_CONTENT>>>\n?/g, '');
    text = text.replace(/<<<END_EXTERNAL_UNTRUSTED_CONTENT>>>\n?/g, '');
    text = text.replace(/Source: Web Fetch\n---\n?/g, '');
    if (d.title) text = `📄 ${d.title}\n\n${text}`;
    return text.trim();
  }

  // Sessions list
  if ('sessions' in d && Array.isArray(d.sessions)) {
    if (d.sessions.length === 0) return '📋 No active sessions';
    return `📋 ${d.sessions.length} session(s):\n` + JSON.stringify(d.sessions, null, 2);
  }

  // Cron jobs list
  if ('jobs' in d && Array.isArray(d.jobs)) {
    if (d.jobs.length === 0) return '⏰ No scheduled jobs';
    return `⏰ ${d.jobs.length} job(s):\n` + JSON.stringify(d.jobs, null, 2);
  }

  // Memory search
  if ('results' in d && Array.isArray(d.results)) {
    if (d.results.length === 0) return '🧠 No matching memories found';
    return `🧠 ${d.results.length} result(s):\n` + JSON.stringify(d.results, null, 2);
  }

  return JSON.stringify(obj, null, 2);
}
