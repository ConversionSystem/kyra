'use client';

import { useState } from 'react';
import { ChannelsClient } from '@/app/(dashboard)/agency/channels/channels-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Globe, Copy, CheckCircle2, ExternalLink } from 'lucide-react';

interface AgencyClient {
  id: string;
  name: string;
  container_config?: Record<string, unknown> | null;
}

type Tab = 'terminal' | 'personality' | 'templates' | 'skills' | 'crm' | 'secrets' | 'settings' | 'ghl' | 'usage' | 'conversations' | 'channels' | 'portal' | 'memory' | 'voice' | 'seo' | 'automation' | 'ai-teams' | 'delivery-sms';

export default function ChannelsLiveTab({
  clientId,
  client,
  onTabChange,
}: {
  clientId: string;
  client: AgencyClient;
  onTabChange?: (tab: Tab) => void;
}) {
  const cfg = (client.container_config ?? {}) as Record<string, unknown>;
  const [widgetTitle, setWidgetTitle] = useState((cfg.widget_title as string) || '');
  const [widgetColor, setWidgetColor] = useState((cfg.widget_color as string) || '#6366f1');
  const [widgetGreeting, setWidgetGreeting] = useState((cfg.widget_greeting as string) || '');
  const [savingWidget, setSavingWidget] = useState(false);
  const [widgetSaved, setWidgetSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://kyra.conversionsystem.com';
  // Correct path: /api/widget/[clientId]/script (served dynamically per-client)
  const scriptTag = `<script src="${appUrl}/api/widget/${client.id}/script" defer></script>`;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const saveWidgetAppearance = async () => {
    setSavingWidget(true);
    try {
      await fetch(`/api/agency/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          container_config: {
            ...cfg,
            widget_title: widgetTitle.trim() || undefined,
            widget_color: widgetColor || '#6366f1',
            widget_greeting: widgetGreeting.trim() || undefined,
          },
        }),
      });
      setWidgetSaved(true);
      setTimeout(() => setWidgetSaved(false), 2000);
    } catch { /* ignore */ }
    setSavingWidget(false);
  };

  return (
    <div className="space-y-8 pb-8">
      {/* ── Live Channels (from ChannelsClient — actually connects to the container) ── */}
      <ChannelsClient clientId={clientId} embedded />

      {/* ── Web Chat Widget Customization ── */}
      <div className="max-w-5xl px-4 sm:px-6 md:px-8">
        <Card className="border-indigo-100">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Globe className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-base">Web Chat Widget</CardTitle>
                <CardDescription className="text-xs">Customize and embed the chat widget on any website</CardDescription>
              </div>
              <span className="ml-auto text-[10px] bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">✅ Ready</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Embed snippet</p>
              <div className="flex items-start gap-2">
                <div className="flex-1 bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 overflow-x-auto">
                  {scriptTag}
                </div>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => copy(scriptTag, 'script')}>
                  {copied === 'script' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-700 mb-3">Customize appearance</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Widget Title</label>
                    <Input value={widgetTitle} onChange={(e) => setWidgetTitle(e.target.value)} placeholder={`Chat with ${client.name}`} className="bg-gray-50 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Brand Colour</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={widgetColor} onChange={(e) => setWidgetColor(e.target.value)} className="h-8 w-10 rounded border border-gray-200 cursor-pointer bg-white p-0.5" />
                      <Input value={widgetColor} onChange={(e) => setWidgetColor(e.target.value)} placeholder="#6366f1" className="bg-gray-50 font-mono text-sm flex-1" maxLength={7} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">Opening Greeting</label>
                    <Textarea value={widgetGreeting} onChange={(e) => setWidgetGreeting(e.target.value)} placeholder="Hi! 👋 How can I help you today?" rows={2} className="bg-gray-50 text-sm" />
                  </div>
                  <Button size="sm" onClick={saveWidgetAppearance} disabled={savingWidget} className="mt-1">
                    {savingWidget ? 'Saving...' : widgetSaved ? '✅ Saved' : 'Save Appearance'}
                  </Button>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-medium text-gray-500 self-start">Preview</p>
                  <div className="w-full rounded-xl overflow-hidden border border-gray-200 shadow-lg text-[11px]">
                    <div className="flex items-center gap-2 px-3 py-2" style={{ background: widgetColor }}>
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-[9px]">🤖</div>
                      <div className="text-white font-semibold text-xs">{widgetTitle || `Chat with ${client.name}`}</div>
                    </div>
                    <div className="bg-gray-50 px-3 py-2.5 space-y-1.5 min-h-[60px]">
                      <div className="flex items-end gap-1">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] shrink-0" style={{ background: widgetColor }}>🤖</div>
                        <div className="bg-white rounded-lg rounded-bl-sm px-2 py-1 shadow-sm text-gray-800 max-w-[80%] text-[10px]">{widgetGreeting || 'Hi! 👋 How can I help you today?'}</div>
                      </div>
                    </div>
                    <div className="bg-white border-t border-gray-100 px-2 py-1.5 flex items-center gap-1.5">
                      <div className="flex-1 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-gray-400 text-[10px]">Type a message...</div>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: widgetColor }}>
                        <svg viewBox="0 0 24 24" width="8" height="8" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs" onClick={() => window.open(`${appUrl}/api/widget/${client.id}/script`, '_blank')}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Preview script
              </Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => copy(`${appUrl}/api/widget/chat`, 'api')}>
                {copied === 'api' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                Copy API endpoint
              </Button>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  );
}
