'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Mail, Phone, Building2, Globe, Calendar,
  Edit2, Trash2, Tag, Bot, MessageSquare, FileText, Flame,
  Sparkles, CheckCircle2, Clock, User, Briefcase,
  Plus, Save, X, ExternalLink, Brain, Send, Target,
  AlertTriangle, CheckSquare, DollarSign, Loader2,
  TrendingUp, Zap, ArrowRight, MoreHorizontal,
  Copy, Link2, Star, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ContactDetail, CrmActivity } from '@/lib/crm/types';
import { getInitials, getAvatarColor, getScoreBadge, getStageBadge } from '@/lib/crm/types';

type Tab = 'timeline' | 'tasks' | 'deals' | 'emails';
type TimelineFilter = 'all' | 'email' | 'sms' | 'call' | 'note' | 'meeting' | 'ai_message' | 'system';

// ─── Main Component ────────────────────────────────────────────────────────────

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
  const [activeTab, setActiveTab] = useState<Tab>('timeline');
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');
  const [tagInput, setTagInput] = useState('');
  const [showAddDeal, setShowAddDeal] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; status: string; priority: string; due_date: string | null }>>([]);
  const [aiActionLoading, setAiActionLoading] = useState<string | null>(null);
  const [aiActionResult, setAiActionResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchContact = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/crm/contacts/${contactId}`);
      if (res.ok) setContact(await res.json());
    } catch (err) {
      console.error('[contact-detail] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/crm/tasks?contact_id=${contactId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('[contact-detail] tasks fetch error:', err);
    }
  }, [contactId]);

  useEffect(() => { fetchContact(); fetchTasks(); }, [fetchContact, fetchTasks]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agency/crm/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) { setEditing(false); fetchContact(); }
    } catch (err) {
      console.error('[contact-detail] save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this contact and all their data? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/agency/crm/contacts/${contactId}`, { method: 'DELETE' });
      if (res.ok) router.push('/agency/crm/contacts');
    } catch (err) {
      console.error('[contact-detail] delete error:', err);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      await fetch('/api/agency/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId, type: 'note', subject: 'Note added', body: noteText.trim(), actor: 'human' }),
      });
      setNoteText('');
      fetchContact();
    } catch (err) {
      console.error('[contact-detail] add note error:', err);
    } finally {
      setAddingNote(false);
    }
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

  const handleAddTag = async () => {
    if (!tagInput.trim() || !contact) return;
    const newTags = [...(contact.tags || []), tagInput.trim()];
    try {
      await fetch(`/api/agency/crm/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      });
      setTagInput('');
      fetchContact();
    } catch (err) {
      console.error('[contact-detail] add tag error:', err);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!contact) return;
    const newTags = (contact.tags || []).filter(t => t !== tag);
    try {
      await fetch(`/api/agency/crm/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags }),
      });
      fetchContact();
    } catch (err) {
      console.error('[contact-detail] remove tag error:', err);
    }
  };

  const handleStageChange = async (stage: string) => {
    await fetch(`/api/agency/crm/contacts/${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    });
    fetchContact();
  };

  const handleAiAction = async (action: string) => {
    setAiActionLoading(action);
    setAiActionResult(null);
    // Simulate AI action — in production would call AI API
    setTimeout(() => {
      const results: Record<string, string> = {
        summarize: `${contact?.first_name || 'Contact'} is a ${contact?.stage || 'lead'} with a score of ${contact?.score || 0}. ${contact?.activities?.length || 0} activities recorded. ${contact?.deals?.length || 0} active deals.`,
        draft_followup: `Hi ${contact?.first_name || 'there'},\n\nJust following up on our last conversation. I wanted to check in and see if you had any questions.\n\nLooking forward to hearing from you!`,
        score: `Score updated based on activity patterns: ${Math.min((contact?.score || 0) + 15, 100)} (was ${contact?.score || 0}).`,
        enrich: `Enrichment scan completed. Found additional data points for ${contact?.email || 'this contact'}.`,
      };
      setAiActionResult(results[action] || 'Action completed');
      setAiActionLoading(null);
    }, 1500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Loading / Not Found ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 text-center">
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
  const daysSinceContact = contact.last_contacted_at
    ? Math.floor((Date.now() - new Date(contact.last_contacted_at).getTime()) / 86400000)
    : null;
  const isStale = daysSinceContact !== null && daysSinceContact > 14;

  const filteredActivities = (contact.activities || []).filter(a => {
    if (timelineFilter === 'all') return true;
    return a.type === timelineFilter;
  });

  const openTasks = tasks.filter(t => t.status !== 'done');
  const pipelineValue = (contact.deals || []).reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-5">
      {/* Back button */}
      <button onClick={() => router.push('/agency/crm/contacts')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition">
        <ArrowLeft className="h-4 w-4" /> Back to Contacts
      </button>

      {/* ═══ HERO HEADER ═══ */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Top section with gradient accent */}
        <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />

        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
            {/* Avatar */}
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${color} flex items-center justify-center text-white text-xl sm:text-2xl font-bold shrink-0 shadow-lg`}>
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{name}</h1>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${scoreBadge.color}`}>{scoreBadge.text}</span>

                {/* Stage dropdown */}
                <select
                  value={contact.stage}
                  onChange={e => handleStageChange(e.target.value)}
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border-0 cursor-pointer ${stageBadge.color}`}
                >
                  <option value="lead">Lead</option>
                  <option value="contact">Contact</option>
                  <option value="customer">Customer</option>
                  <option value="churned">Churned</option>
                </select>
              </div>

              {contact.title && (
                <p className="text-sm text-gray-600 flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" /> {contact.title}
                </p>
              )}

              {contact.company && (
                <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-0.5">
                  <Building2 className="h-3.5 w-3.5" /> {contact.company.name}
                  {contact.company.website && (
                    <a href={contact.company.website} target="_blank" rel="noopener" className="text-indigo-600 hover:underline">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </p>
              )}

              {/* Contact methods — clickable with copy */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3">
                {contact.email && (
                  <button onClick={() => copyToClipboard(contact.email!)}
                    className="text-sm text-gray-500 flex items-center gap-1.5 hover:text-indigo-600 transition group">
                    <Mail className="h-4 w-4" /> {contact.email}
                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                  </button>
                )}
                {contact.phone && (
                  <button onClick={() => copyToClipboard(contact.phone!)}
                    className="text-sm text-gray-500 flex items-center gap-1.5 hover:text-indigo-600 transition group">
                    <Phone className="h-4 w-4" /> {contact.phone}
                    <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                  </button>
                )}
                {copied && <span className="text-xs text-green-600">Copied!</span>}
              </div>

              {/* Tags — inline editable */}
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                {(contact.tags || []).map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium group">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="opacity-0 group-hover:opacity-100 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    className="w-20 text-xs border-0 border-b border-dashed border-gray-300 focus:border-indigo-500 focus:outline-none py-0.5 bg-transparent"
                    placeholder="+ tag"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                    onBlur={() => tagInput.trim() && handleAddTag()}
                  />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 shrink-0 w-full sm:w-auto mt-3 sm:mt-0">
              <Button size="sm" onClick={() => setShowSend(!showSend)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 sm:flex-none">
                <Send className="h-4 w-4 mr-1" /> Message
              </Button>
              <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => {
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

          {/* Stale contact warning */}
          {isStale && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700">
                Last contacted {daysSinceContact} days ago. Consider following up.
              </p>
              <Button size="sm" variant="outline" className="ml-auto text-xs h-7"
                onClick={() => handleAiAction('draft_followup')}>
                <Sparkles className="h-3 w-3 mr-1" /> Draft Follow-up
              </Button>
            </div>
          )}

          {/* Edit Form */}
          {editing && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="First name" value={editForm.first_name || ''} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Last name" value={editForm.last_name || ''} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Title" value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Email" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                <input className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Phone" value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="flex justify-end mt-3">
                <Button size="sm" onClick={handleSave} disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ═══ QUICK STATS BAR ═══ */}
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 sm:px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">Activities</p>
            <p className="text-lg font-bold text-gray-900">{(contact.activities || []).length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Open Deals</p>
            <p className="text-lg font-bold text-gray-900">{(contact.deals || []).length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Pipeline</p>
            <p className="text-lg font-bold text-green-600">${pipelineValue.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Open Tasks</p>
            <p className="text-lg font-bold text-gray-900">{openTasks.length}</p>
          </div>
        </div>
      </div>

      {/* Send Message Panel */}
      {showSend && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-600" /> Send Message
          </h3>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setSendChannel('sms')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${sendChannel === 'sms' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>
              📱 SMS
            </button>
            <button onClick={() => setSendChannel('email')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${sendChannel === 'email' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>
              ✉️ Email
            </button>
            <Button size="sm" variant="ghost" className="ml-auto text-xs"
              onClick={() => handleAiAction('draft_followup')}>
              <Sparkles className="h-3 w-3 mr-1" /> AI Draft
            </Button>
          </div>
          {sendChannel === 'email' && (
            <input className="w-full border rounded-lg px-3 py-2 text-sm mb-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Subject" value={sendSubject} onChange={e => setSendSubject(e.target.value)} />
          )}
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            rows={3}
            placeholder={sendChannel === 'sms' ? `SMS to ${contact.phone || 'no phone'}...` : `Email to ${contact.email || 'no email'}...`}
            value={sendMessage} onChange={e => setSendMessage(e.target.value)} />
          {sendError && <p className="text-sm text-red-600 mt-1">{sendError}</p>}
          {sendSuccess && <p className="text-sm text-green-600 mt-1">{sendSuccess}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={() => setShowSend(false)}>Cancel</Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleSend} disabled={sending || !sendMessage.trim()}>
              {sending ? 'Sending...' : `Send ${sendChannel === 'sms' ? 'SMS' : 'Email'}`}
            </Button>
          </div>
        </div>
      )}

      {/* ═══ AI QUICK ACTIONS ═══ */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-indigo-500" /> AI Quick Actions
        </h3>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'summarize', label: '📝 Summarize', desc: 'AI summary of this contact' },
            { key: 'draft_followup', label: '✉️ Draft Follow-up', desc: 'Generate follow-up message' },
            { key: 'score', label: '📊 Re-Score', desc: 'Update contact score' },
            { key: 'enrich', label: '✨ Enrich', desc: 'Pull enrichment data' },
          ].map(action => (
            <button
              key={action.key}
              onClick={() => handleAiAction(action.key)}
              disabled={aiActionLoading !== null}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-lg text-sm transition disabled:opacity-50"
            >
              {aiActionLoading === action.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>{action.label}</span>}
            </button>
          ))}
        </div>
        {aiActionResult && (
          <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <div className="flex items-start justify-between">
              <p className="text-sm text-indigo-900 whitespace-pre-wrap">{aiActionResult}</p>
              <button onClick={() => setAiActionResult(null)} className="text-indigo-400 hover:text-indigo-600 shrink-0 ml-2">
                <X className="h-4 w-4" />
              </button>
            </div>
            {aiActionLoading === null && aiActionResult.includes('Hi ') && (
              <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => {
                setSendMessage(aiActionResult);
                setShowSend(true);
                setAiActionResult(null);
              }}>
                <Send className="h-3 w-3 mr-1" /> Use as message
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ═══ AI SUMMARY ═══ */}
      {contact.ai_summary && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-bold text-gray-900 uppercase tracking-wide">AI Summary</span>
          </div>
          <p className="text-sm text-gray-700">{contact.ai_summary}</p>
          {contact.ai_next_action && (
            <p className="text-sm text-indigo-700 mt-2 font-medium flex items-center gap-1.5">
              <ArrowRight className="h-4 w-4" /> {contact.ai_next_action}
            </p>
          )}
        </div>
      )}

      {/* ═══ TABS ═══ */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {[
          { key: 'timeline' as Tab, label: 'Timeline', icon: Clock, count: (contact.activities || []).length },
          { key: 'tasks' as Tab, label: 'Tasks', icon: CheckSquare, count: openTasks.length },
          { key: 'deals' as Tab, label: 'Deals', icon: Target, count: (contact.deals || []).length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
              activeTab === tab.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" /> {tab.label}
            {tab.count > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Main Content (2/3) */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-4">
          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <>
              {/* Add Note */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex gap-2">
                  <textarea
                    className="flex-1 border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                    rows={2} placeholder="Add a note..."
                    value={noteText} onChange={e => setNoteText(e.target.value)} />
                  <Button size="sm" onClick={handleAddNote} disabled={addingNote || !noteText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white self-end">
                    <Plus className="h-4 w-4 mr-1" /> {addingNote ? '...' : 'Note'}
                  </Button>
                </div>
              </div>

              {/* Timeline Filters */}
              <div className="flex gap-1 flex-wrap">
                {[
                  { key: 'all' as TimelineFilter, label: 'All' },
                  { key: 'note' as TimelineFilter, label: '📝 Notes' },
                  { key: 'email' as TimelineFilter, label: '✉️ Email' },
                  { key: 'sms' as TimelineFilter, label: '📱 SMS' },
                  { key: 'call' as TimelineFilter, label: '📞 Call' },
                  { key: 'meeting' as TimelineFilter, label: '📅 Meeting' },
                  { key: 'ai_message' as TimelineFilter, label: '🤖 AI' },
                  { key: 'system' as TimelineFilter, label: '⚙️ System' },
                ].map(f => (
                  <button key={f.key} onClick={() => setTimelineFilter(f.key)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                      timelineFilter === f.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Timeline */}
              {filteredActivities.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                  No activity {timelineFilter !== 'all' ? `of type "${timelineFilter}"` : 'yet'}.
                </div>
              ) : (
                <div className="space-y-0">
                  {filteredActivities.map((act, idx) => (
                    <TimelineItem key={act.id} activity={act} isLast={idx === filteredActivities.length - 1} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
                <Button size="sm" onClick={() => setShowAddTask(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="h-4 w-4 mr-1" /> Add Task
                </Button>
              </div>

              {tasks.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                  <CheckSquare className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400">No tasks for this contact</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
                  {tasks.map(task => {
                    const isOverdue = task.status !== 'done' && task.due_date && task.due_date < new Date().toISOString().split('T')[0];
                    const priorityColors: Record<string, string> = { urgent: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-yellow-100 text-yellow-700', low: 'bg-gray-100 text-gray-600' };
                    return (
                      <div key={task.id} className={`px-5 py-3 flex items-center gap-3 ${isOverdue ? 'bg-red-50/50' : ''}`}>
                        <button
                          onClick={async () => {
                            await fetch(`/api/agency/crm/tasks/${task.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: task.status === 'done' ? 'todo' : 'done' }),
                            });
                            fetchTasks();
                          }}
                          className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${
                            task.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-indigo-500'
                          }`}>
                          {task.status === 'done' && <span className="text-xs">✓</span>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {task.title}
                          </p>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${priorityColors[task.priority] || priorityColors.medium}`}>
                          {task.priority}
                        </span>
                        {task.due_date && (
                          <span className={`text-xs ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                            {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {showAddTask && (
                <QuickAddTask contactId={contactId} onClose={() => setShowAddTask(false)} onCreated={() => { setShowAddTask(false); fetchTasks(); }} />
              )}
            </>
          )}

          {/* Deals Tab */}
          {activeTab === 'deals' && (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  {(contact.deals || []).length} deal{(contact.deals || []).length !== 1 ? 's' : ''} · ${pipelineValue.toLocaleString()} pipeline
                </p>
                <Button size="sm" onClick={() => setShowAddDeal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="h-4 w-4 mr-1" /> Add Deal
                </Button>
              </div>

              {(contact.deals || []).length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                  <Target className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400">No deals linked to this contact</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contact.deals.map(deal => {
                    const stageColors: Record<string, string> = {
                      prospect: 'border-l-indigo-400', qualified: 'border-l-blue-400',
                      proposal: 'border-l-purple-400', negotiation: 'border-l-amber-400',
                      won: 'border-l-green-400', lost: 'border-l-gray-400',
                    };
                    return (
                      <div key={deal.id} className={`bg-white border border-gray-200 border-l-4 ${stageColors[deal.stage] || ''} rounded-xl p-4`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{deal.name}</h4>
                            <p className="text-xs text-gray-500 capitalize mt-0.5">{deal.stage} · {deal.probability}% probability</p>
                          </div>
                          <p className="text-xl font-bold text-gray-900">${Number(deal.value).toLocaleString()}</p>
                        </div>
                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              deal.probability >= 75 ? 'bg-green-500' :
                              deal.probability >= 50 ? 'bg-amber-500' :
                              deal.probability >= 25 ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                            style={{ width: `${deal.probability}%` }}
                          />
                        </div>
                        {deal.close_date && (
                          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Close: {new Date(deal.close_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {showAddDeal && (
                <QuickAddDeal contactId={contactId} onClose={() => setShowAddDeal(false)} onCreated={() => { setShowAddDeal(false); fetchContact(); }} />
              )}
            </>
          )}
        </div>

        {/* ═══ SIDEBAR (1/3) ═══ */}
        <div className="space-y-4">
          {/* Details Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Details</h3>
            <div className="space-y-2.5 text-sm">
              <DetailRow label="Source" value={contact.source} />
              <DetailRow label="Score">
                <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${scoreBadge.color}`}>{scoreBadge.text}</span>
              </DetailRow>
              <DetailRow label="Created" value={new Date(contact.created_at).toLocaleDateString()} />
              {contact.last_contacted_at && (
                <DetailRow label="Last contacted">
                  <span className={isStale ? 'text-red-600 font-medium' : 'text-gray-700'}>
                    {timeAgo(contact.last_contacted_at)}
                    {isStale && ' ⚠️'}
                  </span>
                </DetailRow>
              )}
              {contact.last_activity_at && (
                <DetailRow label="Last activity" value={timeAgo(contact.last_activity_at)} />
              )}
            </div>
          </div>

          {/* Company Card */}
          {contact.company && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
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
            <div className="bg-white border border-gray-200 rounded-xl p-4">
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
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-500">{label}</span>
      {children || <span className="text-gray-900 font-medium">{value}</span>}
    </div>
  );
}

function TimelineItem({ activity, isLast }: { activity: CrmActivity; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <TimelineIcon type={activity.type} actor={activity.actor} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-gray-200 my-1" />}
      </div>
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-gray-900">{activity.subject || activity.type}</span>
          {activity.actor === 'ai' && (
            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">AI</span>
          )}
          {activity.direction && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
              activity.direction === 'inbound' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>{activity.direction}</span>
          )}
          <span className="text-[10px] text-gray-400 ml-auto">{timeAgo(activity.created_at)}</span>
        </div>
        {activity.body && (
          <p className="text-xs text-gray-600 mt-0.5 whitespace-pre-wrap bg-gray-50 rounded-lg p-2">{activity.body}</p>
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
    <div className="bg-white border border-gray-200 rounded-xl p-4">
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
        <input className="flex-1 border rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          placeholder="Add memory..." value={newMemory} onChange={e => setNewMemory(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addManual()} />
        <button onClick={addManual} disabled={adding || !newMemory.trim()}
          className="text-xs text-indigo-600 font-medium hover:text-indigo-700 disabled:text-gray-300 px-2">
          {adding ? '...' : '+'}
        </button>
      </div>
    </div>
  );
}

function QuickAddTask({ contactId, onClose, onCreated }: { contactId: string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await fetch('/api/agency/crm/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, due_date: dueDate || undefined, priority, contact_id: contactId }),
    });
    onCreated();
  };

  return (
    <div className="bg-white border border-indigo-200 rounded-xl p-4 space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          placeholder="Task title..." value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        <div className="flex gap-3">
          <input type="date" className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            value={dueDate} onChange={e => setDueDate(e.target.value)} />
          <select className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="urgent">🔴 Urgent</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">⚪ Low</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={saving || !title.trim()}>
            {saving ? 'Creating...' : 'Add Task'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function QuickAddDeal({ contactId, onClose, onCreated }: { contactId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [stage, setStage] = useState('prospect');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await fetch('/api/agency/crm/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, value: Number(value) || 0, stage, contact_id: contactId }),
    });
    onCreated();
  };

  return (
    <div className="bg-white border border-indigo-200 rounded-xl p-4 space-y-3">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          placeholder="Deal name..." value={name} onChange={e => setName(e.target.value)} autoFocus />
        <div className="flex gap-3">
          <div className="relative flex-1">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Value" type="number" value={value} onChange={e => setValue(e.target.value)} />
          </div>
          <select className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            value={stage} onChange={e => setStage(e.target.value)}>
            <option value="prospect">Prospect</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={saving || !name.trim()}>
            {saving ? 'Creating...' : 'Add Deal'}
          </Button>
        </div>
      </form>
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
    case 'task': return <CheckSquare className={`${cls} text-indigo-500`} />;
    case 'deal_created': return <Target className={`${cls} text-green-500`} />;
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
