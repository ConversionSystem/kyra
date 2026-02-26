'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Mail, Phone, Building2, MapPin, Globe, Calendar,
  Edit2, Trash2, Tag, Bot, MessageSquare, FileText, Flame,
  ArrowRight, Sparkles, CheckCircle2, Clock, User, Briefcase,
  Plus, Save, X, ExternalLink, Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContactDetail, CrmActivity } from '@/lib/crm/types';
import { getInitials, getAvatarColor, getScoreBadge, getStageBadge } from '@/lib/crm/types';

export function ContactDetailView() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;

  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [sendChannel, setSendChannel] = useState<'sms' | 'email'>('sms');
  const [sendMessage, setSendMessage] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');

  const fetchContact = useCallback(async () => {
    const res = await fetch(`/api/agency/crm/contacts/${contactId}`);
    if (res.ok) {
      const data = await res.json();
      setContact(data);
    }
    setLoading(false);
  }, [contactId]);

  useEffect(() => { fetchContact(); }, [fetchContact]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/agency/crm/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditing(false);
      fetchContact();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this contact? This cannot be undone.')) return;
    const res = await fetch(`/api/agency/crm/contacts/${contactId}`, { method: 'DELETE' });
    if (res.ok) router.push('/agency/crm/contacts');
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    await fetch('/api/agency/crm/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: contactId,
        type: 'note',
        subject: 'Note added',
        body: noteText.trim(),
        actor: 'human',
      }),
    });
    setNoteText('');
    setAddingNote(false);
    fetchContact();
  };

  const handleSend = async () => {
    if (!sendMessage.trim()) return;
    setSending(true);
    setSendError('');
    setSendSuccess('');

    const res = await fetch(`/api/agency/crm/contacts/${contactId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: sendChannel,
        message: sendMessage.trim(),
        subject: sendChannel === 'email' ? sendSubject || undefined : undefined,
      }),
    });

    if (res.ok) {
      setSendSuccess(`${sendChannel === 'sms' ? 'SMS' : 'Email'} sent!`);
      setSendMessage('');
      setSendSubject('');
      setShowSend(false);
      fetchContact();
      setTimeout(() => setSendSuccess(''), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setSendError(data.error || 'Send failed');
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-gray-400">Loading contact...</div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Contact not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/agency/crm/contacts')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Contacts
        </Button>
      </div>
    );
  }

  const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unnamed Contact';
  const initials = getInitials(contact.first_name, contact.last_name);
  const color = contact.avatar_color || getAvatarColor(contact.first_name, contact.last_name);
  const scoreBadge = getScoreBadge(contact.score, contact.score_label);
  const stageBadge = getStageBadge(contact.stage);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Back button */}
      <button onClick={() => router.push('/agency/crm/contacts')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition">
        <ArrowLeft className="h-4 w-4" /> Back to Contacts
      </button>

      {/* Contact Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center text-white text-xl font-bold shrink-0`}>
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${scoreBadge.color}`}>{scoreBadge.text}</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stageBadge.color}`}>{stageBadge.text}</span>
            </div>

            {contact.title && (
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" /> {contact.title}
              </p>
            )}

            {contact.company && (
              <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                <Building2 className="h-3.5 w-3.5" /> {contact.company.name}
                {contact.company.website && (
                  <a href={contact.company.website} target="_blank" rel="noopener" className="text-indigo-600 hover:underline ml-1">
                    <ExternalLink className="h-3 w-3 inline" />
                  </a>
                )}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="text-xs text-gray-500 flex items-center gap-1 hover:text-indigo-600">
                  <Mail className="h-3.5 w-3.5" /> {contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="text-xs text-gray-500 flex items-center gap-1 hover:text-indigo-600">
                  <Phone className="h-3.5 w-3.5" /> {contact.phone}
                </a>
              )}
            </div>

            {contact.tags?.length > 0 && (
              <div className="flex gap-1 mt-2">
                {contact.tags.map(tag => (
                  <span key={tag} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setShowSend(!showSend)}
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
              <MessageSquare className="h-4 w-4 mr-1" /> Send
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              setEditing(!editing);
              if (!editing) {
                setEditForm({
                  first_name: contact.first_name || '',
                  last_name: contact.last_name || '',
                  email: contact.email || '',
                  phone: contact.phone || '',
                  title: contact.title || '',
                  stage: contact.stage || 'lead',
                });
              }
            }}>
              <Edit2 className="h-4 w-4 mr-1" /> {editing ? 'Cancel' : 'Edit'}
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Edit Form */}
        {editing && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="First name" value={editForm.first_name || ''} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Last name" value={editForm.last_name || ''} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Phone" value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Title" value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
              <select className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={editForm.stage || 'lead'} onChange={e => setEditForm(f => ({ ...f, stage: e.target.value }))}>
                <option value="lead">Lead</option>
                <option value="contact">Contact</option>
                <option value="customer">Customer</option>
                <option value="churned">Churned</option>
              </select>
            </div>
            <div className="flex justify-end mt-3">
              <Button size="sm" onClick={handleSave} disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}

        {/* AI Summary */}
        {contact.ai_summary && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">AI Summary</span>
            </div>
            <p className="text-sm text-gray-700">{contact.ai_summary}</p>
            {contact.ai_next_action && (
              <p className="text-sm text-indigo-700 mt-1 font-medium">
                Suggested next: {contact.ai_next_action}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Send Message Panel */}
      {showSend && (
        <div className="bg-white border border-indigo-200 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-600" /> Send Message
          </h3>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSendChannel('sms')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                sendChannel === 'sms' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              📱 SMS
            </button>
            <button
              onClick={() => setSendChannel('email')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                sendChannel === 'email' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              ✉️ Email
            </button>
          </div>
          {sendChannel === 'email' && (
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm mb-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Subject"
              value={sendSubject}
              onChange={e => setSendSubject(e.target.value)}
            />
          )}
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            rows={3}
            placeholder={sendChannel === 'sms' ? `SMS to ${contact.phone || 'no phone'}...` : `Email to ${contact.email || 'no email'}...`}
            value={sendMessage}
            onChange={e => setSendMessage(e.target.value)}
          />
          {sendError && <p className="text-sm text-red-600 mt-1">{sendError}</p>}
          {sendSuccess && <p className="text-sm text-green-600 mt-1">{sendSuccess}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={() => setShowSend(false)}>Cancel</Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleSend}
              disabled={sending || !sendMessage.trim()}
            >
              {sending ? 'Sending...' : `Send ${sendChannel === 'sms' ? 'SMS' : 'Email'}`}
            </Button>
          </div>
        </div>
      )}

      {/* Two column: Timeline + Quick Info */}
      <div className="grid grid-cols-3 gap-6">
        {/* Timeline (2/3) */}
        <div className="col-span-2 space-y-4">
          {/* Add Note */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <textarea
              className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
              rows={2}
              placeholder="Add a note..."
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
            {noteText.trim() && (
              <div className="flex justify-end mt-2">
                <Button size="sm" onClick={handleAddNote} disabled={addingNote}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="h-4 w-4 mr-1" /> {addingNote ? 'Adding...' : 'Add Note'}
                </Button>
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" /> TIMELINE
            </h2>

            {(!contact.activities?.length) ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center text-sm text-gray-400">
                No activity yet.
              </div>
            ) : (
              <div className="space-y-0">
                {contact.activities.map((act, idx) => (
                  <TimelineItem key={act.id} activity={act} isLast={idx === contact.activities.length - 1} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Info (1/3) */}
        <div className="space-y-4">
          {/* Source */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Source</span>
                <span className="font-medium text-gray-900">{contact.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Score</span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${scoreBadge.color}`}>{scoreBadge.text}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-700">{new Date(contact.created_at).toLocaleDateString()}</span>
              </div>
              {contact.last_contacted_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Last contacted</span>
                  <span className="text-gray-700">{timeAgo(contact.last_contacted_at)}</span>
                </div>
              )}
              {contact.last_activity_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Last activity</span>
                  <span className="text-gray-700">{timeAgo(contact.last_activity_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Company Card */}
          {contact.company && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> Company
              </h3>
              <p className="font-semibold text-gray-900">{contact.company.name}</p>
              {contact.company.industry && <p className="text-xs text-gray-500 mt-0.5">{contact.company.industry}</p>}
              {contact.company.website && (
                <a href={contact.company.website} target="_blank" rel="noopener"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-1">
                  <Globe className="h-3 w-3" /> {contact.company.website}
                </a>
              )}
            </div>
          )}

          {/* AI Relationship Memory */}
          <AiMemorySection contactId={contactId} />

          {/* Enrichment Data */}
          {Object.keys(contact.enrichment_data || {}).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-purple-500" /> Enrichment
              </h3>
              <div className="space-y-1 text-xs text-gray-600">
                {Object.entries(contact.enrichment_data).slice(0, 8).map(([key, val]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <span className="text-gray-500 truncate">{key.replace(/_/g, ' ')}</span>
                    <span className="text-gray-900 truncate font-medium">{String(val).slice(0, 40)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deals */}
          {(contact.deals?.length || 0) > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Deals</h3>
              {contact.deals.map(deal => (
                <div key={deal.id} className="flex justify-between items-center py-1.5 text-sm">
                  <span className="font-medium text-gray-900">{deal.name}</span>
                  <span className="text-green-600 font-bold">${deal.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ activity, isLast }: { activity: CrmActivity; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      {/* Connector line */}
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <TimelineIcon type={activity.type} actor={activity.actor} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
      </div>

      {/* Content */}
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-900">{activity.subject || activity.type}</span>
          {activity.actor === 'ai' && (
            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">AI</span>
          )}
          <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(activity.created_at)}</span>
        </div>
        {activity.body && (
          <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap">{activity.body}</p>
        )}
        {activity.channel && (
          <span className="text-[10px] text-gray-400 mt-1 inline-block">via {activity.channel}</span>
        )}
      </div>
    </div>
  );
}

function AiMemorySection({ contactId }: { contactId: string }) {
  const [memories, setMemories] = useState<Array<{ id: string; type: string; content: string; source: string; created_at: string }>>([]);
  const [newMemory, setNewMemory] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch(`/api/agency/crm/contacts/${contactId}/memory`)
      .then(r => r.ok ? r.json() : { memories: [] })
      .then(d => setMemories(d.memories || []))
      .catch(() => {});
  }, [contactId]);

  const addManual = async () => {
    if (!newMemory.trim()) return;
    setAdding(true);
    await fetch(`/api/agency/crm/contacts/${contactId}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newMemory.trim(), type: 'context' }),
    });
    setNewMemory('');
    setAdding(false);
    const r = await fetch(`/api/agency/crm/contacts/${contactId}/memory`);
    if (r.ok) setMemories((await r.json()).memories || []);
  };

  const typeEmoji: Record<string, string> = {
    personal: '👤', preference: '⚙️', objection: '⚠️', interest: '💡',
    decision: '✅', context: '📝', relationship: '🤝',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1">
        <Brain className="h-3.5 w-3.5 text-indigo-500" /> AI Memory
        {memories.length > 0 && (
          <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full ml-1">{memories.length}</span>
        )}
      </h3>
      {memories.length === 0 ? (
        <p className="text-xs text-gray-400">AI will remember key details from conversations.</p>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {memories.slice(-15).reverse().map(m => (
            <div key={m.id} className="flex items-start gap-1.5 text-xs">
              <span className="shrink-0">{typeEmoji[m.type] || '📝'}</span>
              <span className="text-gray-700">{m.content}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex gap-1">
        <input
          className="flex-1 border rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          placeholder="Add memory..."
          value={newMemory}
          onChange={e => setNewMemory(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addManual()}
        />
        <button onClick={addManual} disabled={adding || !newMemory.trim()}
          className="text-xs text-indigo-600 font-medium hover:text-indigo-700 disabled:text-gray-300 px-2">
          {adding ? '...' : '+'}
        </button>
      </div>
    </div>
  );
}

function TimelineIcon({ type, actor }: { type: string; actor: string }) {
  const cls = 'h-4 w-4';
  if (actor === 'ai') return <Bot className={`${cls} text-indigo-500`} />;
  switch (type) {
    case 'email': return <Mail className={`${cls} text-blue-500`} />;
    case 'sms': return <MessageSquare className={`${cls} text-green-500`} />;
    case 'call': return <Phone className={`${cls} text-purple-500`} />;
    case 'note': return <FileText className={`${cls} text-gray-500`} />;
    case 'meeting': return <Calendar className={`${cls} text-indigo-500`} />;
    case 'ai_message': return <Bot className={`${cls} text-indigo-500`} />;
    case 'stage_change': return <ArrowRight className={`${cls} text-amber-500`} />;
    case 'enrichment': return <Sparkles className={`${cls} text-purple-500`} />;
    case 'score_change': return <Flame className={`${cls} text-red-500`} />;
    case 'system': return <CheckCircle2 className={`${cls} text-gray-400`} />;
    default: return <Clock className={`${cls} text-gray-400`} />;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
