'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Clock, BarChart3, LogOut, Calendar, Check, X, Loader2 } from 'lucide-react';
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

        {/* Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Usage
            </CardTitle>
            <CardDescription>Your activity this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-center">
                <p className="text-2xl font-bold text-zinc-100">-</p>
                <p className="text-xs text-zinc-500">Messages</p>
              </div>
              <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-center">
                <p className="text-2xl font-bold text-zinc-100">-</p>
                <p className="text-xs text-zinc-500">Memories</p>
              </div>
              <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-center">
                <p className="text-2xl font-bold text-zinc-100">Free</p>
                <p className="text-xs text-zinc-500">Plan</p>
              </div>
            </div>
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
