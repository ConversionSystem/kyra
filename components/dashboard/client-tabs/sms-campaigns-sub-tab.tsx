'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare, Plus, Send, Clock, Loader2, Trash2, Sparkles,
  CheckCircle2, AlertTriangle, Users, Calendar, Copy, Check,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SMSCampaign {
  id: string;
  name: string;
  message: string;
  status: string;
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
}

// ── Merge Tags ─────────────────────────────────────────────────────────────────

const MERGE_TAGS = [
  { tag: '{{first_name}}', label: 'First Name' },
  { tag: '{{last_name}}', label: 'Last Name' },
  { tag: '{{full_name}}', label: 'Full Name' },
  { tag: '{{company}}', label: 'Company' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    draft: { bg: 'bg-gray-100 text-gray-600', label: 'Draft' },
    scheduled: { bg: 'bg-blue-100 text-blue-700', label: 'Scheduled' },
    sending: { bg: 'bg-amber-100 text-amber-700', label: 'Sending...' },
    sent: { bg: 'bg-green-100 text-green-700', label: 'Sent' },
    failed: { bg: 'bg-red-100 text-red-700', label: 'Failed' },
  };
  const s = map[status] || map.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg}`}>
      {s.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
      title="Copy message"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SMSCampaignsSubTab({ client }: { client: AgencyClient }) {
  const clientId = client.id;

  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiGenerating, setAIGenerating] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactsLoading, setContactsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load campaigns
  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/sms-campaigns`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  // Search contacts
  const searchContacts = useCallback(async (query: string) => {
    if (!query.trim()) { setContacts([]); return; }
    setContactsLoading(true);
    try {
      const res = await fetch(`/api/agency/crm/contacts?clientId=${clientId}&search=${encodeURIComponent(query)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        const items = (data.data || []).filter((c: Contact) => c.phone);
        setContacts(items);
      }
    } catch { /* non-fatal */ }
    finally { setContactsLoading(false); }
  }, [clientId]);

  // AI SMS generation
  const handleAIGenerate = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    setAIGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/sms-campaigns/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: aiPrompt, businessName: client.name }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setMessage(data.text);
          setAIPrompt('');
        } else if (data.error) {
          setError(data.error);
        }
      }
    } catch { setError('Failed to generate SMS copy'); }
    finally { setAIGenerating(false); }
  }, [aiPrompt, clientId, client.name]);

  // Create campaign
  const handleCreate = useCallback(async () => {
    if (!name.trim() || !message.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/sms-campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          message,
          contactIds: selectedContacts.map(c => c.id),
          scheduledAt: scheduleDate || undefined,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setName('');
        setMessage('');
        setScheduleDate('');
        setSelectedContacts([]);
        loadCampaigns();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create campaign');
      }
    } catch { setError('Failed to create campaign'); }
    finally { setCreating(false); }
  }, [name, message, selectedContacts, scheduleDate, clientId, loadCampaigns]);

  // Send campaign now
  const handleSendNow = useCallback(async (campaignId: string) => {
    setSending(campaignId);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/sms-campaigns/${campaignId}/send`, {
        method: 'POST',
      });
      if (res.ok) {
        loadCampaigns();
      }
    } catch { /* non-fatal */ }
    finally { setSending(null); }
  }, [clientId, loadCampaigns]);

  // Delete campaign
  const handleDelete = useCallback(async (campaignId: string) => {
    try {
      await fetch(`/api/agency/clients/${clientId}/sms-campaigns/${campaignId}`, { method: 'DELETE' });
      loadCampaigns();
    } catch { /* non-fatal */ }
  }, [clientId, loadCampaigns]);

  const toggleContact = (contact: Contact) => {
    setSelectedContacts(prev =>
      prev.some(c => c.id === contact.id)
        ? prev.filter(c => c.id !== contact.id)
        : [...prev, contact]
    );
  };

  const insertMergeTag = (tag: string) => {
    setMessage(prev => prev + tag);
  };

  const charCount = message.length;
  const smsSegments = charCount <= 160 ? 1 : Math.ceil(charCount / 153);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">SMS Campaigns</h3>
          <p className="text-xs text-gray-500 mt-0.5">Send bulk SMS messages to your contacts via GHL.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Create Campaign Form */}
      {showCreate && (
        <div className="rounded-xl border-2 border-indigo-200 bg-white p-5 space-y-4">
          <h4 className="text-sm font-semibold text-gray-900">Create SMS Campaign</h4>

          {/* Campaign Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Campaign Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Spring Sale Announcement"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* AI Generate */}
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-800">AI Write SMS</span>
              <span className="text-[10px] text-purple-500">(1 credit)</span>
            </div>
            <div className="flex gap-2">
              <input
                value={aiPrompt}
                onChange={e => setAIPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAIGenerate()}
                placeholder="Describe the promotion or message..."
                className="flex-1 rounded-lg border border-purple-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              />
              <button
                onClick={handleAIGenerate}
                disabled={aiGenerating || !aiPrompt.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate
              </button>
            </div>
          </div>

          {/* Message Composer */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-700">Message</label>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${charCount > 320 ? 'text-red-600' : charCount > 160 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {charCount} chars · {smsSegments} segment{smsSegments > 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your SMS message here..."
              rows={4}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-xs text-gray-400 mr-1">Merge tags:</span>
              {MERGE_TAGS.map(mt => (
                <button
                  key={mt.tag}
                  onClick={() => insertMergeTag(mt.tag)}
                  className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                >
                  {mt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Select Contacts ({selectedContacts.length} selected)
            </label>
            <input
              value={contactSearch}
              onChange={e => { setContactSearch(e.target.value); searchContacts(e.target.value); }}
              placeholder="Search contacts by name or phone..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
            />
            {contactsLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Searching...
              </div>
            )}
            {contacts.length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {contacts.map(c => {
                  const isSelected = selectedContacts.some(sc => sc.id === c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleContact(c)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                    >
                      <div className={`w-4 h-4 rounded border ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'} flex items-center justify-center`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-gray-900">{[c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unknown'}</span>
                        <span className="text-gray-400 ml-2">{c.phone}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedContacts.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedContacts.map(c => (
                  <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700">
                    {c.first_name || c.phone}
                    <button onClick={() => toggleContact(c)} className="hover:text-red-600">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Schedule */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Schedule (optional)</label>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim() || !message.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : scheduleDate ? <Clock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {scheduleDate ? 'Schedule Campaign' : 'Create Draft'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Campaign List */}
      {campaigns.length > 0 ? (
        <div className="space-y-3">
          {campaigns.map(campaign => (
            <div key={campaign.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900">{campaign.name}</h4>
                    <StatusBadge status={campaign.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Created {new Date(campaign.created_at).toLocaleDateString()}
                    {campaign.scheduled_at && ` · Scheduled for ${new Date(campaign.scheduled_at).toLocaleString()}`}
                    {campaign.sent_at && ` · Sent ${new Date(campaign.sent_at).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <CopyButton text={campaign.message} />
                </div>
              </div>

              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-3">
                {campaign.message}
              </p>

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {campaign.total_contacts} contacts
                </span>
                {campaign.sent_count > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {campaign.sent_count} sent
                  </span>
                )}
                {campaign.failed_count > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {campaign.failed_count} failed
                  </span>
                )}
              </div>

              {/* Actions */}
              {campaign.status === 'draft' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleSendNow(campaign.id)}
                    disabled={sending === campaign.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {sending === campaign.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Send Now
                  </button>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !showCreate ? (
        <div className="text-center py-12 px-6">
          <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No SMS Campaigns Yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Create your first SMS campaign to send bulk messages to your contacts.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Campaign
          </button>
        </div>
      ) : null}
    </div>
  );
}
