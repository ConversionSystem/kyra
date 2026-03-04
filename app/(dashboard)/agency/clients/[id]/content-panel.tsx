'use client';

import { useState } from 'react';
import { Globe, ExternalLink, ChevronDown, ChevronUp, Send, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  onRefresh: () => void;
}

function ContentItem({ entry, clientId, onRefresh }: { entry: ContentEntry; clientId: string; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ ok: boolean; url?: string; error?: string } | null>(null);

  const isDraft = !entry.url && entry.status !== 'published';

  const publishToTelegraph = async () => {
    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/seo/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: 'telegraph', title: entry.title, body: entry.body, published_at: entry.published_at }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Publish failed');
      setPublishResult({ ok: true, url: json.url });
      onRefresh();
    } catch (err) {
      setPublishResult({ ok: false, error: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="flex items-start gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{entry.title}</p>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-gray-500">{new Date(entry.published_at).toLocaleDateString()}</span>
            {entry.word_count && <span className="text-xs text-gray-400">· {entry.word_count} words</span>}
            {entry.target_keyword && <span className="text-xs text-gray-400">· 🎯 {entry.target_keyword}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDraft ? (
            <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
              ✏️ Draft — not published
            </Badge>
          ) : (
            <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
              ✅ Published · {entry.platform}
            </Badge>
          )}
          {entry.url && (
            <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-md"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide' : 'Read'}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100">
          {/* Publish bar — only for drafts */}
          {isDraft && !publishResult?.ok && (
            <div className="bg-blue-50 border-b border-blue-100 px-4 py-2.5 flex items-center justify-between gap-3">
              <div className="text-xs text-blue-700">
                <strong>Draft ready.</strong> Publish to Telegraph instantly — no account or API key required.
              </div>
              <Button
                size="sm"
                onClick={publishToTelegraph}
                disabled={publishing}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
              >
                {publishing
                  ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Publishing…</>
                  : <><Send className="w-3 h-3 mr-1.5" />Publish to Telegraph</>}
              </Button>
            </div>
          )}

          {/* Publish success */}
          {publishResult?.ok && (
            <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs text-emerald-800">Published to Telegraph!</span>
              <a href={publishResult.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 underline ml-1">
                View live →
              </a>
            </div>
          )}

          {/* Publish error */}
          {publishResult && !publishResult.ok && (
            <div className="bg-red-50 border-b border-red-100 px-4 py-2.5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-xs text-red-700">{publishResult.error}</span>
            </div>
          )}

          {/* Article body */}
          {entry.body ? (
            <div
              className="p-4 prose prose-sm max-w-none text-gray-700 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: entry.body }}
            />
          ) : (
            <p className="p-4 text-sm text-gray-400 italic">No content body stored.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function ContentPanel({ entries, clientId, onRefresh }: Props) {
  const drafts = entries.filter(e => !e.url && e.status !== 'published');
  const published = entries.filter(e => e.url || e.status === 'published');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            Content
          </CardTitle>
          <div className="flex items-center gap-2">
            {drafts.length > 0 && (
              <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">{drafts.length} draft{drafts.length !== 1 ? 's' : ''}</Badge>
            )}
            {published.length > 0 && (
              <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">{published.length} published</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            No content yet. Click <strong>Generate Content</strong> above — AI writes a full article in ~10 seconds.
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <ContentItem key={i} entry={entry} clientId={clientId} onRefresh={onRefresh} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
