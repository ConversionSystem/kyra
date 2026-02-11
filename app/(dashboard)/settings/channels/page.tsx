'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, MessageCircle, Phone, Check, X, Loader2, Copy, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface ChannelStatus {
  id?: string;
  status: string;
  verified: boolean;
  connectedAt?: string;
  lastMessageAt?: string;
  metadata?: Record<string, any>;
}

export default function ChannelsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [channels, setChannels] = useState<Record<string, ChannelStatus>>({});
  const [telegramToken, setTelegramToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/channels/status');
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels);
      }
    } catch (e) {
      console.error('Failed to fetch channel status:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      fetchStatus();
    }
    init();
  }, [router, supabase, fetchStatus]);

  const generateTelegramToken = async () => {
    setIsGenerating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/channels/telegram/connect', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setTelegramToken(data.token);
        setTokenExpiry(data.expiresAt);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to generate token' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to generate token' });
    }
    setIsGenerating(false);
  };

  const disconnectChannel = async (channelType: string) => {
    if (!confirm(`Disconnect ${channelType}?`)) return;
    setIsDisconnecting(channelType);
    try {
      const endpoint = channelType === 'telegram'
        ? '/api/channels/telegram/connect'
        : `/api/channels/${channelType}/connect`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        setMessage({ type: 'success', text: `${channelType} disconnected` });
        setTelegramToken(null);
        fetchStatus();
      } else {
        setMessage({ type: 'error', text: 'Failed to disconnect' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to disconnect' });
    }
    setIsDisconnecting(null);
  };

  const copyToken = () => {
    if (telegramToken) {
      navigator.clipboard.writeText(`/connect ${telegramToken}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const telegram = channels.telegram || { status: 'disconnected', verified: false };
  const whatsapp = channels.whatsapp || { status: 'disconnected', verified: false };

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-zinc-100">Channels</h1>
            <p className="text-sm text-zinc-500">Connect Kyra to your messaging apps</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {message && (
          <div className={`rounded-md px-4 py-3 text-sm ${
            message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Telegram */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <MessageCircle className="h-5 w-5 text-blue-400" />
              </div>
              Telegram
              <StatusBadge status={telegram.status} />
            </CardTitle>
            <CardDescription>
              Chat with Kyra directly in Telegram
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {telegram.status === 'connected' && telegram.verified ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-2">
                  {telegram.metadata?.username && (
                    <p className="text-sm text-zinc-300">
                      Connected as <span className="font-medium text-zinc-100">@{telegram.metadata.username}</span>
                    </p>
                  )}
                  {telegram.connectedAt && (
                    <p className="text-xs text-zinc-500">Connected {formatDate(telegram.connectedAt)}</p>
                  )}
                  {telegram.lastMessageAt && (
                    <p className="text-xs text-zinc-500">Last message {formatDate(telegram.lastMessageAt)}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => disconnectChannel('telegram')}
                  disabled={isDisconnecting === 'telegram'}
                >
                  {isDisconnecting === 'telegram' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
                  <p className="text-sm text-zinc-300 mb-3">To connect Telegram:</p>
                  <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
                    <li>Generate a connection token below</li>
                    <li>Open <a href="https://t.me/KyraAIBot" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">@KyraAIBot</a> on Telegram</li>
                    <li>Send the connect command to the bot</li>
                  </ol>
                </div>

                {telegramToken ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4">
                      <p className="text-xs text-zinc-500 mb-2">Send this to @KyraAIBot:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 rounded bg-zinc-800 px-3 py-2 text-sm font-mono text-violet-300">
                          /connect {telegramToken}
                        </code>
                        <Button variant="ghost" size="icon" onClick={copyToken}>
                          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      {tokenExpiry && (
                        <p className="text-xs text-zinc-500 mt-2">
                          Expires {formatDate(tokenExpiry)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={generateTelegramToken}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        New Token
                      </Button>
                      <Button variant="outline" size="sm" onClick={fetchStatus}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Check Status
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={generateTelegramToken} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Generate Connection Token
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="rounded-lg bg-green-500/10 p-2">
                <Phone className="h-5 w-5 text-green-400" />
              </div>
              WhatsApp
              <StatusBadge status={whatsapp.status} />
            </CardTitle>
            <CardDescription>
              Chat with Kyra on WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {whatsapp.status === 'connected' && whatsapp.verified ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-2">
                  {whatsapp.metadata?.phoneNumber && (
                    <p className="text-sm text-zinc-300">
                      Connected: <span className="font-medium text-zinc-100">{whatsapp.metadata.phoneNumber}</span>
                    </p>
                  )}
                  {whatsapp.connectedAt && (
                    <p className="text-xs text-zinc-500">Connected {formatDate(whatsapp.connectedAt)}</p>
                  )}
                  {whatsapp.lastMessageAt && (
                    <p className="text-xs text-zinc-500">Last message {formatDate(whatsapp.lastMessageAt)}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => disconnectChannel('whatsapp')}
                  disabled={isDisconnecting === 'whatsapp'}
                >
                  {isDisconnecting === 'whatsapp' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <X className="h-4 w-4 mr-2" />}
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
                <p className="text-sm text-zinc-300 mb-3">WhatsApp integration coming soon!</p>
                <p className="text-xs text-zinc-500">
                  WhatsApp Business API connection will be available once configured. 
                  You&apos;ll be able to message Kyra directly from WhatsApp.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'connected') {
    return (
      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
        Connected
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
        Pending
      </span>
    );
  }
  return (
    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-zinc-500/10 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
      Disconnected
    </span>
  );
}
