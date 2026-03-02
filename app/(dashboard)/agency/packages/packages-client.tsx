'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Loader2, Package, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PackageSummary {
  id: string;
  name: string;
  emoji: string;
  industry: string;
  tagline: string;
  description: string;
  featureCount: number;
  stepCount: number;
}

interface PackageDetail {
  id: string;
  name: string;
  emoji: string;
  industry: string;
  tagline: string;
  description: string;
  features: string[];
  enabledAgents: string[];
  recommendedChannels: string[];
  setupSteps: Array<{
    step: number;
    title: string;
    description: string;
    actionLabel: string;
    actionHref: string;
    estimated: string;
  }>;
}

interface Props {
  businessName: string;
}

const AGENT_NAMES: Record<string, string> = {
  'front-desk': '📞 Front Desk',
  'sales': '💰 Sales',
  'support': '🛠️ Support',
  'collections': '💳 Collections',
  'review': '⭐ Reviews',
};

const CHANNEL_NAMES: Record<string, string> = {
  'sms': '📱 SMS',
  'web-chat': '💬 Web Chat',
  'whatsapp': '📲 WhatsApp',
  'google-business': '🔍 Google Business',
};

export function PackagesClient({ businessName }: Props) {
  const [packages, setPackages] = useState<PackageSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PackageDetail | null>(null);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [activationResult, setActivationResult] = useState<{ agentsEnabled: number; autopilotActions: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/packages')
      .then(r => r.json())
      .then(d => { setPackages(d.packages ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); setActivated(false); return; }
    fetch(`/api/packages?id=${selectedId}`)
      .then(r => r.json())
      .then(d => { setDetail(d.package); setActivated(false); setActivationResult(null); });
  }, [selectedId]);

  const activate = async () => {
    if (!detail) return;
    setActivating(true);
    try {
      const res = await fetch('/api/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: detail.id, variables: { business_name: businessName } }),
      });
      const data = await res.json();
      if (data.success) {
        setActivated(true);
        setActivationResult(data.activated);
      }
    } catch { /* ignore */ }
    setActivating(false);
  };

  // ── Detail View ─────────────────────────────────────────────────────

  if (detail) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="text-gray-400 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to packages
        </Button>

        <div className="flex items-center gap-4">
          <span className="text-5xl">{detail.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold text-white">{detail.name}</h1>
            <p className="text-gray-400">{detail.tagline}</p>
          </div>
        </div>

        {activated && activationResult && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <p className="text-green-400 font-semibold">Package Activated!</p>
            </div>
            <p className="text-green-300 text-sm">
              ✅ {activationResult.agentsEnabled} AI agents enabled · ✅ {activationResult.autopilotActions} autopilot actions configured · ✅ Smart routing on
            </p>
            <p className="text-green-300 text-sm mt-1">Follow the setup steps below to finish configuration.</p>
          </div>
        )}

        <p className="text-gray-300">{detail.description}</p>

        {/* What's included */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">What&apos;s Included</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detail.features.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                <span className="text-gray-300 text-sm">{f}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Agents + Channels */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">AI Agents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {detail.enabledAgents.map(a => (
                <div key={a} className="flex items-center gap-2 text-sm text-gray-300">
                  {AGENT_NAMES[a] ?? a}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">Recommended Channels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {detail.recommendedChannels.map(c => (
                <div key={c} className="flex items-center gap-2 text-sm text-gray-300">
                  {CHANNEL_NAMES[c] ?? c}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Setup Steps */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Setup Checklist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.setupSteps.map((s) => (
              <div key={s.step} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {s.step}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium">{s.title}</p>
                    <Badge variant="outline" className="border-gray-700 text-gray-500 text-xs">{s.estimated}</Badge>
                  </div>
                  <p className="text-gray-500 text-sm">{s.description}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 shrink-0"
                  onClick={() => window.location.href = s.actionHref}
                >
                  {s.actionLabel} <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activate button */}
        {!activated && (
          <Button
            onClick={activate}
            disabled={activating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
          >
            {activating ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Activating package...</>
            ) : (
              <><Sparkles className="w-5 h-5 mr-2" /> Activate {detail.name}</>
            )}
          </Button>
        )}
      </div>
    );
  }

  // ── Grid View ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Package className="w-6 h-6" /> Service Packages
        </h1>
        <p className="text-gray-400 mt-1">
          Pre-built AI configurations for home service businesses. One click to activate everything — template, agents, autopilot, channels.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
          Loading packages...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map(pkg => (
            <button
              key={pkg.id}
              onClick={() => setSelectedId(pkg.id)}
              className="text-left bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-all hover:scale-[1.01]"
            >
              <span className="text-4xl block mb-3">{pkg.emoji}</span>
              <h3 className="font-bold text-white text-lg">{pkg.name}</h3>
              <p className="text-blue-400 text-sm font-medium">{pkg.tagline}</p>
              <p className="text-gray-500 text-sm mt-2 line-clamp-2">{pkg.description}</p>
              <div className="flex gap-2 mt-3">
                <Badge variant="outline" className="border-gray-700 text-gray-500 text-xs">{pkg.featureCount} features</Badge>
                <Badge variant="outline" className="border-gray-700 text-gray-500 text-xs">{pkg.stepCount} steps</Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
