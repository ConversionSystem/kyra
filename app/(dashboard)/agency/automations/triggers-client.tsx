'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  UserPlus, Calendar, Star, MessageSquare, AlertCircle, CreditCard,
  ChevronDown, ChevronUp, Zap, RefreshCw, Loader2, Check, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Event Trigger Definitions ─────────────────────────────────────────────────

interface TriggerDef {
  id: string;
  event: string;
  icon: React.ReactNode;
  name: string;
  subtitle: string;
  description: string;
  color: string;
  iconBg: string;
  defaultAction: string;
  delayOptions: Array<{ label: string; value: number }>;
}

const TRIGGER_DEFS: TriggerDef[] = [
  {
    id: 'new-lead',
    event: 'contact.created',
    icon: <UserPlus className="h-5 w-5" />,
    name: 'New Lead',
    subtitle: 'Contact added to GHL',
    description: 'AI reaches out immediately when a new lead is created — while they\'re still warm.',
    color: 'from-indigo-500 to-indigo-600',
    iconBg: 'bg-indigo-50 text-indigo-600',
    defaultAction: 'A new lead just came in. Look up their info in GHL and send a warm, personalized intro message introducing yourself. Keep it under 3 sentences. Don\'t be salesy.',
    delayOptions: [
      { label: 'Immediately', value: 0 },
      { label: '5 minutes', value: 300 },
      { label: '15 minutes', value: 900 },
      { label: '1 hour', value: 3600 },
    ],
  },
  {
    id: 'appointment-booked',
    event: 'appointment.created',
    icon: <Calendar className="h-5 w-5" />,
    name: 'Appointment Booked',
    subtitle: 'New appointment created',
    description: 'Sends a confirmation message + preparation info as soon as an appointment is booked.',
    color: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-50 text-violet-600',
    defaultAction: 'An appointment was just booked. Send the contact a warm confirmation with the date, time, and any preparation they need to know. Keep it friendly and concise.',
    delayOptions: [
      { label: 'Immediately', value: 0 },
      { label: '5 minutes', value: 300 },
    ],
  },
  {
    id: 'review-received',
    event: 'review.submitted',
    icon: <Star className="h-5 w-5" />,
    name: 'Review Received',
    subtitle: 'New review on GHL',
    description: 'AI drafts a professional response to every new review — positive or negative.',
    color: 'from-yellow-400 to-amber-500',
    iconBg: 'bg-yellow-50 text-yellow-600',
    defaultAction: 'A new review was received. Draft a professional, warm response. For positive reviews: thank them genuinely and invite them back. For negative reviews: apologize sincerely and offer to make it right. Keep under 4 sentences.',
    delayOptions: [
      { label: 'Immediately', value: 0 },
      { label: '30 minutes', value: 1800 },
      { label: '1 hour', value: 3600 },
    ],
  },
  {
    id: 'no-reply',
    event: 'contact.no_reply',
    icon: <MessageSquare className="h-5 w-5" />,
    name: 'No Reply',
    subtitle: 'Contact went silent',
    description: 'AI follows up when a lead stops responding. Brings them back without being pushy.',
    color: 'from-orange-500 to-amber-500',
    iconBg: 'bg-orange-50 text-orange-600',
    defaultAction: 'This contact hasn\'t replied in a while. Send a gentle, friendly follow-up. Ask a simple question to re-spark the conversation. Not salesy — just checking in.',
    delayOptions: [
      { label: 'After 24 hours', value: 86400 },
      { label: 'After 48 hours', value: 172800 },
      { label: 'After 3 days', value: 259200 },
      { label: 'After 7 days', value: 604800 },
    ],
  },
  {
    id: 'appointment-cancelled',
    event: 'appointment.cancelled',
    icon: <AlertCircle className="h-5 w-5" />,
    name: 'Appointment Cancelled',
    subtitle: 'Appointment was cancelled',
    description: 'When a booking is cancelled, AI reaches out to understand why and offer to rebook.',
    color: 'from-red-500 to-rose-500',
    iconBg: 'bg-red-50 text-red-500',
    defaultAction: 'An appointment was cancelled. Reach out to the contact with empathy. Ask if everything is okay and if they\'d like to reschedule. Don\'t pressure them.',
    delayOptions: [
      { label: 'Immediately', value: 0 },
      { label: '30 minutes', value: 1800 },
      { label: '2 hours', value: 7200 },
    ],
  },
  {
    id: 'payment-received',
    event: 'payment.received',
    icon: <CreditCard className="h-5 w-5" />,
    name: 'Payment Received',
    subtitle: 'Payment completed',
    description: 'AI sends a thank-you message and upsell/retention offer after a payment is received.',
    color: 'from-emerald-500 to-green-600',
    iconBg: 'bg-emerald-50 text-emerald-600',
    defaultAction: 'A payment was just received. Send a warm thank-you message. Express genuine appreciation. If appropriate, mention your referral program or invite them to leave a review.',
    delayOptions: [
      { label: 'Immediately', value: 0 },
      { label: '1 hour', value: 3600 },
      { label: '24 hours', value: 86400 },
    ],
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface TriggerConfig {
  id: string;
  event: string;
  enabled: boolean;
  action: string;
  delay: number;
  totalFired: number;
  lastFired: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TriggersClient() {
  const [triggers, setTriggers] = useState<Record<string, TriggerConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/agency/automations/triggers');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setTriggers(d.triggers || {});
    } catch (err) {
      console.error('[triggers] load failed:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (def: TriggerDef) => {
    const current = triggers[def.id];
    const enabled = !(current?.enabled ?? false);

    // Optimistic update
    const merged: TriggerConfig = {
      ...(current ?? {}),
      id: def.id,
      event: def.event,
      action: current?.action ?? def.defaultAction,
      delay: current?.delay ?? def.delayOptions[0].value,
      totalFired: current?.totalFired ?? 0,
      lastFired: current?.lastFired ?? null,
      enabled,
    };
    setTriggers(prev => ({ ...prev, [def.id]: merged }));

    setSaving(def.id);
    try {
      await fetch('/api/agency/automations/triggers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: def.id,
          event: def.event,
          enabled,
          action: current?.action ?? def.defaultAction,
          delay: current?.delay ?? def.delayOptions[0].value,
        }),
      });
    } catch (err) {
      // Rollback on error
      console.error('[triggers] toggle failed:', err);
      setTriggers(prev => ({ ...prev, [def.id]: current ?? prev[def.id] }));
    }
    setSaving(null);
  };

  const saveAction = async (def: TriggerDef) => {
    const current = triggers[def.id];
    const action = editing[def.id] ?? current?.action ?? def.defaultAction;
    setSaving(def.id + '-action');
    try {
      const res = await fetch('/api/agency/automations/triggers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: def.id,
          event: def.event,
          enabled: current?.enabled ?? false,
          action,
          delay: current?.delay ?? def.delayOptions[0].value,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTriggers(prev => ({ ...prev, [def.id]: { ...prev[def.id], action } }));
      setEditing(prev => { const n = { ...prev }; delete n[def.id]; return n; });
    } catch (err) {
      console.error('[triggers] save action failed:', err);
    }
    setSaving(null);
  };

  const setDelay = async (def: TriggerDef, delay: number) => {
    const current = triggers[def.id];
    setTriggers(prev => ({ ...prev, [def.id]: { ...prev[def.id], delay } }));
    try {
      const res = await fetch('/api/agency/automations/triggers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: def.id,
          event: def.event,
          enabled: current?.enabled ?? false,
          action: current?.action ?? def.defaultAction,
          delay,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error('[triggers] set delay failed:', err);
    }
  };

  const activeCount = Object.values(triggers).filter(t => t.enabled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">Event Triggers</h2>
          </div>
          <p className="text-sm text-gray-500">
            AI reacts instantly to GHL events — no scheduling needed.{' '}
            <span className="font-semibold text-indigo-600">{activeCount} active</span>.
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* ── Intro banner ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-900 mb-0.5">Instant AI reactions</p>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Unlike scheduled automations, triggers fire in real-time when something happens in GHL.
              A new lead gets a message within seconds. No cron job, no delay.
            </p>
          </div>
        </div>
      </div>

      {/* ── Trigger cards ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {TRIGGER_DEFS.map(def => {
          const config = triggers[def.id];
          const isEnabled = config?.enabled ?? false;
          const isExpanded = expanded === def.id;
          const isSaving = saving === def.id;
          const currentAction = editing[def.id] ?? config?.action ?? def.defaultAction;
          const currentDelay = config?.delay ?? def.delayOptions[0].value;
          const hasEdit = editing[def.id] !== undefined && editing[def.id] !== (config?.action ?? def.defaultAction);

          return (
            <div
              key={def.id}
              className={cn(
                'bg-white rounded-2xl border transition-all',
                isEnabled ? 'border-indigo-200 shadow-sm' : 'border-gray-200'
              )}
            >
              {/* Row */}
              <div className="flex items-center gap-3 p-4">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', def.iconBg)}>
                  {def.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-gray-900">{def.name}</span>
                    {isEnabled && config?.totalFired ? (
                      <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full">
                        {config.totalFired} fired
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-400">{def.subtitle}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Expand */}
                  <button
                    onClick={() => setExpanded(isExpanded ? null : def.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {/* Toggle */}
                  <button
                    onClick={() => toggle(def)}
                    disabled={isSaving}
                    className={cn(
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50',
                      isEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                    )}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 text-white animate-spin absolute top-0.5 left-0.5" />
                    ) : (
                      <span className={cn('pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform duration-200', isEnabled ? 'translate-x-5' : 'translate-x-0')} />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded config */}
              {isExpanded && (
                <div className="px-4 pb-5 border-t border-gray-100 pt-4 space-y-4">
                  <p className="text-xs text-gray-500 leading-relaxed">{def.description}</p>

                  {/* Delay selector */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">When to act</label>
                    <div className="flex flex-wrap gap-2">
                      {def.delayOptions.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setDelay(def, opt.value)}
                          className={cn(
                            'px-3 py-1.5 text-xs rounded-xl border font-medium transition-colors',
                            currentDelay === opt.value
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action editor */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">What the AI should do</label>
                    <textarea
                      value={currentAction}
                      onChange={e => setEditing(prev => ({ ...prev, [def.id]: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                    />
                    {hasEdit && (
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => setEditing(prev => { const n = { ...prev }; delete n[def.id]; return n; })}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 rounded-xl hover:bg-gray-100"
                        >
                          <X className="h-3 w-3" /> Discard
                        </button>
                        <button
                          onClick={() => saveAction(def)}
                          disabled={saving === def.id + '-action'}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {saving === def.id + '-action' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Save
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  {config?.totalFired ? (
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>🔁 {config.totalFired} times fired</span>
                      {config.lastFired && <span>⏱ Last: {new Date(config.lastFired).toLocaleDateString()}</span>}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
