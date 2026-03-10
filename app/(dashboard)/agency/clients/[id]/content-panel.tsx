'use client';

import { useState } from 'react';
import {
  FileText, ExternalLink, ChevronDown, ChevronUp,
  Send, Loader2, CheckCircle2, AlertTriangle, Copy, Check,
  Globe, Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ALL_PLATFORMS, type Platform } from './publishing-platforms-panel';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContentEntry {
  title: string;
  platform: string;
  url: string | null;
  type: string;
  published_at: string;
  status?: string;
  body?: string;
  target_keyword?: string;
  word_count?: number;
}

interface Props {
  entries: ContentEntry[];
  clientId: string;
  enabledPlatforms?: string[];
  onRefresh: () => void;
}

// ── Publish result state ──────────────────────────────────────────────────────

interface PublishResult {
  ok: boolean;
  url?: string;
  error?: string;
  platformId?: string;
}

// ── Content Item ──────────────────────────────────────────────────────────────

function ContentItem({
  entry,
  clientId,
  readyPlatforms,
  onRefresh,
}: {
  entry: ContentEntry;
  clientId: string;
  readyPlatforms: Platform[];
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [copied, setCopied] = useState(false);

  const isDraft = !entry.url && entry.status !== 'published';

  const publishTo = async (platformId: string) => {
    setPublishing(platformId);
    setPublishResult(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: platformId,
          title: entry.title,
          body: entry.body,
          published_at: entry.published_at,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Publish failed');
      setPublishResult({ ok: true, url: json.url, platformId });
      onRefresh();
    } catch (err) {
      setPublishResult({ ok: false, error: err instanceof Error ? err.message : 'Failed', platformId });
    } finally {
      setPublishing(null);
    }
  };

  const copyContent = () => {
    if (!entry.body) return;
    const text = entry.body.replace(/<[^>]+>/g, '');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const publishedPlatformName = entry.platform || 'Unknown';

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      isDraft
        ? 'border-amber-200 bg-gradient-to-br from-amber-50/50 to-white'
        : 'border-emerald-200 bg-gradient-to-br from-emerald-50/30 to-white'
    }`}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isDraft ? 'bg-amber-400' : 'bg-emerald-500'}`} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-snug">{entry.title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[11px] text-gray-400">
              {new Date(entry.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {entry.word_count && (
              <span className="text-[11px] text-gray-400">· {entry.word_count.toLocaleString()} words</span>
            )}
            {entry.target_keyword && (
              <span className="text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 font-medium">
                🎯 {entry.target_keyword}
              </span>
            )}
          </div>
        </div>

        {/* Right badges + actions */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          {isDraft ? (
            <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-300 font-semibold">
              ✏️ Draft
            </Badge>
          ) : (
            <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" />
              {publishedPlatformName}
            </Badge>
          )}
          {entry.url && (
            <a href={entry.url} target="_blank" rel="noopener noreferrer"
              className="text-gray-400 hover:text-indigo-600 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
              expanded
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
            }`}
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide' : 'Read'}
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-gray-100">

          {/* Publish bar — drafts only */}
          {isDraft && !publishResult?.ok && (
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-bold text-white">Ready to publish</p>
                  {readyPlatforms.length > 0 ? (
                    <p className="text-[10px] text-indigo-200 mt-0.5">
                      {readyPlatforms.length} platform{readyPlatforms.length !== 1 ? 's' : ''} ready — no setup required
                    </p>
                  ) : (
                    <p className="text-[10px] text-indigo-200 mt-0.5">
                      Enable platforms in the Publishing Platforms panel below
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {readyPlatforms.map(p => (
                    <Button
                      key={p.id}
                      size="sm"
                      onClick={() => publishTo(p.id)}
                      disabled={publishing !== null}
                      className="bg-white hover:bg-gray-100 text-indigo-700 text-[11px] h-7 font-bold border-0"
                    >
                      {publishing === p.id
                        ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        : <span className="mr-1 text-sm">{p.emoji}</span>
                      }
                      {p.name}
                    </Button>
                  ))}
                  {readyPlatforms.length === 0 && (
                    <span className="text-[10px] text-indigo-300 italic">
                      ↓ Enable a platform below to publish
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Publish success */}
          {publishResult?.ok && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-800">Published!</p>
                <a href={publishResult.url} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1">
                  View live article <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          )}

          {/* Publish error */}
          {publishResult && !publishResult.ok && (
            <div className="bg-red-50 border-b border-red-100 px-4 py-2.5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-700">{publishResult.error}</p>
            </div>
          )}

          {/* Article toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Article Content</p>
            <button
              onClick={copyContent}
              className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Article body */}
          {entry.body ? (
            <div
              className="p-4 prose prose-sm max-w-none text-gray-700 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: entry.body }}
            />
          ) : (
            <p className="p-4 text-sm text-gray-400 italic text-center py-6">No content body stored.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── ContentPanel ──────────────────────────────────────────────────────────────

export function ContentPanel({ entries, clientId, enabledPlatforms = [], onRefresh }: Props) {
  const drafts    = entries.filter(e => !e.url && e.status !== 'published');
  const published = entries.filter(e => e.url || e.status === 'published');

  // Ready platforms = enabled AND currently publishable (no setup needed)
  const readyPlatforms = ALL_PLATFORMS.filter(p => enabledPlatforms.includes(p.id) && p.ready);

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            Content
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {drafts.length > 0 && (
              <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-300 font-semibold">
                {drafts.length} draft{drafts.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {published.length > 0 && (
              <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold">
                {published.length} published
              </Badge>
            )}
            {readyPlatforms.length > 0 && (
              <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                {readyPlatforms.map(p => p.emoji).join('')} ready
              </Badge>
            )}
          </div>
        </div>

        {/* Ready platforms quick summary */}
        {readyPlatforms.length === 0 && entries.length > 0 && drafts.length > 0 && (
          <div className="mt-2 flex items-start gap-2 bg-indigo-50 border border-indigo-200 rounded-xl p-2.5">
            <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-indigo-700">
              <strong>Telegraph is enabled by default</strong> — no setup required.
              Enable more platforms in <span className="font-bold">Publishing Platforms</span> below to auto-publish to multiple channels.
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {entries.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-600">No content yet</p>
            <p className="text-xs text-gray-400 mt-1">Click <strong>Generate Content</strong> above — AI writes a full article in ~10 seconds.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <ContentItem
                key={i}
                entry={entry}
                clientId={clientId}
                readyPlatforms={readyPlatforms}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
