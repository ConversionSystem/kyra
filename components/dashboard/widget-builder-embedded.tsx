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
  Leaf, Trash2, BarChart3, TrendingUp, AlertTriangle,
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
  // Brand customization — added 2026-05-12. Logo URL trumps avatar emoji
  // when set (rendered as <img> in the widget header). Font family applies
  // to the entire widget; secondary color is used for accent surfaces
  // (chip backgrounds, hover states); border radius shapes panel + cards.
  const [widgetLogoUrl, setWidgetLogoUrl] = useState((cfg.widget_logo_url as string) || '');
  const [widgetFontFamily, setWidgetFontFamily] = useState((cfg.widget_font_family as string) || 'system');
  const [widgetSecondaryColor, setWidgetSecondaryColor] = useState((cfg.widget_secondary_color as string) || '');
  const [responseLanguage, setResponseLanguage] = useState((cfg.response_language as string) || 'auto');
  const [poweredBy, setPoweredBy] = useState(cfg.widget_powered_by !== false);

  // ── Quick Replies ──
  // 2026-05-13: each entry can be a plain string (sent as chat message
  // on click) OR an object { label, url } (opens URL in new tab on click).
  // Backward-compat: legacy string-only configs still load + save fine.
  type QuickReply = string | { label: string; url?: string };
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>(
    (cfg.widget_quick_replies as QuickReply[]) || []
  );
  const [newReply, setNewReply] = useState('');
  const [newReplyUrl, setNewReplyUrl] = useState('');

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
  const [activeSection, setActiveSection] = useState<'appearance' | 'replies' | 'behavior' | 'menu' | 'embed' | 'insights'>('appearance');

  // ── Stats ──
  type FunnelStage = { stage: string; count: number };
  const [insightsWindow, setInsightsWindow] = useState<7 | 30 | 90>(30);
  const [stats, setStats] = useState<{
    conversations: number;
    messagesToday: number;
    avgResponseTime: string;
    dailyVolume?: Array<{ day: string; count: number }>;
    dailyBucketDays?: number;
    topQueries?: Array<{ query: string; count: number }>;
    escalationCount?: number;
    deflectionRate?: number;
    fallbackRate?: number;
    fallbackCount?: number;
    channelMix?: Record<string, number>;
    windowDays?: number;
    sampleSize?: number;
    sessionsCount?: number;
    avgMessagesPerConv?: number;
    topCategories?: Array<{ category: string; count: number }>;
    topChipClicks?: Array<{ label: string; count: number }>;
    topCardClicks?: Array<{ label: string; count: number }>;
    totalChipClicks?: number;
    totalCardClicks?: number;
    totalPanelOpens?: number;
    totalFirstMessages?: number;
    hourBuckets?: number[];
    peakHour?: number;
    peakHourCount?: number;
    funnel?: FunnelStage[];
    cardCTR?: number;
    cardsShownTotal?: number;
    // v5 additions (2026-05-14)
    periodComparison?: {
      sampleDelta: number;
      deflectionDelta: number;
      escalationDelta: number;
      fallbackDelta: number;
      prevSample: number;
      prevDeflection: number;
      prevEscalations: number;
      prevFallbackRate: number;
    };
    fallbackQueries?: Array<{ query: string; count: number }>;
    todayConversations?: number;
    todayEscalations?: number;
    todayDeflection?: number;
    activeNow?: number;
    topSources?: Array<{ page: string; count: number }>;
    // v6 additions (2026-05-14)
    topBrands?: Array<{ brand: string; count: number }>;
    avgSessionDurationSec?: number;
    returningSessions?: number;
    returningRate?: number;
    totalSessions?: number;
  } | null>(null);

  // Drill-down modal state — click any aggregate row to inspect the
  // actual conversations behind that count. Closes on backdrop click or X.
  type DrillFilter =
    | { kind: 'query'; value: string; title: string }
    | { kind: 'fallback'; title: string }
    | { kind: 'escalation'; title: string }
    | { kind: 'session'; sessionId: string; title: string };
  const [drillFilter, setDrillFilter] = useState<DrillFilter | null>(null);
  const [drillRows, setDrillRows] = useState<Array<{
    user_message: string;
    ai_response: string;
    created_at: string;
    session_id?: string;
    source_url?: string;
  }> | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    fetch(`/api/agency/clients/${clientId}/widget-stats?windowDays=${insightsWindow}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStats(d))
      .catch(() => {});
  }, [clientId, insightsWindow]);

  useEffect(() => {
    if (!drillFilter || !clientId) return;
    setDrillLoading(true);
    setDrillRows(null);
    const params = new URLSearchParams({ windowDays: String(insightsWindow), limit: '25' });
    if (drillFilter.kind === 'query')      params.set('query', drillFilter.value);
    if (drillFilter.kind === 'fallback')   params.set('fallback', '1');
    if (drillFilter.kind === 'escalation') params.set('escalation', '1');
    if (drillFilter.kind === 'session')    params.set('session_id', drillFilter.sessionId);
    fetch(`/api/agency/clients/${clientId}/widget-stats/conversations?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setDrillRows(d?.conversations ?? []); setDrillLoading(false); })
      .catch(() => { setDrillRows([]); setDrillLoading(false); });
  }, [drillFilter, clientId, insightsWindow]);

  // Refresh config from the API on every mount, EVEN when initialConfig
  // was provided. The initialConfig prop seeds the initial state to avoid
  // a flash of empty form (server-rendered first paint), but it goes stale
  // the moment any field is changed elsewhere — including out-of-band SQL
  // updates, or a separate browser tab. Always re-fetching guarantees the
  // form reflects current DB state, which a customer in this session
  // reported as "Quick Reply Buttons not updated" after we SQL-edited the
  // chips. Cost: one extra API call per dashboard mount, fine for an
  // admin-facing surface.
  useEffect(() => {
    if (!clientId) return;
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
        if (c.widget_logo_url) setWidgetLogoUrl(c.widget_logo_url);
        if (c.widget_font_family) setWidgetFontFamily(c.widget_font_family);
        if (c.widget_secondary_color) setWidgetSecondaryColor(c.widget_secondary_color);
        if (c.response_language) setResponseLanguage(c.response_language);
        if (c.widget_powered_by !== undefined) setPoweredBy(Boolean(c.widget_powered_by));
        if (c.widget_quick_replies) setQuickReplies(c.widget_quick_replies as QuickReply[]);
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
    const url = newReplyUrl.trim();
    if (!trimmed || quickReplies.length >= 6) return;
    // If URL is set, store as object so the chip opens the link instead of
    // sending the label as a chat message. Otherwise keep as a plain string
    // to preserve simple legacy configs.
    const entry: QuickReply = url
      ? { label: trimmed, url }
      : trimmed;
    setQuickReplies([...quickReplies, entry]);
    setNewReply('');
    setNewReplyUrl('');
  };

  const removeQuickReply = (index: number) => {
    setQuickReplies(quickReplies.filter((_, i) => i !== index));
  };

  // Helper: pull a display label out of a QuickReply (string OR {label,url}).
  const replyLabel = (r: QuickReply): string =>
    typeof r === 'object' ? (r.label || '') : String(r || '');
  const replyUrl = (r: QuickReply): string =>
    typeof r === 'object' ? (r.url || '') : '';

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
            widget_logo_url: widgetLogoUrl.trim() || undefined,
            widget_font_family: widgetFontFamily || 'system',
            widget_secondary_color: widgetSecondaryColor.trim() || undefined,
            response_language: responseLanguage || 'auto',
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
    { key: 'insights' as const, label: 'Insights', icon: BarChart3 },
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
    // 2026-05-13: removed max-w-6xl. The Chat Widget is the flagship
    // product surface; constraining it to ~72rem made the form feel
    // cramped on wide monitors while the live preview shrank in lockstep.
    // Now full-width within whatever parent it lives in (Settings tab
    // or the deleted /agency/widget page that previously hosted it).
    <div className="w-full">
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
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-[10px]">
                  Ready
                </Badge>
                <Button size="sm" onClick={saveAll} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                  {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
                </Button>
              </div>
              {/* UX hint: customer reported "changes don't apply on the live
                  site." The script is now cached 60s + stale-while-revalidate
                  + ETag-aware, so saves propagate within ~1 minute on most
                  sites and instantly on cache-respecting CDNs. This tooltip
                  sets expectations so the customer doesn't think it's broken. */}
              {saved && (
                <p className="text-[10px] text-gray-500 italic">
                  Live within ~1 min. Hard-refresh your site to see immediately.
                </p>
              )}
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
          <div className={`grid grid-cols-1 gap-8 ${activeSection === 'appearance' ? 'lg:grid-cols-5' : ''}`}>
            {/* Left: Settings */}
            <div className={activeSection === 'appearance' ? 'lg:col-span-3 space-y-6' : 'space-y-6'}>

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

                  {/* ── Brand customization (logo, fonts, accent) ── */}
                  <div className="pt-4 mt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Advanced branding</p>

                    <div className="space-y-1.5 mb-4">
                      <label className="text-sm font-medium text-gray-700">Logo URL (overrides avatar emoji)</label>
                      <Input
                        value={widgetLogoUrl}
                        onChange={(e) => setWidgetLogoUrl(e.target.value)}
                        placeholder="https://your-site.com/logo.png"
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500">Square image, 64×64 or larger. Leave blank to use the avatar emoji.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Font family</label>
                        <select
                          value={widgetFontFamily}
                          onChange={(e) => setWidgetFontFamily(e.target.value)}
                          className="w-full h-10 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm"
                        >
                          <option value="system">System default</option>
                          <option value="Inter">Inter</option>
                          <option value="Roboto">Roboto</option>
                          <option value="Open Sans">Open Sans</option>
                          <option value="Poppins">Poppins</option>
                          <option value="Nunito">Nunito</option>
                          <option value="Lato">Lato</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Accent color (optional)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={widgetSecondaryColor || '#10b981'}
                            onChange={(e) => setWidgetSecondaryColor(e.target.value)}
                            className="h-10 w-12 rounded-lg border border-gray-200 cursor-pointer bg-white p-1"
                          />
                          <Input
                            value={widgetSecondaryColor}
                            onChange={(e) => setWidgetSecondaryColor(e.target.value)}
                            placeholder="leave blank → same as brand"
                            className="bg-gray-50 font-mono flex-1 text-xs"
                            maxLength={7}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Multilingual response language ── */}
                  <div className="pt-4 mt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Conversation language</p>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-700">Response language</label>
                      <select
                        value={responseLanguage}
                        onChange={(e) => setResponseLanguage(e.target.value)}
                        className="w-full h-10 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm"
                      >
                        <option value="auto">Auto-detect — match the customer&apos;s language (recommended)</option>
                        <option value="English">English only</option>
                        <option value="Spanish">Spanish only</option>
                        <option value="French">French only</option>
                        <option value="Portuguese">Portuguese only</option>
                        <option value="German">German only</option>
                        <option value="Chinese (Simplified)">Chinese (Simplified) only</option>
                        <option value="Japanese">Japanese only</option>
                        <option value="Italian">Italian only</option>
                      </select>
                      <p className="text-xs text-gray-500">
                        Auto-detect lets Violet reply in whatever language the visitor writes in — Sonnet 4.6 handles 30+ languages natively. Lock to a specific language if you want every reply in one language regardless of input.
                      </p>
                    </div>
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
                      {quickReplies.length > 0 ? quickReplies.map((reply, i) => {
                        const lbl = replyLabel(reply);
                        const u = replyUrl(reply);
                        return (
                          <span
                            key={i}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border shadow-sm ${u ? 'border-indigo-300 bg-indigo-50 text-indigo-900' : 'border-gray-200 bg-white text-gray-900'}`}
                            title={u ? `Opens: ${u}` : 'Sends as a message to the bot'}
                          >
                            {u && <ExternalLink className="h-3 w-3 opacity-60" />}
                            {lbl}
                            <button onClick={() => removeQuickReply(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        );
                      }) : (
                        <p className="text-xs text-gray-400 italic">Using industry defaults for {clientIndustry}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={newReply}
                          onChange={(e) => setNewReply(e.target.value)}
                          placeholder="Label — e.g. ⚡ LOTUS NOW or 💰 Pricing"
                          className="bg-gray-50 flex-1"
                          maxLength={50}
                          onKeyDown={(e) => e.key === 'Enter' && addQuickReply()}
                        />
                        <Button size="sm" variant="outline" onClick={addQuickReply} disabled={quickReplies.length >= 6 || !newReply.trim()}>
                          <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                      </div>
                      <Input
                        value={newReplyUrl}
                        onChange={(e) => setNewReplyUrl(e.target.value)}
                        placeholder="Optional URL — turns the chip into a link (e.g. /lotus-now)"
                        className="bg-gray-50 text-xs"
                        onKeyDown={(e) => e.key === 'Enter' && addQuickReply()}
                      />
                      <p className="text-xs text-gray-500">
                        Leave URL blank for chips that send a message to the bot. Add a URL when the chip should deep-link to a page (LOTUS NOW, Book Now, etc.).
                      </p>
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

              {/* ── INSIGHTS — analytics from /widget-stats v2 ── */}
              {activeSection === 'insights' && (
                <div className="space-y-5">
                  {/* ── Time-range selector + CSV export — always rendered ── */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 shadow-sm">
                      {([7, 30, 90] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setInsightsWindow(d)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            insightsWindow === d
                              ? 'bg-white text-indigo-700 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {d === 7 ? '7 days' : d === 30 ? '30 days' : '90 days'}
                        </button>
                      ))}
                    </div>
                    <a
                      href={`/api/agency/clients/${clientId}/widget-stats/export?windowDays=${insightsWindow}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      title="Download conversations + telemetry as CSV"
                    >
                      <Code className="h-3.5 w-3.5" />
                      Export CSV
                    </a>
                  </div>

                  {!stats ? (
                    <div className="text-center py-10 text-sm text-gray-500">Loading insights…</div>
                  ) : (stats.sampleSize ?? 0) === 0 ? (
                    <div className="text-center py-10 text-sm text-gray-500">
                      No conversations yet in the last {stats.windowDays ?? 30} days. Insights appear once visitors start chatting.
                    </div>
                  ) : (
                    <>
                      {/* Period-over-period delta helper. Up arrow for growth,
                          down for decline. For deflection delta UP is GOOD;
                          for escalation+fallback UP is BAD — caller decides. */}
                      {(() => null)()}

                      {/* Today's pulse — separate row so the operator sees
                          what's happening RIGHT NOW vs. windowed averages. */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1 flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                              Live pulse
                            </div>
                            <div className="text-sm">
                              <strong className="text-2xl font-extrabold">{stats.todayConversations ?? 0}</strong> conversations today
                              <span className="opacity-75 mx-2">·</span>
                              <strong>{stats.todayEscalations ?? 0}</strong> escalations
                              <span className="opacity-75 mx-2">·</span>
                              <strong>{stats.todayDeflection ?? 0}%</strong> deflection
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1">Active now</div>
                            <div className="text-2xl font-extrabold">{stats.activeNow ?? 0}</div>
                            <p className="text-[10px] opacity-75">last 60 minutes</p>
                          </div>
                        </div>
                      </div>

                      {/* Top-line cards with period-over-period deltas */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/40 border border-emerald-200/50">
                          <div className="flex items-center gap-1.5 mb-1 text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                            <TrendingUp className="h-3.5 w-3.5" /> Deflection
                          </div>
                          <div className="flex items-baseline gap-2">
                            <div className="text-2xl font-extrabold text-emerald-900">{stats.deflectionRate}%</div>
                            {stats.periodComparison && stats.periodComparison.prevSample > 0 && (
                              <span className={`text-[10px] font-bold ${
                                (stats.periodComparison.deflectionDelta) >= 0 ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                {stats.periodComparison.deflectionDelta >= 0 ? '↑' : '↓'} {Math.abs(stats.periodComparison.deflectionDelta)}%
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-emerald-700/70 mt-0.5">resolved without escalation</p>
                        </div>
                        <button
                          onClick={() => setDrillFilter({ kind: 'escalation', title: 'Escalations' })}
                          className="text-left p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-200/50 hover:border-amber-300 hover:shadow-sm transition-all"
                          title="Click to see actual escalation conversations"
                        >
                          <div className="flex items-center gap-1.5 mb-1 text-amber-700 text-xs font-semibold uppercase tracking-wider">
                            <AlertTriangle className="h-3.5 w-3.5" /> Escalations
                          </div>
                          <div className="flex items-baseline gap-2">
                            <div className="text-2xl font-extrabold text-amber-900">{stats.escalationCount}</div>
                            {stats.periodComparison && stats.periodComparison.prevSample > 0 && (
                              <span className={`text-[10px] font-bold ${
                                stats.periodComparison.escalationDelta <= 0 ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                {stats.periodComparison.escalationDelta >= 0 ? '↑' : '↓'} {Math.abs(stats.periodComparison.escalationDelta)}%
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-amber-700/70 mt-0.5">flagged in last {stats.windowDays}d · tap to inspect</p>
                        </button>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/40 border border-indigo-200/50">
                          <div className="flex items-center gap-1.5 mb-1 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
                            <BarChart3 className="h-3.5 w-3.5" /> Sample
                          </div>
                          <div className="flex items-baseline gap-2">
                            <div className="text-2xl font-extrabold text-indigo-900">{stats.sampleSize}</div>
                            {stats.periodComparison && stats.periodComparison.prevSample > 0 && (
                              <span className={`text-[10px] font-bold ${
                                stats.periodComparison.sampleDelta >= 0 ? 'text-emerald-600' : 'text-gray-500'
                              }`}>
                                {stats.periodComparison.sampleDelta >= 0 ? '↑' : '↓'} {Math.abs(stats.periodComparison.sampleDelta)}%
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-indigo-700/70 mt-0.5">vs prev {stats.windowDays}d</p>
                        </div>
                      </div>

                      {/* ── Engagement row — 6 stats cards ── */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="p-3 rounded-xl bg-white border border-gray-200">
                          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Sessions</div>
                          <div className="text-xl font-extrabold text-gray-900">{stats.sessionsCount ?? 0}</div>
                          <p className="text-[10px] text-gray-500 mt-0.5">unique chats</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white border border-gray-200">
                          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Msgs / chat</div>
                          <div className="text-xl font-extrabold text-gray-900">{stats.avgMessagesPerConv ?? 0}</div>
                          <p className="text-[10px] text-gray-500 mt-0.5">engagement depth</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white border border-gray-200">
                          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Avg duration</div>
                          <div className="text-xl font-extrabold text-gray-900">
                            {(() => {
                              const s = stats.avgSessionDurationSec ?? 0;
                              if (s === 0) return '—';
                              if (s < 60) return `${s}s`;
                              const m = Math.floor(s / 60);
                              const r = s % 60;
                              return r === 0 ? `${m}m` : `${m}m ${r}s`;
                            })()}
                          </div>
                          <p className="text-[10px] text-gray-500 mt-0.5">first → last msg</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white border border-gray-200">
                          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Returning</div>
                          <div className="text-xl font-extrabold text-gray-900">{stats.returningRate ?? 0}%</div>
                          <p className="text-[10px] text-gray-500 mt-0.5">{stats.returningSessions ?? 0} multi-day</p>
                        </div>
                        <div className="p-3 rounded-xl bg-white border border-gray-200">
                          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Card CTR</div>
                          <div className="text-xl font-extrabold text-gray-900">{stats.cardCTR ?? 0}%</div>
                          <p className="text-[10px] text-gray-500 mt-0.5">{stats.totalCardClicks ?? 0} / {stats.cardsShownTotal ?? 0} clicks</p>
                        </div>
                        <div className={`p-3 rounded-xl bg-white border ${(stats.fallbackRate ?? 0) > 30 ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-gray-500">Fallback rate</div>
                          <div className={`text-xl font-extrabold ${(stats.fallbackRate ?? 0) > 30 ? 'text-red-700' : 'text-gray-900'}`}>{stats.fallbackRate ?? 0}%</div>
                          <p className="text-[10px] text-gray-500 mt-0.5">replies that punt to phone</p>
                        </div>
                      </div>

                      {/* ── Conversion funnel ── */}
                      {(stats.funnel ?? []).length > 0 && (stats.funnel?.[0]?.count ?? 0) > 0 && (
                        <div className="p-4 rounded-xl bg-white border border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-3">Conversion funnel</p>
                          <div className="space-y-2">
                            {(stats.funnel ?? []).map((s, i) => {
                              const top = stats.funnel?.[0]?.count ?? 1;
                              const pct = top === 0 ? 0 : Math.round((s.count / top) * 100);
                              const prev = i === 0 ? 100 : (stats.funnel?.[i - 1]?.count ?? 1);
                              const dropoff = i === 0 || prev === 0 ? null : Math.round(((prev - s.count) / prev) * 100);
                              return (
                                <div key={s.stage} className="flex items-center gap-3">
                                  <span className="text-xs text-gray-600 w-32 truncate">{s.stage}</span>
                                  <div className="flex-1 h-7 rounded-md bg-gray-100 overflow-hidden relative">
                                    <div
                                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 flex items-center px-2"
                                      style={{ width: `${Math.max(2, pct)}%` }}
                                    >
                                      <span className="text-[10px] font-bold text-white">{s.count}</span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-gray-500 w-16 text-right">
                                    {pct}%{dropoff != null && dropoff > 0 ? ` (-${dropoff}%)` : ''}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-3 italic">
                            Visitor flow from widget open through clicking out. Big drop between Cards shown and Card clicked means the cards aren't compelling — try sharper product names or bigger discount badges.
                          </p>
                        </div>
                      )}

                      {/* ── Top product categories asked about ── */}
                      {(stats.topCategories ?? []).length > 0 && (
                        <div className="p-4 rounded-xl bg-white border border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-3">Most-asked categories</p>
                          <div className="flex flex-wrap gap-2">
                            {(stats.topCategories ?? []).map(c => (
                              <button
                                key={c.category}
                                type="button"
                                onClick={() => setDrillFilter({ kind: 'query', value: c.category, title: `Conversations mentioning "${c.category}"` })}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                              >
                                <span className="capitalize">{c.category}</span>
                                <span className="text-indigo-500 font-bold">×{c.count}</span>
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-3 italic">
                            Where customer demand is concentrated. Click any category to inspect the conversations. Cross-reference with stock to make sure trending categories aren't selling out.
                          </p>
                        </div>
                      )}

                      {/* ── Top brands asked about ── */}
                      {(stats.topBrands ?? []).length > 0 && (
                        <div className="p-4 rounded-xl bg-white border border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-3">Most-asked brands</p>
                          <div className="flex flex-wrap gap-2">
                            {(stats.topBrands ?? []).map(b => (
                              <button
                                key={b.brand}
                                type="button"
                                onClick={() => setDrillFilter({ kind: 'query', value: b.brand, title: `Conversations mentioning "${b.brand}"` })}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100 transition-colors"
                              >
                                <span>{b.brand}</span>
                                <span className="text-purple-500 font-bold">×{b.count}</span>
                              </button>
                            ))}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-3 italic">
                            Brands customers ask for by name. If a brand keeps trending, push it in your promos and quick-reply chips.
                          </p>
                        </div>
                      )}

                      {/* ── Top product cards clicked ── */}
                      {(stats.topCardClicks ?? []).length > 0 && (
                        <div className="p-4 rounded-xl bg-white border border-gray-200">
                          <div className="flex items-baseline justify-between mb-3">
                            <p className="text-sm font-semibold text-gray-700">Top product clicks</p>
                            <span className="text-xs text-gray-500">{stats.totalCardClicks} total</span>
                          </div>
                          <ol className="space-y-1.5">
                            {(stats.topCardClicks ?? []).slice(0, 8).map((c, i) => (
                              <li key={i} className="flex items-center gap-3 text-sm">
                                <span className="w-5 text-xs text-gray-400 font-mono">{i + 1}.</span>
                                <span className="flex-1 text-gray-700 truncate" title={c.label}>{c.label}</span>
                                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">×{c.count}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Volume sparkline — dynamic window label */}
                      <div className="p-4 rounded-xl bg-white border border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-3">
                          {stats.dailyBucketDays === 1
                            ? `Daily volume (last ${stats.windowDays}d)`
                            : `Volume per ${stats.dailyBucketDays}d (last ${stats.windowDays}d)`}
                        </p>
                        <div className="flex items-end gap-2 h-24">
                          {(stats.dailyVolume ?? []).map((d) => {
                            const max = Math.max(1, ...(stats.dailyVolume ?? []).map(x => x.count));
                            const pct = Math.round((d.count / max) * 100);
                            return (
                              <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1">
                                <span className="text-[10px] font-semibold text-gray-700">{d.count}</span>
                                <div
                                  className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all"
                                  style={{ height: `${Math.max(2, pct)}%` }}
                                />
                                <span className="text-[10px] text-gray-500">{d.day.slice(5)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Top customer queries — clickable for drill-down */}
                      <div className="p-4 rounded-xl bg-white border border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Top customer questions</p>
                        {(stats.topQueries ?? []).length === 0 ? (
                          <p className="text-xs text-gray-500 italic">Not enough data yet.</p>
                        ) : (
                          <ol className="space-y-0.5">
                            {(stats.topQueries ?? []).slice(0, 8).map((q, i) => (
                              <li key={i}>
                                <button
                                  onClick={() => setDrillFilter({ kind: 'query', value: q.query, title: `"${q.query}"` })}
                                  className="w-full flex items-center gap-3 text-sm py-1 px-2 -mx-2 rounded-md hover:bg-indigo-50 transition-colors"
                                  title="Click to see actual conversations"
                                >
                                  <span className="w-5 text-xs text-gray-400 font-mono">{i + 1}.</span>
                                  <span className="flex-1 text-left text-gray-700 truncate">{q.query}</span>
                                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">×{q.count}</span>
                                </button>
                              </li>
                            ))}
                          </ol>
                        )}
                        <p className="text-[11px] text-gray-500 mt-3 italic">
                          Click any question to read the actual conversations behind it. Add answers to your training doc to deflect these directly.
                        </p>
                      </div>

                      {/* KB-gap drill-down — questions where the bot punted to phone.
                          Direct signal for what's missing in the training doc. */}
                      {(stats.fallbackQueries ?? []).length > 0 && (
                        <div className="p-4 rounded-xl bg-red-50/50 border border-red-200/60">
                          <div className="flex items-baseline justify-between mb-3">
                            <p className="text-sm font-semibold text-red-900 flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5" /> KB gaps — questions the bot punted to phone
                            </p>
                            <span className="text-xs text-red-700">{stats.fallbackCount} fallback replies in {stats.windowDays}d</span>
                          </div>
                          <ol className="space-y-0.5">
                            {(stats.fallbackQueries ?? []).slice(0, 6).map((q, i) => (
                              <li key={i}>
                                <button
                                  onClick={() => setDrillFilter({ kind: 'query', value: q.query, title: `Fallback: "${q.query}"` })}
                                  className="w-full flex items-center gap-3 text-sm py-1 px-2 -mx-2 rounded-md hover:bg-red-100/60 transition-colors"
                                  title="Click to read the bot's actual fallback response"
                                >
                                  <span className="w-5 text-xs text-red-400 font-mono">{i + 1}.</span>
                                  <span className="flex-1 text-left text-red-900 truncate">{q.query}</span>
                                  <span className="text-xs font-semibold text-red-700 bg-red-100 rounded-full px-2 py-0.5">×{q.count}</span>
                                </button>
                              </li>
                            ))}
                          </ol>
                          <p className="text-[11px] text-red-700/80 mt-3 italic">
                            These questions caused the bot to fall back to &quot;please call us&quot; — add direct answers to your training doc and the deflection rate will climb.
                          </p>
                        </div>
                      )}

                      {/* Top source pages — where visitors start their chats */}
                      {(stats.topSources ?? []).length > 0 && (
                        <div className="p-4 rounded-xl bg-white border border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-3">Top referring pages</p>
                          <ol className="space-y-1.5">
                            {(stats.topSources ?? []).slice(0, 6).map((s, i) => (
                              <li key={i} className="flex items-center gap-3 text-sm">
                                <span className="w-5 text-xs text-gray-400 font-mono">{i + 1}.</span>
                                <span className="flex-1 text-gray-700 font-mono text-xs truncate" title={s.page}>{s.page}</span>
                                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">×{s.count}</span>
                              </li>
                            ))}
                          </ol>
                          <p className="text-[11px] text-gray-500 mt-3 italic">
                            Pages where the widget was opened. High-traffic pages with low engagement may need a more inviting greeting or contextual chips.
                          </p>
                        </div>
                      )}

                      {/* Channel mix */}
                      {stats.channelMix && Object.keys(stats.channelMix).length > 0 && (
                        <div className="p-4 rounded-xl bg-white border border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-3">Channel mix</p>
                          <div className="space-y-2">
                            {Object.entries(stats.channelMix).sort(([, a], [, b]) => b - a).map(([ch, count]) => {
                              const total = Object.values(stats.channelMix ?? {}).reduce((a, b) => a + b, 0);
                              const pct = total === 0 ? 0 : Math.round((count / total) * 100);
                              return (
                                <div key={ch} className="flex items-center gap-3">
                                  <span className="text-xs font-medium text-gray-600 w-20 capitalize">{ch}</span>
                                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs text-gray-500 w-16 text-right">{count} ({pct}%)</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Chip clicks — top URL chips by click count */}
                      {(stats.totalChipClicks ?? 0) > 0 && (stats.topChipClicks ?? []).length > 0 && (
                        <div className="p-4 rounded-xl bg-white border border-gray-200">
                          <div className="flex items-baseline justify-between mb-3">
                            <p className="text-sm font-semibold text-gray-700">Top chip clicks</p>
                            <span className="text-xs text-gray-500">{stats.totalChipClicks} total clicks tracked</span>
                          </div>
                          <ol className="space-y-1.5">
                            {(stats.topChipClicks ?? []).slice(0, 6).map((c, i) => {
                              const maxCount = Math.max(1, ...(stats.topChipClicks ?? []).map(x => x.count));
                              const pct = Math.round((c.count / maxCount) * 100);
                              return (
                                <li key={i} className="flex items-center gap-3 text-sm">
                                  <span className="w-5 text-xs text-gray-400 font-mono">{i + 1}.</span>
                                  <span className="flex-1 text-gray-700 truncate" title={c.label}>{c.label}</span>
                                  <div className="w-24 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                    <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5 w-10 text-center">×{c.count}</span>
                                </li>
                              );
                            })}
                          </ol>
                          <p className="text-[11px] text-gray-500 mt-3 italic">
                            Tracks clicks on CTA chips (URL-bearing quick replies). Use this to A/B test which CTAs drive the most navigation.
                          </p>
                        </div>
                      )}

                      {/* Peak hour — when conversations cluster */}
                      {(stats.peakHour ?? -1) >= 0 && (stats.peakHourCount ?? 0) > 0 && (
                        <div className="p-4 rounded-xl bg-white border border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Peak activity hour</p>
                          <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-extrabold text-gray-900">
                              {(() => {
                                const h = stats.peakHour ?? 0;
                                const ampm = h >= 12 ? 'PM' : 'AM';
                                const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                                return `${hour12} ${ampm}`;
                              })()}
                            </span>
                            <span className="text-sm text-gray-500">
                              {stats.peakHourCount} conversations during this hour-of-day (rolling {stats.windowDays}d)
                            </span>
                          </div>
                          {/* 24-hour sparkbar */}
                          {(stats.hourBuckets ?? []).length === 24 && (
                            <div className="mt-3 flex items-end gap-0.5 h-12">
                              {(stats.hourBuckets ?? []).map((count, h) => {
                                const max = Math.max(1, ...(stats.hourBuckets ?? []));
                                const pct = Math.round((count / max) * 100);
                                const isPeak = h === stats.peakHour;
                                return (
                                  <div
                                    key={h}
                                    className={`flex-1 rounded-t ${isPeak ? 'bg-indigo-600' : 'bg-indigo-200'}`}
                                    style={{ height: `${Math.max(2, pct)}%` }}
                                    title={`${h}:00 → ${count} conv`}
                                  />
                                );
                              })}
                            </div>
                          )}
                          <div className="mt-1 flex justify-between text-[9px] text-gray-400 font-mono">
                            <span>12am</span><span>6am</span><span>noon</span><span>6pm</span><span>11pm</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ── Drill-down modal — read the actual conversations ── */}
                  {drillFilter && (
                    <div
                      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                      onClick={() => setDrillFilter(null)}
                    >
                      <div
                        className="bg-white rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">
                              {drillFilter.title}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Recent conversations matching this filter (last {insightsWindow} days)
                            </p>
                          </div>
                          <button
                            onClick={() => setDrillFilter(null)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            aria-label="Close"
                          >
                            <X className="h-5 w-5 text-gray-500" />
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                          {drillLoading ? (
                            <div className="text-center py-10 text-sm text-gray-500">Loading conversations…</div>
                          ) : !drillRows || drillRows.length === 0 ? (
                            <div className="text-center py-10 text-sm text-gray-500">No matching conversations found.</div>
                          ) : (
                            drillRows.map((row, i) => (
                              <div key={i} className="border border-gray-100 rounded-xl p-3 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-baseline justify-between mb-2 text-[11px] text-gray-500">
                                  <span>{new Date(row.created_at).toLocaleString()}</span>
                                  {row.source_url && (
                                    <span className="font-mono truncate ml-3 max-w-[200px]" title={row.source_url}>
                                      {(() => {
                                        try { return new URL(row.source_url).pathname; } catch { return row.source_url; }
                                      })()}
                                    </span>
                                  )}
                                </div>
                                <div className="mb-2">
                                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Customer</div>
                                  <p className="text-sm text-gray-900 bg-indigo-50/50 px-3 py-2 rounded-lg">{row.user_message || '—'}</p>
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Bot reply</div>
                                  <p className="text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg whitespace-pre-wrap line-clamp-6">{row.ai_response || '—'}</p>
                                </div>
                                {row.session_id && (
                                  <button
                                    onClick={() => setDrillFilter({ kind: 'session', sessionId: row.session_id!, title: `Session: ${row.session_id}` })}
                                    className="mt-2 text-[11px] text-indigo-600 hover:text-indigo-700 font-medium"
                                  >
                                    See full session →
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                        <div className="p-3 border-t border-gray-100 bg-gray-50/50 text-[11px] text-gray-500 text-center">
                          {drillRows && drillRows.length > 0
                            ? `Showing ${drillRows.length} most recent`
                            : 'Use CSV export for the full dataset'}
                        </div>
                      </div>
                    </div>
                  )}
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

            {/* Right: Live Preview (Appearance tab only) */}
            {activeSection === 'appearance' && (
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
                        {((quickReplies.length > 0 ? quickReplies : ['Get Started', 'Pricing', 'Contact']) as QuickReply[]).slice(0, 5).map((reply, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-medium px-2.5 py-1.5 rounded-full border bg-white shadow-sm cursor-default"
                            style={{ borderColor: `${widgetColor}33`, color: replyUrl(reply) ? widgetColor : '#374151', fontWeight: replyUrl(reply) ? 700 : 500 }}
                          >
                            {replyLabel(reply)}
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
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
