'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Mic,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface VoiceCommandLog {
  timestamp: string;
  client_id: string | null;
  transcript: string;
  action: string;
  params: Record<string, string>;
  success: boolean;
  result: string;
}

const ACTION_LABELS: Record<string, string> = {
  update_greeting: 'Update Greeting',
  update_instructions: 'Update Instructions',
  toggle_permission: 'Toggle Permission',
  update_persona: 'Update Persona',
  send_message: 'Send Message',
  get_status: 'Get Status',
  unknown: 'Unknown',
};

const ACTION_COLORS: Record<string, string> = {
  update_greeting: 'bg-blue-50 text-blue-700 border-blue-200',
  update_instructions: 'bg-purple-50 text-purple-700 border-purple-200',
  toggle_permission: 'bg-amber-50 text-amber-700 border-amber-200',
  update_persona: 'bg-pink-50 text-pink-700 border-pink-200',
  send_message: 'bg-green-50 text-green-700 border-green-200',
  get_status: 'bg-gray-50 text-gray-700 border-gray-200',
  unknown: 'bg-gray-50 text-gray-500 border-gray-200',
};

export default function VoiceCommandsPage() {
  const [logs, setLogs] = useState<VoiceCommandLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agency/settings');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      const voiceLogs =
        (data.settings?.voice_command_logs as VoiceCommandLog[]) || [];
      setLogs(voiceLogs);
    } catch (err) {
      console.error('Failed to fetch voice logs:', err);
      setError('Failed to load voice command history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatTime = (timestamp: string) => {
    const d = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    if (diff < 60_000) return 'Just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;

    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Mic className="h-6 w-6 text-indigo-600" />
            </div>
            Voice Commands
          </h1>
          <p className="text-gray-500 mt-1">
            Recent voice commands and their results
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && logs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <RefreshCw className="h-8 w-8 animate-spin mb-3" />
          <p>Loading voice commands…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && logs.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Mic className="h-12 w-12 mb-4 opacity-40" />
          <p className="text-lg font-medium text-gray-500">No voice commands yet</p>
          <p className="text-sm mt-1">
            Use the microphone button to start giving voice commands
          </p>
        </div>
      )}

      {/* Command list */}
      {logs.length > 0 && (
        <div className="space-y-3">
          {logs.map((log, i) => (
            <div
              key={`${log.timestamp}-${i}`}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  {/* Status icon */}
                  <div className="shrink-0 mt-0.5">
                    {log.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    {/* Result message */}
                    <p className="font-medium text-gray-900">{log.result}</p>

                    {/* Transcript */}
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      &ldquo;{log.transcript}&rdquo;
                    </p>

                    {/* Action badge + params */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
                          ACTION_COLORS[log.action] || ACTION_COLORS.unknown
                        )}
                      >
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      {Object.entries(log.params || {}).map(([key, value]) =>
                        value ? (
                          <span
                            key={key}
                            className="text-xs text-gray-400 truncate max-w-[200px]"
                          >
                            {key}: {value}
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="shrink-0 flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  {formatTime(log.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
