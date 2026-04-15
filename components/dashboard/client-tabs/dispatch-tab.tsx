'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Truck, Clock, AlertTriangle, CheckCircle2, Zap,
  MapPin, Users, Bell, Settings, Play, RefreshCw,
  TrendingUp, Shield, Loader2, Plus,
  Trash2, Save, ToggleLeft, ToggleRight, Key, Copy, Check,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────

interface DispatchConfig {
  enabled: boolean;
  hasApiKey: boolean;
  optimizationIntervalMinutes: number;
  zones: SlaZone[];
  rules: SlaRule[];
  notificationGate: {
    suppressOnReassign: boolean;
    suppressOnRouteReoptimize: boolean;
    cooldownMinutes: number;
  };
  defaultSlaTotalMinutes: number;
  autoOptimize: boolean;
}

interface SlaZone {
  id: string;
  name: string;
  zipCodes: string[];
  targetMinutes: number;
  priority: number;
  color: string;
}

interface SlaRule {
  id: string;
  enabled: boolean;
  name: string;
  description: string;
  type: string;
  config: Record<string, unknown>;
}

interface DispatchStats {
  totalTasks24h: number;
  completedOnTime: number;
  slaBreaches: number;
  avgDeliveryMinutes: number;
  activeDrivers: number;
  optimizationRuns24h: number;
  lastOptimization?: string;
}

interface DriverStatus {
  id: string;
  name: string;
  onDuty: boolean;
  activeTasks: number;
  location?: [number, number];
  lastSeen: string;
  currentTaskEta?: number;
  breakEligible: boolean;
}

interface DispatchEventEntry {
  id: string;
  event_type: string;
  details: Record<string, unknown>;
  tasks_affected: number;
  workers_affected: number;
  created_at: string;
}

type SubView = 'overview' | 'routes' | 'drivers' | 'notifications' | 'rules';

const SUB_VIEWS: { id: SubView; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'routes', label: 'Routes & Optimization', icon: MapPin },
  { id: 'drivers', label: 'Drivers', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'rules', label: 'Automation Rules', icon: Settings },
];

// ── Main Component ────────────────────────────────────────────────────────

export default function DispatchTab({ clientId }: { clientId: string }) {
  const [activeView, setActiveView] = useState<SubView>('overview');
  const [config, setConfig] = useState<DispatchConfig | null>(null);
  const [stats, setStats] = useState<DispatchStats | null>(null);
  const [drivers, setDrivers] = useState<DriverStatus[]>([]);
  const [events, setEvents] = useState<DispatchEventEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/dispatch`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setConfig(data.config);
      setStats(data.stats);
      setEvents(data.recentEvents || []);
    } catch (err) {
      console.error('Failed to load dispatch config:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const loadDrivers = useCallback(async () => {
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/dispatch/drivers`);
      if (res.ok) {
        const data = await res.json();
        setDrivers(data.drivers || []);
      }
    } catch {
      // silently fail — drivers are optional if API key not set
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (activeView === 'drivers' && config?.hasApiKey) loadDrivers();
  }, [activeView, config?.hasApiKey, loadDrivers]);

  const saveConfig = async (updates: Record<string, unknown>) => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/dispatch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        // Reload full config from server to stay in sync
        await loadData();
        setSaveMsg('Saved');
        setTimeout(() => setSaveMsg(null), 2000);
      } else {
        const data = await res.json();
        setSaveMsg(`Error: ${data.error || 'Failed to save'}`);
      }
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveMsg('Error: Network failure');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Truck className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Dispatch Intelligence</h2>
            <p className="text-xs text-gray-500">Route optimization, SLA tracking, driver management</p>
          </div>
        </div>
        {config?.enabled && config?.hasApiKey && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="h-3 w-3" /> Active
          </span>
        )}
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {SUB_VIEWS.map((v) => {
          const Icon = v.icon;
          const isActive = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setActiveView(v.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {v.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeView === 'overview' && (
        <OverviewView
          clientId={clientId}
          config={config}
          stats={stats}
          events={events}
          onSave={saveConfig}
          saving={saving}
          saveMsg={saveMsg}
        />
      )}
      {activeView === 'routes' && (
        <RoutesView
          clientId={clientId}
          config={config}
          onSave={saveConfig}
          saving={saving}
          saveMsg={saveMsg}
        />
      )}
      {activeView === 'drivers' && (
        <DriversView drivers={drivers} onRefresh={loadDrivers} config={config} />
      )}
      {activeView === 'notifications' && (
        <NotificationsView
          config={config}
          onSave={saveConfig}
          saving={saving}
          saveMsg={saveMsg}
        />
      )}
      {activeView === 'rules' && (
        <RulesView
          config={config}
          onSave={saveConfig}
          saving={saving}
          saveMsg={saveMsg}
        />
      )}
    </div>
  );
}

// ── Save Button ───────────────────────────────────────────────────────────

function SaveButton({ saving, saveMsg, onClick }: { saving: boolean; saveMsg: string | null; onClick: () => void }) {
  return (
    <div className="flex items-center gap-3 justify-end">
      {saveMsg && (
        <span className={`text-xs ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {saveMsg}
        </span>
      )}
      <button
        onClick={onClick}
        disabled={saving}
        className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save Changes
      </button>
    </div>
  );
}

// ── Overview View ──────────────────────────────────────────────────────────

function OverviewView({
  clientId,
  config,
  stats,
  events,
  onSave,
  saving,
  saveMsg,
}: {
  clientId: string;
  config: DispatchConfig | null;
  stats: DispatchStats | null;
  events: DispatchEventEntry[];
  onSave: (updates: Record<string, unknown>) => void;
  saving: boolean;
  saveMsg: string | null;
}) {
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);

  // No API key — show setup
  if (!config?.hasApiKey) {
    return (
      <div className="space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white">
          <div>
            <p className="text-sm font-semibold text-gray-900">Dispatch Intelligence</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {config?.enabled ? 'Enabled — connect OnFleet to start' : 'Enable to start optimizing delivery routes'}
            </p>
          </div>
          <button
            onClick={() => onSave({ enabled: !config?.enabled })}
            disabled={saving}
          >
            {config?.enabled ? (
              <ToggleRight className="h-8 w-8 text-green-500" />
            ) : (
              <ToggleLeft className="h-8 w-8 text-gray-300" />
            )}
          </button>
        </div>

        {/* API Key Setup */}
        <div className="p-6 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <Key className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Connect OnFleet</p>
              <p className="text-xs text-gray-500">Enter your OnFleet API key to enable route optimization and driver tracking</p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your OnFleet API key"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={() => onSave({ onfleetApiKey: apiKey.trim(), enabled: true })}
              disabled={saving || !apiKey.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {saving ? 'Connecting...' : 'Connect OnFleet'}
            </button>
            {saveMsg && (
              <p className={`text-xs ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{saveMsg}</p>
            )}
          </div>
        </div>

        {/* Webhook URL for reference */}
        <WebhookUrlCard clientId={clientId} />
      </div>
    );
  }

  const statCards = [
    { label: 'Deliveries (24h)', value: stats?.totalTasks24h ?? 0, icon: Truck },
    { label: 'On Time', value: stats?.completedOnTime ?? 0, icon: CheckCircle2, color: 'text-green-600' },
    { label: 'SLA Breaches', value: stats?.slaBreaches ?? 0, icon: AlertTriangle, color: stats?.slaBreaches ? 'text-red-600' : 'text-gray-400' },
    { label: 'Avg. Minutes', value: stats?.avgDeliveryMinutes ?? 0, icon: Clock },
    { label: 'Active Drivers', value: stats?.activeDrivers ?? 0, icon: Users },
    { label: 'Optimizations', value: stats?.optimizationRuns24h ?? 0, icon: Zap },
  ];

  return (
    <div className="space-y-6">
      {/* Enable/Disable + API Key */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Dispatch Intelligence</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {config.enabled
                ? 'Actively optimizing routes and managing SLAs'
                : 'Enable to start optimizing delivery routes'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Update API Key */}
          {showApiInput ? (
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="New API key"
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => { onSave({ onfleetApiKey: apiKey.trim() }); setShowApiInput(false); setApiKey(''); }}
                disabled={!apiKey.trim()}
                className="text-xs text-indigo-600 font-medium hover:text-indigo-700"
              >
                Update
              </button>
              <button
                onClick={() => { setShowApiInput(false); setApiKey(''); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowApiInput(true)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <Key className="h-3 w-3" /> API Key
            </button>
          )}
          <button
            onClick={() => onSave({ enabled: !config.enabled })}
            disabled={saving}
          >
            {config.enabled ? (
              <ToggleRight className="h-8 w-8 text-green-500" />
            ) : (
              <ToggleLeft className="h-8 w-8 text-gray-300" />
            )}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      {config.enabled && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="p-4 rounded-xl border border-gray-200 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-4 w-4 ${s.color || 'text-gray-400'}`} />
                  <span className="text-xs text-gray-500">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* SLA Performance Bar */}
      {config.enabled && stats && stats.totalTasks24h > 0 && (
        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <p className="text-sm font-semibold text-gray-900 mb-3">SLA Performance</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all"
                style={{ width: `${Math.round((stats.completedOnTime / stats.totalTasks24h) * 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-gray-900">
              {Math.round((stats.completedOnTime / stats.totalTasks24h) * 100)}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1.5">
            {stats.completedOnTime} of {stats.totalTasks24h} deliveries met SLA target
          </p>
        </div>
      )}

      {/* Webhook URL */}
      {config.enabled && <WebhookUrlCard clientId={clientId} />}

      {/* Recent Events */}
      {config.enabled && events.length > 0 && (
        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <p className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</p>
          <div className="space-y-2">
            {events.slice(0, 10).map((e) => (
              <div key={e.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-gray-50 last:border-0">
                <EventIcon type={e.event_type} />
                <span className="flex-1 text-gray-700">{formatEventType(e.event_type)}</span>
                <span className="text-gray-400">
                  {e.tasks_affected > 0 && `${e.tasks_affected} tasks`}
                </span>
                <span className="text-gray-400 tabular-nums">
                  {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Optimization */}
      {config.enabled && stats?.lastOptimization && (
        <p className="text-xs text-gray-400 text-center">
          Last optimization: {new Date(stats.lastOptimization).toLocaleString()}
        </p>
      )}
    </div>
  );
}

// ── Webhook URL Card ──────────────────────────────────────────────────────

function WebhookUrlCard({ clientId, hasApiKey }: { clientId: string; hasApiKey?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState<{ success: boolean; message: string } | null>(null);
  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/onfleet?clientId=${clientId}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const registerWebhooks = async () => {
    setRegistering(true);
    setRegisterResult(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/dispatch/webhooks`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setRegisterResult({ success: false, message: data.error || 'Failed to register' });
      } else if (data.failed > 0) {
        const failedNames = data.results
          .filter((r: { status: string }) => r.status === 'failed')
          .map((r: { name: string; error?: string }) => `${r.name}: ${r.error}`)
          .join(', ');
        setRegisterResult({ success: false, message: `${data.created} registered, ${data.failed} failed: ${failedNames}` });
      } else {
        setRegisterResult({
          success: true,
          message: `${data.created} webhook${data.created !== 1 ? 's' : ''} registered${data.existed ? `, ${data.existed} already existed` : ''}`,
        });
      }
    } catch {
      setRegisterResult({ success: false, message: 'Network error' });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-indigo-500" />
          <p className="text-sm font-semibold text-gray-900">OnFleet Webhooks</p>
        </div>
        {hasApiKey && (
          <button
            onClick={registerWebhooks}
            disabled={registering}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {registering ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Registering...</>
            ) : (
              <><Zap className="h-3 w-3" /> Auto-Register Webhooks</>
            )}
          </button>
        )}
      </div>

      {registerResult && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 ${
          registerResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {registerResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {registerResult.message}
        </div>
      )}

      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg overflow-x-auto">
          {webhookUrl}
        </code>
        <button
          onClick={copyUrl}
          className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-indigo-600 border border-gray-200 rounded-lg transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1.5">
        {hasApiKey
          ? 'Click "Auto-Register Webhooks" to set up all 6 triggers automatically, or add them manually in OnFleet.'
          : 'Connect your OnFleet API key first, then webhooks can be auto-registered.'}
      </p>
    </div>
  );
}

// ── Routes & Optimization View ─────────────────────────────────────────────

function RoutesView({
  clientId,
  config,
  onSave,
  saving,
  saveMsg,
}: {
  clientId: string;
  config: DispatchConfig | null;
  onSave: (updates: Record<string, unknown>) => void;
  saving: boolean;
  saveMsg: string | null;
}) {
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<string | null>(null);
  const [interval, setInterval_] = useState(config?.optimizationIntervalMinutes ?? 15);
  const [defaultSla, setDefaultSla] = useState(config?.defaultSlaTotalMinutes ?? 60);
  const [autoOpt, setAutoOpt] = useState(config?.autoOptimize ?? true);
  const [zones, setZones] = useState<SlaZone[]>(config?.zones ?? []);

  const triggerOptimization = async () => {
    setOptimizing(true);
    setOptimizeResult(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/dispatch/optimize`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setOptimizeResult(`Optimized: ${data.tasksProcessed} tasks processed, ${data.tasksUpdated} updated`);
      } else {
        setOptimizeResult(`Error: ${data.errors?.join(', ') || data.error || 'Unknown'}`);
      }
    } catch {
      setOptimizeResult('Network error');
    } finally {
      setOptimizing(false);
    }
  };

  const addZone = () => {
    const newZone: SlaZone = {
      id: `zone-${Date.now()}`,
      name: '',
      zipCodes: [],
      targetMinutes: 45,
      priority: zones.length + 1,
      color: ZONE_COLORS[zones.length % ZONE_COLORS.length],
    };
    setZones([...zones, newZone]);
  };

  const updateZone = (id: string, updates: Partial<SlaZone>) => {
    setZones(zones.map((z) => z.id === id ? { ...z, ...updates } : z));
  };

  const removeZone = (id: string) => {
    setZones(zones.filter((z) => z.id !== id));
  };

  const handleSave = () => {
    onSave({
      optimizationIntervalMinutes: interval,
      defaultSlaTotalMinutes: defaultSla,
      autoOptimize: autoOpt,
      zones,
    });
  };

  return (
    <div className="space-y-6">
      {/* Manual Optimization Trigger */}
      <div className="p-4 rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Route Optimization</p>
            <p className="text-xs text-gray-500">Trigger OnFleet route optimization manually or on a schedule</p>
          </div>
          <button
            onClick={triggerOptimization}
            disabled={optimizing || !config?.hasApiKey}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {optimizing ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Optimizing...</>
            ) : (
              <><Play className="h-3.5 w-3.5" /> Run Now</>
            )}
          </button>
        </div>
        {optimizeResult && (
          <p className={`text-xs mt-2 ${optimizeResult.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {optimizeResult}
          </p>
        )}
        {!config?.hasApiKey && (
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Connect your OnFleet API key in the Overview tab to enable optimization
          </p>
        )}
      </div>

      {/* Auto-Optimization Settings */}
      <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-4">
        <p className="text-sm font-semibold text-gray-900">Auto-Optimization</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-700">Enable auto-optimization</p>
            <p className="text-xs text-gray-500">Runs route optimization on a schedule</p>
          </div>
          <button onClick={() => setAutoOpt(!autoOpt)}>
            {autoOpt ? (
              <ToggleRight className="h-7 w-7 text-green-500" />
            ) : (
              <ToggleLeft className="h-7 w-7 text-gray-300" />
            )}
          </button>
        </div>

        {autoOpt && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Optimization interval (minutes)
              </label>
              <input
                type="number"
                min={5}
                max={120}
                value={interval}
                onChange={(e) => setInterval_(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                Default SLA target (minutes)
              </label>
              <input
                type="number"
                min={15}
                max={240}
                value={defaultSla}
                onChange={(e) => setDefaultSla(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* SLA Zones */}
      <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">SLA Zones</p>
            <p className="text-xs text-gray-500">Set delivery time targets by zip code area</p>
          </div>
          <button
            onClick={addZone}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            <Plus className="h-3.5 w-3.5" /> Add Zone
          </button>
        </div>

        {zones.length === 0 && (
          <p className="text-xs text-gray-400 py-4 text-center">
            No zones configured. All deliveries use the default {defaultSla}-minute SLA.
          </p>
        )}

        {zones.map((zone) => (
          <div key={zone.id} className="border border-gray-100 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: zone.color }}
              />
              <input
                type="text"
                value={zone.name}
                onChange={(e) => updateZone(zone.id, { name: e.target.value })}
                placeholder="Zone name (e.g. Blue Zone)"
                className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="number"
                value={zone.targetMinutes}
                onChange={(e) => updateZone(zone.id, { targetMinutes: Number(e.target.value) })}
                className="w-20 px-2 py-1 border border-gray-200 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                min={10}
                max={240}
              />
              <span className="text-xs text-gray-400">min</span>
              <button
                onClick={() => removeZone(zone.id)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Zip codes (comma-separated — press Enter or comma to add)
              </label>
              <ZipCodeInput
                zipCodes={zone.zipCodes}
                onChange={(zipCodes) => updateZone(zone.id, { zipCodes })}
              />
            </div>
          </div>
        ))}
      </div>

      <SaveButton saving={saving} saveMsg={saveMsg} onClick={handleSave} />
    </div>
  );
}

// ── Zip Code Input (tag-style) ────────────────────────────────────────────

function ZipCodeInput({ zipCodes, onChange }: { zipCodes: string[]; onChange: (zips: string[]) => void }) {
  const [input, setInput] = useState('');

  const addZips = (raw: string) => {
    const newZips = raw
      .split(/[,\s]+/)
      .map((z) => z.trim())
      .filter((z) => z && !zipCodes.includes(z));
    if (newZips.length > 0) {
      onChange([...zipCodes, ...newZips]);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addZips(input);
    }
    if (e.key === 'Backspace' && !input && zipCodes.length > 0) {
      onChange(zipCodes.slice(0, -1));
    }
  };

  const handleBlur = () => {
    if (input.trim()) addZips(input);
  };

  const removeZip = (zip: string) => {
    onChange(zipCodes.filter((z) => z !== zip));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5 border border-gray-200 rounded-lg min-h-[36px] focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
      {zipCodes.map((zip) => (
        <span key={zip} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium">
          {zip}
          <button onClick={() => removeZip(zip)} className="text-indigo-400 hover:text-indigo-700">
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={zipCodes.length === 0 ? 'Type zip codes...' : ''}
        className="flex-1 min-w-[80px] text-sm outline-none bg-transparent"
      />
    </div>
  );
}

// ── Drivers View ──────────────────────────────────────────────────────────

function DriversView({
  drivers,
  onRefresh,
  config,
}: {
  drivers: DriverStatus[];
  onRefresh: () => void;
  config: DispatchConfig | null;
}) {
  const onDuty = drivers.filter((d) => d.onDuty);
  const offDuty = drivers.filter((d) => !d.onDuty);

  if (!config?.hasApiKey) {
    return (
      <div className="text-center py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 mx-auto mb-4">
          <Users className="h-6 w-6 text-indigo-600" />
        </div>
        <p className="text-sm font-medium text-gray-700">Connect OnFleet to see drivers</p>
        <p className="text-xs text-gray-400 mt-1">Go to the Overview tab and add your OnFleet API key</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">
          {onDuty.length} on duty, {offDuty.length} off duty
        </p>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {drivers.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No driver data available</p>
          <p className="text-xs text-gray-400 mt-1">Drivers will appear here when they&apos;re active in OnFleet</p>
        </div>
      )}

      {/* On Duty */}
      {onDuty.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">On Duty</p>
          {onDuty.map((d) => (
            <DriverCard key={d.id} driver={d} />
          ))}
        </div>
      )}

      {/* Off Duty */}
      {offDuty.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Off Duty</p>
          {offDuty.map((d) => (
            <DriverCard key={d.id} driver={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DriverCard({ driver }: { driver: DriverStatus }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white">
      <div className={`w-2 h-2 rounded-full ${driver.onDuty ? 'bg-green-400' : 'bg-gray-300'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{driver.name}</p>
        <p className="text-xs text-gray-500">
          {driver.activeTasks} active task{driver.activeTasks !== 1 ? 's' : ''}
          {driver.currentTaskEta && ` \u00b7 ETA ${Math.round(driver.currentTaskEta / 60)}min`}
        </p>
      </div>
      {driver.breakEligible && (
        <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">
          Break eligible
        </span>
      )}
      <span className="text-xs text-gray-400">
        {new Date(driver.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

// ── Notifications View ──────────────────────────────────────────────────────

function NotificationsView({
  config,
  onSave,
  saving,
  saveMsg,
}: {
  config: DispatchConfig | null;
  onSave: (updates: Record<string, unknown>) => void;
  saving: boolean;
  saveMsg: string | null;
}) {
  const gate = config?.notificationGate ?? {
    suppressOnReassign: true,
    suppressOnRouteReoptimize: true,
    cooldownMinutes: 10,
  };

  const [suppressReassign, setSuppressReassign] = useState(gate.suppressOnReassign);
  const [suppressReoptimize, setSuppressReoptimize] = useState(gate.suppressOnRouteReoptimize);
  const [cooldown, setCooldown] = useState(gate.cooldownMinutes);

  const handleSave = () => {
    onSave({
      notificationGate: {
        suppressOnReassign: suppressReassign,
        suppressOnRouteReoptimize: suppressReoptimize,
        cooldownMinutes: cooldown,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-4 w-4 text-indigo-500" />
          <p className="text-sm font-semibold text-gray-900">Notification Gate</p>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Controls WHEN notifications are sent. Prevents duplicate tracking messages when tasks are reassigned or routes are reoptimized.
          The Voice &amp; SMS tab controls WHAT message content is sent.
        </p>

        <div className="space-y-4">
          <ToggleRow
            label="Suppress on reassignment"
            description="Don't send a new tracking notification when a task is moved to a different driver"
            enabled={suppressReassign}
            onChange={setSuppressReassign}
          />
          <ToggleRow
            label="Suppress during reoptimization"
            description="Don't notify when routes are rebalanced by the optimizer"
            enabled={suppressReoptimize}
            onChange={setSuppressReoptimize}
          />
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              Notification cooldown (minutes)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Minimum time between notifications for the same order
            </p>
            <input
              type="number"
              min={0}
              max={120}
              value={cooldown}
              onChange={(e) => setCooldown(Number(e.target.value))}
              className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <SaveButton saving={saving} saveMsg={saveMsg} onClick={handleSave} />
    </div>
  );
}

// ── Automation Rules View ──────────────────────────────────────────────────

function RulesView({
  config,
  onSave,
  saving,
  saveMsg,
}: {
  config: DispatchConfig | null;
  onSave: (updates: Record<string, unknown>) => void;
  saving: boolean;
  saveMsg: string | null;
}) {
  // Use DEFAULT_RULES if config has no rules or empty array
  const initialRules = config?.rules && config.rules.length > 0 ? config.rules : DEFAULT_RULES;
  const [rules, setRules] = useState<SlaRule[]>(initialRules);

  const toggleRule = (id: string) => {
    setRules(rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const handleSave = () => {
    onSave({ rules });
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border border-gray-200 bg-white">
        <p className="text-sm font-semibold text-gray-900 mb-1">Automation Rules</p>
        <p className="text-xs text-gray-500 mb-4">
          Rules that automatically adjust delivery routing based on conditions
        </p>

        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                rule.enabled ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-100'
              }`}
            >
              <button onClick={() => toggleRule(rule.id)}>
                {rule.enabled ? (
                  <ToggleRight className="h-6 w-6 text-green-500" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-gray-300" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                <p className="text-xs text-gray-500">{rule.description}</p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {rule.type.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      <SaveButton saving={saving} saveMsg={saveMsg} onClick={handleSave} />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-xs font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button onClick={() => onChange(!enabled)}>
        {enabled ? (
          <ToggleRight className="h-6 w-6 text-green-500" />
        ) : (
          <ToggleLeft className="h-6 w-6 text-gray-300" />
        )}
      </button>
    </div>
  );
}

function EventIcon({ type }: { type: string }) {
  const icons: Record<string, { icon: React.ElementType; color: string }> = {
    optimization_run: { icon: Zap, color: 'text-indigo-500' },
    sla_breach: { icon: AlertTriangle, color: 'text-red-500' },
    notification_suppressed: { icon: Bell, color: 'text-amber-500' },
    driver_break: { icon: Clock, color: 'text-gray-500' },
    route_rebalance: { icon: RefreshCw, color: 'text-indigo-500' },
    complete_before_set: { icon: Clock, color: 'text-green-500' },
  };
  const entry = icons[type] ?? { icon: TrendingUp, color: 'text-gray-400' };
  const Icon = entry.icon;
  return <Icon className={`h-3.5 w-3.5 ${entry.color}`} />;
}

function formatEventType(type: string): string {
  const labels: Record<string, string> = {
    optimization_run: 'Route optimization completed',
    sla_breach: 'SLA breach detected',
    notification_suppressed: 'Notification suppressed',
    driver_break: 'Driver break scheduled',
    route_rebalance: 'Routes rebalanced',
    complete_before_set: 'SLA deadline set',
  };
  return labels[type] ?? type.replace(/_/g, ' ');
}

const ZONE_COLORS = ['#6366F1', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

const DEFAULT_RULES: SlaRule[] = [
  {
    id: 'rule-cutoff-priority',
    enabled: true,
    name: 'Near-Cutoff Priority Boost',
    description: 'Orders placed within 10 minutes of a batch cutoff get prioritized to the first half of the next route',
    type: 'complete_before_override',
    config: { cutoffBufferMinutes: 10 },
  },
  {
    id: 'rule-auto-reoptimize',
    enabled: true,
    name: 'Auto-Reoptimize on Cancellation',
    description: 'When a delivery is cancelled, automatically reoptimize the remaining route',
    type: 'optimization_interval',
    config: { triggerOnCancel: true },
  },
  {
    id: 'rule-breach-alert',
    enabled: true,
    name: 'SLA Breach Alert',
    description: 'Alert dispatch when a delivery is projected to exceed its SLA target by 15+ minutes',
    type: 'breach_alert',
    config: { thresholdMinutes: 15 },
  },
  {
    id: 'rule-driver-break',
    enabled: false,
    name: 'Driver Break Enforcement',
    description: 'After 4 hours on duty, mark driver as break-eligible and exclude from new route assignments',
    type: 'driver_break',
    config: { hoursBeforeBreak: 4 },
  },
];
