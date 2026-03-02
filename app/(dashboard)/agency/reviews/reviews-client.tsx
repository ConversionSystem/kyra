'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Star, MessageSquare, TrendingUp, AlertTriangle, ExternalLink, Save, Loader2, CheckCircle2, Send } from 'lucide-react';

interface Props {
  agencyId: string;
  clientId: string | null;
  businessName: string;
  reviewConfig: Record<string, unknown>;
  isSolo: boolean;
}

interface ReviewStats {
  totalSent: number;
  totalResponded: number;
  positiveCount: number;
  negativeCount: number;
  avgRating: number;
  reviewClickCount: number;
  responseRate: number;
}

export function ReviewsClient({ agencyId, clientId, businessName, reviewConfig, isSolo }: Props) {
  const [googleUrl, setGoogleUrl] = useState((reviewConfig.google_url as string) ?? '');
  const [yelpUrl, setYelpUrl] = useState((reviewConfig.yelp_url as string) ?? '');
  const [facebookUrl, setFacebookUrl] = useState((reviewConfig.facebook_url as string) ?? '');
  const [ownerPhone, setOwnerPhone] = useState((reviewConfig.owner_phone as string) ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [testName, setTestName] = useState('');
  const [testService, setTestService] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const params = clientId ? `?clientId=${clientId}` : '';
      const res = await fetch(`/api/reviews${params}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch { /* ignore */ }
    setLoadingStats(false);
  }, [clientId]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/agency/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviews: {
            google_url: googleUrl || undefined,
            yelp_url: yelpUrl || undefined,
            facebook_url: facebookUrl || undefined,
            owner_phone: ownerPhone || undefined,
            enabled: true,
          },
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleTestReview = async () => {
    if (!testName) return;
    setSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientId ?? agencyId,
          contactId: `test-${Date.now()}`,
          contactName: testName,
          service: testService || undefined,
        }),
      });
      const data = await res.json();
      setTestResult(data.message);
    } catch (err) {
      setTestResult(`Error: ${(err as Error).message}`);
    }
    setSending(false);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reviews & Reputation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Automatically collect 5-star reviews and catch negative feedback before it goes public.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Requests Sent', value: stats?.totalSent ?? 0, icon: Send, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Response Rate', value: `${stats?.responseRate ?? 0}%`, icon: MessageSquare, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'Avg Rating', value: stats?.avgRating ? `${stats.avgRating} ⭐` : '—', icon: Star, bg: 'bg-yellow-50', color: 'text-yellow-600' },
          { label: 'Reviews Clicked', value: stats?.reviewClickCount ?? 0, icon: TrendingUp, bg: 'bg-purple-50', color: 'text-purple-600' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2.5">
                <div className={`rounded-lg ${s.bg} p-2`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-900">{loadingStats ? '...' : s.value}</p>
                  <p className="text-[11px] text-gray-400">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { emoji: '💬', title: 'AI Asks', desc: '"How was your experience?" after service' },
              { emoji: '⭐', title: 'Customer Rates', desc: 'Replies with 1-5 or a comment' },
              { emoji: '🎉', title: 'If Positive', desc: 'Sends direct Google/Yelp review link' },
              { emoji: '🚨', title: 'If Negative', desc: 'Alerts you BEFORE they post publicly' },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="font-semibold text-gray-900 text-sm">{s.title}</div>
                <div className="text-gray-500 text-xs mt-1">{s.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Review Links</CardTitle>
          <CardDescription>Where should happy customers leave reviews?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Google Review URL</label>
            <Input
              placeholder="https://g.page/r/your-business/review"
              value={googleUrl}
              onChange={(e) => setGoogleUrl(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Find yours: Google your business → click &quot;Write a review&quot; → copy the URL
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Yelp Business URL</label>
            <Input
              placeholder="https://yelp.com/biz/your-business"
              value={yelpUrl}
              onChange={(e) => setYelpUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Facebook Reviews URL</label>
            <Input
              placeholder="https://facebook.com/your-business/reviews"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Your Phone (for negative feedback alerts)
            </label>
            <Input
              placeholder="+1 555-123-4567"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" /> : <Save className="w-4 h-4 mr-1" />}
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Test */}
      <Card>
        <CardHeader>
          <CardTitle>Test Review Request</CardTitle>
          <CardDescription>Preview what your customers will receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Customer Name</label>
              <Input
                placeholder="Sarah Johnson"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Service (optional)</label>
              <Input
                placeholder="Teeth cleaning"
                value={testService}
                onChange={(e) => setTestService(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleTestReview} disabled={sending || !testName} variant="outline">
            {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            Preview Message
          </Button>
          {testResult && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-3">
              <p className="text-xs text-gray-500 mb-2">Message that would be sent:</p>
              <p className="text-gray-900 whitespace-pre-line text-sm">{testResult}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
