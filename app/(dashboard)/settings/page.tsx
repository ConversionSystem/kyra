'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Clock, BarChart3, LogOut, Calendar, Check, X, Loader2, MessageCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [usage, setUsage] = useState<any>(null);
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      // Get user profile from users table
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setUser(user);
      setEmail(user.email || '');
      setName(profile?.name || user.user_metadata?.name || '');
      setTimezone(profile?.timezone || 'UTC');
      
      // Check Google Calendar connection
      const { data: googleIntegration } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .single();
      
      setGoogleConnected(!!googleIntegration);
      setIsLoading(false);
      
      // Fetch usage data
      try {
        const usageRes = await fetch('/api/usage');
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          setUsage(usageData);
        }
      } catch (e) {
        console.error('Failed to fetch usage:', e);
      }

      // Check for OAuth callback messages
      const success = searchParams.get('success');
      const error = searchParams.get('error');
      
      if (success === 'google_connected') {
        setMessage({ type: 'success', text: 'Google Calendar connected successfully!' });
        setGoogleConnected(true);
      } else if (error === 'google_auth_failed') {
        setMessage({ type: 'error', text: 'Failed to connect Google Calendar. Please try again.' });
      }
    }
    
    loadUser();
  }, [router, supabase, searchParams]);

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('users')
      .update({ name, timezone, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    
    if (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } else {
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    }
    
    setIsSaving(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4">
          <Link href="/chat">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold text-zinc-100">Settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {message && (
          <div
            className={`rounded-md px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-500/10 text-green-400'
                : 'bg-red-500/10 text-red-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Manage your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Email</label>
              <Input
                value={email}
                disabled
                className="opacity-60"
              />
              <p className="text-xs text-zinc-500">Email cannot be changed</p>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Preferences
            </CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Europe/Bratislava">Bratislava</option>
                <option value="Asia/Tokyo">Tokyo</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Channels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Channels
            </CardTitle>
            <CardDescription>Connect Kyra to Telegram, WhatsApp, and more</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings/channels">
              <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 hover:bg-zinc-800 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-zinc-100">Manage Channels</p>
                  <p className="text-xs text-zinc-500">Telegram, WhatsApp — connect your messaging apps</p>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-500" />
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Integrations
            </CardTitle>
            <CardDescription>Connect external services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-100">Google Calendar</p>
                  <p className="text-xs text-zinc-500">
                    {googleConnected ? 'Connected' : 'View and create events'}
                  </p>
                </div>
              </div>
              {googleConnected ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-sm text-green-400">
                    <Check className="h-4 w-4" />
                    Connected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (confirm('Disconnect Google Calendar?')) {
                        await fetch('/api/calendar', { method: 'DELETE' });
                        setGoogleConnected(false);
                        setMessage({ type: 'success', text: 'Google Calendar disconnected' });
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsConnectingGoogle(true);
                    window.location.href = '/api/auth/google';
                  }}
                  disabled={isConnectingGoogle}
                >
                  {isConnectingGoogle ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Connect'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Usage & Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Usage & Plan
            </CardTitle>
            <CardDescription>Your current plan and credit usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-center">
                <p className="text-2xl font-bold text-zinc-100">{usage?.messageCount ?? '-'}</p>
                <p className="text-xs text-zinc-500">Messages</p>
              </div>
              <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-center">
                <p className="text-2xl font-bold text-zinc-100">{usage?.memoryCount ?? '-'}</p>
                <p className="text-xs text-zinc-500">Memories</p>
              </div>
              <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-center">
                <p className="text-2xl font-bold text-violet-400 capitalize">{usage?.planName ?? 'Free'}</p>
                <p className="text-xs text-zinc-500">Plan</p>
              </div>
            </div>

            {/* Credits bar */}
            {usage && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Credits used</span>
                  <span className="text-zinc-300">{usage.creditsUsed} / {usage.creditsLimit}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      usage.usagePercentage > 90 ? 'bg-red-500' :
                      usage.usagePercentage > 70 ? 'bg-yellow-500' : 'bg-violet-500'
                    }`}
                    style={{ width: `${Math.min(100, usage.usagePercentage)}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500">{usage.creditsRemaining} credits remaining</p>
              </div>
            )}

            {/* Upgrade options */}
            {(!usage || usage.plan === 'free' || usage.plan === 'starter') && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-300">Upgrade your plan</p>
                <div className="grid gap-3">
                  {usage?.plan !== 'starter' && (
                    <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
                      <div>
                        <p className="font-medium text-zinc-100">Starter — $20/mo</p>
                        <p className="text-xs text-zinc-500">500 credits · WhatsApp + Telegram · Web search</p>
                      </div>
                      <Button
                        size="sm"
                        disabled={isUpgrading !== null}
                        onClick={async () => {
                          setIsUpgrading('starter');
                          try {
                            const res = await fetch('/api/billing/checkout', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ plan: 'starter' }),
                            });
                            const data = await res.json();
                            if (data.url) window.location.href = data.url;
                            else setMessage({ type: 'error', text: data.error || 'Failed to start checkout' });
                          } catch { setMessage({ type: 'error', text: 'Failed to start checkout' }); }
                          setIsUpgrading(null);
                        }}
                      >
                        {isUpgrading === 'starter' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upgrade'}
                      </Button>
                    </div>
                  )}
                  {usage?.plan !== 'business' && (
                    <div className="flex items-center justify-between rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
                      <div>
                        <p className="font-medium text-zinc-100">Business — $100/mo</p>
                        <p className="text-xs text-zinc-500">3,000 credits · AI sub-agents · Priority support</p>
                      </div>
                      <Button
                        size="sm"
                        disabled={isUpgrading !== null}
                        onClick={async () => {
                          setIsUpgrading('business');
                          try {
                            const res = await fetch('/api/billing/checkout', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ plan: 'business' }),
                            });
                            const data = await res.json();
                            if (data.url) window.location.href = data.url;
                            else setMessage({ type: 'error', text: data.error || 'Failed to start checkout' });
                          } catch { setMessage({ type: 'error', text: 'Failed to start checkout' }); }
                          setIsUpgrading(null);
                        }}
                      >
                        {isUpgrading === 'business' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upgrade'}
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
                    <div>
                      <p className="font-medium text-zinc-100">Max — $200/mo</p>
                      <p className="text-xs text-zinc-500">8,000 credits · Unlimited memory · API access · SLA</p>
                    </div>
                    <Button
                      size="sm"
                      disabled={isUpgrading !== null}
                      onClick={async () => {
                        setIsUpgrading('max');
                        try {
                          const res = await fetch('/api/billing/checkout', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ plan: 'max' }),
                          });
                          const data = await res.json();
                          if (data.url) window.location.href = data.url;
                          else setMessage({ type: 'error', text: data.error || 'Failed to start checkout' });
                        } catch { setMessage({ type: 'error', text: 'Failed to start checkout' }); }
                        setIsUpgrading(null);
                      }}
                    >
                      {isUpgrading === 'max' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upgrade'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Manage subscription (for paid users) */}
            {usage?.hasSubscription && (
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/billing/portal', { method: 'POST' });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                  } catch {
                    setMessage({ type: 'error', text: 'Failed to open billing portal' });
                  }
                }}
              >
                Manage Subscription
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </main>
    </div>
  );
}
