'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  Filter,
  Phone,
  Mail,
  Globe,
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  ChevronDown,
  RefreshCw,
  Smartphone,
  X,
} from 'lucide-react';

interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  clientId: string;
  clientName: string;
  channel: string;
  lastInbound: string;
  lastAiResponse: string;
  lastMessageAt: string;
  unreadCount: number;
  status: 'ai_handled' | 'needs_human' | 'active';
  responseTimeMs: number | null;
}

interface Stats {
  today: number;
  thisWeek: number;
  aiHandled: number;
  total: number;
  avgResponseMs: number;
}

interface Client {
  id: string;
  name: string;
}

export default function ConversationsClient({ clients }: { clients: Client[] }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [channelFilter, setChannelFilter] = useState<string>('');
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (clientFilter) params.set('client', clientFilter);
      if (channelFilter) params.set('channel', channelFilter);

      const res = await fetch(`/api/agency/conversations?${params}`);
      if (!res.ok) throw new Error('Failed to fetch conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
      setStats(data.stats || null);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientFilter, channelFilter]);

  useEffect(() => {
    setLoading(true);
    fetchConversations();
  }, [fetchConversations]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  // Filter by search text
  const filtered = conversations.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.contactName.toLowerCase().includes(q) ||
      c.clientName.toLowerCase().includes(q) ||
      c.lastInbound.toLowerCase().includes(q) ||
      c.lastAiResponse.toLowerCase().includes(q) ||
      (c.contactPhone || '').includes(q) ||
      (c.contactEmail || '').toLowerCase().includes(q)
    );
  });

  const channels = [...new Set(conversations.map(c => c.channel))].filter(Boolean);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms':
      case 'SMS': return <Smartphone className="h-3.5 w-3.5" />;
      case 'Phone': return <Phone className="h-3.5 w-3.5" />;
      case 'Email': return <Mail className="h-3.5 w-3.5" />;
      case 'web_chat':
      case 'Web Chat':
      case 'Live Chat': return <Globe className="h-3.5 w-3.5" />;
      case 'telegram': return <MessageCircle className="h-3.5 w-3.5" />;
      case 'terminal': return <MessageSquare className="h-3.5 w-3.5" />;
      default: return <MessageCircle className="h-3.5 w-3.5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ai_handled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded-full">
            <CheckCircle2 className="h-3 w-3" /> AI Handled
          </span>
        );
      case 'needs_human':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-full">
            <AlertCircle className="h-3 w-3" /> Needs Reply
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
            <MessageCircle className="h-3 w-3" /> Active
          </span>
        );
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatResponseTime = (ms: number | null) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 text-indigo-500 animate-spin" />
        <span className="ml-2 text-gray-500">Loading conversations from GHL...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3 bg-white rounded-xl border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
            <p className="text-xs text-gray-500">Today</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">{stats.thisWeek}</p>
            <p className="text-xs text-gray-500">This Week</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-gray-200">
            <p className="text-2xl font-bold text-green-600">{stats.aiHandled}</p>
            <p className="text-xs text-gray-500">AI Handled</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-gray-200">
            <p className="text-2xl font-bold text-indigo-600">{formatResponseTime(stats.avgResponseMs)}</p>
            <p className="text-xs text-gray-500">Avg Response</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Clients</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Channels</option>
          {channels.map(ch => (
            <option key={ch} value={ch}>{ch}</option>
          ))}
        </select>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-500 hover:text-indigo-600 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>

        <a
          href={`/api/agency/conversations/export?days=30${clientFilter ? `&clientId=${clientFilter}` : ''}`}
          download
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 hover:text-indigo-700 border border-gray-200 hover:border-indigo-300 rounded-lg transition-colors bg-white"
          title="Download conversations as CSV"
        >
          <ChevronDown className="h-3.5 w-3.5" /> Export CSV
        </a>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Conversation List + Detail Split View */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* List */}
        <div className={`flex-1 space-y-1 overflow-y-auto ${selectedConv ? 'hidden sm:block sm:max-w-md' : ''}`}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">
                {conversations.length === 0
                  ? 'No conversations yet. Messages will appear here when customers contact your clients.'
                  : 'No conversations match your filters.'}
              </p>
            </div>
          ) : (
            filtered.map(conv => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedConv?.id === conv.id
                    ? 'bg-indigo-50 border-indigo-200'
                    : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-gray-900 truncate">{conv.contactName}</p>
                        {conv.unreadCount > 0 && (
                          <span className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{conv.clientName}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs text-gray-400">{formatTime(conv.lastMessageAt)}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      {getChannelIcon(conv.channel)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 pl-10">
                  {conv.lastInbound || conv.lastAiResponse || 'No messages'}
                </p>
                <div className="mt-1.5 pl-10">
                  {getStatusBadge(conv.status)}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selectedConv && (
          <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col min-h-[400px]">
            {/* Detail Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                    <User className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{selectedConv.contactName}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{selectedConv.clientName}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        {getChannelIcon(selectedConv.channel)} {selectedConv.channel}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedConv(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 sm:hidden"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {/* Contact info */}
              <div className="flex gap-3 mt-3 text-xs text-gray-500">
                {selectedConv.contactPhone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {selectedConv.contactPhone}
                  </span>
                )}
                {selectedConv.contactEmail && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {selectedConv.contactEmail}
                  </span>
                )}
                {selectedConv.responseTimeMs && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Response: {formatResponseTime(selectedConv.responseTimeMs)}
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedConv.lastInbound && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-3 w-3 text-gray-500" />
                  </div>
                  <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2 max-w-[80%]">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedConv.lastInbound}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatTime(selectedConv.lastMessageAt)}</p>
                  </div>
                </div>
              )}
              {selectedConv.lastAiResponse && (
                <div className="flex gap-2 justify-end">
                  <div className="bg-indigo-600 rounded-xl rounded-tr-sm px-3 py-2 max-w-[80%]">
                    <p className="text-sm text-white whitespace-pre-wrap">{selectedConv.lastAiResponse}</p>
                    <p className="text-xs text-indigo-200 mt-1">
                      AI • {selectedConv.responseTimeMs ? `${formatResponseTime(selectedConv.responseTimeMs)}` : ''}
                    </p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <MessageSquare className="h-3 w-3 text-indigo-600" />
                  </div>
                </div>
              )}
              {!selectedConv.lastInbound && !selectedConv.lastAiResponse && (
                <p className="text-center text-sm text-gray-400 py-8">
                  No message details available for this conversation.
                </p>
              )}
            </div>

            {/* Status footer */}
            <div className="p-3 border-t border-gray-100 flex items-center justify-between">
              {getStatusBadge(selectedConv.status)}
              <span className="text-xs text-gray-400">
                Conversation ID: {selectedConv.id.slice(0, 12)}...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
