'use client';

// ============================================================================
// Web Chat Leads — Dashboard component
//
// Shows leads automatically captured from the embeddable web chat widget.
// Displays urgency badges, contact info, conversation previews, and status management.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  Mail,
  Phone,
  Globe,
  Flame,
  ThermometerSun,
  Snowflake,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface WebChatLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  interest: string | null;
  urgency: 'hot' | 'warm' | 'cold';
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  source_url: string | null;
  conversation_summary: string | null;
  conversation_history: Array<{ role: string; content: string }>;
  crm_contact_id: string | null;
  clientName: string;
  created_at: string;
}

interface Stats {
  total: number;
  new: number;
  hot: number;
  withEmail: number;
  withPhone: number;
}

const URGENCY_CONFIG = {
  hot: { icon: Flame, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', label: 'Hot' },
  warm: { icon: ThermometerSun, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Warm' },
  cold: { icon: Snowflake, color: 'text-blue-400', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Cold' },
};

const STATUS_CONFIG = {
  new: { color: 'bg-blue-100 text-blue-700', label: 'New' },
  contacted: { color: 'bg-yellow-100 text-yellow-700', label: 'Contacted' },
  qualified: { color: 'bg-purple-100 text-purple-700', label: 'Qualified' },
  converted: { color: 'bg-green-100 text-green-700', label: 'Converted' },
  lost: { color: 'bg-gray-100 text-gray-500', label: 'Lost' },
};

export default function WebChatLeads() {
  const [leads, setLeads] = useState<WebChatLead[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, new: 0, hot: 0, withEmail: 0, withPhone: 0 });
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'hot'>('all');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams({ days: '30' });
      if (filter === 'new') params.set('status', 'new');
      if (filter === 'hot') params.set('urgency', 'hot');

      const res = await fetch(`/api/agency/leads/web-chat?${params}`);
      const data = await res.json();

      if (data.migrationRequired) {
        setMigrationRequired(true);
        setLoading(false);
        return;
      }

      setLeads(data.leads || []);
      setStats(data.stats || { total: 0, new: 0, hot: 0, withEmail: 0, withPhone: 0 });
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateStatus = async (leadId: string, newStatus: string) => {
    setUpdatingStatus(leadId);
    try {
      const res = await fetch('/api/agency/leads/web-chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, status: newStatus }),
      });
      if (res.ok) {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus as WebChatLead['status'] } : l));
      }
    } catch (err) {
      console.error('Failed to update lead status:', err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-200 rounded-lg" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (migrationRequired) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">Migration Required</h3>
            <p className="text-sm text-amber-700 mt-1">
              Run the web chat leads migration to enable automatic lead capture from your chat widget.
            </p>
            <pre className="mt-3 text-xs bg-amber-100 p-3 rounded-lg overflow-x-auto text-amber-900">
              supabase/migrations/20260301001_web_chat_leads.sql
            </pre>
            <p className="text-xs text-amber-600 mt-2">
              Paste this SQL into your Supabase SQL Editor and run it.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
            <Users className="h-3.5 w-3.5" />
            Total Leads
          </div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-blue-500 text-xs font-medium">
            <Clock className="h-3.5 w-3.5" />
            New
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats.new}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-red-500 text-xs font-medium">
            <Flame className="h-3.5 w-3.5" />
            Hot Leads
          </div>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.hot}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
            <Mail className="h-3.5 w-3.5" />
            With Email
          </div>
          <div className="text-2xl font-bold mt-1">{stats.withEmail}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
            <Phone className="h-3.5 w-3.5" />
            With Phone
          </div>
          <div className="text-2xl font-bold mt-1">{stats.withPhone}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['all', 'new', 'hot'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All Leads' : f === 'new' ? '🆕 New Only' : '🔥 Hot Only'}
          </button>
        ))}
      </div>

      {/* Leads List */}
      {leads.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center">
          <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700">No web chat leads yet</h3>
          <p className="text-sm text-gray-500 mt-1">
            When visitors share their contact info via your chat widget, leads will appear here automatically.
          </p>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 text-left max-w-md mx-auto">
            <p className="font-medium mb-1">To get started:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Deploy a client AI (or use your agency AI)</li>
              <li>Embed the chat widget on your website</li>
              <li>Visitors who share email/phone are captured automatically</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map(lead => {
            const urgCfg = URGENCY_CONFIG[lead.urgency];
            const statusCfg = STATUS_CONFIG[lead.status];
            const isExpanded = expandedLead === lead.id;
            const UrgIcon = urgCfg.icon;

            return (
              <div
                key={lead.id}
                className={`bg-white rounded-xl border ${urgCfg.border} overflow-hidden transition-shadow hover:shadow-md`}
              >
                {/* Lead Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Urgency badge */}
                      <div className={`flex items-center justify-center h-10 w-10 rounded-full ${urgCfg.bg}`}>
                        <UrgIcon className={`h-5 w-5 ${urgCfg.color}`} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 truncate">
                            {[lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Anonymous Visitor'}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          {lead.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {lead.email}
                            </span>
                          )}
                          {lead.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lead.phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {lead.clientName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {lead.interest && (
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full hidden md:inline">
                          {lead.interest}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">{timeAgo(lead.created_at)}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Conversation summary */}
                  {!isExpanded && lead.conversation_summary && (
                    <p className="text-xs text-gray-500 mt-2 ml-13 truncate">
                      {lead.conversation_summary}
                    </p>
                  )}
                </div>

                {/* Expanded: Conversation + Actions */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4">
                    {/* Conversation History */}
                    {lead.conversation_history?.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          Conversation
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-3">
                          {lead.conversation_history.map((msg, idx) => (
                            <div
                              key={idx}
                              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                                  msg.role === 'user'
                                    ? 'bg-indigo-100 text-indigo-900'
                                    : 'bg-white text-gray-700 border'
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">Move to:</span>
                        {(['contacted', 'qualified', 'converted', 'lost'] as const)
                          .filter(s => s !== lead.status)
                          .map(s => (
                            <button
                              key={s}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatus(lead.id, s);
                              }}
                              disabled={updatingStatus === lead.id}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${STATUS_CONFIG[s].color} hover:opacity-80 disabled:opacity-50`}
                            >
                              {STATUS_CONFIG[s].label}
                            </button>
                          ))}
                      </div>

                      <div className="flex items-center gap-2">
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
                          >
                            <Mail className="h-3 w-3" />
                            Email
                          </a>
                        )}
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100"
                          >
                            <Phone className="h-3 w-3" />
                            Call
                          </a>
                        )}
                        {lead.crm_contact_id && (
                          <a
                            href={`/agency/crm?contact=${lead.crm_contact_id}`}
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 text-purple-600 rounded hover:bg-purple-100"
                          >
                            <ExternalLink className="h-3 w-3" />
                            CRM
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
