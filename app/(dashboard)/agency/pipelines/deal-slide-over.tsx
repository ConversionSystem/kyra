'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X, DollarSign, Calendar, User, Building2, Tag, FileText,
  Trash2, Trophy, XCircle, ChevronDown, Save, Loader2, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getInitials, getAvatarColor } from '@/lib/crm/types';
import type { CrmDeal, CrmActivity } from '@/lib/crm/types';

// ─── Types ──────────────────────────────────────────────────────────────

interface DealWithRelations extends CrmDeal {
  contact: { id: string; first_name: string | null; last_name: string | null; email: string | null; avatar_color: string | null } | null;
  company: { id: string; name: string } | null;
}

const STAGES = [
  { id: 'prospect', label: 'Prospect' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
] as const;

// ─── Component ──────────────────────────────────────────────────────────

export function DealSlideOver({
  deal,
  onClose,
  onUpdate,
  onDelete,
}: {
  deal: DealWithRelations;
  onClose: () => void;
  onUpdate: (dealId: string, updates: Partial<CrmDeal>) => Promise<void>;
  onDelete: (dealId: string) => Promise<void>;
}) {
  const [name, setName] = useState(deal.name);
  const [value, setValue] = useState(String(deal.value));
  const [stage, setStage] = useState(deal.stage);
  const [closeDate, setCloseDate] = useState(deal.close_date || '');
  const [notes, setNotes] = useState(deal.notes || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset when deal changes
  useEffect(() => {
    setName(deal.name);
    setValue(String(deal.value));
    setStage(deal.stage);
    setCloseDate(deal.close_date || '');
    setNotes(deal.notes || '');
    setHasChanges(false);
  }, [deal.id, deal.name, deal.value, deal.stage, deal.close_date, deal.notes]);

  // Track changes
  useEffect(() => {
    const changed =
      name !== deal.name ||
      value !== String(deal.value) ||
      stage !== deal.stage ||
      closeDate !== (deal.close_date || '') ||
      notes !== (deal.notes || '');
    setHasChanges(changed);
  }, [name, value, stage, closeDate, notes, deal]);

  // Fetch activities for this deal
  useEffect(() => {
    async function fetchActivities() {
      setLoadingActivities(true);
      try {
        const res = await fetch(`/api/agency/crm/activities?deal_id=${deal.id}`);
        if (res.ok) {
          const data = await res.json();
          setActivities(Array.isArray(data) ? data : data.activities || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoadingActivities(false);
      }
    }
    fetchActivities();
  }, [deal.id]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(deal.id, {
      name,
      value: parseFloat(value) || 0,
      stage,
      close_date: closeDate || null,
      notes: notes || null,
    } as Partial<CrmDeal>);
    setSaving(false);
    setHasChanges(false);
  };

  const handleStageChange = async (newStage: string) => {
    setStage(newStage as CrmDeal['stage']);
    await onUpdate(deal.id, { stage: newStage } as Partial<CrmDeal>);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this deal? This cannot be undone.')) return;
    setDeleting(true);
    await onDelete(deal.id);
    setDeleting(false);
  };

  const handleQuickWin = () => handleStageChange('won');
  const handleQuickLost = () => handleStageChange('lost');

  const contactName = deal.contact
    ? ((deal.contact.first_name || '') + ' ' + (deal.contact.last_name || '')).trim() || deal.contact.email || 'Unknown'
    : 'No contact';
  const initials = deal.contact ? getInitials(deal.contact.first_name, deal.contact.last_name) : '?';
  const avatarColor = deal.contact?.avatar_color || getAvatarColor(deal.contact?.first_name, deal.contact?.last_name);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="text-lg font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 w-full p-0"
              placeholder="Deal name"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasChanges && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Save
              </Button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {/* Quick Actions */}
          {deal.stage !== 'won' && deal.stage !== 'lost' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 flex-1 text-xs"
                onClick={handleQuickWin}
              >
                <Trophy className="h-3.5 w-3.5 mr-1" /> Mark Won
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-gray-500 border-gray-200 hover:bg-gray-50 flex-1 text-xs"
                onClick={handleQuickLost}
              >
                <XCircle className="h-3.5 w-3.5 mr-1" /> Mark Lost
              </Button>
            </div>
          )}

          {/* Stage */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Stage</label>
            <select
              value={stage}
              onChange={e => handleStageChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
            >
              {STAGES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Value */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Deal Value</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                placeholder="0"
              />
            </div>
          </div>

          {/* Expected Close Date */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Expected Close Date</label>
            <input
              type="date"
              value={closeDate}
              onChange={e => setCloseDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
            />
          </div>

          {/* Contact */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Contact</label>
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center shrink-0`}>
                <span className="text-xs font-bold text-white">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{contactName}</p>
                {deal.contact?.email && (
                  <p className="text-xs text-gray-500 truncate">{deal.contact.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Company */}
          {deal.company && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Company</label>
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-900 truncate">{deal.company.name}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              placeholder="Add notes about this deal..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-none"
            />
          </div>

          {/* Activity Timeline */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Activity</label>
            {loadingActivities ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">No activity yet</div>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 10).map(act => (
                  <div key={act.id} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700">{act.subject || act.type}</p>
                      {act.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{act.body}</p>}
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                        <Clock className="h-3 w-3" />
                        {new Date(act.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        {act.actor_name && <span>· {act.actor_name}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-5 py-3 flex items-center justify-between">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition"
          >
            {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            Delete deal
          </button>
          <p className="text-[10px] text-gray-400">
            Created {new Date(deal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>
    </>
  );
}
