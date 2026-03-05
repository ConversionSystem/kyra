'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Inbox, Loader2, User, Bot, Clock, RefreshCw,
  AlertTriangle, Filter, ChevronDown, ChevronUp,
  MessageSquare, Send, Smartphone, Globe, Search, X,
} from 'lucide-react';

interface Conversation {
  id: string;
  client_id: string;
  client_name: string;
  client_industry: string | null;
  channel: string;
  user_message: string;
  ai_response: string;
  created_at: string;
}

interface Client { id: string; name: string; industry: string | null; }

const CHANNEL_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  test_chat:  { label: 'Test Chat',    icon: MessageSquare, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  web_chat:   { label: 'Chat Widget',  icon: Globe,         color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  portal:     { label: 'Portal',       icon: Globe,         color: 'bg-purple-50 text-purple-600 border-purple-200' },
  telegram:   { label: 'Telegram',     icon: Send,          color: 'bg-sky-50 text-sky-600 border-sky-200' },
  sms:        { label: 'SMS',          icon: Smartphone,    color: 'bg-green-50 text-green-600 border-green-200' },
  ghl_sms:    { label: 'GHL SMS',      icon: Smartphone,    color: 'bg-green-50 text-green-600 border-green-200' },
  ghl_email:  { label: 'GHL Email',    icon: MessageSquare, color: 'bg-orange-50 text-orange-600 border-orange-200' },
  whatsapp:   { label: 'WhatsApp',     icon: Smartphone,    color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function ConversationsFeed() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  // Pre-select filters from URL params (e.g. ?channel=web_chat&clientId=xxx)
  const [filterClient, setFilterClient] = useState(() => searchParams?.get('clientId') || '');
  const [filterChannel, setFilterChannel] = useState(() => searchParams?.get('channel') || '');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // debounced
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [page, setPage] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [secondsSince, setSecondsSince] = useState(0);
  const LIMIT = 50;

  const load = useCallback(async (opts?: { reset?: boolean }) => {
    const currentPage = opts?.reset ? 0 : page;
    if (opts?.reset) setPage(0);
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), page: String(currentPage) });
      if (filterClient) params.set('clientId', filterClient);
      if (filterChannel) params.set('channel', filterChannel);
      if (searchQuery) params.set('q', searchQuery);
      const res = await fetch(`/api/agency/conversations?${params}`);
      const d = await res.json();
      if (d.migrationRequired) { setMigrationRequired(true); setLoading(false); setRefreshing(false); return; }
      setClients(d.clients || []);
      setTotal(d.total || 0);
      if (opts?.reset || currentPage === 0) {
        setConversations(d.conversations || []);
      } else {
        setConversations(prev => [...prev, ...(d.conversations || [])]);
      }
    } catch { /* ignore */ }
    setLoading(false);
    setRefreshing(false);
    setLastRefresh(new Date());
    setSecondsSince(0);
  }, [filterClient, filterChannel, searchQuery, page]);

  useEffect(() => { load({ reset: true }); }, [filterClient, filterChannel, searchQuery]); // eslint-disable-line
  useEffect(() => { if (!loading) load(); }, [page]); // eslint-disable-line

  // Debounce search input → searchQuery
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setPage(0);
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  // Auto-refresh every 10s — fast enough to feel live
  useEffect(() => {
    const t = setInterval(() => load({ reset: true }), 10_000);
    return () => clearInterval(t);
  }, [load]);

  // Tick seconds-since counter
  useEffect(() => {
    const t = setInterval(() => setSecondsSince(s => s + 1), 1_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (migrationRequired) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-4">
        <p className="font-semibold text-amber-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> One-time database setup required
        </p>
        <p className="text-sm text-amber-700">
          Run this SQL in your{' '}
          <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-medium">
            Supabase SQL Editor
          </a>{' '}
          to enable conversation logging:
        </p>
        <pre className="text-xs bg-white border border-amber-200 rounded-lg p-4 overflow-x-auto text-gray-700 leading-relaxed">{
`CREATE TABLE IF NOT EXISTS client_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES agency_clients(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'test_chat',
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  tokens_used INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON client_conversations(client_id);
CREATE INDEX ON client_conversations(created_at DESC);
ALTER TABLE client_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members view" ON client_conversations FOR SELECT
  USING (agency_id IN (SELECT agency_id FROM agency_members WHERE user_id = auth.uid()));
CREATE POLICY "Service insert" ON client_conversations FOR INSERT WITH CHECK (true);`
        }</pre>
        <p className="text-xs text-amber-600">After running, refresh this page — conversations will appear automatically.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters + stats */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Filter className="h-4 w-4" />
          {searchQuery ? (
            <span className="font-medium text-indigo-600">{total} result{total !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;</span>
          ) : (
            <span>{total} total</span>
          )}
          {/* Live indicator */}
          {lastRefresh && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              <span>LIVE · {secondsSince < 60 ? `${secondsSince}s ago` : `${Math.floor(secondsSince / 60)}m ago`}</span>
            </div>
          )}
        </div>

        {/* Keyword search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search messages…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-8 pr-7 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:border-indigo-400 w-48"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setSearchQuery(''); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Client filter */}
        <select
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-indigo-400"
        >
          <option value="">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Channel filter */}
        <select
          value={filterChannel}
          onChange={e => setFilterChannel(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-indigo-400"
        >
          <option value="">All channels</option>
          {Object.entries(CHANNEL_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <button
          onClick={() => load({ reset: true })}
          disabled={refreshing}
          className="ml-auto flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Inbox className="h-12 w-12 text-gray-200" />
          <p className="font-medium text-gray-500">No conversations yet</p>
          <p className="text-sm text-gray-400 max-w-sm">
            Use the Test Chat tab on any client, or share portal links — every conversation shows up here automatically.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {conversations.map(conv => {
              const ch = CHANNEL_META[conv.channel] || { label: conv.channel, icon: MessageSquare, color: 'bg-gray-50 text-gray-500 border-gray-200' };
              const ChIcon = ch.icon;
              const isOpen = expanded === conv.id;
              const isEscalated = conv.ai_response?.includes("I'll flag this for our team");
              const isProactive = conv.user_message?.startsWith('[NEW CONTACT]');

              return (
                <div
                  key={conv.id}
                  className={`rounded-xl border transition-all cursor-pointer ${isEscalated ? 'border-red-200 bg-red-50 hover:border-red-300' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  onClick={() => setExpanded(isOpen ? null : conv.id)}
                >
                  <div className="flex items-start gap-3 p-4">
                    {/* Channel icon */}
                    <div className={`mt-0.5 shrink-0 rounded-lg p-1.5 border ${ch.color}`}>
                      <ChIcon className="h-3.5 w-3.5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/agency/clients/${conv.client_id}`}
                          onClick={e => e.stopPropagation()}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {conv.client_name}
                        </Link>
                        {conv.client_industry && (
                          <span className="text-[10px] text-gray-400">{conv.client_industry}</span>
                        )}
                        {isEscalated && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">🚨 Escalated</span>}
                        {isProactive && !isEscalated && <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-medium">👋 Greeted</span>}
                      </div>

                      {/* User message */}
                      <div className="flex items-start gap-1.5">
                        <User className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                        <p className={`text-sm text-gray-800 ${isOpen ? 'whitespace-pre-wrap' : 'line-clamp-1'}`}>
                          {conv.user_message}
                        </p>
                      </div>

                      {/* AI response — only when expanded */}
                      {isOpen && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-start gap-1.5">
                          <Bot className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{conv.ai_response}</p>
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(conv.created_at)}
                      </span>
                      {isOpen
                        ? <ChevronUp className="h-4 w-4 text-gray-300" />
                        : <ChevronDown className="h-4 w-4 text-gray-300" />
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load more */}
          {conversations.length < total && (
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={refreshing}
              className="w-full py-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 transition"
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `Load more (${total - conversations.length} remaining)`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
