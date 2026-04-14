'use client';

import { useState, useEffect } from 'react';
import {
  Palette,
  Code,
  Copy,
  Check,
  Eye,
  MessageCircle,
  Globe,
  Smartphone,
  Monitor,
  Sparkles,
  Settings2,
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
  autoOpenDelay: number;
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

const AVATAR_OPTIONS = ['\u{1F916}', '\u{1F4AC}', '\u{1F44B}', '\u{1F9E0}', '\u26A1', '\u{1F3AF}', '\u{1F31F}', '\u{1F52E}', '\u{1F91D}', '\u{1F4A1}'];

/**
 * Embeddable widget builder for use in website editor and other contexts.
 * Manages its own state and API calls — just pass a clientId.
 */
export function WidgetBuilderEmbedded({ clientId }: { clientId: string }) {
  const [copied, setCopied] = useState(false);
  const [embedPlatform, setEmbedPlatform] = useState<'html' | 'wordpress' | 'shopify' | 'react'>('html');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [agencyPlan, setAgencyPlan] = useState<string>('free');

  const [config, setConfig] = useState<WidgetConfig>({
    title: 'Chat with us',
    greeting: 'Hi! How can I help you today?',
    color: '#6366f1',
    position: 'bottom-right',
    avatarEmoji: '\u{1F916}',
    poweredBy: true,
    autoOpen: false,
    autoOpenDelay: 5,
  });

  // Load agency plan
  useEffect(() => {
    fetch('/api/agency')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setAgencyPlan(data.agency?.plan || data.plan || 'free'); })
      .catch(() => {});
  }, []);

  // Load client widget config
  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/agency/clients/${clientId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
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
  }, [clientId]);

  const saveConfig = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}`, {
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaved(true);
      setSaveError(null);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError('Failed to save widget config');
    } finally {
      setSaving(false);
    }
  };

  const getEmbedCode = () => {
    const base = 'https://kyra.conversionsystem.com';
    switch (embedPlatform) {
      case 'html':
        return `<!-- Kyra AI Chat Widget -->\n<script src="${base}/api/widget/${clientId}/script" defer></script>`;
      case 'wordpress':
        return `<!-- Add to your theme's footer.php or use a "Header & Footer Scripts" plugin -->\n<script src="${base}/api/widget/${clientId}/script" defer></script>`;
      case 'shopify':
        return `<!-- Paste in Online Store → Themes → Edit Code → theme.liquid (before </body>) -->\n<script src="${base}/api/widget/${clientId}/script" defer></script>`;
      case 'react':
        return `// Add to your layout component or _app.tsx\nimport Script from 'next/script';\n\n<Script\n  src="${base}/api/widget/${clientId}/script"\n  strategy="lazyOnload"\n/>`;
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
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-6">
          {/* Appearance */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
              <Palette className="h-5 w-5 text-indigo-500" />
              Appearance
            </h2>

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

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Greeting Message</label>
              <textarea
                value={config.greeting}
                onChange={e => setConfig(prev => ({ ...prev, greeting: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={2}
                placeholder="Hi! How can I help you today?"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {COLOR_PRESETS.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => setConfig(prev => ({ ...prev, color: preset.value }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${config.color === preset.value ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  />
                ))}
              </div>
              <input
                type="text"
                value={config.color}
                onChange={e => setConfig(prev => ({ ...prev, color: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                placeholder="#6366f1"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Avatar</label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setConfig(prev => ({ ...prev, avatarEmoji: emoji }))}
                    className={`w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center transition-all ${config.avatarEmoji === emoji ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <div className="flex gap-2">
                {(['bottom-right', 'bottom-left'] as const).map(pos => (
                  <button
                    key={pos}
                    onClick={() => setConfig(prev => ({ ...prev, position: pos }))}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${config.position === pos ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    {pos === 'bottom-right' ? 'Bottom Right' : 'Bottom Left'}
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

            <label className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-700">Auto-open widget</span>
              <button
                onClick={() => setConfig(prev => ({ ...prev, autoOpen: !prev.autoOpen }))}
                className={`relative w-10 h-5 rounded-full transition-colors ${config.autoOpen ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${config.autoOpen ? 'left-5' : 'left-0.5'}`} />
              </button>
            </label>

            {config.autoOpen && (
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Delay (seconds)</label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={config.autoOpenDelay}
                  onChange={e => setConfig(prev => ({ ...prev, autoOpenDelay: parseInt(e.target.value) || 5 }))}
                  className="w-24 px-3 py-1.5 border rounded-lg text-sm"
                />
              </div>
            )}

            {agencyPlan !== 'free' && (
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Show &quot;Powered by&quot;</span>
                <button
                  onClick={() => setConfig(prev => ({ ...prev, poweredBy: !prev.poweredBy }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${config.poweredBy ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${config.poweredBy ? 'left-5' : 'left-0.5'}`} />
                </button>
              </label>
            )}
          </div>

          {/* Embed Code */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
              <Code className="h-5 w-5 text-indigo-500" />
              Embed Code
            </h2>
            <div className="flex gap-1 mb-3">
              {(['html', 'wordpress', 'shopify', 'react'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setEmbedPlatform(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${embedPlatform === p ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            <div className="relative">
              <pre className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 overflow-x-auto border">{getEmbedCode()}</pre>
              <button
                onClick={copyEmbed}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-white border shadow-sm hover:bg-gray-50 transition"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-gray-500" />}
              </button>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              {saving ? 'Saving...' : saved ? <><Check className="h-4 w-4" /> Saved</> : 'Save Changes'}
            </button>
            {saveError && <p className="text-sm text-red-500">{saveError}</p>}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Eye className="h-4 w-4" />
              Preview
            </div>
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`p-1.5 rounded ${previewMode === 'desktop' ? 'bg-white shadow' : ''}`}
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`p-1.5 rounded ${previewMode === 'mobile' ? 'bg-white shadow' : ''}`}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className={`bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl border p-6 flex items-end ${config.position === 'bottom-right' ? 'justify-end' : 'justify-start'} min-h-[400px]`}>
            <div className="space-y-3" style={{ maxWidth: previewMode === 'mobile' ? '280px' : '360px' }}>
              {/* Chat window preview */}
              <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: config.color }}>
                  <span className="text-xl">{config.avatarEmoji}</span>
                  <span className="text-white font-medium text-sm">{config.title}</span>
                </div>
                <div className="p-4">
                  <div className="bg-gray-100 rounded-xl px-3 py-2 text-sm text-gray-700 inline-block max-w-[80%]">
                    {config.greeting}
                  </div>
                </div>
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-2 border rounded-xl px-3 py-2">
                    <span className="text-sm text-gray-400">Type a message...</span>
                  </div>
                </div>
                {config.poweredBy && (
                  <div className="text-center pb-2">
                    <span className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> Powered by Kyra
                    </span>
                  </div>
                )}
              </div>

              {/* FAB */}
              <div className={`flex ${config.position === 'bottom-right' ? 'justify-end' : 'justify-start'}`}>
                <div className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl" style={{ backgroundColor: config.color }}>
                  <MessageCircle className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
