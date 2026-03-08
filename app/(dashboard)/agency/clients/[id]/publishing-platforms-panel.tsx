'use client';

import { useState, useCallback } from 'react';
import { Globe, CheckCircle2, Settings, Zap, Lock, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ── Platform Definitions ──────────────────────────────────────────────────────

export interface Platform {
  id: string;
  name: string;
  emoji: string;
  type: 'web2' | 'semantic' | 'social';
  typeLabel: string;
  note: string;
  ready: boolean;       // Can publish right now (no setup needed)
  phase2: boolean;      // Still being built
  setupUrl?: string;    // Where to configure API keys
}

export const ALL_PLATFORMS: Platform[] = [
  // Web 2.0 — direct publishing
  {
    id: 'telegraph',
    name: 'Telegraph',
    emoji: '✈️',
    type: 'web2',
    typeLabel: 'Web 2.0',
    note: 'No account or API key required',
    ready: true,
    phase2: false,
  },
  {
    id: 'wordpress',
    name: 'WordPress.com',
    emoji: '📝',
    type: 'web2',
    typeLabel: 'Web 2.0',
    note: 'REST API — needs site URL + App Password',
    ready: false,
    phase2: false,
    setupUrl: 'https://wordpress.com/me/security/application-passwords',
  },
  {
    id: 'blogger',
    name: 'Blogger',
    emoji: '📰',
    type: 'web2',
    typeLabel: 'Web 2.0',
    note: 'Google Blogger API v3',
    ready: false,
    phase2: false,
    setupUrl: 'https://console.developers.google.com',
  },
  {
    id: 'notion',
    name: 'Notion',
    emoji: '📓',
    type: 'web2',
    typeLabel: 'Web 2.0 + Stack',
    note: 'Notion Integration API',
    ready: false,
    phase2: false,
    setupUrl: 'https://www.notion.so/my-integrations',
  },
  // Semantic Stack — high-authority backlinks
  {
    id: 'google_docs',
    name: 'Google Docs',
    emoji: '📄',
    type: 'semantic',
    typeLabel: 'Semantic Stack',
    note: 'Google Docs API — indexed by AI crawlers',
    ready: false,
    phase2: false,
    setupUrl: 'https://console.developers.google.com',
  },
  {
    id: 'github_pages',
    name: 'GitHub Pages',
    emoji: '⚡',
    type: 'semantic',
    typeLabel: 'Semantic Stack',
    note: 'GitHub REST API — high-authority domain',
    ready: false,
    phase2: false,
    setupUrl: 'https://github.com/settings/tokens',
  },
  {
    id: 'google_sites',
    name: 'Google Sites',
    emoji: '🌐',
    type: 'semantic',
    typeLabel: 'Semantic Stack',
    note: 'Google Sites API',
    ready: false,
    phase2: true,
    setupUrl: 'https://console.developers.google.com',
  },
];

const TYPE_COLORS: Record<string, string> = {
  web2:     'bg-indigo-100 text-indigo-700 border-indigo-200',
  semantic: 'bg-violet-100 text-violet-700 border-violet-200',
  social:   'bg-blue-100 text-blue-700 border-blue-200',
};

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  clientId: string;
  enabledPlatforms: string[];   // list of platform IDs currently enabled
  onPlatformsChange?: (ids: string[]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PublishingPlatformsPanel({ clientId, enabledPlatforms, onPlatformsChange }: Props) {
  const [enabled, setEnabled] = useState<Set<string>>(new Set(enabledPlatforms));
  const [saving, setSaving] = useState<string | null>(null);

  const toggle = useCallback(async (platformId: string) => {
    const next = new Set(enabled);
    if (next.has(platformId)) {
      next.delete(platformId);
    } else {
      next.add(platformId);
    }
    setEnabled(next);
    setSaving(platformId);
    onPlatformsChange?.(Array.from(next));

    try {
      await fetch(`/api/agency/clients/${clientId}/seo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: 'publishing_platforms', value: Array.from(next) }),
      });
    } catch {
      // Non-fatal — UI already updated optimistically
    } finally {
      setSaving(null);
    }
  }, [enabled, clientId, onPlatformsChange]);

  const web2 = ALL_PLATFORMS.filter(p => p.type === 'web2');
  const semantic = ALL_PLATFORMS.filter(p => p.type === 'semantic');

  const enabledCount = ALL_PLATFORMS.filter(p => enabled.has(p.id)).length;
  const readyCount = ALL_PLATFORMS.filter(p => enabled.has(p.id) && p.ready).length;

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            Publishing Platforms
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {enabledCount > 0 && (
              <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-medium">
                {enabledCount} enabled
              </span>
            )}
            {readyCount > 0 && (
              <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-medium flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" /> {readyCount} ready
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Toggle platforms to enable content publishing. Enabled platforms appear as publish options on draft content.
        </p>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Web 2.0 */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Web 2.0 — Direct Publishing</p>
          <div className="space-y-2">
            {web2.map(p => (
              <PlatformRow
                key={p.id}
                platform={p}
                isEnabled={enabled.has(p.id)}
                isSaving={saving === p.id}
                onToggle={() => toggle(p.id)}
              />
            ))}
          </div>
        </div>

        {/* Semantic Stack */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Semantic Stack — AI Citation Boost</p>
            <Badge className="text-[9px] bg-violet-100 text-violet-600 border-violet-200 py-0">High Authority</Badge>
          </div>
          <p className="text-[10px] text-gray-400 mb-2">
            Publishing to these platforms puts your content on domains that AI systems (ChatGPT, Perplexity) actively index — directly boosting your GEO score.
          </p>
          <div className="space-y-2">
            {semantic.map(p => (
              <PlatformRow
                key={p.id}
                platform={p}
                isEnabled={enabled.has(p.id)}
                isSaving={saving === p.id}
                onToggle={() => toggle(p.id)}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Platform Row ──────────────────────────────────────────────────────────────

function PlatformRow({
  platform,
  isEnabled,
  isSaving,
  onToggle,
}: {
  platform: Platform;
  isEnabled: boolean;
  isSaving: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        isEnabled
          ? 'bg-indigo-50 border-indigo-200'
          : 'bg-gray-50 border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* Toggle */}
      <button
        onClick={onToggle}
        className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 flex items-center ${
          isEnabled ? 'bg-indigo-600' : 'bg-gray-300'
        }`}
        style={{ height: '22px', minWidth: '40px' }}
      >
        {isSaving
          ? <Loader2 className="w-3 h-3 text-white animate-spin absolute left-1/2 -translate-x-1/2" />
          : (
            <span
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                isEnabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          )
        }
      </button>

      {/* Icon */}
      <span className="text-lg leading-none shrink-0">{platform.emoji}</span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`text-xs font-bold ${isEnabled ? 'text-indigo-900' : 'text-gray-700'}`}>
            {platform.name}
          </p>
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${TYPE_COLORS[platform.type]}`}>
            {platform.typeLabel}
          </span>
          {platform.phase2 && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
              Soon
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">{platform.note}</p>
      </div>

      {/* Status / Action */}
      {isEnabled && (
        platform.ready ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 shrink-0">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        ) : (
          platform.setupUrl ? (
            <a
              href={platform.setupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold shrink-0"
              onClick={e => e.stopPropagation()}
            >
              <Settings className="w-3 h-3" /> Setup
              <ChevronRight className="w-2.5 h-2.5" />
            </a>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-gray-400 shrink-0">
              <Lock className="w-3 h-3" /> Needs setup
            </span>
          )
        )
      )}
    </div>
  );
}
