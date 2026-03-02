'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, CheckCircle2, XCircle, Edit3, MessageSquare, Clock,
  Bot, User, Loader2, AlertTriangle, Settings, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReviewItem {
  id: string;
  client_id: string;
  client_name: string;
  channel: string;
  customer_message: string;
  ai_draft: string;
  created_at: string;
}

interface ReviewSettings {
  enabled: boolean;
  client_ids: string[];
}

export function ReviewQueueClient() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [settings, setSettings] = useState<ReviewSettings>({ enabled: false, client_ids: [] });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const fetchQueue = useCallback(async () => {
    const res = await fetch('/api/agency/review-queue');
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
      setSettings(data.settings || { enabled: false, client_ids: [] });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleAction = async (id: string, action: string, extra?: Record<string, string>) => {
    setProcessing(id);
    await fetch('/api/agency/review-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, id, ...extra }),
    });
    setItems(prev => prev.filter(i => i.id !== id));
    setEditing(null);
    setProcessing(null);
  };

  const toggleGate = async () => {
    const newEnabled = !settings.enabled;
    await fetch('/api/agency/review-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_settings', enabled: newEnabled }),
    });
    setSettings(s => ({ ...s, enabled: newEnabled }));
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 md:p-8 flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" /> Review Queue
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and approve AI responses before they reach customers
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
          <Settings className="h-4 w-4 mr-1" /> Settings
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Review Gate Settings</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Enable Review Gates</p>
              <p className="text-xs text-gray-500 mt-0.5">
                When enabled, AI responses are held for your approval before being sent to customers
              </p>
            </div>
            <button
              onClick={toggleGate}
              className={`relative w-11 h-6 rounded-full transition ${settings.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.enabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          {settings.enabled && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
              <p className="text-xs text-indigo-700">
                <span className="font-semibold">Active:</span> All new AI responses will be queued here for review.
                Nothing gets sent to customers until you approve it.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status Banner */}
      {!settings.enabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-700">
            <p className="font-semibold">Review Gates are off</p>
            <p className="text-xs mt-0.5">AI responses are being sent directly to customers without review. Enable review gates in settings above to add human oversight.</p>
          </div>
        </div>
      )}

      {/* Queue Stats */}
      <div className="flex items-center gap-4">
        <span className={`text-sm font-medium px-3 py-1.5 rounded-lg ${items.length > 0 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {items.length} pending review{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Queue Items */}
      {items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">All clear!</p>
          <p className="text-sm text-gray-400 mt-1">No messages waiting for review. You&apos;re all caught up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-indigo-200 transition">
              {/* Item Header */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-medium text-gray-900">{item.client_name}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase">{item.channel || 'chat'}</span>
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {timeAgo(item.created_at)}
                </span>
              </div>

              {/* Messages */}
              <div className="p-5 space-y-4">
                {/* Customer Message */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-gray-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-gray-500 uppercase">Customer</span>
                    <p className="text-sm text-gray-900 mt-0.5">{item.customer_message}</p>
                  </div>
                </div>

                {/* AI Draft */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-medium text-indigo-500 uppercase">AI Draft</span>
                    {editing === item.id ? (
                      <textarea
                        className="w-full mt-1 p-3 border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                        rows={4}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm text-gray-700 mt-0.5 bg-indigo-50/50 border border-indigo-100 rounded-lg p-3">{item.ai_draft}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/30 flex items-center gap-2">
                {editing === item.id ? (
                  <>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                      disabled={processing === item.id}
                      onClick={() => handleAction(item.id, 'edit_approve', { edited_response: editText, original_response: item.ai_draft })}>
                      {processing === item.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      Save & Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs" onClick={() => setEditing(null)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs"
                      disabled={processing === item.id}
                      onClick={() => handleAction(item.id, 'approve')}>
                      {processing === item.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs"
                      onClick={() => { setEditing(item.id); setEditText(item.ai_draft); }}>
                      <Edit3 className="h-3 w-3 mr-1" /> Edit & Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs text-red-600 hover:bg-red-50"
                      disabled={processing === item.id}
                      onClick={() => handleAction(item.id, 'reject')}>
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
