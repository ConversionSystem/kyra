'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Loader2, Send, Sparkles, MessageSquare, Bot, User,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import { UsageAnalytics } from '@/app/(dashboard)/agency/clients/[id]/usage-analytics';
import { MemoryBrowser } from '@/app/(dashboard)/agency/clients/[id]/memory-browser';
import { CustomerIntelligence } from '@/app/(dashboard)/agency/clients/[id]/customer-intelligence';
import HealthScoreBadge from '@/components/dashboard/health-score-badge';
import ClientActivityHeatmap from '@/components/dashboard/client-activity-heatmap';
import RoiSummaryCard from '@/components/dashboard/roi-summary-card';
import WorkerPerformanceCard from '@/components/dashboard/client-tabs/worker-performance-card';
import TasksCard from '@/components/dashboard/client-tabs/tasks-card';

const SUB_TABS = ['usage', 'tasks', 'memory', 'ai-reports'] as const;
type SubTab = typeof SUB_TABS[number];

const SUB_TAB_LABELS: Record<SubTab, string> = {
  usage: 'Usage',
  tasks: 'Tasks',
  memory: 'Memory',
  'ai-reports': 'AI Reports',
};

// ── AI Reports Chat ────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  'How is this client doing this month?',
  'What are the top performing channels?',
  'Are we on track for revenue goals?',
  'What needs attention right now?',
  'Give me a weekly performance summary.',
];

function AIReportsChat({ client }: { client: AgencyClient }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async (question?: string) => {
    const q = (question || input).trim();
    if (!q || loading) return;
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: q, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`/api/agency/clients/${client.id}/ai-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          data: {
            conversationsCount: client.usage_this_month ?? 0,
            conversationsChange: 0,
            avgResponseTime: 0,
            leadCount: 0,
            leadsChange: 0,
            dealPipelineValue: 0,
            dealsWon: 0,
            dealsLost: 0,
            bookingCount: 0,
            emailsSent: 0,
            emailOpenRate: 0,
            emailClickRate: 0,
            messagesHandled: client.usage_this_month ?? 0,
            creditsUsed: 0,
            topChannels: [],
            period: 'last_30_days',
          },
        }),
      });
      const data = await res.json() as { report?: string; error?: string };
      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: data.report || data.error || 'No response.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Failed to generate report. Please try again.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [client.id, client.usage_this_month, input, loading]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-gray-900">AI Analytics Assistant</h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">Ask questions about this client&apos;s performance in natural language.</p>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="h-80 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">Ask me anything about this client&apos;s performance</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-indigo-600" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${
                    msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                  }`}>
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="bg-gray-100 rounded-xl px-4 py-2.5">
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask about client performance..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface InsightsTabProps {
  client: AgencyClient;
  defaultSubTab?: SubTab;
  workerRoleId?: string;
}

export default function InsightsTab({ client, defaultSubTab = 'usage', workerRoleId }: InsightsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(defaultSubTab);

  return (
    <div className="space-y-6">
      {/* Sub-nav pills */}
      <div className="flex flex-wrap gap-2 overflow-x-auto scrollbar-hide">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeSubTab === tab
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {SUB_TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {activeSubTab === 'tasks' && (
        <div className="space-y-6">
          <TasksCard clientId={client.id} workerRoleId={workerRoleId} />
        </div>
      )}

      {activeSubTab === 'usage' && (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">
            Messages handled, response times, and costs for this client&apos;s AI worker.
          </p>
          <WorkerPerformanceCard clientId={client.id} />
          <RoiSummaryCard
            totalConversations={client.usage_this_month ?? 0}
            plan="pro"
            billingCents={client.billing_amount_cents ?? 0}
            showLink={false}
          />
          <HealthScoreBadge clientId={client.id} showDetails />
          <ClientActivityHeatmap clientId={client.id} />
          <UsageAnalytics clientId={client.id} />
        </div>
      )}

      {activeSubTab === 'memory' && (
        <div className="space-y-0">
          <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-indigo-700 mb-1">AI Memory</p>
            <p className="text-xs text-indigo-600">
              Your AI worker builds a memory of each customer over time — facts, preferences, history.
              This memory is injected into every conversation so the AI feels like it knows them.
            </p>
          </div>
          <CustomerIntelligence clientId={client.id} />
          <div className="border-t border-gray-200 mt-6 pt-6 px-4 sm:px-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              AI Context Files (Advanced)
            </p>
            <MemoryBrowser clientId={client.id} clientName={client.name || 'Client'} />
          </div>
        </div>
      )}

      {activeSubTab === 'ai-reports' && (
        <AIReportsChat client={client} />
      )}

    </div>
  );
}
