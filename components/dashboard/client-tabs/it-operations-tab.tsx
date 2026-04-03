'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Mail,
  FolderOpen,
  MessageCircle,
  Mic,
  GitBranch,
  Search,
  ArrowRight,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ExternalLink,
  Zap,
  Phone,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import VoiceSubTab from './voice-sub-tab';

// ── Types ────────────────────────────────────────────────────────────────────

type SubTab = 'dashboard' | 'email' | 'files' | 'teams' | 'meetings' | 'code' | 'research' | 'voice';

// ── Connection helpers ────────────────────────────────────────────────────────

function useConnections(client: AgencyClient) {
  const cfg = (client.container_config || {}) as Record<string, unknown>;
  return {
    cfg,
    hasEmail: !!(cfg.email_imap_host && cfg.email_address && cfg.email_password),
    hasMicrosoft: !!(cfg.microsoft_tenant_id && cfg.microsoft_client_id && cfg.microsoft_client_secret),
    hasGoogle: !!(cfg.google_service_account_email),
    hasFathom: !!(cfg.fathom_api_key),
    hasGitHub: !!(cfg.github_token),
  };
}

// ── Empty state component ─────────────────────────────────────────────────────

function EmptyState({ title, description, action }: { title: string; description: string; action?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
        <Zap className="w-6 h-6 text-indigo-400" />
      </div>
      <p className="text-sm font-semibold text-gray-900 mb-1">{title}</p>
      <p className="text-xs text-gray-500 max-w-xs">{description}</p>
      {action && (
        <p className="text-xs text-indigo-600 font-medium mt-3">{action}</p>
      )}
    </div>
  );
}

// ── Connect prompt ────────────────────────────────────────────────────────────

function ConnectPrompt({ service, settingsLink }: { service: string; settingsLink?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
      <p className="text-sm font-medium text-gray-700 mb-1">{service} not connected</p>
      <p className="text-xs text-gray-500 mb-3">
        Connect it in <span className="font-semibold">Settings → Integrations</span> to see live data here.
      </p>
      {settingsLink && (
        <a href={settingsLink} className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700">
          Go to Settings <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

// ── Status dot ────────────────────────────────────────────────────────────────

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
  );
}

// ── Dashboard View ────────────────────────────────────────────────────────────

function DashboardView({ onNavigate, client }: { onNavigate: (tab: SubTab) => void; client: AgencyClient }) {
  const { hasEmail, hasMicrosoft, hasGoogle, hasFathom, hasGitHub } = useConnections(client);

  const tools = [
    { name: 'Email (IMAP)', icon: '📧', connected: hasEmail, tab: 'email' as SubTab, hint: 'Read & send emails' },
    { name: 'Microsoft 365', icon: '🪟', connected: hasMicrosoft, tab: 'files' as SubTab, hint: 'Outlook, OneDrive, Teams' },
    { name: 'Google Workspace', icon: '🔵', connected: hasGoogle, tab: 'email' as SubTab, hint: 'Gmail, Drive, Calendar' },
    { name: 'Fathom', icon: '🎙️', connected: hasFathom, tab: 'meetings' as SubTab, hint: 'Meeting transcripts' },
    { name: 'GitHub', icon: '🔧', connected: hasGitHub, tab: 'code' as SubTab, hint: 'Repos, PRs, deployments' },
    { name: 'Web Search', icon: '🔍', connected: true, tab: 'research' as SubTab, hint: 'Always available' },
  ];

  const connectedCount = tools.filter(t => t.connected).length;
  const allConnected = connectedCount === tools.length;

  return (
    <div className="space-y-6">
      {/* Connection status banner */}
      {!allConnected && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-indigo-900">Connect your tools to get started</p>
          <p className="text-xs text-indigo-700 mt-0.5">
            {connectedCount} of {tools.length} integrations connected.{' '}
            <span className="font-semibold">Configure in Settings → Integrations.</span>
          </p>
        </div>
      )}

      {/* Tool status cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tools.map(tool => (
          <button
            key={tool.name}
            onClick={() => onNavigate(tool.tab)}
            className="rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-indigo-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{tool.icon}</span>
            </div>
            <p className="text-xs font-semibold text-gray-900 mb-1">{tool.name}</p>
            <div className="flex items-center gap-1.5">
              <StatusDot connected={tool.connected} />
              <span className={`text-[11px] font-medium ${tool.connected ? 'text-green-700' : 'text-gray-400'}`}>
                {tool.connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            {tool.connected && (
              <p className="text-[10px] text-gray-400 mt-1">{tool.hint}</p>
            )}
          </button>
        ))}
      </div>

      {/* Ask your AI worker */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Ask Your IT Operations Worker</h3>
        <p className="text-xs text-gray-500 mb-4">
          Your AI worker handles all of this through the Chat tab. Here are some things to try:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { label: '📧 Check my email', tab: 'email' as SubTab },
            { label: '📁 Find a file on OneDrive', tab: 'files' as SubTab },
            { label: '💬 What are my Teams mentions?', tab: 'teams' as SubTab },
            { label: '🎙️ Summarize my last meeting', tab: 'meetings' as SubTab },
            { label: '🔧 Show me open pull requests', tab: 'code' as SubTab },
            { label: '🔍 Research a topic', tab: 'research' as SubTab },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.tab)}
              className="flex items-center justify-between px-3 py-2.5 text-sm text-gray-700 bg-gray-50 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
            >
              {action.label}
              <ArrowRight className="w-3.5 h-3.5 shrink-0 text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Quick start guide if nothing connected */}
      {connectedCount <= 1 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Start</h3>
          <ol className="space-y-2">
            {[
              { step: '1', text: 'Connect Email (IMAP/SMTP) in Settings → Integrations — works with Gmail, Outlook, or any IMAP account' },
              { step: '2', text: 'Go to Chat and type "check my email" — your AI worker will list your inbox immediately' },
              { step: '3', text: 'Optionally connect Microsoft 365, Google Workspace, Fathom, and GitHub for full IT operations' },
            ].map(item => (
              <li key={item.step} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {item.step}
                </span>
                {item.text}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ── Email View ────────────────────────────────────────────────────────────────

function EmailView({ client }: { client: AgencyClient }) {
  const { hasEmail, hasGoogle, hasMicrosoft, cfg } = useConnections(client);
  const emailAddress = cfg.email_address as string | undefined;

  if (!hasEmail && !hasGoogle && !hasMicrosoft) {
    return (
      <div className="space-y-4">
        <ConnectPrompt service="Email" />
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Supported Email Providers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { name: 'Gmail', imap: 'imap.gmail.com', smtp: 'smtp.gmail.com', note: 'Requires App Password (2FA must be on)' },
              { name: 'Outlook / Microsoft 365', imap: 'outlook.office365.com', smtp: 'smtp.office365.com', note: 'Use App Password or OAuth' },
              { name: 'Yahoo Mail', imap: 'imap.mail.yahoo.com', smtp: 'smtp.mail.yahoo.com', note: 'Requires App Password' },
            ].map(p => (
              <div key={p.name} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                <p className="text-sm font-semibold text-gray-900 mb-1">{p.name}</p>
                <p className="text-[11px] text-gray-500">IMAP: {p.imap}</p>
                <p className="text-[11px] text-gray-500">SMTP: {p.smtp}</p>
                <p className="text-[11px] text-indigo-600 mt-1">{p.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Connected account info */}
      {hasEmail && emailAddress && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-900">Email connected: {emailAddress}</p>
            <p className="text-xs text-green-700">Ask your AI worker to check, read, or send emails in the Chat tab.</p>
          </div>
        </div>
      )}

      {/* What you can do */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">What Your AI Worker Can Do</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { cmd: '"Check my email"', desc: 'Lists your recent inbox with subject, sender, and date' },
            { cmd: '"Read email 86571"', desc: 'Opens and reads the full content of a specific email' },
            { cmd: '"Any urgent emails?"', desc: 'Scans inbox and flags emails needing immediate attention' },
            { cmd: '"Reply to [sender] saying..."', desc: 'Drafts and sends a reply after your approval' },
            { cmd: '"Send email to..."', desc: 'Composes and sends a new email (asks for approval first)' },
            { cmd: '"Search emails about..."', desc: 'Searches your inbox by topic, sender, or keyword' },
          ].map(item => (
            <div key={item.cmd} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
              <code className="text-xs text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded shrink-0">{item.cmd}</code>
              <p className="text-xs text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Google Workspace email */}
      {hasGoogle && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-900">Google Workspace connected</p>
            <p className="text-xs text-green-700">Gmail, Drive, and Calendar are available. Ask your AI worker to check Gmail.</p>
          </div>
        </div>
      )}

      {/* Priority senders config */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Priority Senders</h3>
        <p className="text-xs text-gray-500 mb-3">
          Tell your AI worker which senders are VIP — they get flagged immediately rather than batched.
          Go to <span className="font-semibold">Settings → Workers → IT Operations Specialist</span> and set Priority Email Senders.
        </p>
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 font-mono">
          {(cfg.priority_senders as string) || 'No priority senders configured'}
        </div>
      </div>
    </div>
  );
}

// ── Files View ────────────────────────────────────────────────────────────────

function FilesView({ client }: { client: AgencyClient }) {
  const { hasMicrosoft, hasGoogle } = useConnections(client);

  if (!hasMicrosoft && !hasGoogle) {
    return (
      <div className="space-y-4">
        <ConnectPrompt service="Microsoft 365 or Google Workspace" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {hasMicrosoft ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-sm font-semibold text-green-900">OneDrive Connected</p>
            </div>
            <p className="text-xs text-green-700">Ask your AI worker to find, upload, download, or share files.</p>
          </div>
        ) : (
          <ConnectPrompt service="Microsoft 365 (OneDrive)" />
        )}
        {hasGoogle ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-sm font-semibold text-green-900">Google Drive Connected</p>
            </div>
            <p className="text-xs text-green-700">Ask your AI worker to search, open, or share Drive files.</p>
          </div>
        ) : (
          <ConnectPrompt service="Google Workspace (Drive)" />
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">What Your AI Worker Can Do</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { cmd: '"Find the Q1 budget file"', desc: 'Searches OneDrive and Google Drive' },
            { cmd: '"List files in /Projects/"', desc: 'Lists folder contents from either storage' },
            { cmd: '"Share [file] with [email]"', desc: 'Sets sharing permissions on files' },
            { cmd: '"Download the latest contract"', desc: 'Retrieves file content or download link' },
          ].map(item => (
            <div key={item.cmd} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
              <code className="text-xs text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded shrink-0">{item.cmd}</code>
              <p className="text-xs text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Teams View ────────────────────────────────────────────────────────────────

function TeamsView({ client }: { client: AgencyClient }) {
  const { hasMicrosoft } = useConnections(client);

  if (!hasMicrosoft) {
    return <ConnectPrompt service="Microsoft 365 (Teams)" />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-900">Microsoft Teams connected</p>
          <p className="text-xs text-green-700">Your AI worker can read channels, mentions, and post updates.</p>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">What Your AI Worker Can Do</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { cmd: '"Check my Teams mentions"', desc: 'Finds all @mentions requiring a response' },
            { cmd: '"Post update to #engineering"', desc: 'Posts a message to a specific channel' },
            { cmd: '"What\'s new in #general?"', desc: 'Reads recent channel messages' },
            { cmd: '"Post meeting summary to Teams"', desc: 'Auto-posts Fathom summaries after meetings' },
          ].map(item => (
            <div key={item.cmd} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
              <code className="text-xs text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded shrink-0">{item.cmd}</code>
              <p className="text-xs text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Meetings View ─────────────────────────────────────────────────────────────

function MeetingsView({ client }: { client: AgencyClient }) {
  const { hasFathom } = useConnections(client);

  if (!hasFathom) {
    return (
      <div className="space-y-4">
        <ConnectPrompt service="Fathom" />
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">What is Fathom?</h3>
          <p className="text-sm text-gray-600 mb-3">
            Fathom is an AI meeting recorder that automatically transcribes your calls and generates summaries and action items.
            Connect it here and your AI worker will automatically extract action items, post summaries to Teams, and remind you of follow-ups.
          </p>
          <a href="https://fathom.video" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Learn about Fathom <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-900">Fathom connected</p>
          <p className="text-xs text-green-700">Your AI worker can retrieve transcripts, summaries, and action items from your meetings.</p>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">What Your AI Worker Can Do</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { cmd: '"Summarize my last meeting"', desc: 'Pulls the most recent Fathom recording summary' },
            { cmd: '"What are my action items?"', desc: 'Lists all open action items from recent meetings' },
            { cmd: '"Get transcript from Monday standup"', desc: 'Retrieves full meeting transcript' },
            { cmd: '"Post meeting notes to Teams"', desc: 'Sends summary to a specified Teams channel' },
          ].map(item => (
            <div key={item.cmd} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
              <code className="text-xs text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded shrink-0">{item.cmd}</code>
              <p className="text-xs text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Code View ─────────────────────────────────────────────────────────────────

function CodeView({ client }: { client: AgencyClient }) {
  const { hasGitHub, cfg } = useConnections(client);
  const repos = (cfg.github_repos as string | undefined) || '';

  if (!hasGitHub) {
    return <ConnectPrompt service="GitHub" />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-900">GitHub connected</p>
          {repos && <p className="text-xs text-green-700">Monitoring: {repos.split('\n').filter(Boolean).join(', ')}</p>}
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">What Your AI Worker Can Do</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { cmd: '"Show open pull requests"', desc: 'Lists all open PRs across monitored repos' },
            { cmd: '"Check build status"', desc: 'Shows recent GitHub Actions run results' },
            { cmd: '"Create branch feature/xyz"', desc: 'Creates a new branch (asks for confirmation)' },
            { cmd: '"Open PR for [branch]"', desc: 'Creates a pull request (asks for confirmation)' },
            { cmd: '"Any failed deployments?"', desc: 'Checks recent workflow runs for failures' },
            { cmd: '"List recent commits on main"', desc: 'Shows commit history for a branch' },
          ].map(item => (
            <div key={item.cmd} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
              <code className="text-xs text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded shrink-0">{item.cmd}</code>
              <p className="text-xs text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Research View ─────────────────────────────────────────────────────────────

function ResearchView() {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-900">Web Search always available</p>
          <p className="text-xs text-green-700">No configuration needed — your AI worker can research any topic instantly.</p>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">What Your AI Worker Can Do</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { cmd: '"Research SOC 2 compliance"', desc: 'Searches the web and returns a structured summary with sources' },
            { cmd: '"Compare cloud backup solutions"', desc: 'Researches and compares options with pros/cons' },
            { cmd: '"Summarize this URL: ..."', desc: 'Fetches and summarizes any webpage or article' },
            { cmd: '"What are the latest trends in..."', desc: 'Live search for current information on any topic' },
          ].map(item => (
            <div key={item.cmd} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
              <code className="text-xs text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded shrink-0">{item.cmd}</code>
              <p className="text-xs text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Tips</h3>
        <ul className="space-y-1.5 text-sm text-gray-600">
          <li className="flex items-start gap-2"><span className="text-indigo-500 shrink-0">•</span> Ask follow-up questions — your AI worker remembers the research context within a conversation</li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 shrink-0">•</span> Combine with email: "Research [topic] and draft a summary email to the team"</li>
          <li className="flex items-start gap-2"><span className="text-indigo-500 shrink-0">•</span> Combine with Teams: "Research [topic] and post a summary to #general"</li>
        </ul>
      </div>
    </div>
  );
}

// ── Sub-Tab Config ────────────────────────────────────────────────────────────

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'teams', label: 'Teams', icon: MessageCircle },
  { id: 'meetings', label: 'Meetings', icon: Mic },
  { id: 'code', label: 'Code', icon: GitBranch },
  { id: 'research', label: 'Research', icon: Search },
  { id: 'voice', label: 'Voice AI', icon: Phone },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function ITOperationsTab({ client }: { client: AgencyClient }) {
  const [subTab, setSubTab] = useState<SubTab>('dashboard');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">IT Operations Center</h2>
        <p className="text-sm text-gray-500 mt-0.5">Email, files, Teams, meetings, code & research — all in one place.</p>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              subTab === t.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 'dashboard' && <DashboardView onNavigate={setSubTab} client={client} />}
      {subTab === 'email' && <EmailView client={client} />}
      {subTab === 'files' && <FilesView client={client} />}
      {subTab === 'teams' && <TeamsView client={client} />}
      {subTab === 'meetings' && <MeetingsView client={client} />}
      {subTab === 'code' && <CodeView client={client} />}
      {subTab === 'research' && <ResearchView />}
      {subTab === 'voice' && <VoiceSubTab client={client} />}
    </div>
  );
}
