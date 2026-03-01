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

  // Test review
  const [testName, setTestName] = useState('');
  const [testService, setTestService] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Load stats
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

  // Save settings
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

  // Test review request
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Reviews & Reputation</h1>
        <p className="text-gray-400 mt-1">
          Automatically collect 5-star reviews and catch negative feedback before it goes public.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Requests Sent', value: stats?.totalSent ?? 0, icon: Send, color: 'text-blue-400' },
          { label: 'Response Rate', value: `${stats?.responseRate ?? 0}%`, icon: MessageSquare, color: 'text-green-400' },
          { label: 'Avg Rating', value: stats?.avgRating ? `${stats.avgRating} ⭐` : '—', icon: Star, color: 'text-yellow-400' },
          { label: 'Reviews Clicked', value: stats?.reviewClickCount ?? 0, icon: TrendingUp, color: 'text-purple-400' },
        ].map((s, i) => (
          <Card key={i} className="bg-gray-900 border-gray-800">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
              <div className="text-xl font-bold text-white">{loadingStats ? '...' : s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* How it works */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            {[
              { step: '1', emoji: '💬', title: 'AI Asks', desc: '"How was your experience?" after service' },
              { step: '2', emoji: '⭐', title: 'Customer Rates', desc: 'Replies with 1-5 or a comment' },
              { step: '3a', emoji: '🎉', title: 'If Positive', desc: 'Sends direct Google/Yelp review link' },
              { step: '3b', emoji: '🚨', title: 'If Negative', desc: 'Alerts you BEFORE they post publicly' },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="font-semibold text-white text-sm">{s.title}</div>
                <div className="text-gray-500 text-xs mt-1">{s.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Review Links</CardTitle>
          <CardDescription>Where should happy customers leave reviews?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Google Review URL</label>
            <Input
              placeholder="https://g.page/r/your-business/review"
              value={googleUrl}
              onChange={(e) => setGoogleUrl(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
            <p className="text-xs text-gray-600 mt-1">
              Find yours: Google your business → click &quot;Write a review&quot; → copy the URL
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Yelp Business URL</label>
            <Input
              placeholder="https://yelp.com/biz/your-business"
              value={yelpUrl}
              onChange={(e) => setYelpUrl(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Facebook Reviews URL</label>
            <Input
              placeholder="https://facebook.com/your-business/reviews"
              value={facebookUrl}
              onChange={(e) => setFacebookUrl(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">
              Your Phone (for negative feedback alerts)
            </label>
            <Input
              placeholder="+1 555-123-4567"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 mr-1 text-green-400" /> : <Save className="w-4 h-4 mr-1" />}
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
        </CardContent>
      </Card>

      {/* Test */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Test Review Request</CardTitle>
          <CardDescription>Preview what your customers will receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Customer Name</label>
              <Input
                placeholder="Sarah Johnson"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Service (optional)</label>
              <Input
                placeholder="Teeth cleaning"
                value={testService}
                onChange={(e) => setTestService(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
          <Button onClick={handleTestReview} disabled={sending || !testName} variant="outline" className="border-gray-700 text-gray-300">
            {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            Preview Message
          </Button>
          {testResult && (
            <div className="bg-gray-800 rounded-lg p-4 mt-3">
              <p className="text-xs text-gray-500 mb-2">Message that would be sent:</p>
              <p className="text-white whitespace-pre-line text-sm">{testResult}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
