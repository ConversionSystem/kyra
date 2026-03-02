'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  Radio,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Channel Definitions ───────────────────────────────────────────────────────

interface ChannelDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  tokenField: string;
  tokenLabel: string;
  tokenPlaceholder: string;
  steps: Array<{ text: string; link?: string; linkText?: string }>;
  tip: string;
  pairingSteps?: Array<{ text: string; link?: string; linkText?: string }>;
  pairingTip?: string;
  pairingPlaceholder?: string;
}

const CHANNELS: ChannelDef[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    color: 'text-blue-600',
    description: 'Chat with your AI assistant via Telegram.',
    tokenField: 'botToken',
    tokenLabel: 'Bot Token',
    tokenPlaceholder: '123456:ABC-DEF...',
    steps: [
      { text: 'Open @BotFather on Telegram', link: 'https://t.me/BotFather', linkText: 'Open @BotFather' },
      { text: 'Send /newbot, follow prompts, and copy the token' },
      { text: 'Paste your bot token below' },
    ],
    tip: "You can paste the entire BotFather message — we'll extract the token automatically.",
    pairingSteps: [
      { text: 'Open your bot on Telegram and send any message' },
      { text: 'The bot will reply with an 8-character pairing code' },
      { text: 'Enter your pairing code below' },
    ],
    pairingTip: "You can paste the entire bot message — we'll extract the code automatically.",
    pairingPlaceholder: 'E.G. AB2CD3EF',
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: '🎮',
    color: 'text-indigo-600',
    description: 'Add your AI assistant to Discord servers.',
    tokenField: 'token',
    tokenLabel: 'Bot Token',
    tokenPlaceholder: 'MTIz...abc',
    steps: [
      { text: 'Go to Discord Developer Portal', link: 'https://discord.com/developers/applications', linkText: 'Open Developer Portal' },
      { text: 'Create New Application → Bot → Copy Token' },
      { text: 'Enable Message Content Intent under Bot → Privileged Intents' },
      { text: 'Paste your bot token below' },
    ],
    tip: 'Make sure to enable the "Message Content" privileged intent in the Discord Developer Portal.',
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: '💼',
    color: 'text-green-600',
    description: 'Connect your AI assistant to Slack workspaces.',
    tokenField: 'botToken',
    tokenLabel: 'Bot Token',
    tokenPlaceholder: 'xoxb-...',
    steps: [
      { text: 'Go to Slack API', link: 'https://api.slack.com/apps', linkText: 'Open Slack API' },
      { text: 'Create New App → From Scratch → name it → select workspace' },
      { text: 'Under OAuth & Permissions, add Bot Token Scopes: chat:write, channels:history, channels:read, im:history, im:read, im:write' },
      { text: 'Install to Workspace → Copy Bot User OAuth Token' },
      { text: 'Paste your bot token below' },
    ],
    tip: 'You also need a Socket Mode App Token (xapp-...) for real-time events.',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '📱',
    color: 'text-emerald-600',
    description: 'Connect your AI to WhatsApp via QR code pairing.',
    tokenField: '_whatsapp',
    tokenLabel: 'Setup',
    tokenPlaceholder: '',
    steps: [
      { text: 'WhatsApp connects via QR code pairing — no token needed' },
      { text: 'Click Connect below to start the pairing process' },
      { text: 'Scan the QR code with your WhatsApp app' },
    ],
    tip: 'WhatsApp uses the Baileys library for web-based pairing. The QR code will appear in the gateway logs.',
  },
  {
    id: 'signal',
    name: 'Signal',
    icon: '🔒',
    color: 'text-blue-500',
    description: 'Secure messaging with your AI via Signal.',
    tokenField: '_signal',
    tokenLabel: 'Phone Number',
    tokenPlaceholder: '+1234567890',
    steps: [
      { text: 'Signal requires a dedicated phone number for the bot' },
      { text: 'Install signal-cli on the gateway host' },
      { text: 'Register or link the number, then enter it below' },
    ],
    tip: 'Signal is the most privacy-focused option. Requires signal-cli setup.',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ChannelsClient() {
  const [channelStatus, setChannelStatus] = useState<Record<string, { configured: boolean; hasToken: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [connectingChannel, setConnectingChannel] = useState<string | null>(null);
  const [tokenValues, setTokenValues] = useState<Record<string, string>>({});
  const [pairingValues, setPairingValues] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, { type: 'success' | 'error'; text: string }>>({});
  const [expandedChannel, setExpandedChannel] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/openclaw/channels');
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setChannelStatus(data.channels || {});
        } else {
          setChannelStatus({});
        }
      } else {
        setChannelStatus({});
      }
    } catch {
      setChannelStatus({});
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const connectChannel = async (channel: ChannelDef) => {
    const token = tokenValues[channel.id]?.trim();
    if (!token && !channel.tokenField.startsWith('_')) return;

    setConnectingChannel(channel.id);
    setMessages((prev) => ({ ...prev, [channel.id]: undefined as any }));

    try {
      let cleanToken = token;
      if (channel.id === 'telegram' && token.includes('Use this token')) {
        const match = token.match(/(\d+:[A-Za-z0-9_-]+)/);
        if (match) cleanToken = match[1];
      }

      const config: Record<string, unknown> = {};
      if (channel.id === 'whatsapp') {
        config.enabled = true;
      } else if (channel.id === 'signal') {
        config.phoneNumber = cleanToken;
      } else {
        config[channel.tokenField] = cleanToken;
      }

      const res = await fetch('/api/openclaw/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channel.id, config }),
      });
      const data = await res.json();

      if (data.ok) {
        setChannelStatus((prev) => ({ ...prev, [channel.id]: { configured: true, hasToken: true } }));
        setMessages((prev) => ({
          ...prev,
          [channel.id]: { type: 'success', text: `${channel.name} connected! Gateway restarting to apply changes... (this takes ~2 minutes)` },
        }));
        setTimeout(loadStatus, 10000);
        setTimeout(loadStatus, 60000);
        setTimeout(loadStatus, 150000);
      } else {
        setMessages((prev) => ({
          ...prev,
          [channel.id]: { type: 'error', text: data.error?.message || 'Connection failed' },
        }));
      }
    } catch (err) {
      setMessages((prev) => ({
        ...prev,
        [channel.id]: { type: 'error', text: String(err) },
      }));
    }
    setConnectingChannel(null);
  };

  const approvePairing = async (channel: ChannelDef) => {
    const code = pairingValues[channel.id]?.trim();
    if (!code) return;

    setConnectingChannel(channel.id + '-pair');

    try {
      let cleanCode = code.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();

      const res = await fetch('/api/openclaw/channels/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: channel.id, code: cleanCode }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = { ok: false, error: { message: `Server returned ${res.status}: ${res.statusText}` } };
      }

      if (data.ok) {
        setMessages((prev) => ({
          ...prev,
          [channel.id + '-pair']: { type: 'success', text: 'Pairing approved! You can now chat with your bot.' },
        }));
      } else {
        setMessages((prev) => ({
          ...prev,
          [channel.id + '-pair']: { type: 'error', text: data.error?.message || 'Pairing failed' },
        }));
      }
    } catch (err) {
      setMessages((prev) => ({
        ...prev,
        [channel.id + '-pair']: { type: 'error', text: String(err) },
      }));
    }
    setConnectingChannel(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Connect Channels</h1>
        <p className="text-sm text-gray-500 mt-1">
          Connect messaging platforms so your AI can chat with customers directly
        </p>
      </div>

      {/* Channel Cards */}
      <div className="space-y-4">
        {CHANNELS.map((channel) => {
          const status = channelStatus[channel.id];
          const isConnected = status?.configured && status?.hasToken;
          const isExpanded = expandedChannel === channel.id;
          const msg = messages[channel.id];
          const pairMsg = messages[channel.id + '-pair'];

          return (
            <Card key={channel.id}>
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpandedChannel(isExpanded ? null : channel.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{channel.icon}</span>
                    <div>
                      <CardTitle className={cn('text-lg', channel.color)}>{channel.name}</CardTitle>
                      <CardDescription>{channel.description}</CardDescription>
                    </div>
                  </div>
                  {isConnected && (
                    <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Connected
                    </div>
                  )}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 space-y-4">
                  {/* Setup Steps */}
                  <div className="space-y-2">
                    {channel.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 text-xs text-gray-500 font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700">
                          {step.link ? (
                            <>
                              <a href={step.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {step.linkText || step.text}
                                <ExternalLink className="inline h-3 w-3 ml-1" />
                              </a>
                              {step.text !== step.linkText && step.linkText && (
                                <span> — {step.text.replace(step.linkText, '').trim()}</span>
                              )}
                            </>
                          ) : (
                            step.text
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Tip */}
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {channel.tip}
                  </div>

                  {/* Token Input */}
                  {!channel.tokenField.startsWith('_') && (
                    <div className="flex gap-2">
                      <Input
                        placeholder={channel.tokenPlaceholder}
                        value={tokenValues[channel.id] || ''}
                        onChange={(e) => setTokenValues((prev) => ({ ...prev, [channel.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && connectChannel(channel)}
                        className="font-mono text-sm"
                      />
                      <Button
                        onClick={() => connectChannel(channel)}
                        disabled={connectingChannel === channel.id || !tokenValues[channel.id]?.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                      >
                        {connectingChannel === channel.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Connect'
                        )}
                      </Button>
                    </div>
                  )}

                  {/* WhatsApp / special channels */}
                  {channel.tokenField.startsWith('_') && channel.id !== 'signal' && (
                    <Button
                      onClick={() => connectChannel(channel)}
                      disabled={connectingChannel === channel.id}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {connectingChannel === channel.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Radio className="h-4 w-4 mr-2" />
                      )}
                      Connect {channel.name}
                    </Button>
                  )}

                  {/* Signal phone input */}
                  {channel.id === 'signal' && (
                    <div className="flex gap-2">
                      <Input
                        placeholder={channel.tokenPlaceholder}
                        value={tokenValues[channel.id] || ''}
                        onChange={(e) => setTokenValues((prev) => ({ ...prev, [channel.id]: e.target.value }))}
                        className="font-mono text-sm"
                      />
                      <Button
                        onClick={() => connectChannel(channel)}
                        disabled={connectingChannel === channel.id || !tokenValues[channel.id]?.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                      >
                        Connect
                      </Button>
                    </div>
                  )}

                  {/* Connection message */}
                  {msg && (
                    <p className={cn('text-sm font-medium', msg.type === 'success' ? 'text-emerald-600' : 'text-red-600')}>
                      {msg.text}
                    </p>
                  )}

                  {/* Pairing section (after connection) */}
                  {isConnected && channel.pairingSteps && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                      <h3 className="text-base font-semibold text-gray-900">Pair Your {channel.name} Account</h3>

                      {channel.pairingSteps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-xs text-gray-500 font-bold shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-sm text-gray-700">{step.text}</span>
                        </div>
                      ))}

                      {channel.pairingTip && (
                        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          {channel.pairingTip}
                        </div>
                      )}

                      {!pairMsg?.type && (
                        <div className="flex gap-2">
                          <Input
                            placeholder={channel.pairingPlaceholder || 'Pairing code...'}
                            value={pairingValues[channel.id] || ''}
                            onChange={(e) => setPairingValues((prev) => ({ ...prev, [channel.id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && approvePairing(channel)}
                            className="font-mono text-sm uppercase"
                          />
                          <Button
                            onClick={() => approvePairing(channel)}
                            disabled={connectingChannel === channel.id + '-pair' || !pairingValues[channel.id]?.trim()}
                            className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                          >
                            {connectingChannel === channel.id + '-pair' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Approve'
                            )}
                          </Button>
                        </div>
                      )}

                      {pairMsg && (
                        <p className={cn('text-sm font-medium', pairMsg.type === 'success' ? 'text-emerald-600' : 'text-red-600')}>
                          {pairMsg.text}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center py-4 border-t border-gray-200">
        <p className="text-gray-400 text-xs">
          Powered by OpenClaw — channels connect directly to your AI engine
        </p>
      </div>
    </div>
  );
}
