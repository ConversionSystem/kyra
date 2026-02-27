'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Inbox, Users, TrendingUp, Flame, Search, Bell, Bot, Send, Loader2,
  CheckCircle2, Clock, Mail, MessageSquare, Phone, ArrowRight,
  ChevronDown, ChevronRight, AlertCircle, Eye, X, Sparkles,
  Building2, Calendar, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CrmFeedResponse, CommandFeedItem, CrmActivity } from '@/lib/crm/types';
import { getInitials, getAvatarColor } from '@/lib/crm/types';

export function CrmCommandFeed() {
  const router = useRouter();
  const [feed, setFeed] = useState<CrmFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiHandledOpen, setAiHandledOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/crm/feed');
      if (res.ok) {
        const data = await res.json();
        setFeed(data);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 30_000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  const resolveItem = async (activityId: string) => {
    await fetch('/api/agency/crm/activities', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_id: activityId }),
    });
    fetchFeed();
  };

  const approveAndSend = async (item: CommandFeedItem) => {
    if (!item.contact_id || !item.metadata?.ai_draft) return;
    setSending(item.id);
    try {
      const res = await fetch(`/api/agency/crm/contacts/${item.contact_id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: item.metadata?.channel || 'email',
          message: item.metadata.ai_draft as string,
          subject: item.subject || 'Follow-up',
        }),
      });
      if (res.ok) {
        await resolveItem(item.id);
      }
    } catch (err) {
      console.error('Send failed:', err);
    }
    setSending(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/agency/crm/contacts?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-400 flex items-center gap-2">
          <Inbox className="h-5 w-5" /> Loading CRM...
        </div>
      </div>
    );
  }

  const stats = feed?.stats || { total_contacts: 0, pipeline_value: 0, hot_leads: 0, ai_handled_count: 0 };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Inbox className="h-6 w-6 text-indigo-600" /> CRM
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Your AI-operated command center</p>
        </div>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none w-64"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <button onClick={() => router.push('/agency/crm/contacts')}
          className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-indigo-200 hover:shadow-sm transition">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contacts</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.total_contacts}</div>
        </button>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pipeline</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            ${stats.pipeline_value >= 1000 ? `${(stats.pipeline_value / 1000).toFixed(1)}K` : stats.pipeline_value}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Flame className="h-5 w-5 text-red-500" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hot Leads</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.hot_leads}</div>
        </div>
      </div>

      {/* Needs Your Attention */}
      {(feed?.attention_items?.length || 0) > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-amber-500" />
            NEEDS YOUR ATTENTION
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {feed!.attention_items.length}
            </span>
          </h2>
          <div className="space-y-2">
            {feed!.attention_items.map(item => (
              <AttentionCard key={item.id} item={item} onResolve={resolveItem} onApproveAndSend={approveAndSend} sendingId={sending} router={router} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!feed?.attention_items?.length) && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="font-semibold text-green-800">All clear!</p>
          <p className="text-sm text-green-600 mt-1">Nothing needs your attention right now. AI is handling everything.</p>
        </div>
      )}

      {/* AI Handled Today */}
      {stats.ai_handled_count > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setAiHandledOpen(!aiHandledOpen)}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-500" />
              AI HANDLED TODAY
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {stats.ai_handled_count}
              </span>
            </span>
            {aiHandledOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          </button>
          {aiHandledOpen && (
            <div className="px-5 pb-4 space-y-1">
              {(feed?.ai_handled_today || []).slice(0, 15).map(act => (
                <div key={act.id} className="flex items-center gap-2 py-1.5 text-xs text-gray-600">
                  <Sparkles className="h-3 w-3 text-indigo-400 shrink-0" />
                  <span>{act.subject || act.body?.slice(0, 80) || act.type}</span>
                  <span className="text-gray-400 ml-auto shrink-0">{timeAgo(act.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-gray-400" /> RECENT ACTIVITY
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {(feed?.recent_activities || []).length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              No activity yet. Create your first contact or run a pipeline campaign.
            </div>
          ) : (
            (feed?.recent_activities || []).map(act => (
              <div
                key={act.id}
                className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition cursor-pointer"
                onClick={() => act.contact_id && router.push(`/agency/crm/contacts/${act.contact_id}`)}
              >
                <ActivityIcon type={act.type} actor={act.actor} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {act.contact_name && (
                      <span className="text-sm font-medium text-gray-900">{act.contact_name}</span>
                    )}
                    {act.company_name && (
                      <span className="text-xs text-gray-500">· {act.company_name}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{act.subject || act.body?.slice(0, 80) || act.type}</p>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(act.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button
          onClick={() => router.push('/agency/crm/contacts')}
          variant="outline"
          className="flex-1 py-5 text-sm"
        >
          <Users className="h-4 w-4 mr-2" /> View All Contacts
        </Button>
        <Button
          onClick={() => router.push('/agency/crm/companies')}
          variant="outline"
          className="flex-1 py-5 text-sm"
        >
          <Building2 className="h-4 w-4 mr-2" /> View Companies
        </Button>
        <Button
          onClick={() => router.push('/agency/pipeline')}
          variant="outline"
          className="flex-1 py-5 text-sm"
        >
          <Sparkles className="h-4 w-4 mr-2" /> AI Pipeline
        </Button>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AttentionCard({ item, onResolve, onApproveAndSend, sendingId, router }: {
  item: CommandFeedItem;
  onResolve: (id: string) => void;
  onApproveAndSend: (item: CommandFeedItem) => void;
  sendingId: string | null;
  router: ReturnType<typeof useRouter>;
}) {
  const contactName = item.contact
    ? `${item.contact.first_name || ''} ${item.contact.last_name || ''}`.trim() || 'Unknown'
    : 'Unknown Contact';

  const initials = getInitials(item.contact?.first_name, item.contact?.last_name);
  const color = getAvatarColor(item.contact?.first_name, item.contact?.last_name);

  return (
    <div className="bg-white border border-amber-200 rounded-xl p-4 hover:border-amber-300 transition">
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-gray-900">{contactName}</span>
            {item.contact?.company_name && (
              <span className="text-xs text-gray-500">· {item.contact.company_name}</span>
            )}
            <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(item.created_at)}</span>
          </div>
          <p className="text-sm text-gray-700">{item.subject || item.body?.slice(0, 120)}</p>
          {item.body && item.body !== item.subject && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.body.slice(0, 200)}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {item.contact_id && (
              <Button size="sm" variant="default"
                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700"
                onClick={() => router.push(`/agency/crm/contacts/${item.contact_id}`)}>
                <Eye className="h-3 w-3 mr-1" /> View
              </Button>
            )}
            {item.attention_type === 'approval_needed' && (item.metadata?.ai_draft as string) && (
              <Button size="sm" variant="default"
                className="h-7 text-xs bg-green-600 hover:bg-green-700"
                disabled={sendingId === item.id}
                onClick={() => onApproveAndSend(item)}>
                {sendingId === item.id ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="h-3 w-3 mr-1" /> Approve &amp; Send</>
                )}
              </Button>
            )}
            {item.attention_type === 'reply_needed' && (
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => item.contact_id && router.push(`/agency/crm/contacts/${item.contact_id}`)}>
                <MessageSquare className="h-3 w-3 mr-1" /> Reply
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-500"
              onClick={() => onResolve(item.id)}>
              <X className="h-3 w-3 mr-1" /> Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityIcon({ type, actor }: { type: string; actor: string }) {
  const iconClass = 'h-4 w-4';
  if (actor === 'ai') return <Bot className={`${iconClass} text-indigo-500`} />;

  switch (type) {
    case 'email': return <Mail className={`${iconClass} text-blue-500`} />;
    case 'sms': return <MessageSquare className={`${iconClass} text-green-500`} />;
    case 'call': return <Phone className={`${iconClass} text-purple-500`} />;
    case 'note': return <FileText className={`${iconClass} text-gray-400`} />;
    case 'meeting': return <Calendar className={`${iconClass} text-indigo-500`} />;
    case 'ai_message': return <Bot className={`${iconClass} text-indigo-500`} />;
    case 'stage_change': return <ArrowRight className={`${iconClass} text-amber-500`} />;
    case 'enrichment': return <Sparkles className={`${iconClass} text-purple-500`} />;
    case 'score_change': return <Flame className={`${iconClass} text-red-500`} />;
    default: return <AlertCircle className={`${iconClass} text-gray-400`} />;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}
