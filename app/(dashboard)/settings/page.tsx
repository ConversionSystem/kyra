'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, User, Clock, BarChart3, LogOut, Calendar, Check, X, Loader2, MessageCircle, ChevronRight, Puzzle, Zap, Cpu, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { INSTRUCTION_PRESETS } from '@/lib/instructions/presets';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
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
  // const [isUpgrading, setIsUpgrading] = useState<string | null>(null); // Hidden during beta
  const [preferredModel, setPreferredModel] = useState('auto');
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [instructionsKnowledge, setInstructionsKnowledge] = useState('');
  const [instructionsStyle, setInstructionsStyle] = useState('');
  const [isSavingInstructions, setIsSavingInstructions] = useState(false);
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

      // Fetch model preference
      try {
        const modelRes = await fetch('/api/settings/model');
        if (modelRes.ok) {
          const modelData = await modelRes.json();
          setPreferredModel(modelData.preferred_model || 'auto');
        }
      } catch (e) {
        console.error('Failed to fetch model preference:', e);
      }

      // Fetch custom instructions
      try {
        const instrRes = await fetch('/api/settings/instructions');
        if (instrRes.ok) {
          const instrData = await instrRes.json();
          setInstructionsKnowledge(instrData.knowledge || '');
          setInstructionsStyle(instrData.style || '');
        }
      } catch (e) {
        console.error('Failed to fetch custom instructions:', e);
      }

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4">
          <Link href="/chat">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {message && (
          <div
            className={`rounded-md px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-600'
                : 'bg-red-50 text-red-600'
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
              <label className="text-sm font-medium text-gray-700">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                value={email}
                disabled
                className="opacity-60"
              />
              <p className="text-xs text-gray-400">Email cannot be changed</p>
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
              <label className="text-sm font-medium text-gray-700">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900"
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

        {/* Model Preference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Model Preference
            </CardTitle>
            <CardDescription>Choose which AI model powers your conversations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Model</label>
              <select
                value={preferredModel}
                onChange={async (e) => {
                  const value = e.target.value;
                  setPreferredModel(value);
                  setIsSavingModel(true);
                  setMessage(null);
                  try {
                    const res = await fetch('/api/settings/model', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ preferred_model: value }),
                    });
                    if (res.ok) {
                      setMessage({ type: 'success', text: 'Model preference saved!' });
                    } else {
                      setMessage({ type: 'error', text: 'Failed to save model preference' });
                    }
                  } catch {
                    setMessage({ type: 'error', text: 'Failed to save model preference' });
                  }
                  setIsSavingModel(false);
                }}
                className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900"
              >
                <option value="auto">Auto (Smart Routing)</option>
                <option value="claude-sonnet-4">Claude Sonnet 4</option>
                <option value="claude-haiku">Claude Haiku</option>
                <option value="gpt-4o" disabled>GPT-4o (Coming Soon)</option>
              </select>
            </div>
            <div className="space-y-2 text-xs text-gray-400">
              {preferredModel === 'auto' && (
                <p>Automatically picks the best model for each message — fast for simple queries, powerful for complex ones. Best balance of speed and cost.</p>
              )}
              {preferredModel === 'claude-sonnet-4' && (
                <p>Always uses Claude Sonnet 4 — great balance of quality and speed. Ideal for most tasks.</p>
              )}
              {preferredModel === 'claude-haiku' && (
                <p>Always uses Claude Haiku — fastest responses at lowest cost. Best for quick questions and simple tasks.</p>
              )}
              {preferredModel === 'gpt-4o' && (
                <p>OpenAI GPT-4o — requires bringing your own API key. Coming soon.</p>
              )}
            </div>
            {isSavingModel && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </div>
            )}
          </CardContent>
        </Card>

        {/* Custom Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Custom Instructions
            </CardTitle>
            <CardDescription>Tell Kyra about yourself and how you'd like it to respond</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">What should Kyra know about you?</label>
              <Textarea
                value={instructionsKnowledge}
                onChange={(e) => setInstructionsKnowledge(e.target.value)}
                placeholder="e.g. I'm a software engineer based in NYC. I work on React and Node.js projects..."
                rows={4}
                maxLength={2000}
                className="bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-400 text-right">{instructionsKnowledge.length}/2000</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">How should Kyra respond?</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {INSTRUCTION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setInstructionsStyle(preset.content)}
                    className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <Textarea
                value={instructionsStyle}
                onChange={(e) => setInstructionsStyle(e.target.value)}
                placeholder="e.g. Be concise and use bullet points. Include code examples when relevant..."
                rows={4}
                maxLength={2000}
                className="bg-gray-100 border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-400 text-right">{instructionsStyle.length}/2000</p>
            </div>

            <Button
              onClick={async () => {
                setIsSavingInstructions(true);
                setMessage(null);
                try {
                  const res = await fetch('/api/settings/instructions', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      knowledge: instructionsKnowledge,
                      style: instructionsStyle,
                    }),
                  });
                  if (res.ok) {
                    setMessage({ type: 'success', text: 'Custom instructions saved!' });
                  } else {
                    const data = await res.json();
                    setMessage({ type: 'error', text: data.error || 'Failed to save instructions' });
                  }
                } catch {
                  setMessage({ type: 'error', text: 'Failed to save instructions' });
                }
                setIsSavingInstructions(false);
              }}
              disabled={isSavingInstructions}
              className="w-full"
            >
              {isSavingInstructions ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Instructions'
              )}
            </Button>
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
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-100 p-4 hover:bg-gray-100 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">Manage Channels</p>
                  <p className="text-xs text-gray-400">Telegram, WhatsApp — connect your messaging apps</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Puzzle className="h-5 w-5" />
              Skills
            </CardTitle>
            <CardDescription>Enable tools and integrations for your AI</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings/skills">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-100 p-4 hover:bg-gray-100 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">Manage Skills</p>
                  <p className="text-xs text-gray-400">Web search, GitHub, browser control, voice, and more</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Automations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Automations
            </CardTitle>
            <CardDescription>Scheduled tasks your AI runs automatically</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/automations">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-100 p-4 hover:bg-gray-100 transition-colors cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">Manage Automations</p>
                  <p className="text-xs text-gray-400">Daily briefings, email digests, reminders, and more</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
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
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Google Calendar</p>
                  <p className="text-xs text-gray-400">
                    {googleConnected ? 'Connected' : 'View and create events'}
                  </p>
                </div>
              </div>
              {googleConnected ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-sm text-green-600">
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
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div className="rounded-lg border border-gray-200 bg-gray-100 p-3 md:p-4 text-center">
                <p className="text-xl md:text-2xl font-bold text-gray-900">{usage?.messageCount ?? '-'}</p>
                <p className="text-xs text-gray-400">Messages</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-100 p-3 md:p-4 text-center">
                <p className="text-xl md:text-2xl font-bold text-gray-900">{usage?.memoryCount ?? '-'}</p>
                <p className="text-xs text-gray-400">Memories</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-gray-100 p-3 md:p-4 text-center">
                <p className="text-xl md:text-2xl font-bold text-indigo-600 capitalize">{usage?.planName ?? 'Free'}</p>
                <p className="text-xs text-gray-400">Plan</p>
              </div>
            </div>

            {/* Credits bar */}
            {usage && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Credits used</span>
                  <span className="text-gray-700">{usage.creditsUsed} / {usage.creditsLimit}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      usage.usagePercentage > 90 ? 'bg-red-500' :
                      usage.usagePercentage > 70 ? 'bg-yellow-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.min(100, usage.usagePercentage)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">{usage.creditsRemaining} credits remaining</p>
              </div>
            )}

            {/* Beta notice */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-xs font-semibold uppercase">Beta</span>
                <p className="font-medium text-amber-900">Free during beta</p>
              </div>
              <p className="text-sm text-amber-700">
                Full platform access while we&apos;re in beta. Bring your own API keys — you only pay your AI provider directly.
              </p>
              <Link href="/agency/api-keys">
                <Button variant="outline" size="sm" className="mt-3">
                  Manage API Keys
                </Button>
              </Link>
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
