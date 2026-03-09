'use client';

import { useState, useEffect, useCallback } from 'react';
import { SectionNav } from '@/components/dashboard/section-nav';
import {
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  Loader2,
  Radio,
  X,
  Zap,
  Lock,
  Wifi,
  WifiOff,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface ChannelDef {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  description: string;
  color: string;           // tailwind bg gradient class
  textColor: string;       // tailwind text class for heading
  plan: 'lite' | 'pro' | 'scale' | 'all';
  status: 'available' | 'coming-soon';
  setupKind: 'token' | 'qr' | 'phone' | 'embed' | 'bridge';
  tokenField?: string;
  tokenLabel?: string;
  tokenPlaceholder?: string;
  steps: Array<{ text: string; link?: string; linkText?: string }>;
  tip: string;
  pairingSteps?: Array<{ text: string }>;
  pairingTip?: string;
  pairingPlaceholder?: string;
}

// ── Channel Definitions ───────────────────────────────────────────────────────

const CHANNELS: ChannelDef[] = [
  // ── Always Available ───────────────────────────────────────────────────────
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    tagline: 'Bot-based messaging',
    description: 'The fastest setup. Get your AI worker live on Telegram in under 5 minutes.',
    color: 'from-blue-500 to-blue-600',
    textColor: 'text-blue-600',
    plan: 'all',
    status: 'available',
    setupKind: 'token',
    tokenField: 'botToken',
    tokenLabel: 'Bot Token',
    tokenPlaceholder: '123456:ABC-DEF...',
    steps: [
      { text: 'Open @BotFather on Telegram', link: 'https://t.me/BotFather', linkText: 'Open @BotFather →' },
      { text: 'Send /newbot, follow the prompts, and copy the token' },
      { text: 'Paste your bot token below and click Connect' },
    ],
    tip: "You can paste the entire BotFather message — we'll extract the token automatically.",
    pairingSteps: [
      { text: 'Open your bot on Telegram and send any message' },
      { text: 'The bot will reply with an 8-character pairing code' },
      { text: 'Enter the pairing code below' },
    ],
    pairingTip: "You can paste the entire bot message — we'll extract the code automatically.",
    pairingPlaceholder: 'e.g. AB2CD3EF',
  },
  {
    id: 'webchat',
    name: 'Web Chat',
    icon: '🌐',
    tagline: 'Embed on any website',
    description: 'Drop a single script tag on your client\'s website. Their AI is live instantly.',
    color: 'from-violet-500 to-purple-600',
    textColor: 'text-violet-600',
    plan: 'all',
    status: 'available',
    setupKind: 'embed',
    steps: [
      { text: 'Copy the embed code below' },
      { text: 'Paste it before the closing </body> tag on the website' },
      { text: 'The chat widget appears automatically — no config needed' },
    ],
    tip: 'The widget uses your AI worker\'s persona and knowledge base automatically.',
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: '🎮',
    tagline: 'Community & team channels',
    description: 'Deploy your AI worker across Discord servers. Great for community businesses.',
    color: 'from-indigo-500 to-indigo-600',
    textColor: 'text-indigo-600',
    plan: 'all',
    status: 'available',
    setupKind: 'token',
    tokenField: 'token',
    tokenLabel: 'Bot Token',
    tokenPlaceholder: 'MTIz...abc',
    steps: [
      { text: 'Go to Discord Developer Portal', link: 'https://discord.com/developers/applications', linkText: 'Open Developer Portal →' },
      { text: 'Create New Application → Bot → Reset Token → Copy Token' },
      { text: 'Under Bot → Privileged Gateway Intents, enable Message Content Intent' },
      { text: 'Paste your bot token below' },
    ],
    tip: 'Invite the bot to servers using OAuth2 URL Generator with bot + applications.commands scopes.',
  },

  // ── Pro+ ──────────────────────────────────────────────────────────────────
  {
    id: 'whatsapp-business',
    name: 'WhatsApp Business',
    icon: '💬',
    tagline: 'Meta Cloud API',
    description: 'Official Meta Business API. No QR scanning — a dedicated business number.',
    color: 'from-green-500 to-emerald-600',
    textColor: 'text-green-600',
    plan: 'pro',
    status: 'available',
    setupKind: 'token',
    tokenField: 'phoneNumberId',
    tokenLabel: 'Phone Number ID',
    tokenPlaceholder: '1234567890',
    steps: [
      { text: 'Create a Meta Business account', link: 'https://developers.facebook.com', linkText: 'Open Meta for Developers →' },
      { text: 'Create an App → Add WhatsApp product → Set up WhatsApp Business API' },
      { text: 'Copy your Phone Number ID and Permanent Access Token' },
      { text: 'Set webhook URL to your gateway endpoint (shown below after connecting)' },
    ],
    tip: 'Use a System User Token (not a personal token) — it doesn\'t expire. Store it securely.',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp (QR)',
    icon: '📱',
    tagline: 'QR code pairing',
    description: 'Connect any WhatsApp number via QR code. No business account needed.',
    color: 'from-emerald-400 to-green-500',
    textColor: 'text-emerald-600',
    plan: 'pro',
    status: 'available',
    setupKind: 'qr',
    tokenField: '_whatsapp',
    tokenLabel: '',
    tokenPlaceholder: '',
    steps: [
      { text: 'Click Connect below to start the pairing session' },
      { text: 'A QR code will appear in your gateway logs / terminal' },
      { text: 'Open WhatsApp on your phone → Settings → Linked Devices → Link a Device' },
      { text: 'Scan the QR code' },
    ],
    tip: 'WhatsApp via QR uses the Baileys library. Use a dedicated number — not your personal WhatsApp.',
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: '💼',
    tagline: 'Workspace messaging',
    description: 'AI worker inside Slack — answer questions, manage tasks, handle DMs.',
    color: 'from-amber-400 to-orange-500',
    textColor: 'text-amber-600',
    plan: 'pro',
    status: 'available',
    setupKind: 'token',
    tokenField: 'botToken',
    tokenLabel: 'Bot OAuth Token',
    tokenPlaceholder: 'xoxb-...',
    steps: [
      { text: 'Create a Slack App at api.slack.com/apps', link: 'https://api.slack.com/apps', linkText: 'Open Slack API →' },
      { text: 'From Scratch → name it → select workspace → enable Socket Mode' },
      { text: 'Under OAuth & Permissions, add scopes: chat:write, channels:history, im:read, im:write' },
      { text: 'Install to Workspace → copy Bot User OAuth Token (xoxb-)' },
    ],
    tip: 'You also need an App-Level Token (xapp-) for Socket Mode. Generate it under Settings → Basic Information.',
  },
  {
    id: 'signal',
    name: 'Signal',
    icon: '🔒',
    tagline: 'End-to-end encrypted',
    description: 'The most private channel. Perfect for healthcare, legal, and finance clients.',
    color: 'from-blue-400 to-cyan-500',
    textColor: 'text-blue-500',
    plan: 'pro',
    status: 'available',
    setupKind: 'phone',
    tokenField: 'phoneNumber',
    tokenLabel: 'Phone Number',
    tokenPlaceholder: '+1234567890',
    steps: [
      { text: 'Signal requires a dedicated phone number (SIM or VoIP)' },
      { text: 'Install signal-cli on your gateway server', link: 'https://github.com/AsamK/signal-cli', linkText: 'signal-cli GitHub →' },
      { text: 'Register or link the number: signal-cli -u +1234567890 register' },
      { text: 'Enter the registered number below' },
    ],
    tip: 'Signal is the most privacy-focused option. The number must be registered before entering it here.',
  },

  // ── Scale ─────────────────────────────────────────────────────────────────
  {
    id: 'imessage',
    name: 'iMessage',
    icon: '🍎',
    tagline: 'Apple Messages',
    description: 'AI worker on iMessage and SMS. Uses BlueBubbles bridge on a Mac.',
    color: 'from-gray-600 to-gray-800',
    textColor: 'text-gray-700',
    plan: 'scale',
    status: 'available',
    setupKind: 'bridge',
    tokenField: 'bridgeUrl',
    tokenLabel: 'BlueBubbles Server URL',
    tokenPlaceholder: 'http://your-mac:1234',
    steps: [
      { text: 'Install BlueBubbles on a Mac with an Apple ID signed in', link: 'https://bluebubbles.app', linkText: 'bluebubbles.app →' },
      { text: 'In BlueBubbles Settings → Server → copy the server URL and password' },
      { text: 'Make sure the Mac stays awake and online' },
      { text: 'Paste the server URL and password below' },
    ],
    tip: 'Requires a Mac running BlueBubbles server. The Mac must stay powered on and connected.',
  },
  {
    id: 'google-chat',
    name: 'Google Chat',
    icon: '🔵',
    tagline: 'Workspace messaging',
    description: 'AI worker in Google Chat. Perfect for businesses on Google Workspace.',
    color: 'from-blue-500 to-green-500',
    textColor: 'text-blue-600',
    plan: 'scale',
    status: 'coming-soon',
    setupKind: 'token',
    tokenField: 'serviceAccountKey',
    tokenLabel: 'Service Account Key (JSON)',
    tokenPlaceholder: '{"type":"service_account",...}',
    steps: [
      { text: 'Create a Google Cloud project and enable the Chat API' },
      { text: 'Create a Service Account and download the JSON key' },
      { text: 'Configure the Chat app in Google Cloud Console' },
    ],
    tip: 'Coming soon — join the waitlist to be notified when this channel is available.',
  },
];

// ── Plan label helpers ────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  all:   { label: 'All Plans',  color: 'bg-gray-100 text-gray-600' },
  lite:  { label: 'Lite+',      color: 'bg-emerald-100 text-emerald-700' },
  pro:   { label: 'Pro+',       color: 'bg-indigo-100 text-indigo-700' },
  scale: { label: 'Scale',      color: 'bg-purple-100 text-purple-700' },
};

// ── Main Component ────────────────────────────────────────────────────────────

export function ChannelsClient({ clientId }: { clientId?: string }) {
  const [channelStatus, setChannelStatus] = useState<Record<string, { configured: boolean; hasToken: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ChannelDef | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [tokenValue, setTokenValue] = useState('');
  const [extraValue, setExtraValue] = useState('');   // second field (e.g. access token for WhatsApp Business)
  const [pairingValue, setPairingValue] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pairMessage, setPairMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [pairingPhase, setPairingPhase] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const url = clientId
        ? `/api/openclaw/channels?clientId=${clientId}`
        : '/api/openclaw/channels';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.ok) setChannelStatus(data.channels || {});
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [clientId]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const openChannel = (ch: ChannelDef) => {
    if (ch.status === 'coming-soon') return;
    setSelected(ch);
    setTokenValue('');
    setExtraValue('');
    setPairingValue('');
    setMessage(null);
    setPairMessage(null);
    setPairingPhase(false);
  };

  const closeModal = () => {
    setSelected(null);
    setConnecting(false);
    setMessage(null);
    setPairMessage(null);
    setPairingPhase(false);
  };

  const connectChannel = async () => {
    if (!selected) return;
    setConnecting(true);
    setMessage(null);

    try {
      let channelConfig: Record<string, unknown> = {};

      if (selected.id === 'telegram') {
        // Extract token from BotFather message if needed
        const raw = tokenValue.trim();
        const match = raw.match(/\d{5,}:[A-Za-z0-9_-]{30,}/);
        channelConfig = { botToken: match ? match[0] : raw };
      } else if (selected.id === 'discord') {
        channelConfig = { token: tokenValue.trim() };
      } else if (selected.id === 'slack') {
        channelConfig = { botToken: tokenValue.trim() };
      } else if (selected.id === 'signal') {
        channelConfig = { phoneNumber: tokenValue.trim() };
      } else if (selected.id === 'whatsapp-business') {
        channelConfig = {
          provider: 'meta',
          phoneNumberId: tokenValue.trim(),
          accessToken: extraValue.trim(),
        };
      } else if (selected.id === 'whatsapp') {
        channelConfig = { enabled: true };
      } else if (selected.id === 'imessage') {
        channelConfig = {
          bridgeUrl: tokenValue.trim(),
          password: extraValue.trim(),
        };
      } else if (selected.id === 'webchat') {
        // WebChat is always connected via the widget embed — no gateway config needed
        setMessage({ type: 'success', text: 'Web Chat is active. Copy the embed code and add it to your client\'s website.' });
        setConnecting(false);
        return;
      }

      const res = await fetch('/api/openclaw/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: selected.id,
          config: channelConfig,
          ...(clientId && { clientId }),
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setMessage({ type: 'success', text: data.message || 'Connected! Gateway is restarting (~30 seconds).' });
        loadStatus();
        if (selected.pairingSteps) setPairingPhase(true);
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Connection failed. Check your credentials.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error — please try again.' });
    }
    setConnecting(false);
  };

  const approvePairing = async () => {
    if (!selected) return;
    setConnecting(true);
    setPairMessage(null);

    try {
      // Extract code from message
      const raw = pairingValue.trim().toUpperCase();
      const match = raw.match(/[A-Z0-9]{8}/);
      const code = match ? match[0] : raw;

      const res = await fetch('/api/openclaw/channels/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: selected.id,
          code,
          ...(clientId && { clientId }),
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setPairMessage({ type: 'success', text: '✅ Paired! Your AI worker is now live on ' + selected.name + '.' });
        loadStatus();
      } else {
        setPairMessage({ type: 'error', text: data.error?.message || 'Pairing failed. Check the code and try again.' });
      }
    } catch {
      setPairMessage({ type: 'error', text: 'Network error — please try again.' });
    }
    setConnecting(false);
  };

  const getEmbedCode = () => {
    const cId = clientId || 'YOUR_CLIENT_ID';
    return `<script src="https://kyra.conversionsystem.com/widget/chat.js" data-client-id="${cId}" defer></script>`;
  };

  const copyEmbed = async () => {
    await navigator.clipboard.writeText(getEmbedCode());
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  // Split channels into connected and available
  const connectedChannels = CHANNELS.filter(ch => {
    const s = channelStatus[ch.id];
    return s?.configured && s?.hasToken;
  });
  const availableChannels = CHANNELS.filter(ch => {
    const s = channelStatus[ch.id];
    return !(s?.configured && s?.hasToken);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-0">
    <SectionNav currentHref="/agency/channels" />
    <div className="p-4 sm:p-6 md:p-8 space-y-8 max-w-5xl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Channels</h1>
          <p className="text-sm text-gray-500 mt-1">
            Connect your AI worker to the platforms your customers already use.
          </p>
        </div>
        {connectedChannels.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
            <Wifi className="h-4 w-4" />
            {connectedChannels.length} channel{connectedChannels.length !== 1 ? 's' : ''} live
          </div>
        )}
      </div>

      {/* ── Connected channels ───────────────────────────────────────────── */}
      {connectedChannels.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Channels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {connectedChannels.map(ch => (
              <button
                key={ch.id}
                onClick={() => openChannel(ch)}
                className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all text-left"
              >
                <span className="text-2xl">{ch.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{ch.name}</span>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{ch.tagline}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Available channels ───────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {connectedChannels.length > 0 ? 'Add More Channels' : 'Available Channels'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableChannels.map(ch => {
            const planBadge = PLAN_LABELS[ch.plan];
            const isComingSoon = ch.status === 'coming-soon';

            return (
              <button
                key={ch.id}
                onClick={() => openChannel(ch)}
                disabled={isComingSoon}
                className={cn(
                  'group relative flex flex-col p-5 rounded-2xl border text-left transition-all',
                  isComingSoon
                    ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                    : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md cursor-pointer'
                )}
              >
                {/* Plan badge */}
                {ch.plan !== 'all' && (
                  <span className={cn('absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full', planBadge.color)}>
                    {planBadge.label}
                  </span>
                )}

                {/* Coming soon badge */}
                {isComingSoon && (
                  <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">
                    Coming Soon
                  </span>
                )}

                {/* Channel icon with gradient bubble */}
                <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-2xl mb-3 shadow-sm', ch.color)}>
                  {ch.icon}
                </div>

                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-900">{ch.name}</h3>
                  <p className="text-[11px] text-gray-400 font-medium mb-1.5">{ch.tagline}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{ch.description}</p>
                </div>

                {/* Footer row */}
                <div className="mt-4 flex items-center justify-between">
                  {isComingSoon ? (
                    <span className="text-xs text-gray-400">Coming soon</span>
                  ) : (
                    <span className={cn('text-xs font-semibold group-hover:underline', ch.textColor)}>
                      Connect →
                    </span>
                  )}
                  {ch.plan !== 'all' && !isComingSoon && (
                    <Lock className="h-3.5 w-3.5 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        <Zap className="h-3.5 w-3.5 text-indigo-400" />
        <p className="text-xs text-gray-400">
          Powered by <span className="font-semibold text-gray-500">OpenClaw</span> — all channels connect directly to your AI worker&apos;s brain
        </p>
      </div>

      {/* ── Setup Modal ──────────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            {/* Modal header */}
            <div className={cn('bg-gradient-to-br p-6 rounded-t-2xl', selected.color)}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl">
                    {selected.icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Connect {selected.name}</h2>
                    <p className="text-sm text-white/80">{selected.tagline}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Status pills */}
              <div className="flex items-center gap-2 mt-4">
                {channelStatus[selected.id]?.configured ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium bg-white/25 text-white px-3 py-1 rounded-full">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium bg-white/25 text-white px-3 py-1 rounded-full">
                    <WifiOff className="h-3.5 w-3.5" /> Not Connected
                  </span>
                )}
                {selected.plan !== 'all' && (
                  <span className="text-xs font-medium bg-white/25 text-white px-3 py-1 rounded-full">
                    {PLAN_LABELS[selected.plan].label}
                  </span>
                )}
              </div>
            </div>

            {/* Modal body */}
            <div className="p-4 sm:p-6 space-y-5">

              {/* Embed code (WebChat only) */}
              {selected.setupKind === 'embed' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 leading-relaxed">{selected.description}</p>
                  <div className="relative">
                    <pre className="bg-gray-950 text-emerald-400 text-xs p-4 rounded-xl font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
                      {getEmbedCode()}
                    </pre>
                    <button
                      onClick={copyEmbed}
                      className="absolute top-3 right-3 p-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      {embedCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Paste this before the <code className="font-mono bg-gray-100 px-1 rounded">&lt;/body&gt;</code> tag on your client&apos;s website.
                    The chat widget loads automatically.
                  </p>
                </div>
              )}

              {/* Setup steps */}
              {selected.setupKind !== 'embed' && !pairingPhase && (
                <>
                  <div className="space-y-3">
                    {selected.steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="flex items-center justify-center h-6 w-6 min-w-[24px] rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700 leading-relaxed">
                          {step.link ? (
                            <a href={step.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline">
                              {step.linkText || step.text}
                              <ExternalLink className="inline h-3 w-3 ml-0.5 mb-0.5" />
                            </a>
                          ) : step.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Tip */}
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                    <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                    <span>{selected.tip}</span>
                  </div>

                  {/* Token / phone / bridge input */}
                  {selected.tokenField && !selected.tokenField.startsWith('_') && (
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">{selected.tokenLabel}</label>
                        <input
                          type="text"
                          placeholder={selected.tokenPlaceholder}
                          value={tokenValue}
                          onChange={e => setTokenValue(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && connectChannel()}
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>

                      {/* WhatsApp Business: extra field for access token */}
                      {selected.id === 'whatsapp-business' && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Permanent Access Token</label>
                          <input
                            type="password"
                            placeholder="EAAx..."
                            value={extraValue}
                            onChange={e => setExtraValue(e.target.value)}
                            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                      )}

                      {/* iMessage: extra field for password */}
                      {selected.id === 'imessage' && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1.5">BlueBubbles Password</label>
                          <input
                            type="password"
                            placeholder="Your BlueBubbles server password"
                            value={extraValue}
                            onChange={e => setExtraValue(e.target.value)}
                            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Connection message */}
                  {message && (
                    <p className={cn('text-sm font-medium', message.type === 'success' ? 'text-emerald-600' : 'text-red-500')}>
                      {message.text}
                    </p>
                  )}

                  {/* Connect button */}
                  {!message?.type && (
                    <button
                      onClick={connectChannel}
                      disabled={
                        connecting ||
                        (selected.tokenField && !selected.tokenField.startsWith('_') && !tokenValue.trim()) ||
                        (selected.id === 'whatsapp-business' && !extraValue.trim()) ||
                        (selected.id === 'imessage' && !extraValue.trim())
                      }
                      className={cn(
                        'w-full py-3 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 bg-gradient-to-r disabled:opacity-50 disabled:cursor-not-allowed',
                        selected.color
                      )}
                    >
                      {connecting ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Connecting...</>
                      ) : selected.setupKind === 'qr' ? (
                        <><Radio className="h-4 w-4" /> Start QR Pairing</>
                      ) : (
                        <>Connect {selected.name}</>
                      )}
                    </button>
                  )}
                </>
              )}

              {/* Pairing phase (after token connected) */}
              {pairingPhase && selected.pairingSteps && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Channel configured! Now pair your account.
                  </div>

                  <div className="space-y-3">
                    {selected.pairingSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="flex items-center justify-center h-6 w-6 min-w-[24px] rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700">{step.text}</span>
                      </div>
                    ))}
                  </div>

                  {selected.pairingTip && (
                    <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                      <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                      {selected.pairingTip}
                    </div>
                  )}

                  {!pairMessage && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={selected.pairingPlaceholder || 'Pairing code...'}
                        value={pairingValue}
                        onChange={e => setPairingValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && approvePairing()}
                        className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={approvePairing}
                        disabled={connecting || !pairingValue.trim()}
                        className={cn('px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all bg-gradient-to-r disabled:opacity-50', selected.color)}
                      >
                        {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
                      </button>
                    </div>
                  )}

                  {pairMessage && (
                    <p className={cn('text-sm font-medium', pairMessage.type === 'success' ? 'text-emerald-600' : 'text-red-500')}>
                      {pairMessage.text}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
