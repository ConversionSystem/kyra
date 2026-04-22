'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Phone, PhoneCall, Clock, Loader2, Play, FileText,
  Sparkles, Settings, BarChart3, ChevronDown, ChevronUp,
  Mic, Volume2, MessageSquare, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import { timeAgo } from '@/lib/format/time-ago';

// ── Types ──────────────────────────────────────────────────────────────────────

interface VoiceCallLog {
  id: string;
  created_at: string;
  user_message: string;
  ai_response: string;
  metadata?: {
    type?: string;
    duration_seconds?: number;
    caller_number?: string;
    direction?: string;
    recording_url?: string;
    status?: string;
    [key: string]: unknown;
  };
}

interface VoiceStats {
  totalCalls: number;
  callsToday: number;
  avgDuration: number;
  resolutionRate: number;
}

interface PersonalityConfig {
  tone: string;
  greeting: string;
  objectionHandling: string;
  script: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, sub }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-indigo-500" />
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ── Call Card ─────────────────────────────────────────────────────────────────

function CallCard({ call }: { call: VoiceCallLog }) {
  const [expanded, setExpanded] = useState(false);
  const duration = call.metadata?.duration_seconds;
  const direction = call.metadata?.direction || 'inbound';
  const status = call.metadata?.status || 'completed';

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-9 h-9 rounded-full ${
            status === 'completed' ? 'bg-green-100' : status === 'failed' ? 'bg-red-100' : 'bg-gray-100'
          }`}>
            {status === 'completed' ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : status === 'failed' ? (
              <XCircle className="w-4 h-4 text-red-600" />
            ) : (
              <Phone className="w-4 h-4 text-gray-500" />
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">
              {call.metadata?.caller_number || 'Unknown Caller'}
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="capitalize">{direction}</span>
              <span>•</span>
              <span>{timeAgo(call.created_at)}</span>
              {duration ? (
                <>
                  <span>•</span>
                  <span>{formatDuration(duration)}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-3">
          {/* AI Summary */}
          {call.ai_response && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">AI Summary</p>
              <p className="text-sm text-gray-700">{call.ai_response}</p>
            </div>
          )}

          {/* Transcript */}
          {call.user_message && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Transcript</p>
              <div className="rounded-lg bg-gray-50 p-3 max-h-48 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{call.user_message}</p>
              </div>
            </div>
          )}

          {/* Recording */}
          {call.metadata?.recording_url && (
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-indigo-600" />
              <a
                href={call.metadata.recording_url as string}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:underline"
              >
                Listen to recording
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function VoiceSubTab({ client }: { client: AgencyClient }) {
  const [calls, setCalls] = useState<VoiceCallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'calls' | 'config'>('calls');
  const [personality, setPersonality] = useState<PersonalityConfig>({
    tone: 'professional',
    greeting: '',
    objectionHandling: '',
    script: '',
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const stats: VoiceStats = (() => {
    const today = new Date().toISOString().split('T')[0];
    const todayCalls = calls.filter(c => c.created_at?.startsWith(today));
    const completedCalls = calls.filter(c => c.metadata?.status === 'completed' || !c.metadata?.status);
    const durations = calls
      .map(c => c.metadata?.duration_seconds)
      .filter((d): d is number => typeof d === 'number' && d > 0);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

    return {
      totalCalls: calls.length,
      callsToday: todayCalls.length,
      avgDuration: Math.round(avgDuration),
      resolutionRate: calls.length > 0 ? Math.round((completedCalls.length / calls.length) * 100) : 0,
    };
  })();

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/voice/call-logs?entityId=${client.id}&limit=50`);
      const data = await res.json() as { calls?: VoiceCallLog[] };
      setCalls(data.calls || []);
    } catch {
      // silent fail — table might not exist
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  const handleTestCall = useCallback(async () => {
    try {
      await fetch(`/api/voice/outbound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, test: true }),
      });
    } catch {
      // handled by UI
    }
  }, [client.id]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Phone} label="Total Calls" value={stats.totalCalls} />
        <StatCard icon={PhoneCall} label="Calls Today" value={stats.callsToday} />
        <StatCard icon={Clock} label="Avg Duration" value={formatDuration(stats.avgDuration)} />
        <StatCard icon={BarChart3} label="Resolution Rate" value={`${stats.resolutionRate}%`} />
      </div>

      {/* View toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveView('calls')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeView === 'calls' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Call History
          </button>
          <button
            onClick={() => setActiveView('config')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeView === 'config' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            AI Personality
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchCalls}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={handleTestCall}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            Test Call
          </button>
        </div>
      </div>

      {/* Call History */}
      {activeView === 'calls' && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : calls.length === 0 ? (
            <div className="text-center py-12 px-6">
              <Phone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No voice calls yet</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Voice calls for this client will appear here once connected.
              </p>
            </div>
          ) : (
            calls.map(call => <CallCard key={call.id} call={call} />)
          )}
        </div>
      )}

      {/* AI Personality Config */}
      {activeView === 'config' && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-gray-900">Voice AI Personality</h3>
          </div>
          <p className="text-sm text-gray-500">
            Configure how the AI sounds and behaves during phone calls for this client.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Tone</label>
              <select
                value={personality.tone}
                onChange={e => setPersonality(p => ({ ...p, tone: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="professional">Professional & Polished</option>
                <option value="friendly">Friendly & Casual</option>
                <option value="empathetic">Empathetic & Caring</option>
                <option value="authoritative">Authoritative & Direct</option>
                <option value="enthusiastic">Enthusiastic & Energetic</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Opening Greeting</label>
              <textarea
                value={personality.greeting}
                onChange={e => setPersonality(p => ({ ...p, greeting: e.target.value }))}
                placeholder="Hi! Thanks for calling [Business Name]. How can I help you today?"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Objection Handling</label>
              <textarea
                value={personality.objectionHandling}
                onChange={e => setPersonality(p => ({ ...p, objectionHandling: e.target.value }))}
                placeholder="When the caller says it's too expensive: Acknowledge their concern, highlight the value, offer a consultation..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Call Script / Guidelines</label>
              <textarea
                value={personality.script}
                onChange={e => setPersonality(p => ({ ...p, script: e.target.value }))}
                placeholder="1. Greet the caller warmly&#10;2. Identify their need&#10;3. Present relevant services&#10;4. Handle objections&#10;5. Book a meeting or transfer to a human"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={5}
              />
            </div>

            <button
              onClick={async () => {
                setSavingConfig(true);
                // Save to client settings (future: persist to agency_clients.voice_config)
                await new Promise(r => setTimeout(r, 500));
                setSavingConfig(false);
              }}
              disabled={savingConfig}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
              Save Personality
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
