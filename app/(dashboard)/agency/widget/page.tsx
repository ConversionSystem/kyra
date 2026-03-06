'use client';

// ============================================================================
// Widget Builder + Chat Analytics
//
// Visual editor for the embeddable web chat widget with:
// 1. Live preview of widget customization
// 2. Color, greeting, position, avatar, auto-open controls
// 3. Embed code generator for multiple platforms
// 4. Chat analytics dashboard (conversations, leads, conversion)
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  Palette,
  Code,
  BarChart3,
  Copy,
  Check,
  Eye,
  MessageCircle,
  Users,
  TrendingUp,
  Flame,
  ArrowUpRight,
  Globe,
  Smartphone,
  Monitor,
  ChevronRight,
  Sparkles,
  Settings2,
  ExternalLink,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WidgetConfig {
  title: string;
  greeting: string;
  color: string;
  position: 'bottom-right' | 'bottom-left';
  avatarEmoji: string;
  poweredBy: boolean;
  autoOpen: boolean;
  autoOpenDelay: number; // seconds
}

interface Analytics {
  overview: {
    totalMessages: number;
    totalSessions: number;
    avgMessagesPerSession: number;
    avgResponseLength: number;
    leadsTotal: number;
    leadsHot: number;
    leadsNew: number;
    leadConversionRate: number;
  };
  daily: Array<{ date: string; messages: number; sessions: number; leads: number }>;
  clientBreakdown: Array<{ clientId: string; clientName: string; messages: number; sessions: number }>;
  topSources: Array<{ page: string; count: number }>;
}

// ── Color Presets ─────────────────────────────────────────────────────────────
const COLOR_PRESETS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Slate', value: '#475569' },
  { name: 'Black', value: '#18181b' },
];

const AVATAR_OPTIONS = ['🤖', '💬', '👋', '🧠', '⚡', '🎯', '🌟', '🔮', '🤝', '💡'];

export default function WidgetBuilderPage() {
  const [activeTab, setActiveTab] = useState<'builder' | 'analytics'>('builder');
  const [copied, setCopied] = useState(false);
  const [embedPlatform, setEmbedPlatform] = useState<'html' | 'wordpress' | 'shopify' | 'react'>('html');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Widget config state
  const [config, setConfig] = useState<WidgetConfig>({
    title: 'Chat with us',
    greeting: 'Hi! 👋 How can I help you today?',
    color: '#6366f1',
    position: 'bottom-right',
    avatarEmoji: '🤖',
    poweredBy: true,
    autoOpen: false,
    autoOpenDelay: 5,
  });

  // Analytics state
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Clients for embed code
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load clients
  useEffect(() => {
    fetch('/api/agency/clients')
      .then(r => r.json())
      .then(data => {
        const list = (data.clients || data || []).filter((c: Record<string, unknown>) => c.status === 'active' || c.status === 'setup');
        setClients(list);
        if (list.length > 0 && !selectedClient) {
          setSelectedClient(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Load client widget config
  useEffect(() => {
    if (!selectedClient) return;
    fetch(`/api/agency/clients/${selectedClient}`)
      .then(r => r.json())
      .then(data => {
        const cfg = data.client?.container_config || data.container_config || {};
        setConfig(prev => ({
          ...prev,
          title: cfg.widget_title || prev.title,
          greeting: cfg.widget_greeting || prev.greeting,
          color: cfg.widget_color || prev.color,
          avatarEmoji: cfg.widget_avatar || prev.avatarEmoji,
          position: cfg.widget_position || prev.position,
          autoOpen: cfg.widget_auto_open || false,
          autoOpenDelay: cfg.widget_auto_open_delay || 5,
          poweredBy: cfg.widget_powered_by !== undefined ? Boolean(cfg.widget_powered_by) : true,
        }));
      })
      .catch(() => {});
  }, [selectedClient]);

  // Load analytics
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const params = new URLSearchParams({ days: String(analyticsDays) });
      if (selectedClient) params.set('clientId', selectedClient);
      const res = await fetch(`/api/agency/analytics/chat-widget?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setAnalyticsError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsDays, selectedClient]);

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
  }, [activeTab, fetchAnalytics]);

  // Save config
  const saveConfig = async () => {
    if (!selectedClient) return;
    setSaving(true);
    try {
      await fetch(`/api/agency/clients/${selectedClient}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          container_config: {
            widget_title: config.title,
            widget_greeting: config.greeting,
            widget_color: config.color,
            widget_avatar: config.avatarEmoji,
            widget_position: config.position,
            widget_auto_open: config.autoOpen,
            widget_auto_open_delay: config.autoOpenDelay,
            widget_powered_by: config.poweredBy,
          },
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Failed to save widget config');
    } finally {
      setSaving(false);
    }
  };

  // Generate embed code
  const getEmbedCode = () => {
    const id = selectedClient || '{CLIENT_ID}';
    const base = 'https://kyra.conversionsystem.com';

    switch (embedPlatform) {
      case 'html':
        return `<!-- Kyra AI Chat Widget -->\n<script src="${base}/api/widget/${id}/script" defer></script>`;
      case 'wordpress':
        return `<!-- Add to your theme's footer.php or use a "Header & Footer Scripts" plugin -->\n<script src="${base}/api/widget/${id}/script" defer></script>`;
      case 'shopify':
        return `<!-- Paste in Online Store → Themes → Edit Code → theme.liquid (before </body>) -->\n<script src="${base}/api/widget/${id}/script" defer></script>`;
      case 'react':
        return `// Add to your layout component or _app.tsx\nimport Script from 'next/script';\n\n<Script\n  src="${base}/api/widget/${id}/script"\n  strategy="lazyOnload"\n/>`;
      default:
        return '';
    }
  };

  const copyEmbed = () => {
    navigator.clipboard.writeText(getEmbedCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat Widget</h1>
          <p className="text-sm text-gray-500 mt-1">
            Customize your AI chat widget and track its performance
          </p>
        </div>

        {/* Client Selector */}
        {clients.length > 0 && (
          <select
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2 bg-white"
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Single tab — Builder only. Conversations live in the Conversations inbox. */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <div className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-white shadow text-gray-900">
            <Palette className="h-4 w-4" />
            Builder
          </div>
        </div>
        <a
          href={`/agency/conversations?channel=web_chat${selectedClient ? `&clientId=${selectedClient}` : ''}`}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
          <BarChart3 className="h-4 w-4" />
          View chat conversations
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {true ? (
        <WidgetBuilder
          config={config}
          setConfig={setConfig}
          saveConfig={saveConfig}
          saving={saving}
          saved={saved}
          embedPlatform={embedPlatform}
          setEmbedPlatform={setEmbedPlatform}
          getEmbedCode={getEmbedCode}
          copyEmbed={copyEmbed}
          copied={copied}
          previewMode={previewMode}
          setPreviewMode={setPreviewMode}
          selectedClient={selectedClient}
        />
      ) : (
        <WidgetAnalytics
          analytics={analytics}
          loading={analyticsLoading}
          error={analyticsError}
          days={analyticsDays}
          setDays={setAnalyticsDays}
          onRetry={fetchAnalytics}
        />
      )}
    </div>
  );
}

// ── Widget Builder ──────────────────────────────────────────────────────────

function WidgetBuilder({
  config,
  setConfig,
  saveConfig,
  saving,
  saved,
  embedPlatform,
  setEmbedPlatform,
  getEmbedCode,
  copyEmbed,
  copied,
  previewMode,
  setPreviewMode,
  selectedClient,
}: {
  config: WidgetConfig;
  setConfig: (fn: (prev: WidgetConfig) => WidgetConfig) => void;
  saveConfig: () => void;
  saving: boolean;
  saved: boolean;
  embedPlatform: string;
  setEmbedPlatform: (p: 'html' | 'wordpress' | 'shopify' | 'react') => void;
  getEmbedCode: () => string;
  copyEmbed: () => void;
  copied: boolean;
  previewMode: string;
  setPreviewMode: (m: 'desktop' | 'mobile') => void;
  selectedClient: string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Controls */}
      <div className="space-y-6">
        {/* Appearance */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
            <Palette className="h-5 w-5 text-indigo-500" />
            Appearance
          </h2>

          {/* Widget Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={config.title}
              onChange={e => setConfig(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Chat with us"
            />
          </div>

          {/* Greeting */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Greeting Message</label>
            <textarea
              value={config.greeting}
              onChange={e => setConfig(prev => ({ ...prev, greeting: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={2}
              placeholder="Hi! 👋 How can I help you today?"
            />
          </div>

          {/* Color */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {COLOR_PRESETS.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => setConfig(prev => ({ ...prev, color: preset.value }))}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    config.color === preset.value ? 'border-gray-900 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                />
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={config.color}
                  onChange={e => setConfig(prev => ({ ...prev, color: e.target.value }))}
                  className="w-8 h-8 rounded-full cursor-pointer border-0"
                  title="Custom color"
                />
              </div>
            </div>
          </div>

          {/* Avatar */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setConfig(prev => ({ ...prev, avatarEmoji: emoji }))}
                  className={`w-10 h-10 rounded-full border-2 text-lg flex items-center justify-center transition-transform ${
                    config.avatarEmoji === emoji ? 'border-indigo-500 bg-indigo-50 scale-110' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Position */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <div className="flex gap-2">
              {(['bottom-right', 'bottom-left'] as const).map(pos => (
                <button
                  key={pos}
                  onClick={() => setConfig(prev => ({ ...prev, position: pos }))}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    config.position === pos ? 'bg-indigo-100 text-indigo-700 border-indigo-200 border' : 'bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200'
                  }`}
                >
                  {pos === 'bottom-right' ? '↘ Bottom Right' : '↙ Bottom Left'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Behavior */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
            <Settings2 className="h-5 w-5 text-indigo-500" />
            Behavior
          </h2>

          {/* Auto-open */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Auto-open for new visitors</label>
              <p className="text-xs text-gray-500">Widget opens automatically after a delay</p>
            </div>
            <button
              onClick={() => setConfig(prev => ({ ...prev, autoOpen: !prev.autoOpen }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.autoOpen ? 'bg-indigo-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.autoOpen ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {config.autoOpen && (
            <div className="ml-0 mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Open after {config.autoOpenDelay}s
              </label>
              <input
                type="range"
                min={2}
                max={30}
                value={config.autoOpenDelay}
                onChange={e => setConfig(prev => ({ ...prev, autoOpenDelay: parseInt(e.target.value) }))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>2s</span>
                <span>30s</span>
              </div>
            </div>
          )}

          {/* Powered by */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between overflow-x-hidden">
            <div>
              <label className="block text-sm font-medium text-gray-700">&quot;Powered by Kyra&quot; badge</label>
              <p className="text-xs text-gray-500">Free marketing — recommended for free tier</p>
            </div>
            <button
              onClick={() => setConfig(prev => ({ ...prev, poweredBy: !prev.poweredBy }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.poweredBy ? 'bg-indigo-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.poweredBy ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={saveConfig}
          disabled={saving || !selectedClient}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Widget Settings'}
        </button>

        {/* Embed Code */}
        <div className="bg-white rounded-xl border p-5">
          <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
            <Code className="h-5 w-5 text-indigo-500" />
            Embed Code
          </h2>

          {/* Platform tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg mb-3">
            {([
              { key: 'html', label: 'HTML' },
              { key: 'wordpress', label: 'WordPress' },
              { key: 'shopify', label: 'Shopify' },
              { key: 'react', label: 'React/Next' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setEmbedPlatform(key)}
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  embedPlatform === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative">
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap break-all">
              {getEmbedCode()}
            </pre>
            <button
              onClick={copyEmbed}
              className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          {!selectedClient && (
            <p className="text-xs text-amber-600 mt-2">
              ⚠️ Select a client above to generate the embed code
            </p>
          )}
        </div>
      </div>

      {/* Right: Live Preview */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900">
              <Eye className="h-5 w-5 text-indigo-500" />
              Live Preview
            </h2>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-1.5 rounded-md ${previewMode === 'desktop' ? 'bg-white shadow' : ''}`}
              >
                <Monitor className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-1.5 rounded-md ${previewMode === 'mobile' ? 'bg-white shadow' : ''}`}
              >
                <Smartphone className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Preview Frame */}
          <div
            className={`relative bg-gray-100 rounded-xl overflow-hidden mx-auto transition-all ${
              previewMode === 'mobile' ? 'w-[320px] h-[568px]' : 'w-full h-[500px]'
            }`}
          >
            {/* Mock website content */}
            <div className="absolute inset-0 p-4">
              <div className="h-4 w-32 bg-gray-300 rounded mb-3" />
              <div className="h-3 w-full bg-gray-200 rounded mb-2" />
              <div className="h-3 w-3/4 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-5/6 bg-gray-200 rounded mb-4" />
              <div className="h-24 w-full bg-gray-200 rounded mb-3" />
              <div className="h-3 w-full bg-gray-200 rounded mb-2" />
              <div className="h-3 w-2/3 bg-gray-200 rounded" />
            </div>

            {/* Chat Panel Preview */}
            <div
              className={`absolute ${config.position === 'bottom-right' ? 'right-3' : 'left-3'} bottom-16 w-[280px] rounded-2xl shadow-xl overflow-hidden`}
              style={{ maxWidth: previewMode === 'mobile' ? '85%' : '280px' }}
            >
              {/* Header */}
              <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: config.color }}>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">
                  {config.avatarEmoji}
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">{config.title || 'Chat with us'}</div>
                  <div className="text-white/70 text-[10px]">Typically replies instantly</div>
                </div>
              </div>

              {/* Messages */}
              <div className="bg-gray-50 px-3 py-3 space-y-2">
                <div className="flex items-end gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: config.color }}>
                    {config.avatarEmoji}
                  </div>
                  <div className="bg-white rounded-xl rounded-bl-sm px-3 py-2 text-xs text-gray-700 shadow-sm max-w-[200px]">
                    {config.greeting || 'Hi! 👋 How can I help?'}
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="rounded-xl rounded-br-sm px-3 py-2 text-xs text-white max-w-[200px]" style={{ backgroundColor: config.color }}>
                    What services do you offer?
                  </div>
                </div>
                <div className="flex items-end gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: config.color }}>
                    {config.avatarEmoji}
                  </div>
                  <div className="bg-white rounded-xl rounded-bl-sm px-3 py-2 text-xs text-gray-700 shadow-sm max-w-[200px]">
                    Great question! We offer a full range of...
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="bg-white px-3 py-2 border-t flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-lg px-3 py-1.5 text-[10px] text-gray-400">Type a message...</div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: config.color }}>
                  <ChevronRight className="h-3.5 w-3.5 text-white" />
                </div>
              </div>

              {/* Powered by */}
              {config.poweredBy && (
                <div className="bg-white border-t px-3 py-1.5 text-center text-[9px] text-gray-400">
                  ⚡ AI by <span className="text-indigo-500 font-semibold">Kyra</span>
                </div>
              )}
            </div>

            {/* Chat Button Preview */}
            <div
              className={`absolute ${config.position === 'bottom-right' ? 'right-3' : 'left-3'} bottom-3`}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                style={{ backgroundColor: config.color }}
              >
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-3">
            This is a preview. The actual widget may vary slightly.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Widget Analytics ────────────────────────────────────────────────────────

function WidgetAnalytics({
  analytics,
  loading,
  error,
  days,
  setDays,
  onRetry,
}: {
  analytics: Analytics | null;
  loading: boolean;
  error: string | null;
  days: number;
  setDays: (d: number) => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center overflow-x-hidden">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <BarChart3 className="h-7 w-7 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">Failed to load analytics</h3>
        <p className="text-sm text-gray-500 mb-4 max-w-xs">{error || 'No data available. Try refreshing.'}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const { overview, daily, topSources } = analytics;

  // Calculate chart max for scaling
  const maxMessages = Math.max(...daily.map(d => d.messages), 1);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {[7, 14, 30].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              days === d ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {d === 7 ? '7 days' : d === 14 ? '14 days' : '30 days'}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<MessageCircle className="h-5 w-5 text-blue-500" />}
          label="Conversations"
          value={overview.totalSessions}
          sub={`${overview.totalMessages} messages`}
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
          label="Avg. Messages"
          value={overview.avgMessagesPerSession}
          sub="per conversation"
        />
        <KpiCard
          icon={<Users className="h-5 w-5 text-purple-500" />}
          label="Leads Captured"
          value={overview.leadsTotal}
          sub={`${overview.leadsHot} hot leads`}
        />
        <KpiCard
          icon={<Flame className="h-5 w-5 text-orange-500" />}
          label="Conversion Rate"
          value={`${overview.leadConversionRate}%`}
          sub="visitors → leads"
        />
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-white rounded-xl border p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Daily Activity</h3>
        <div className="flex items-end gap-1 h-40">
          {daily.slice(-Math.min(days, 30)).map((day, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className="w-full bg-indigo-400 rounded-t transition-all hover:bg-indigo-500"
                style={{
                  height: `${Math.max((day.messages / maxMessages) * 100, 2)}%`,
                  minHeight: '2px',
                }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 bg-gray-900 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}: {day.messages} msgs
              </div>
              {/* Date label (show every 3-7 days) */}
              {(idx === 0 || idx === daily.length - 1 || idx % Math.ceil(days / 7) === 0) && (
                <span className="text-[9px] text-gray-400">
                  {new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Top Sources + Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Source Pages */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-400" />
            Top Source Pages
          </h3>
          {topSources.length === 0 ? (
            <p className="text-sm text-gray-400">No source page data yet</p>
          ) : (
            <div className="space-y-2">
              {topSources.map((source, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate flex-1 mr-2">{source.page}</span>
                  <span className="text-gray-500 font-medium flex-shrink-0">{source.count} leads</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Performance Summary */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gray-400" />
            Performance Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Avg. response length</span>
              <span className="text-gray-900 font-medium">{overview.avgResponseLength} chars</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">New leads (uncontacted)</span>
              <span className="text-gray-900 font-medium">{overview.leadsNew}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Hot leads</span>
              <span className="text-red-600 font-medium">{overview.leadsHot}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Lead conversion rate</span>
              <span className="text-emerald-600 font-medium">{overview.leadConversionRate}%</span>
            </div>
          </div>

          {overview.leadsTotal === 0 && overview.totalSessions > 0 && (
            <div className="mt-4 p-3 bg-amber-50 rounded-lg text-xs text-amber-700">
              <strong>Tip:</strong> Your widget is getting conversations but no leads yet.
              Make sure your AI is configured to capture visitor contact info naturally.
            </div>
          )}

          {overview.totalSessions === 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <strong>Getting started:</strong> Embed the chat widget on your website to start
              collecting analytics. Go to the Builder tab for your embed code.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── KPI Card Component ──────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
}) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}
