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
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Plus,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';

// ── Types ────────────────────────────────────────────────────────────────────

type SubTab = 'dashboard' | 'email' | 'files' | 'teams' | 'meetings' | 'code' | 'research';

interface Integration {
  name: string;
  icon: string;
  status: 'Connected' | 'Not Connected';
  summary: string;
  lastActivity: string;
}

interface EmailItem {
  from: string;
  subject: string;
  time: string;
  priority: 'Urgent' | 'Action' | 'Info';
}

interface FileItem {
  name: string;
  modified: string;
  size: string;
  type: string;
}

interface ChannelItem {
  name: string;
  unread: number;
  lastMessage: string;
  lastTime: string;
}

interface MeetingItem {
  name: string;
  date: string;
  duration: string;
  attendees: number;
  actionItems: number;
  summary: string;
  actions: { desc: string; owner: string; due: string; status: 'Pending' | 'Done' | 'Overdue' }[];
}

interface RepoItem {
  name: string;
  openPRs: number;
  lastCommit: string;
  buildStatus: 'pass' | 'fail' | 'running';
}

interface PRItem {
  title: string;
  author: string;
  branch: string;
  age: string;
  reviewStatus: 'Approved' | 'Changes Requested' | 'Pending Review';
}

interface BuildRun {
  workflow: string;
  status: 'success' | 'failure' | 'running';
  duration: string;
  triggeredBy: string;
}

interface ResearchItem {
  query: string;
  summary: string;
  sources: number;
  date: string;
}

// ── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_INTEGRATIONS: Integration[] = [
  { name: 'Outlook', icon: '📧', status: 'Connected', summary: '12 unread, 3 urgent', lastActivity: '10 min ago' },
  { name: 'OneDrive', icon: '📁', status: 'Connected', summary: '247 files, last sync 2h ago', lastActivity: '2 hours ago' },
  { name: 'Teams', icon: '💬', status: 'Connected', summary: '5 unread mentions', lastActivity: '30 min ago' },
  { name: 'Gmail', icon: '✉️', status: 'Not Connected', summary: '8 unread, 1 urgent', lastActivity: '1 hour ago' },
  { name: 'Fathom', icon: '🎙️', status: 'Connected', summary: '3 meetings this week', lastActivity: '1 day ago' },
  { name: 'GitHub', icon: '🔧', status: 'Connected', summary: '2 open PRs, 1 failed build', lastActivity: '45 min ago' },
];

const MOCK_OUTLOOK_EMAILS: EmailItem[] = [
  { from: 'Carter Williams', subject: 'Q1 Budget Review — Need Your Input', time: '10:32 AM', priority: 'Urgent' },
  { from: 'Sarah Chen', subject: 'Updated proposal attached', time: '9:15 AM', priority: 'Action' },
  { from: 'IT Department', subject: 'System maintenance window Saturday', time: '8:45 AM', priority: 'Info' },
  { from: 'Mike Johnson', subject: 'Re: Project timeline update', time: 'Yesterday', priority: 'Action' },
  { from: 'Newsletter', subject: 'Weekly industry digest', time: 'Yesterday', priority: 'Info' },
];

const MOCK_GMAIL_EMAILS: EmailItem[] = [
  { from: 'Alex Rivera', subject: 'Partnership opportunity — follow up', time: '11:00 AM', priority: 'Urgent' },
  { from: 'Google Workspace', subject: 'Storage usage report', time: '9:30 AM', priority: 'Info' },
  { from: 'David Park', subject: 'Invoice #4521 attached', time: '8:00 AM', priority: 'Action' },
  { from: 'Conference Team', subject: 'Speaker confirmation needed', time: 'Yesterday', priority: 'Action' },
  { from: 'LinkedIn', subject: '5 new connection requests', time: 'Yesterday', priority: 'Info' },
];

const MOCK_ONEDRIVE_FILES: FileItem[] = [
  { name: 'Q1-Budget-Report.xlsx', modified: '2 hours ago', size: '2.4 MB', type: 'Excel' },
  { name: 'Project-Proposal-v3.docx', modified: '1 day ago', size: '1.1 MB', type: 'Word' },
  { name: 'Meeting-Notes-Mar20.pdf', modified: '2 days ago', size: '450 KB', type: 'PDF' },
  { name: 'Brand-Guidelines.pptx', modified: '3 days ago', size: '8.2 MB', type: 'PowerPoint' },
  { name: 'Team-Photo-2026.jpg', modified: '1 week ago', size: '3.7 MB', type: 'Image' },
];

const MOCK_GDRIVE_FILES: FileItem[] = [
  { name: 'Marketing Strategy 2026', modified: '3 hours ago', size: '—', type: 'Google Doc' },
  { name: 'Sales Pipeline Tracker', modified: '1 day ago', size: '—', type: 'Google Sheet' },
  { name: 'Company All-Hands Slides', modified: '2 days ago', size: '—', type: 'Google Slides' },
  { name: 'Competitor Analysis', modified: '4 days ago', size: '—', type: 'Google Doc' },
  { name: 'Q1 Revenue Dashboard', modified: '1 week ago', size: '—', type: 'Google Sheet' },
];

const MOCK_CHANNELS: ChannelItem[] = [
  { name: '#general', unread: 2, lastMessage: 'Team standup reminder for tomorrow', lastTime: '30 min ago' },
  { name: '#engineering', unread: 8, lastMessage: 'Deployment to staging complete', lastTime: '45 min ago' },
  { name: '#marketing', unread: 0, lastMessage: 'Campaign report shared', lastTime: '2 hours ago' },
  { name: '#support', unread: 3, lastMessage: 'Ticket #892 escalated', lastTime: '1 hour ago' },
  { name: '#leadership', unread: 1, lastMessage: 'Q2 planning doc ready for review', lastTime: '3 hours ago' },
];

const MOCK_MENTIONS = [
  { channel: '#engineering', from: 'Jake', message: '@ops Can you check the staging deploy?', time: '45 min ago' },
  { channel: '#support', from: 'Lisa', message: '@ops Customer needs file from OneDrive shared', time: '1 hour ago' },
  { channel: '#leadership', from: 'VP Ops', message: '@ops Prepare the Q1 summary for Friday', time: '3 hours ago' },
];

const MOCK_MEETINGS: MeetingItem[] = [
  {
    name: 'Monday Standup', date: '2026-03-23', duration: '25 min', attendees: 8, actionItems: 5,
    summary: 'Discussed sprint progress, 3 blockers identified. Design review needed for new dashboard.',
    actions: [
      { desc: 'Review dashboard mockups', owner: 'Sarah', due: '2026-03-25', status: 'Pending' },
      { desc: 'Fix staging deployment issue', owner: 'Jake', due: '2026-03-24', status: 'Done' },
      { desc: 'Send Q1 report to leadership', owner: 'You', due: '2026-03-22', status: 'Overdue' },
      { desc: 'Schedule vendor call', owner: 'Mike', due: '2026-03-26', status: 'Pending' },
      { desc: 'Update project timeline doc', owner: 'You', due: '2026-03-25', status: 'Pending' },
    ],
  },
  {
    name: 'Client Review — Acme Corp', date: '2026-03-22', duration: '45 min', attendees: 4, actionItems: 3,
    summary: 'Client happy with progress. Requested additional reporting features by end of month.',
    actions: [
      { desc: 'Add export-to-PDF feature', owner: 'Dev Team', due: '2026-03-28', status: 'Pending' },
      { desc: 'Send updated SOW', owner: 'You', due: '2026-03-24', status: 'Pending' },
      { desc: 'Schedule follow-up for April', owner: 'Sarah', due: '2026-03-26', status: 'Pending' },
    ],
  },
  {
    name: 'Weekly Leadership Sync', date: '2026-03-21', duration: '30 min', attendees: 5, actionItems: 2,
    summary: 'Reviewed Q1 metrics. Revenue ahead of target. Need to finalize Q2 hiring plan.',
    actions: [
      { desc: 'Finalize Q2 hiring plan', owner: 'HR', due: '2026-03-28', status: 'Pending' },
      { desc: 'Prepare board deck draft', owner: 'You', due: '2026-03-30', status: 'Pending' },
    ],
  },
];

const MOCK_REPOS: RepoItem[] = [
  { name: 'acme-webapp', openPRs: 2, lastCommit: '45 min ago', buildStatus: 'pass' },
  { name: 'acme-api', openPRs: 1, lastCommit: '2 hours ago', buildStatus: 'fail' },
  { name: 'acme-docs', openPRs: 0, lastCommit: '1 day ago', buildStatus: 'pass' },
];

const MOCK_PRS: PRItem[] = [
  { title: 'feat: Add dashboard analytics', author: 'sarah-dev', branch: 'feature/analytics', age: '2 days', reviewStatus: 'Approved' },
  { title: 'fix: Email notification bug', author: 'jake-eng', branch: 'fix/email-notif', age: '1 day', reviewStatus: 'Pending Review' },
  { title: 'chore: Update dependencies', author: 'dependabot', branch: 'deps/march-update', age: '3 days', reviewStatus: 'Changes Requested' },
];

const MOCK_BUILDS: BuildRun[] = [
  { workflow: 'CI — acme-webapp', status: 'success', duration: '3m 42s', triggeredBy: 'Push to main' },
  { workflow: 'Deploy — acme-api', status: 'failure', duration: '1m 15s', triggeredBy: 'Push to main' },
  { workflow: 'CI — acme-webapp', status: 'success', duration: '4m 01s', triggeredBy: 'PR #42' },
  { workflow: 'Lint — acme-docs', status: 'success', duration: '0m 28s', triggeredBy: 'Push to main' },
  { workflow: 'Deploy — acme-webapp', status: 'success', duration: '2m 55s', triggeredBy: 'Merge PR #41' },
];

const MOCK_RESEARCH: ResearchItem[] = [
  { query: 'Best practices for SOC 2 compliance in SaaS', summary: 'SOC 2 Type II requires continuous monitoring of 5 trust service criteria. Key steps: define scope, implement controls, engage auditor 3-6 months ahead.', sources: 8, date: '2026-03-22' },
  { query: 'Comparison of cloud backup solutions 2026', summary: 'Top contenders: Veeam (enterprise), Backblaze B2 (cost-effective), AWS Backup (native). Veeam leads in hybrid-cloud, B2 best price/GB.', sources: 12, date: '2026-03-20' },
  { query: 'Remote team productivity tools trends', summary: 'AI-powered async tools gaining traction. Loom + Notion + Linear most popular stack. Meeting fatigue driving shift to async-first workflows.', sources: 6, date: '2026-03-18' },
];

const MOCK_ACTIVITIES = [
  { icon: '📧', desc: 'Drafted reply to Carter\'s email about Q1 budget', time: '1 hour ago' },
  { icon: '📁', desc: 'Uploaded quarterly report to /Q1 Reports/', time: '2 hours ago' },
  { icon: '🎙️', desc: 'Extracted 5 action items from Monday standup', time: '3 hours ago' },
  { icon: '🔧', desc: 'PR #42 merged — deployed to staging', time: '4 hours ago' },
  { icon: '💬', desc: 'Posted meeting summary to #engineering', time: '5 hours ago' },
  { icon: '📧', desc: 'Sent daily email digest via Telegram', time: '6 hours ago' },
  { icon: '🔍', desc: 'Completed research: SOC 2 compliance best practices', time: '8 hours ago' },
  { icon: '📁', desc: 'Shared Brand Guidelines with marketing team', time: '1 day ago' },
  { icon: '🔧', desc: 'Created branch fix/email-notif for bug fix', time: '1 day ago' },
  { icon: '🎙️', desc: 'Sent follow-up reminder for client review action items', time: '2 days ago' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function DemoBanner({ service }: { service: string }) {
  return (
    <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-2.5 mb-4">
      <p className="text-sm text-indigo-700">
        <span className="font-medium">Demo data</span> — connect {service} in Settings → Secrets for live data
      </p>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: 'Urgent' | 'Action' | 'Info' }) {
  const colors = { Urgent: 'bg-red-50 text-red-700', Action: 'bg-amber-50 text-amber-700', Info: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[priority]}`}>
      {priority}
    </span>
  );
}

function StatusDot({ status }: { status: 'Connected' | 'Not Connected' }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${status === 'Connected' ? 'bg-green-500' : 'bg-gray-300'}`} />
  );
}

function BuildBadge({ status }: { status: 'success' | 'failure' | 'running' | 'pass' | 'fail' }) {
  const map: Record<string, { label: string; cls: string }> = {
    success: { label: '✅ Pass', cls: 'bg-green-50 text-green-700' },
    pass: { label: '✅ Pass', cls: 'bg-green-50 text-green-700' },
    failure: { label: '❌ Fail', cls: 'bg-red-50 text-red-700' },
    fail: { label: '❌ Fail', cls: 'bg-red-50 text-red-700' },
    running: { label: '⏳ Running', cls: 'bg-amber-50 text-amber-700' },
  };
  const s = map[status] || map.success;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

function ReviewBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Approved: 'bg-green-50 text-green-700',
    'Pending Review': 'bg-amber-50 text-amber-700',
    'Changes Requested': 'bg-red-50 text-red-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

function ActionStatusBadge({ status }: { status: 'Pending' | 'Done' | 'Overdue' }) {
  const colors = { Pending: 'bg-amber-50 text-amber-700', Done: 'bg-green-50 text-green-700', Overdue: 'bg-red-50 text-red-700' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {status}
    </span>
  );
}

// ── Sub-Tab Views ────────────────────────────────────────────────────────────

function DashboardView({ onNavigate, client }: { onNavigate: (tab: SubTab) => void; client: AgencyClient }) {
  const cfg = (client.container_config || {}) as Record<string, unknown>;
  const connectedCount = [
    !!(cfg.microsoft_tenant_id && cfg.microsoft_client_id && cfg.microsoft_client_secret),
    !!(cfg.google_service_account_email),
    !!(cfg.fathom_api_key),
    !!(cfg.github_token),
    true, // Brave — always connected
  ].filter(Boolean).length;
  const totalIntegrations = 6;

  return (
    <div className="space-y-6">
      {connectedCount < 3 && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-indigo-900">Connect your tools to get started</p>
          <p className="text-xs text-indigo-700">{connectedCount} of {totalIntegrations} integrations connected. Configure integrations in <span className="font-semibold">Settings → Integrations</span>.</p>
        </div>
      )}
      <DemoBanner service="Microsoft 365, Google Workspace, Fathom, and GitHub" />

      {/* Integration status cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {MOCK_INTEGRATIONS.map(i => (
          <div key={i.name} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{i.icon}</span>
              <span className="text-sm font-semibold text-gray-900">{i.name}</span>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <StatusDot status={i.status} />
              <span className={`text-xs font-medium ${i.status === 'Connected' ? 'text-green-700' : 'text-gray-400'}`}>{i.status}</span>
            </div>
            <p className="text-xs text-gray-500">{i.summary}</p>
            <p className="text-[10px] text-gray-400 mt-1">{i.lastActivity}</p>
          </div>
        ))}
      </div>

      {/* Today's Schedule */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Today&apos;s Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Morning Inbox Scan</p>
              <p className="text-xs text-gray-500">✅ Complete — 12 emails categorized</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Email Digest</p>
              <p className="text-xs text-gray-500">⏳ Scheduled for 5:00 PM</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Meeting Follow-ups</p>
              <p className="text-xs text-gray-500">3 pending action items</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
        <div className="space-y-2.5">
          {MOCK_ACTIVITIES.map((a, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <span className="shrink-0 text-base">{a.icon}</span>
              <span className="text-gray-700 flex-1">{a.desc}</span>
              <span className="text-xs text-gray-400 whitespace-nowrap">{a.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Scan Inbox', tab: 'email' as SubTab },
            { label: 'Check Meetings', tab: 'meetings' as SubTab },
            { label: 'Review PRs', tab: 'code' as SubTab },
            { label: 'Run Research', tab: 'research' as SubTab },
          ].map(a => (
            <button
              key={a.tab}
              onClick={() => onNavigate(a.tab)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              {a.label} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmailView() {
  return (
    <div className="space-y-6">
      <DemoBanner service="Microsoft 365 and Google Workspace" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outlook Column */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">📧</span>
              <h3 className="text-sm font-semibold text-gray-900">Outlook</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-red-600">3 urgent</span>
              <span>·</span>
              <span>12 unread</span>
            </div>
          </div>
          <div className="space-y-2">
            {MOCK_OUTLOOK_EMAILS.map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.from}</p>
                  <p className="text-xs text-gray-500 truncate">{e.subject}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{e.time}</span>
                <PriorityBadge priority={e.priority} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
              Scan Inbox
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
              Draft Reply
            </button>
          </div>
        </div>

        {/* Gmail Column */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">✉️</span>
              <h3 className="text-sm font-semibold text-gray-900">Gmail</h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-red-600">1 urgent</span>
              <span>·</span>
              <span>8 unread</span>
            </div>
          </div>
          <div className="space-y-2">
            {MOCK_GMAIL_EMAILS.map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.from}</p>
                  <p className="text-xs text-gray-500 truncate">{e.subject}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{e.time}</span>
                <PriorityBadge priority={e.priority} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
              Scan Inbox
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
              Draft Reply
            </button>
          </div>
        </div>
      </div>

      {/* Email Digest */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Email Digest</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">Next digest scheduled</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">Today at 5:00 PM</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Last digest preview</p>
            <p className="text-sm text-gray-700 mt-0.5">12 emails processed: 3 urgent, 4 action needed, 5 informational</p>
          </div>
          <div className="flex items-end">
            <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
              Send Digest Now
            </button>
          </div>
        </div>
      </div>

      {/* Priority Senders */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Priority Senders</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {['boss@company.com', 'cfo@company.com', 'vp-sales@company.com'].map(s => (
            <span key={s} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
              {s}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add priority sender email..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button className="p-1.5 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FilesView() {
  return (
    <div className="space-y-6">
      <DemoBanner service="Microsoft 365 and Google Workspace" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OneDrive */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">📁</span>
            <h3 className="text-sm font-semibold text-gray-900">OneDrive</h3>
            <span className="text-xs text-gray-400 ml-auto">247 files</span>
          </div>
          <div className="space-y-2">
            {MOCK_ONEDRIVE_FILES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                  <p className="text-xs text-gray-500">{f.type} · {f.size}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{f.modified}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Google Drive */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">📂</span>
            <h3 className="text-sm font-semibold text-gray-900">Google Drive</h3>
            <span className="text-xs text-gray-400 ml-auto">189 files</span>
          </div>
          <div className="space-y-2">
            {MOCK_GDRIVE_FILES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.name}</p>
                  <p className="text-xs text-gray-500">{f.type}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{f.modified}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">Find File</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                placeholder="Search across OneDrive & Drive..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button className="p-1.5 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Upload File</label>
            <button className="w-full mt-1 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors text-left">
              Select destination & upload →
            </button>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Share File</label>
            <button className="w-full mt-1 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors text-left">
              Select file & recipients →
            </button>
          </div>
        </div>
      </div>

      {/* Top-level folders */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Folder Structure</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">OneDrive</p>
            <div className="space-y-1">
              {['📂 Documents', '📂 Projects', '📂 Q1 Reports', '📂 Shared', '📂 Templates'].map(f => (
                <button key={f} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Google Drive</p>
            <div className="space-y-1">
              {['📂 My Drive', '📂 Shared with me', '📂 Marketing', '📂 Engineering', '📂 Finance'].map(f => (
                <button key={f} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamsView() {
  return (
    <div className="space-y-6">
      <DemoBanner service="Microsoft 365" />

      {/* Channel Monitor */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Channel Monitor</h3>
        <div className="space-y-2">
          {MOCK_CHANNELS.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-sm font-medium text-indigo-600 w-28 shrink-0">{c.name}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 truncate">{c.lastMessage}</p>
              </div>
              {c.unread > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold">
                  {c.unread}
                </span>
              )}
              <span className="text-xs text-gray-400 whitespace-nowrap">{c.lastTime}</span>
            </div>
          ))}
        </div>
        <button className="mt-3 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
          Post Update
        </button>
      </div>

      {/* @Mentions */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">@Mentions Requiring Response</h3>
        <div className="space-y-3">
          {MOCK_MENTIONS.map((m, i) => (
            <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-indigo-600">{m.channel}</span>
                <span className="text-xs text-gray-400">· {m.from} · {m.time}</span>
              </div>
              <p className="text-sm text-gray-700">{m.message}</p>
              <button className="mt-2 px-3 py-1 text-xs font-medium text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                Draft Reply
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Meeting Summaries Posted */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Meeting Summaries Posted</h3>
        <div className="space-y-2">
          {[
            { channel: '#engineering', time: '2026-03-23 10:30 AM', summary: 'Monday Standup — 5 action items, 3 blockers discussed' },
            { channel: '#leadership', time: '2026-03-21 3:00 PM', summary: 'Weekly Leadership Sync — Q1 metrics reviewed, Q2 hiring plan needed' },
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-sm font-medium text-indigo-600 w-28 shrink-0">{s.channel}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 truncate">{s.summary}</p>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{s.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MeetingsView() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <DemoBanner service="Fathom" />

      {/* Recent Meetings */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Meetings</h3>
        <div className="space-y-2">
          {MOCK_MEETINGS.map((m, i) => (
            <div key={i}>
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.date} · {m.duration} · {m.attendees} attendees</p>
                  </div>
                  <span className="text-xs font-medium text-indigo-600">{m.actionItems} action items</span>
                  <ArrowRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded === i ? 'rotate-90' : ''}`} />
                </div>
              </button>
              {expanded === i && (
                <div className="px-3 pb-3">
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-sm text-gray-700 mb-3">{m.summary}</p>
                    <p className="text-xs font-medium text-gray-900 mb-2">Action Items:</p>
                    <div className="space-y-1.5">
                      {m.actions.map((a, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs">
                          <ActionStatusBadge status={a.status} />
                          <span className="text-gray-700 flex-1">{a.desc}</span>
                          <span className="text-gray-500">{a.owner}</span>
                          <span className="text-gray-400">Due: {a.due}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* All Action Items */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">All Action Items</h3>
        <div className="space-y-2">
          {MOCK_MEETINGS.flatMap(m => m.actions).map((a, i) => (
            <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg ${a.status === 'Overdue' ? 'bg-red-50 border border-red-100' : 'hover:bg-gray-50'} transition-colors`}>
              <ActionStatusBadge status={a.status} />
              <span className="text-sm text-gray-700 flex-1">{a.desc}</span>
              <span className="text-xs text-gray-500">{a.owner}</span>
              <span className="text-xs text-gray-400">Due: {a.due}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Auto-Follow-Up Toggles */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Auto-Follow-Up</h3>
        <div className="space-y-3">
          {[
            { label: 'Auto-post meeting summaries to Teams', defaultOn: true },
            { label: 'Send action item reminders via Telegram', defaultOn: false },
          ].map((t, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{t.label}</span>
              <button className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${t.defaultOn ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${t.defaultOn ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CodeView() {
  return (
    <div className="space-y-6">
      <DemoBanner service="GitHub" />

      {/* Repositories */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Repositories</h3>
        <div className="space-y-2">
          {MOCK_REPOS.map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
              <GitBranch className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-900 w-32">{r.name}</span>
              <span className="text-xs text-gray-500">{r.openPRs} open PRs</span>
              <span className="text-xs text-gray-400 flex-1">Last commit: {r.lastCommit}</span>
              <BuildBadge status={r.buildStatus} />
            </div>
          ))}
        </div>
      </div>

      {/* Open Pull Requests */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Open Pull Requests</h3>
        <div className="space-y-2">
          {MOCK_PRS.map((p, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{p.title}</p>
                <p className="text-xs text-gray-500">{p.author} · {p.branch} · {p.age} old</p>
              </div>
              <ReviewBadge status={p.reviewStatus} />
              <button className="px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                Review
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Build Status */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Builds</h3>
        <div className="space-y-2">
          {MOCK_BUILDS.map((b, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
              <BuildBadge status={b.status} />
              <span className="text-sm font-medium text-gray-900 flex-1">{b.workflow}</span>
              <span className="text-xs text-gray-500">{b.duration}</span>
              <span className="text-xs text-gray-400">{b.triggeredBy}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">Create Branch</label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                placeholder="branch-name"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                Create
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Open PR</label>
            <button className="w-full mt-1 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors text-left">
              Select repo & branch →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResearchView() {
  return (
    <div className="space-y-6">
      <DemoBanner service="Web Search (Brave API)" />

      {/* New Research */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">New Research</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter a research topic or question..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
            Research
          </button>
        </div>
      </div>

      {/* Recent Research */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Research</h3>
        <div className="space-y-4">
          {MOCK_RESEARCH.map((r, i) => (
            <div key={i} className="p-4 rounded-lg border border-gray-100 bg-gray-50">
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-medium text-gray-900">{r.query}</p>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-3">{r.date}</span>
              </div>
              <p className="text-sm text-gray-700 mb-2">{r.summary}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{r.sources} sources</span>
                <button className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">View full report →</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Research */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Saved Research</h3>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            placeholder="Search saved research..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button className="p-1.5 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
            <Search className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400">3 research reports saved to memory</p>
      </div>
    </div>
  );
}

// ── Setup View ──────────────────────────────────────────────────────────────

interface SetupField {
  key: string;
  label: string;
  placeholder: string;
  help: string;
  sensitive?: boolean;
  multiline?: boolean;
}

interface SetupIntegration {
  id: string;
  name: string;
  icon: string;
  description: string;
  connected: boolean;
  fields: SetupField[];
  setupSteps: string[];
  linkTo?: string;
  alwaysConnected?: boolean;
  note?: string;
}

function SetupView({ client }: { client: AgencyClient }) {
  const cfg = (client.container_config || {}) as Record<string, unknown>;

  const integrations: SetupIntegration[] = [
    {
      id: 'microsoft365',
      name: 'Microsoft 365',
      icon: '📧',
      description: 'Outlook email, OneDrive files, Teams messaging',
      connected: !!(cfg.microsoft_tenant_id && cfg.microsoft_client_id && cfg.microsoft_client_secret),
      fields: [
        { key: 'microsoft_tenant_id', label: 'Tenant ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', help: 'Azure Portal → Azure Active Directory → Overview → Tenant ID' },
        { key: 'microsoft_client_id', label: 'Application (Client) ID', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', help: 'Azure Portal → App Registrations → Your App → Client ID' },
        { key: 'microsoft_client_secret', label: 'Client Secret', placeholder: 'Your app client secret value', help: 'Azure Portal → App Registrations → Your App → Certificates & Secrets → New Client Secret', sensitive: true },
      ],
      setupSteps: [
        'Go to Azure Portal (portal.azure.com)',
        'Navigate to Azure Active Directory → App Registrations → New Registration',
        'Name it "Kyra AI Integration" — set Redirect URI to https://kyra.conversionsystem.com/api/auth/callback',
        'Grant permissions: Mail.ReadWrite, Files.ReadWrite.All, Chat.ReadWrite, Calendars.ReadWrite',
        'Create a Client Secret and copy the Value (not the ID)',
        'Copy Tenant ID, Client ID, and Client Secret below',
      ],
    },
    {
      id: 'google',
      name: 'Google Workspace',
      icon: '✉️',
      description: 'Gmail, Google Drive, Google Calendar',
      connected: !!(cfg.google_service_account_email),
      fields: [
        { key: 'google_service_account_email', label: 'Service Account Email', placeholder: 'your-bot@project.iam.gserviceaccount.com', help: 'Google Cloud Console → IAM & Admin → Service Accounts' },
        { key: 'google_service_account_key', label: 'Service Account JSON Key', placeholder: 'Paste the entire JSON key file content', help: 'Create a key for the service account → download JSON', sensitive: true, multiline: true },
      ],
      setupSteps: [
        'Go to Google Cloud Console (console.cloud.google.com)',
        'Create a new project or select existing',
        'Enable APIs: Gmail API, Google Drive API, Google Calendar API',
        'Create a Service Account under IAM & Admin',
        'Download the JSON key file',
        'Share your Google Drive folders and Calendar with the service account email',
        'Paste the service account email and JSON key below',
      ],
    },
    {
      id: 'fathom',
      name: 'Fathom',
      icon: '🎙️',
      description: 'Meeting transcripts, summaries, action items',
      connected: !!(cfg.fathom_api_key),
      fields: [
        { key: 'fathom_api_key', label: 'API Key', placeholder: 'fathom_xxxxxxxx', help: 'Fathom → Settings → API → Generate Key', sensitive: true },
      ],
      setupSteps: [
        'Log in to Fathom (fathom.video)',
        'Go to Settings → API',
        'Generate a new API key',
        'Paste it below',
      ],
    },
    {
      id: 'github',
      name: 'GitHub',
      icon: '🔧',
      description: 'Repositories, pull requests, deployments',
      connected: !!(cfg.github_token),
      fields: [
        { key: 'github_token', label: 'Personal Access Token', placeholder: 'ghp_xxxxxxxxxxxx', help: 'GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic) → Generate', sensitive: true },
        { key: 'github_repos', label: 'Repositories to Monitor', placeholder: 'org/repo1\norg/repo2', help: 'One repository per line (owner/repo format)', multiline: true },
      ],
      setupSteps: [
        'Go to GitHub → Settings → Developer Settings → Personal Access Tokens',
        'Generate a classic token with scopes: repo, workflow, read:org',
        'Paste the token and list your repositories below',
      ],
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: '💬',
      description: 'Commands, approvals, daily digests',
      connected: false,
      fields: [],
      setupSteps: [
        'Open Telegram and search for @BotFather',
        'Send /newbot and follow the prompts to create your bot',
        'Copy the bot token',
        'Go to Settings → Channels in the client dashboard to connect',
      ],
      linkTo: 'channels',
    },
    {
      id: 'brave',
      name: 'Web Search (Brave)',
      icon: '🔍',
      description: 'Live web research and content retrieval',
      connected: true,
      fields: [],
      setupSteps: [],
      alwaysConnected: true,
      note: 'Built into the platform — no setup required.',
    },
  ];

  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});

  const handleSave = async (integrationId: string, fields: SetupField[]) => {
    setSaving(integrationId);
    setError(null);
    try {
      const configUpdate: Record<string, string> = {};
      fields.forEach(f => {
        if (values[f.key]?.trim()) configUpdate[f.key] = values[f.key].trim();
      });

      const res = await fetch(`/api/agency/clients/${client.id}/container-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configUpdate),
      });

      if (!res.ok) throw new Error('Failed to save');
      setSaved(integrationId);
      setTimeout(() => setSaved(null), 3000);
    } catch {
      setError('Failed to save configuration. Try again.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <DemoBanner service="Integration credentials" />
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Connect Your Tools</h3>
        <p className="text-xs text-gray-500 mb-4">Step-by-step guides to connect each integration. Click an integration to expand.</p>

        <div className="space-y-3">
          {integrations.map(integration => {
            const isExpanded = expandedId === integration.id;
            return (
              <div
                key={integration.id}
                className={`rounded-xl border transition-all ${
                  isExpanded ? 'border-indigo-300 shadow-md' : 'border-gray-200 hover:border-indigo-200'
                }`}
              >
                {/* Collapsed header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : integration.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{integration.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{integration.name}</p>
                      <p className="text-xs text-gray-500">{integration.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {integration.connected || integration.alwaysConnected ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Not Connected
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    {integration.note && (
                      <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3 mt-3">{integration.note}</p>
                    )}

                    {integration.setupSteps.length > 0 && (
                      <div className="mt-3 rounded-lg bg-indigo-50 p-3">
                        <p className="text-xs font-semibold text-indigo-900 mb-2">Step-by-step guide:</p>
                        <ol className="space-y-1">
                          {integration.setupSteps.map((step, i) => (
                            <li key={i} className="text-xs text-indigo-800 flex gap-2">
                              <span className="font-semibold text-indigo-600 shrink-0">{i + 1}.</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {integration.fields.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {integration.fields.map(field => (
                          <div key={field.key}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">{field.label}</label>
                            <p className="text-[10px] text-gray-400 mb-1">{field.help}</p>
                            {field.multiline ? (
                              <textarea
                                value={values[field.key] || (cfg[field.key] as string) || ''}
                                onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                                placeholder={field.placeholder}
                                rows={4}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                              />
                            ) : (
                              <div className="relative">
                                <input
                                  type={field.sensitive && !showSensitive[field.key] ? 'password' : 'text'}
                                  value={values[field.key] || (cfg[field.key] as string) || ''}
                                  onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                                  placeholder={field.placeholder}
                                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono pr-10"
                                />
                                {field.sensitive && (
                                  <button
                                    type="button"
                                    onClick={() => setShowSensitive(s => ({ ...s, [field.key]: !s[field.key] }))}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                  >
                                    {showSensitive[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}

                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={() => handleSave(integration.id, integration.fields)}
                            disabled={saving === integration.id}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            {saving === integration.id ? 'Saving…' : 'Save Configuration'}
                          </button>
                          {saved === integration.id && (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {integration.linkTo && (
                      <p className="mt-3 text-xs text-indigo-600">
                        Complete setup in the <span className="font-semibold">{integration.linkTo}</span> section of client settings.
                      </p>
                    )}

                    {error && saving === null && (
                      <p className="mt-2 text-xs text-red-600">{error}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Sub-Tab Config ───────────────────────────────────────────────────────────

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'teams', label: 'Teams', icon: MessageCircle },
  { id: 'meetings', label: 'Meetings', icon: Mic },
  { id: 'code', label: 'Code', icon: GitBranch },
  { id: 'research', label: 'Research', icon: Search },
];

// ── Main Component ───────────────────────────────────────────────────────────

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
      {subTab === 'email' && <EmailView />}
      {subTab === 'files' && <FilesView />}
      {subTab === 'teams' && <TeamsView />}
      {subTab === 'meetings' && <MeetingsView />}
      {subTab === 'code' && <CodeView />}
      {subTab === 'research' && <ResearchView />}
    </div>
  );
}
