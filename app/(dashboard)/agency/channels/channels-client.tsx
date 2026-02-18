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
    color: 'text-blue-400',
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
    color: 'text-indigo-400',
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
    color: 'text-green-400',
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
    color: 'text-emerald-400',
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
    color: 'text-blue-300',
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

  // Load channel status — with localStorage cache so status persists across refreshes during gateway restart
  const loadStatus = useCallback(async () => {
    // Load cached status first
    try {
      const cached = localStorage.getItem('kyra-channel-status');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          setChannelStatus(parsed);
        }
      }
    } catch { /* ignore */ }

    try {
      const res = await fetch('/api/openclaw/channels');
      const data = await res.json();
      if (data.ok) {
        setChannelStatus(data.channels || {});
        // Cache to localStorage
        localStorage.setItem('kyra-channel-status', JSON.stringify(data.channels || {}));
      }
      // If not ok (gateway restarting), keep cached status — don't clear
    } catch { /* ignore — keep cached status */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const connectChannel = async (channel: ChannelDef) => {
    const token = tokenValues[channel.id]?.trim();
    if (!token && !channel.tokenField.startsWith('_')) return;

    setConnectingChannel(channel.id);
    setMessages((prev) => ({ ...prev, [channel.id]: undefined as any }));

    try {
      // Extract token from BotFather message if pasted
      let cleanToken = token;
      if (channel.id === 'telegram' && token.includes('Use this token')) {
        const match = token.match(/(\d+:[A-Za-z0-9_-]+)/);
        if (match) cleanToken = match[1];
      }

      const config: Record<string, unknown> = {};
      if (channel.id === 'whatsapp') {
        // WhatsApp needs special setup
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
        // Immediately mark as connected in local state + cache
        const newStatus = { ...channelStatus, [channel.id]: { configured: true, hasToken: true } };
        setChannelStatus(newStatus);
        localStorage.setItem('kyra-channel-status', JSON.stringify(newStatus));

        setMessages((prev) => ({
          ...prev,
          [channel.id]: { type: 'success', text: `${channel.name} connected! Gateway restarting to apply changes... (this takes ~2 minutes)` },
        }));
        // Refresh status after gateway restart (~150s for full reboot)
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
      // Extract code from bot message if pasted
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Connect Channels</h1>
        <p className="text-gray-400 text-sm mt-1">
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
            <Card key={channel.id} className="bg-gray-900 border-gray-800">
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
                    <div className="flex items-center gap-1.5 text-green-400 text-sm font-medium">
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
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-800 text-xs text-gray-400 font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-300">
                          {step.link ? (
                            <>
                              <a href={step.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
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
                  <div className="flex items-start gap-2 text-xs text-amber-400/80 bg-amber-950/20 rounded-lg px-3 py-2">
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
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 text-sm font-mono"
                      />
                      <Button
                        onClick={() => connectChannel(channel)}
                        disabled={connectingChannel === channel.id || !tokenValues[channel.id]?.trim()}
                        className="bg-blue-600 hover:bg-blue-700 shrink-0"
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
                      className="bg-blue-600 hover:bg-blue-700"
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
                        className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 text-sm font-mono"
                      />
                      <Button
                        onClick={() => connectChannel(channel)}
                        disabled={connectingChannel === channel.id || !tokenValues[channel.id]?.trim()}
                        className="bg-blue-600 hover:bg-blue-700 shrink-0"
                      >
                        Connect
                      </Button>
                    </div>
                  )}

                  {/* Connection message */}
                  {msg && (
                    <p className={cn('text-sm font-medium', msg.type === 'success' ? 'text-green-400' : 'text-red-400')}>
                      {msg.text}
                    </p>
                  )}

                  {/* Pairing section (after connection) */}
                  {isConnected && channel.pairingSteps && (
                    <Card className="bg-gray-800/50 border-gray-700">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base text-white">Pair Your {channel.name} Account</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {channel.pairingSteps.map((step, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-700 text-xs text-gray-400 font-bold shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-sm text-gray-300">{step.text}</span>
                          </div>
                        ))}

                        {channel.pairingTip && (
                          <div className="flex items-start gap-2 text-xs text-amber-400/80 bg-amber-950/20 rounded-lg px-3 py-2">
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
                              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 text-sm font-mono uppercase"
                            />
                            <Button
                              onClick={() => approvePairing(channel)}
                              disabled={connectingChannel === channel.id + '-pair' || !pairingValues[channel.id]?.trim()}
                              className="bg-blue-600 hover:bg-blue-700 shrink-0"
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
                          <p className={cn('text-sm font-medium', pairMsg.type === 'success' ? 'text-green-400' : 'text-red-400')}>
                            {pairMsg.text}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center py-4 border-t border-gray-800">
        <p className="text-gray-500 text-xs">
          Powered by OpenClaw — channels connect directly to your AI engine
        </p>
      </div>
    </div>
  );
}
