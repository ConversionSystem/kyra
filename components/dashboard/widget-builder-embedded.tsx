'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Globe, Copy, CheckCircle2, ExternalLink, Palette, MessageSquare,
  Code, X, Plus, RotateCcw, Volume2, VolumeX, UserCheck, Settings2, Smartphone,
  Leaf, Trash2,
} from 'lucide-react';

interface JaneStoreEntry {
  id: string;
  name: string;
  algoliaStoreId: number;
  baseUrl: string;
}

interface WidgetBuilderEmbeddedProps {
  clientId: string;
  clientName?: string;
  clientIndustry?: string;
  initialConfig?: Record<string, unknown>;
}

/**
 * Purple Lotus–style Web Chat Widget builder.
 * Tabs: Appearance · Quick Replies · Behavior · Embed & Install
 * Manages its own state and API calls — just pass a clientId.
 */
export function WidgetBuilderEmbedded({
  clientId,
  clientName = '',
  clientIndustry = 'general business',
  initialConfig,
}: WidgetBuilderEmbeddedProps) {
  const cfg = (initialConfig ?? {}) as Record<string, unknown>;

  // ── Appearance ──
  const [widgetTitle, setWidgetTitle] = useState((cfg.widget_title as string) || '');
  const [widgetColor, setWidgetColor] = useState((cfg.widget_color as string) || '#6366f1');
  const [widgetGreeting, setWidgetGreeting] = useState((cfg.widget_greeting as string) || '');
  const [widgetPosition, setWidgetPosition] = useState((cfg.widget_position as string) || 'bottom-right');
  const [widgetAvatar, setWidgetAvatar] = useState((cfg.widget_avatar as string) || '🤖');
  const [poweredBy, setPoweredBy] = useState(cfg.widget_powered_by !== false);

  // ── Quick Replies ──
  const [quickReplies, setQuickReplies] = useState<string[]>(
    (cfg.widget_quick_replies as string[]) || []
  );
  const [newReply, setNewReply] = useState('');

  // ── Behavior ──
  const [proactiveDelay, setProactiveDelay] = useState<number>((cfg.widget_proactive_delay as number) || 8);
  const [soundEnabled, setSoundEnabled] = useState(cfg.widget_sound !== false);
  const [leadCapture, setLeadCapture] = useState(cfg.widget_lead_capture !== false);

  // ── Menu Integration (Jane POS) ──
  // website_url removed from this tab (managed on Training tab). Kept state
  // cleanup would require threading the load handler differently; omit entirely.
  const [janeAlgoliaAppId, setJaneAlgoliaAppId] = useState((cfg.jane_algolia_app_id as string) || '');
  const [janeAlgoliaSearchKey, setJaneAlgoliaSearchKey] = useState((cfg.jane_algolia_search_key as string) || '');
  const [janeAlgoliaIndex, setJaneAlgoliaIndex] = useState((cfg.jane_algolia_index as string) || '');
  const [janeDefaultStoreId, setJaneDefaultStoreId] = useState((cfg.jane_default_store_id as string) || '');
  const [janeStores, setJaneStores] = useState<JaneStoreEntry[]>(() => {
    const raw = cfg.jane_stores as Array<Partial<JaneStoreEntry>> | undefined;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((s) => s && s.id)
      .map((s) => ({
        id: String(s.id),
        name: String(s.name || s.id),
        algoliaStoreId: Number(s.algoliaStoreId || 0),
        baseUrl: String(s.baseUrl || ''),
      }));
  });
  const [janeKnownBrands, setJaneKnownBrands] = useState<string[]>(
    Array.isArray(cfg.jane_known_brands) ? (cfg.jane_known_brands as string[]).filter((b) => typeof b === 'string') : [],
  );
  const [newBrand, setNewBrand] = useState('');

  // ── State ──
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'appearance' | 'replies' | 'behavior' | 'menu' | 'embed'>('appearance');

  // ── Stats ──
  const [stats, setStats] = useState<{ conversations: number; messagesToday: number; avgResponseTime: string } | null>(null);

  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/agency/clients/${clientId}/widget-stats`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStats(d))
      .catch(() => {});
  }, [clientId]);

  // Load config from API if no initialConfig provided
  useEffect(() => {
    if (initialConfig || !clientId) return;
    fetch(`/api/agency/clients/${clientId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const c = data.client?.container_config || data.container_config || {};
        if (c.widget_title) setWidgetTitle(c.widget_title);
        if (c.widget_color) setWidgetColor(c.widget_color);
        if (c.widget_greeting) setWidgetGreeting(c.widget_greeting);
        if (c.widget_position) setWidgetPosition(c.widget_position);
        if (c.widget_avatar) setWidgetAvatar(c.widget_avatar);
        if (c.widget_powered_by !== undefined) setPoweredBy(Boolean(c.widget_powered_by));
        if (c.widget_quick_replies) setQuickReplies(c.widget_quick_replies);
        if (c.widget_proactive_delay) setProactiveDelay(c.widget_proactive_delay);
        if (c.widget_sound !== undefined) setSoundEnabled(c.widget_sound !== false);
        if (c.widget_lead_capture !== undefined) setLeadCapture(c.widget_lead_capture !== false);
        // website_url is loaded + edited on the Training tab.
        if (typeof c.jane_algolia_app_id === 'string') setJaneAlgoliaAppId(c.jane_algolia_app_id);
        if (typeof c.jane_algolia_search_key === 'string') setJaneAlgoliaSearchKey(c.jane_algolia_search_key);
        if (typeof c.jane_algolia_index === 'string') setJaneAlgoliaIndex(c.jane_algolia_index);
        if (typeof c.jane_default_store_id === 'string') setJaneDefaultStoreId(c.jane_default_store_id);
        if (Array.isArray(c.jane_stores)) {
          setJaneStores(
            (c.jane_stores as Array<Partial<JaneStoreEntry>>)
              .filter((s) => s && s.id)
              .map((s) => ({
                id: String(s.id),
                name: String(s.name || s.id),
                algoliaStoreId: Number(s.algoliaStoreId || 0),
                baseUrl: String(s.baseUrl || ''),
              })),
          );
        }
        if (Array.isArray(c.jane_known_brands)) {
          setJaneKnownBrands((c.jane_known_brands as unknown[]).filter((b): b is string => typeof b === 'string'));
        }
      })
      .catch(() => {});
  }, [clientId, initialConfig]);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://kyra.conversionsystem.com';
  const scriptTag = `<script src="${appUrl}/api/widget/${clientId}/script" defer></script>`;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {});
  };

  const addQuickReply = () => {
    const trimmed = newReply.trim();
    if (!trimmed || quickReplies.length >= 6) return;
    setQuickReplies([...quickReplies, trimmed]);
    setNewReply('');
  };

  const removeQuickReply = (index: number) => {
    setQuickReplies(quickReplies.filter((_, i) => i !== index));
  };

  const resetQuickReplies = () => {
    setQuickReplies([]);
  };

  const saveAll = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      // Sanitize Jane stores: drop incomplete entries, ensure numeric IDs
      const cleanedStores = janeStores
        .map((s) => ({
          id: s.id.trim(),
          name: s.name.trim() || s.id.trim(),
          algoliaStoreId: Number(s.algoliaStoreId) || 0,
          baseUrl: s.baseUrl.trim(),
        }))
        .filter((s) => s.id && s.algoliaStoreId > 0 && s.baseUrl);

      const res = await fetch(`/api/agency/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          container_config: {
            widget_title: widgetTitle.trim() || undefined,
            widget_color: widgetColor || '#6366f1',
            widget_greeting: widgetGreeting.trim() || undefined,
            widget_position: widgetPosition,
            widget_avatar: widgetAvatar.trim() || '🤖',
            widget_powered_by: poweredBy,
            widget_quick_replies: quickReplies.length > 0 ? quickReplies : undefined,
            widget_proactive_delay: proactiveDelay,
            widget_sound: soundEnabled,
            widget_lead_capture: leadCapture,
            // website_url is managed on the Training tab — don't duplicate here.
            jane_algolia_app_id: janeAlgoliaAppId.trim() || undefined,
            jane_algolia_search_key: janeAlgoliaSearchKey.trim() || undefined,
            jane_algolia_index: janeAlgoliaIndex.trim() || undefined,
            jane_default_store_id: janeDefaultStoreId.trim() || undefined,
            jane_stores: cleanedStores.length > 0 ? cleanedStores : undefined,
            jane_known_brands: janeKnownBrands.length > 0 ? janeKnownBrands : undefined,
          },
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('[widget] save failed:', err);
    }
    setSaving(false);
  };

  const sections = [
    { key: 'appearance' as const, label: 'Appearance', icon: Palette },
    { key: 'replies' as const, label: 'Quick Replies', icon: MessageSquare },
    { key: 'behavior' as const, label: 'Behavior', icon: Settings2 },
    { key: 'menu' as const, label: 'Menu Integration', icon: Leaf },
    { key: 'embed' as const, label: 'Embed & Install', icon: Code },
  ];

  // ── Jane store helpers ──
  const updateJaneStore = (index: number, patch: Partial<JaneStoreEntry>) => {
    setJaneStores((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };
  const addJaneStore = () => {
    setJaneStores((prev) => [...prev, { id: '', name: '', algoliaStoreId: 0, baseUrl: '' }]);
  };
  const removeJaneStore = (index: number) => {
    setJaneStores((prev) => prev.filter((_, i) => i !== index));
  };
  const addBrand = () => {
    const trimmed = newBrand.trim();
    if (!trimmed) return;
    if (janeKnownBrands.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
      setNewBrand('');
      return;
    }
    setJaneKnownBrands([...janeKnownBrands, trimmed]);
    setNewBrand('');
  };
  const removeBrand = (index: number) => {
    setJaneKnownBrands(janeKnownBrands.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-6xl">
      <Card className="border-indigo-100 shadow-sm">
        <CardHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Web Chat Widget</CardTitle>
                <CardDescription className="text-xs">Customize, configure, and embed your AI chat widget</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                Ready
              </Badge>
              <Button size="sm" onClick={saveAll} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-0 border-b border-gray-100">
          <div className="p-4 text-center border-r border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{stats?.conversations ?? '—'}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Total Conversations</p>
          </div>
          <div className="p-4 text-center border-r border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{stats?.messagesToday ?? '—'}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Messages Today</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats?.avgResponseTime ?? '—'}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Avg Response</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeSection === s.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </button>
          ))}
        </div>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left: Settings */}
            <div className="lg:col-span-3 space-y-6">

              {/* ── APPEARANCE ── */}
              {activeSection === 'appearance' && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Widget Title</label>
                    <Input value={widgetTitle} onChange={(e) => setWidgetTitle(e.target.value)} placeholder={`Chat with ${clientName || 'us'}`} className="bg-gray-50" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Brand Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={widgetColor} onChange={(e) => setWidgetColor(e.target.value)} className="h-10 w-12 rounded-lg border border-gray-200 cursor-pointer bg-white p-1" />
                      <Input value={widgetColor} onChange={(e) => setWidgetColor(e.target.value)} placeholder="#6366f1" className="bg-gray-50 font-mono flex-1" maxLength={7} />
                      <div className="flex gap-1">
                        {['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'].map(c => (
                          <button key={c} onClick={() => setWidgetColor(c)} className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110" style={{ background: c, borderColor: widgetColor === c ? '#111' : 'transparent' }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Opening Greeting</label>
                    <Textarea value={widgetGreeting} onChange={(e) => setWidgetGreeting(e.target.value)} placeholder="Hi! How can I help you today?" rows={2} className="bg-gray-50" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Avatar Emoji</label>
                      <Input value={widgetAvatar} onChange={(e) => setWidgetAvatar(e.target.value)} placeholder="🤖" className="bg-gray-50 text-center text-xl" maxLength={4} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Position</label>
                      <select value={widgetPosition} onChange={(e) => setWidgetPosition(e.target.value)} className="w-full h-10 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm">
                        <option value="bottom-right">Bottom Right</option>
                        <option value="bottom-left">Bottom Left</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Powered by Kyra badge</p>
                      <p className="text-xs text-gray-500">Required on Free &amp; Lite plans</p>
                    </div>
                    <button
                      onClick={() => setPoweredBy(!poweredBy)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${poweredBy ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${poweredBy ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── QUICK REPLIES ── */}
              {activeSection === 'replies' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Quick Reply Buttons</p>
                    <p className="text-xs text-gray-500 mb-3">
                      These appear when the chat opens. Max 6 buttons.
                      {quickReplies.length === 0 && ' Using industry defaults — add custom ones below.'}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {quickReplies.length > 0 ? quickReplies.map((reply, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-gray-200 bg-white shadow-sm">
                          {reply}
                          <button onClick={() => removeQuickReply(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      )) : (
                        <p className="text-xs text-gray-400 italic">Using industry defaults for {clientIndustry}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newReply}
                        onChange={(e) => setNewReply(e.target.value)}
                        placeholder="e.g. Pricing, Hours, Book Now..."
                        className="bg-gray-50 flex-1"
                        maxLength={50}
                        onKeyDown={(e) => e.key === 'Enter' && addQuickReply()}
                      />
                      <Button size="sm" variant="outline" onClick={addQuickReply} disabled={quickReplies.length >= 6 || !newReply.trim()}>
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                    {quickReplies.length > 0 && (
                      <button onClick={resetQuickReplies} className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 mt-2 transition-colors">
                        <RotateCcw className="h-3 w-3" /> Reset to industry defaults
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── BEHAVIOR ── */}
              {activeSection === 'behavior' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Proactive greeting</p>
                      <p className="text-xs text-gray-500">Show a bubble inviting visitors to chat after {proactiveDelay}s</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={proactiveDelay}
                        onChange={(e) => setProactiveDelay(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-16 text-center bg-white"
                        min={0}
                        max={60}
                      />
                      <span className="text-xs text-gray-500">sec</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      {soundEnabled ? <Volume2 className="h-5 w-5 text-indigo-600" /> : <VolumeX className="h-5 w-5 text-gray-400" />}
                      <div>
                        <p className="text-sm font-medium text-gray-700">Sound notification</p>
                        <p className="text-xs text-gray-500">Play a chime when the AI responds</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${soundEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${soundEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <UserCheck className={`h-5 w-5 ${leadCapture ? 'text-indigo-600' : 'text-gray-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Smart lead capture</p>
                        <p className="text-xs text-gray-500">Auto-detect and save visitor contact info to CRM</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setLeadCapture(!leadCapture)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${leadCapture ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${leadCapture ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── MENU INTEGRATION (Jane POS) ── */}
              {activeSection === 'menu' && (
                <div className="space-y-5">
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-800">
                    <p className="font-medium mb-1">Jane / Algolia product search</p>
                    <p className="leading-relaxed">
                      For cannabis dispensaries on Jane. Paste the public Algolia search key from your menu page (visible in DevTools Network tab) — it&apos;s safe to store. The widget uses these to pull live product recommendations.
                    </p>
                  </div>

                  {/* Website URL lives on the Training tab (`container_config.website_url`).
                      Previously duplicated here — removed to prevent last-write-wins conflicts. */}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Algolia App ID</label>
                      <Input
                        value={janeAlgoliaAppId}
                        onChange={(e) => setJaneAlgoliaAppId(e.target.value)}
                        placeholder="VFM4X0N23A"
                        className="bg-gray-50 font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Algolia Index</label>
                      <Input
                        value={janeAlgoliaIndex}
                        onChange={(e) => setJaneAlgoliaIndex(e.target.value)}
                        placeholder="menu-products-production"
                        className="bg-gray-50 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Algolia Search Key (public)</label>
                    <Input
                      value={janeAlgoliaSearchKey}
                      onChange={(e) => setJaneAlgoliaSearchKey(e.target.value)}
                      placeholder="e.g. 8bd39f3c1d26dd060940b682f024757c"
                      className="bg-gray-50 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Default Store ID</label>
                    <Input
                      value={janeDefaultStoreId}
                      onChange={(e) => setJaneDefaultStoreId(e.target.value)}
                      placeholder="e.g. san-jose"
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">Must match one of the Store IDs below. Used when the visitor hasn&apos;t picked a store yet.</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Stores</label>
                      <Button size="sm" variant="outline" onClick={addJaneStore}>
                        <Plus className="h-4 w-4 mr-1" /> Add Store
                      </Button>
                    </div>
                    {janeStores.length === 0 && (
                      <p className="text-xs text-gray-400 italic py-2">No stores configured. Add at least one to enable product search.</p>
                    )}
                    {janeStores.map((store, i) => (
                      <div key={i} className="p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-medium text-gray-600">Store ID (slug)</label>
                            <Input
                              value={store.id}
                              onChange={(e) => updateJaneStore(i, { id: e.target.value })}
                              placeholder="san-jose"
                              className="bg-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-gray-600">Display Name</label>
                            <Input
                              value={store.name}
                              onChange={(e) => updateJaneStore(i, { name: e.target.value })}
                              placeholder="San Jose"
                              className="bg-white text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-medium text-gray-600">Algolia store_id (numeric)</label>
                            <Input
                              type="number"
                              value={store.algoliaStoreId || ''}
                              onChange={(e) => updateJaneStore(i, { algoliaStoreId: parseInt(e.target.value) || 0 })}
                              placeholder="4398"
                              className="bg-white text-sm font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-gray-600">Menu Base URL</label>
                            <Input
                              value={store.baseUrl}
                              onChange={(e) => updateJaneStore(i, { baseUrl: e.target.value })}
                              placeholder="https://example.com"
                              className="bg-white text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={() => removeJaneStore(i)}
                            className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Known Brands</label>
                    <p className="text-xs text-gray-500">
                      Brands this dispensary carries. Used to detect brand intent in customer messages
                      (e.g. &quot;Any Alien Labs strains?&quot;). {janeKnownBrands.length} listed.
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {janeKnownBrands.map((brand, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 bg-white shadow-sm"
                        >
                          {brand}
                          <button onClick={() => removeBrand(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Input
                        value={newBrand}
                        onChange={(e) => setNewBrand(e.target.value)}
                        placeholder="e.g. Alien Labs"
                        className="bg-gray-50 flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBrand())}
                      />
                      <Button size="sm" variant="outline" onClick={addBrand} disabled={!newBrand.trim()}>
                        <Plus className="h-4 w-4 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── EMBED & INSTALL ── */}
              {activeSection === 'embed' && (
                <div className="space-y-5">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Embed snippet</p>
                    <p className="text-xs text-gray-500 mb-2">Paste this before the closing &lt;/body&gt; tag on any webpage.</p>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 bg-gray-900 rounded-lg p-3.5 font-mono text-xs text-green-400 overflow-x-auto leading-relaxed">
                        {scriptTag}
                      </div>
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => copy(scriptTag, 'script')}>
                        {copied === 'script' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">API endpoint</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-gray-100 rounded-lg px-3.5 py-2.5 font-mono text-xs text-gray-600">
                        POST {appUrl}/api/widget/chat
                      </code>
                      <Button size="sm" variant="outline" onClick={() => copy(`${appUrl}/api/widget/chat`, 'api')}>
                        {copied === 'api' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                    <p className="text-sm font-semibold text-blue-800 mb-1">WordPress / Webflow / Squarespace</p>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Paste the embed snippet into your site&apos;s custom HTML/code injection area.
                      In WordPress, use the &quot;Custom HTML&quot; block or add it to your theme&apos;s footer.php.
                      The widget loads async and won&apos;t affect page speed.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => window.open(`${appUrl}/api/widget/${clientId}/script`, '_blank')}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Preview script
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Live Preview */}
            <div className="lg:col-span-2">
              <div className="sticky top-4">
                <p className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                  <Smartphone className="h-4 w-4" /> Live Preview
                </p>
                {/* Phone Mockup Frame */}
                <div className="mx-auto w-[280px] rounded-[28px] border-[6px] border-gray-800 bg-gray-800 shadow-2xl overflow-hidden">
                  {/* Status bar */}
                  <div className="bg-gray-800 h-6 flex items-center justify-center">
                    <div className="w-16 h-1 rounded-full bg-gray-600" />
                  </div>
                  {/* Widget panel */}
                  <div className="bg-white flex flex-col" style={{ height: '420px' }}>
                    {/* Header */}
                    <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: `linear-gradient(135deg, ${widgetColor}, ${widgetColor}cc)` }}>
                      <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-lg border border-white/25">
                        {widgetAvatar || '🤖'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold text-sm truncate">{widgetTitle || `Chat with ${clientName || 'us'}`}</div>
                        <div className="text-white/75 text-[10px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          Online · Ready to help
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-3 space-y-2.5 overflow-y-auto" style={{ background: 'linear-gradient(180deg, #f7f8fa 0%, #f0f1f5 100%)' }}>
                      {/* Bot greeting */}
                      <div className="flex items-end gap-1.5">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0" style={{ background: `linear-gradient(135deg, ${widgetColor}, ${widgetColor}aa)` }}>
                          {widgetAvatar || '🤖'}
                        </div>
                        <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm text-gray-800 max-w-[85%] text-xs leading-relaxed">
                          {widgetGreeting || 'Hi! How can I help you today?'}
                        </div>
                      </div>

                      {/* Quick replies preview */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(quickReplies.length > 0 ? quickReplies : ['Get Started', 'Pricing', 'Contact']).slice(0, 5).map((reply, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-medium px-2.5 py-1.5 rounded-full border bg-white shadow-sm cursor-default"
                            style={{ borderColor: `${widgetColor}33`, color: '#374151' }}
                          >
                            {reply}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Input */}
                    <div className="px-3 py-2.5 bg-white border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-full bg-gray-100 px-3.5 py-2 text-[10px] text-gray-400">
                          Type a message...
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, ${widgetColor}, ${widgetColor}cc)` }}>
                          <svg viewBox="0 0 24 24" width="12" height="12" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </div>
                      </div>
                      {poweredBy && (
                        <p className="text-center text-[8px] text-gray-400 mt-1.5">Powered by <strong>Kyra</strong></p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
