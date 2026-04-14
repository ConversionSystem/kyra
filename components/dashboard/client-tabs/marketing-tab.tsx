'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  LayoutDashboard,
  PenTool,
  Smartphone,
  Mail,
  ArrowRight,
  Loader2,
  Plus,
  Copy,
  Check,
  AlertTriangle,
  ExternalLink,
  Trash2,
  RefreshCw,
  Calendar,
  Users,
  Zap,
  TrendingUp,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Star,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import EmailMarketingTab from './email-marketing-tab';
import CampaignsSubTab from './campaigns-sub-tab';
import SMSCampaignsSubTab from './sms-campaigns-sub-tab';
import ReviewsSubTab from './reviews-sub-tab';
import WorkflowsTab from './workflows-tab';
import { EmailSequencesDashboard } from '@/app/(dashboard)/agency/email/email-sequences-dashboard';

// ── Types ────────────────────────────────────────────────────────────────────

type SubTab = 'dashboard' | 'social' | 'email' | 'sequences' | 'campaigns' | 'sms' | 'reviews' | 'workflows';

interface SocialDraft {
  id: string;
  platform: string;
  topic: string;
  body: string;
  status: 'draft' | 'posted';
  created: string;
  day?: string;
}

interface WorkerTeamConfig {
  enabled?: boolean;
  members?: Array<{ worker_id: string; role: string; name?: string }>;
  handoff_style?: string;
  primary_worker_id?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="text-center py-12 px-6">
      <Icon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function DraftBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
      DRAFT — awaiting approval
    </span>
  );
}

function ThreatBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const map = {
    high: { emoji: '🔴', bg: 'bg-red-100 text-red-700', label: 'High threat' },
    medium: { emoji: '🟡', bg: 'bg-amber-100 text-amber-700', label: 'Medium' },
    low: { emoji: '🟢', bg: 'bg-green-100 text-green-700', label: 'Low' },
  };
  const t = map[level];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${t.bg}`}>
      {t.emoji} {t.label}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function ConnectBanner({ service, settingsPath }: { service: string; settingsPath?: string }) {
  return (
    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 mb-4 flex items-start gap-3">
      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium text-amber-800">Connect {service} for live data</p>
        <p className="text-xs text-amber-600 mt-0.5">
          {settingsPath
            ? `Go to Settings → Secrets to add your ${service} credentials.`
            : `Configure ${service} in your agency settings to enable this feature.`}
        </p>
      </div>
    </div>
  );
}

/** Strip markdown code fences from LLM replies before parsing JSON */
function stripCodeFences(text: string): string {
  return text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
}

/** Try to parse a JSON array from an LLM reply (handles code fences, markdown wrapping) */
function parseJsonArray(reply: string): Array<Record<string, unknown>> | null {
  const cleaned = stripCodeFences(reply);
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

/** Send a message to the AI worker chat and get the reply text. */
async function sendChatPrompt(clientId: string, message: string): Promise<string> {
  const res = await fetch(`/api/agency/clients/${clientId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Chat API ${res.status}: ${errText.slice(0, 100)}`);
  }

  // Handle SSE stream
  if (res.headers.get('content-type')?.includes('text/event-stream')) {
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let fullText = '';
    let doneText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          // Handle { type: "content", content: "..." } — accumulate chunks
          if (parsed.type === 'content' && parsed.content) {
            fullText += parsed.content;
          }
          // Handle { type: "done", fullResponse: "..." } — definitive complete text
          if (parsed.type === 'done' && parsed.fullResponse) {
            doneText = parsed.fullResponse;
          }
          // OpenAI SSE format fallback
          if (parsed.choices?.[0]?.delta?.content) {
            fullText += parsed.choices[0].delta.content;
          }
        } catch {
          // ignore parse errors
        }
      }
    }
    // Prefer the done event fullResponse (most accurate), fall back to accumulated chunks
    return (doneText || fullText).trim();
  }

  // Non-streaming JSON response
  const data = await res.json();
  return String(data.reply || data.message || data.response || data.content || '').trim();
}

/** Extract readable text from AI replies that may contain JSON arrays. */
function extractTextFromAIReply(reply: string): string {
  const trimmed = reply.trim();
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as Array<Record<string, unknown>>;
      if (Array.isArray(parsed) && parsed[0]?.body) {
        return parsed.map(p => `**${p.platform}**\n\n${p.body}`).join('\n\n---\n\n');
      }
    } catch { /* not JSON */ }
  }
  return trimmed;
}

// ── AI Worker Status Helper ──────────────────────────────────────────────────

function useWorkerStatus(client: AgencyClient) {
  const cfg = client.container_config || {};
  const activeWorkerId = cfg.active_worker_id as string | undefined;
  const workerTeam = cfg.worker_team as WorkerTeamConfig | undefined;

  const isMarketingWorker = activeWorkerId === 'ai-marketing-worker';
  const isInTeam = workerTeam?.enabled && workerTeam.members?.some(m => m.worker_id === 'ai-marketing-worker');
  const isActive = isMarketingWorker || !!isInTeam;

  const teamMembers = workerTeam?.enabled ? workerTeam.members : undefined;

  return { isActive, isMarketingWorker, isInTeam, teamMembers, activeWorkerId };
}

// ── Setup Steps (module scope) ──────────────────────────────────────────────

const SETUP_STEPS = [
  {
    label: "Draft your first social post",
    hint: "Use the Social tab to generate platform-specific social media posts",
    check: (cfg: Record<string, unknown>) => !!(cfg.first_social_generated),
    tab: "social",
    action: "Create social post",
  },
];

// ── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView({ client, onNavigate }: { client: AgencyClient; onNavigate: (tab: SubTab) => void }) {
  const clientId = client.id;
  const [stats, setStats] = useState({ conversations: 0, pages: 0, contacts: 0, activities: 0 });
  const [activities, setActivities] = useState<Array<{ type: string; subject: string; body: string; created_at: string; actor: string }>>([]);
  const [loading, setLoading] = useState(true);
  const { isActive, isMarketingWorker, isInTeam, teamMembers, activeWorkerId } = useWorkerStatus(client);
  const cfg = client.container_config || {};
  const isSetupComplete = SETUP_STEPS.every(s => s.check(cfg));

  useEffect(() => {
    async function load() {
      try {
        const [convRes, pagesRes, contactsRes, actRes] = await Promise.allSettled([
          fetch(`/api/agency/clients/${clientId}/conversations?limit=20`).then(r => r.json()),
          fetch(`/api/agency/sites?clientId=${clientId}`).then(r => r.json()),
          fetch(`/api/agency/crm/contacts?clientId=${clientId}&limit=1`).then(r => r.json()),
          fetch(`/api/agency/clients/${clientId}/ghl/actions?limit=10`).then(r => r.json()),
        ]);

        setStats({
          conversations: convRes.status === 'fulfilled' ? (convRes.value?.total ?? convRes.value?.conversations?.length ?? 0) : 0,
          pages: pagesRes.status === 'fulfilled' ? (pagesRes.value?.data?.[0]?.pages_count || 0) : 0,
          contacts: contactsRes.status === 'fulfilled' ? (contactsRes.value?.total ?? contactsRes.value?.data?.length ?? 0) : 0,
          activities: actRes.status === 'fulfilled' ? (actRes.value?.data?.length || 0) : 0,
        });

        // Pull recent activities from client-specific conversations
        if (convRes.status === 'fulfilled') {
          const convs = convRes.value?.conversations || [];
          setActivities(convs.slice(0, 10).map((c: Record<string, unknown>) => ({
            type: 'conversation',
            subject: `AI responded via ${String(c.channel || 'chat').replace('_', ' ')}`,
            body: String(c.user_message || '').slice(0, 80),
            created_at: String(c.created_at || ''),
            actor: 'ai',
          })));
        }
      } catch {
        // Non-fatal — show zeros
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Marketing Worker Status Card */}
      <div className={`rounded-xl border p-5 ${isActive ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isActive ? 'bg-green-100' : 'bg-amber-100'}`}>
            <Zap className={`h-5 w-5 ${isActive ? 'text-green-700' : 'text-amber-700'}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-sm font-semibold ${isActive ? 'text-green-800' : 'text-amber-800'}`}>
              {isActive ? 'AI Marketing Worker — Active' : 'AI Marketing Worker — Not Applied'}
            </h3>
            {isActive ? (
              <>
                <p className="text-xs text-green-600 mt-0.5">
                  {isMarketingWorker && !isInTeam && 'Running as primary worker. All marketing modes enabled.'}
                  {isInTeam && teamMembers && (
                    <>Marketing team: {teamMembers.map(m => m.name || m.worker_id).join(' + ')}</>
                  )}
                  {isInTeam && !teamMembers && 'Part of an active AI team.'}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs text-amber-600 mt-0.5">
                  Apply the AI Marketing Worker to unlock full marketing capabilities — content creation, competitor intel, and social drafting.
                </p>
                <button
                  onClick={() => {
                    // Navigate to AI Workers tab (parent tab navigation)
                    const el = document.querySelector('[data-tab-id="ai-workers"]') as HTMLButtonElement;
                    if (el) el.click();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 text-xs font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
                >
                  Go to AI Workers <ArrowRight className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tools Status — shown when worker is active */}
      {isActive && (() => {
        const installedSkills = (client.settings?.installed_clawhub_skills as Array<{slug:string}> | undefined) ?? [];
        const hasFirecrawl = installedSkills.some(s => s.slug === 'firecrawl-cli');
        const hasBlogwatcher = installedSkills.some(s => s.slug === 'blogwatcher');
        return (
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Web Intelligence (Firecrawl)', active: hasFirecrawl },
              { label: 'Blog Monitor', active: hasBlogwatcher },
            ].map(t => (
              <div key={t.label} className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border ${t.active ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${t.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                {t.label}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Setup Checklist — shown when worker is active but config is incomplete */}
      {isActive && !isSetupComplete && (
        <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-indigo-100">
              <Sparkles className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-indigo-900">Complete Your AI Marketing Setup</h3>
              <p className="text-xs text-indigo-600 mt-0.5">Your AI Marketing Worker is live — finish setup to unlock full capabilities.</p>
            </div>
          </div>

          <div className="space-y-2">
            {SETUP_STEPS.map((step, i) => {
              const done = step.check(cfg);
              return (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${done ? "bg-white/60" : "bg-white"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${done ? "bg-green-500 text-white" : "bg-indigo-600 text-white"}`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${done ? "text-gray-400 line-through" : "text-gray-900"}`}>{step.label}</p>
                    {!done && <p className="text-xs text-gray-500 mt-0.5">{step.hint}</p>}
                  </div>
                  {!done && (
                    <button
                      onClick={() => onNavigate(step.tab as SubTab)}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                    >
                      {step.action} →
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {SETUP_STEPS.filter(s => !s.check(cfg)).length === 0 && (
            <p className="text-xs text-green-700 font-medium mt-3 text-center">🎉 Setup complete! Your AI Marketing Worker is fully configured.</p>
          )}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Conversations" value={stats.conversations} sub="Total AI conversations" />
        <MetricCard label="Site Pages" value={stats.pages} sub="Generated content pages" />
        <MetricCard label="Contacts" value={stats.contacts} sub="CRM contacts captured" />
        <MetricCard label="AI Actions" value={stats.activities} sub="Actions taken by AI" />
      </div>

      {/* Clarification when worker is not applied */}
      {!isActive && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
          Stats shown reflect actual data from this client. Apply the AI Marketing Worker to unlock content creation, social drafting, and campaign features.
        </p>
      )}

      {/* Recent Activity — from CRM activities */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h3>
        {activities.length > 0 ? (
          <div className="space-y-2.5">
            {activities.map((a, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 text-base">
                  {a.type.includes('message') || a.type.includes('chat') ? '💬' :
                   a.type.includes('lead') || a.type.includes('contact') ? '🎯' :
                   a.type.includes('book') || a.type.includes('appointment') ? '📅' :
                   a.type.includes('email') ? '📧' :
                   a.type.includes('content') || a.type.includes('seo') ? '📝' :
                   a.actor === 'ai' ? '🤖' : '⚡'}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-gray-700">{a.subject}</span>
                  {a.body && <p className="text-xs text-gray-400 truncate mt-0.5">{a.body}</p>}
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                  {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4 text-center">
            No activity yet. Activity will appear here as your AI worker handles conversations, books appointments, and captures leads.
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Draft Social Posts', tab: 'social' as SubTab, icon: Smartphone },
            { label: 'Email Campaign', tab: 'email' as SubTab, icon: Mail },
            { label: 'Reviews', tab: 'reviews' as SubTab, icon: Star },
          ].map(a => (
            <button
              key={a.tab}
              onClick={() => onNavigate(a.tab)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <a.icon className="w-3.5 h-3.5" />
              {a.label} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Social View ──────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', icon: '🔵' },
  { id: 'twitter', label: 'Twitter/X', icon: '🐦' },
  { id: 'instagram', label: 'Instagram', icon: '📸' },
] as const;

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const SOCIAL_HELP = [
  { title: "Select your platforms", body: "Toggle which platforms you want posts for: LinkedIn, Twitter/X, or Instagram. The AI tailors the format and tone for each platform automatically." },
  { title: "Type a topic and click Generate", body: "Enter any topic (e.g. \"how AI saves agencies 10 hours a week\"). The AI will write platform-specific posts in your brand voice." },
  { title: "Drafts stay in your queue until you post", body: "All social posts are saved as drafts. Copy the text to post manually, or click \"Mark as Posted\" to track what went live. Nothing is ever auto-posted." },
];

function SocialView({ client }: { client: AgencyClient }) {
  const clientId = client.id;
  const cfg = client.container_config || {};
  const businessName = (cfg.business_name as string) || client.name;
  const industry = (cfg.industry as string) || client.industry || '';
  const brandTone = (cfg.brand_tone as string) || 'Professional and engaging';
  const linkedinTargets = (cfg.linkedin_targets as string) || '';

  const [postTopic, setPostTopic] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set(['linkedin']));
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<SocialDraft[]>([]);
  const [activeSection, setActiveSection] = useState<'generate' | 'calendar' | 'engagement'>('generate');
  const [showHelp, setShowHelp] = useState(false);

  // Persist drafts in localStorage so they survive browser close
  useEffect(() => {
    const saved = localStorage.getItem(`kyra-social-drafts-${clientId}`);
    if (saved) { try { setDrafts(JSON.parse(saved)); } catch {} }
  }, [clientId]);
  useEffect(() => {
    localStorage.setItem(`kyra-social-drafts-${clientId}`, JSON.stringify(drafts));
  }, [drafts, clientId]);

  // Engagement comments
  const [engagementLoading, setEngagementLoading] = useState(false);
  const [engagementComments, setEngagementComments] = useState('');

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // keep at least one
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleGenerate = useCallback(async () => {
    if (!postTopic.trim() || selectedPlatforms.size === 0) return;
    setGenerating(true);
    try {
      const platforms = Array.from(selectedPlatforms).map(id => PLATFORMS.find(p => p.id === id)!.label);
      const prompt = `Write social media posts for ${businessName} (${industry || 'general industry'}) about: "${postTopic}". Brand tone: ${brandTone}.

Generate a separate post for EACH of these platforms: ${platforms.join(', ')}

Return ONLY a JSON array (no markdown, no explanation):
[{"platform":"LinkedIn","body":"Post content here..."},{"platform":"Twitter/X","body":"Tweet content here..."}]

Requirements per platform:
- LinkedIn: Professional, thought leadership, 150-300 words, use paragraphs and line breaks, end with a question or CTA
- Twitter/X: Concise, punchy, under 280 characters, use relevant hashtags
- Instagram: Visual-friendly caption, use emojis, include relevant hashtags at the end, 100-200 words`;

      const reply = await sendChatPrompt(clientId, prompt);

      const jsonMatch = reply.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
          const newDrafts = parsed.map(p => ({
            id: `social-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            platform: String(p.platform || ''),
            topic: postTopic,
            body: String(p.body || ''),
            status: 'draft' as const,
            created: new Date().toISOString(),
          }));
          setDrafts(prev => [...newDrafts, ...prev]);
          setPostTopic('');
        } catch {
          // Fallback: single draft with full reply
          setDrafts(prev => [{
            id: `social-${Date.now()}`,
            platform: platforms[0],
            topic: postTopic,
            body: reply,
            status: 'draft' as const,
            created: new Date().toISOString(),
          }, ...prev]);
        }
      } else {
        // No JSON — create one draft per platform with the full reply
        const newDrafts = platforms.map(p => ({
          id: `social-${Date.now()}-${p}`,
          platform: p,
          topic: postTopic,
          body: reply,
          status: 'draft' as const,
          created: new Date().toISOString(),
        }));
        setDrafts(prev => [...newDrafts, ...prev]);
      }
    } catch { /* handled */ }
    finally { setGenerating(false); }
  }, [postTopic, selectedPlatforms, clientId, businessName, industry, brandTone]);

  const generateForDay = useCallback(async (day: string) => {
    if (generating) return;
    setGenerating(true);
    try {
      const platforms = Array.from(selectedPlatforms).map(id => PLATFORMS.find(p => p.id === id)!.label);
      const platformList = platforms.join(', ');
      const prompt = platforms.length === 1
        ? `Write a ${platforms[0]} post for ${businessName} (${industry || 'general industry'}). This is for ${day}. Brand tone: ${brandTone}. Pick a relevant topic for the day/week and make it engaging. Return just the post text, no JSON.`
        : `Write social media posts for ${businessName} (${industry || 'general industry'}) for ${day}. Brand tone: ${brandTone}. Pick a relevant topic for the day/week.

Generate a separate post for EACH of these platforms: ${platformList}

Return ONLY a JSON array (no markdown, no explanation):
[{"platform":"LinkedIn","body":"Post content here..."}]`;

      const reply = await sendChatPrompt(clientId, prompt);

      if (platforms.length === 1) {
        setDrafts(prev => [{
          id: `social-${Date.now()}-${day}`,
          platform: platforms[0],
          topic: `${day} post`,
          body: reply,
          status: 'draft' as const,
          created: new Date().toISOString(),
          day,
        }, ...prev]);
      } else {
        const jsonMatch = reply.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
            const newDrafts = parsed.map(p => ({
              id: `social-${Date.now()}-${day}-${Math.random().toString(36).slice(2, 6)}`,
              platform: String(p.platform || ''),
              topic: `${day} post`,
              body: String(p.body || ''),
              status: 'draft' as const,
              created: new Date().toISOString(),
              day,
            }));
            setDrafts(prev => [...newDrafts, ...prev]);
          } catch {
            setDrafts(prev => [{
              id: `social-${Date.now()}-${day}`,
              platform: platforms[0],
              topic: `${day} post`,
              body: reply,
              status: 'draft' as const,
              created: new Date().toISOString(),
              day,
            }, ...prev]);
          }
        } else {
          const newDrafts = platforms.map(p => ({
            id: `social-${Date.now()}-${day}-${p}`,
            platform: p,
            topic: `${day} post`,
            body: reply,
            status: 'draft' as const,
            created: new Date().toISOString(),
            day,
          }));
          setDrafts(prev => [...newDrafts, ...prev]);
        }
      }
    } catch { /* handled */ }
    finally { setGenerating(false); }
  }, [generating, selectedPlatforms, clientId, businessName, industry, brandTone]);

  const markAsPosted = (id: string) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, status: 'posted' as const } : d));
  };

  const deleteDraft = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
  };

  const draftEngagementComments = useCallback(async () => {
    setEngagementLoading(true);
    setEngagementComments('');
    try {
      const targets = linkedinTargets || 'relevant accounts in our industry';
      const prompt = `Mode 4: Draft 3 engagement comments for LinkedIn. Target accounts: ${targets}. Rotate styles: data point, personal experience, thoughtful question, different perspective.

For each comment, include:
1. Which target account it's for
2. A suggested post topic to comment on
3. The actual comment draft (2-4 sentences, genuine and helpful)

Make them feel authentic, not salesy. Each should offer genuine value.`;

      const reply = await sendChatPrompt(clientId, prompt);
      if (!reply) {
        setEngagementComments('No response received. Make sure your AI Marketing Worker is deployed and running.');
        return;
      }
      setEngagementComments(reply);
    } catch { /* handled */ }
    finally { setEngagementLoading(false); }
  }, [clientId, linkedinTargets]);

  const platformIcon = (name: string) => {
    const p = PLATFORMS.find(p => p.label.toLowerCase().includes(name.toLowerCase()) || p.id === name.toLowerCase());
    return p?.icon || '📱';
  };

  // Calendar: figure out current week's days
  const weekDays = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    return WEEKDAYS.map((label, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const hasContent = drafts.some(d => d.day === label);
      const isToday = date.toDateString() === today.toDateString();
      return { label, dateStr, hasContent, isToday };
    });
  }, [drafts]);

  return (
    <div className="space-y-6">
      {/* How to use this tab */}
      <div className="rounded-xl border border-blue-100 bg-blue-50">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">💡</span>
            <span className="text-sm font-medium text-blue-800">How to use this tab</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-blue-500 transition-transform ${showHelp ? "rotate-180" : ""}`} />
        </button>
        {showHelp && (
          <div className="px-4 pb-4 space-y-2 border-t border-blue-100">
            {SOCIAL_HELP.map((step, i) => (
              <div key={i} className="flex gap-3 pt-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{i+1}</span>
                <div>
                  <p className="text-sm font-medium text-blue-900">{step.title}</p>
                  <p className="text-xs text-blue-700 mt-0.5">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section Toggle */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'generate' as const, label: 'Generate Posts', icon: PenTool },
          { id: 'calendar' as const, label: 'Calendar', icon: Calendar },
          { id: 'engagement' as const, label: 'Engagement', icon: MessageSquare },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeSection === s.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <s.icon className="w-3.5 h-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Generate Section */}
      {activeSection === 'generate' && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Social Content Studio</h3>
          <p className="text-xs text-gray-500 mb-4">Generate platform-specific posts. Select multiple platforms to generate all at once.</p>

          {/* Platform Selector */}
          <div className="flex gap-2 mb-4">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  selectedPlatforms.has(p.id)
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 mb-4">
            <input
              value={postTopic}
              onChange={e => setPostTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="Topic or idea for the post..."
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleGenerate}
              disabled={generating || !postTopic.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
              Generate {selectedPlatforms.size > 1 ? `(${selectedPlatforms.size})` : ''}
            </button>
          </div>
        </div>
      )}

      {/* Calendar Section */}
      {activeSection === 'calendar' && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Weekly Calendar</h3>
          <p className="text-xs text-gray-500 mb-4">Click a day to generate content. Filled slots show scheduled drafts.</p>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
              <button
                key={day.label}
                onClick={() => !day.hasContent && generateForDay(day.label)}
                disabled={generating}
                className={`rounded-lg border p-3 text-center transition-colors ${
                  day.isToday ? 'border-indigo-300 bg-indigo-50' :
                  day.hasContent ? 'border-green-200 bg-green-50' :
                  'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <p className={`text-xs font-medium ${day.isToday ? 'text-indigo-600' : 'text-gray-500'}`}>
                  {day.label}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{day.dateStr}</p>
                {day.hasContent ? (
                  <Check className="w-4 h-4 text-green-600 mx-auto mt-1" />
                ) : (
                  <Plus className="w-4 h-4 text-gray-300 mx-auto mt-1" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Engagement Section */}
      {activeSection === 'engagement' && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">LinkedIn Engagement Comments</h3>
          <p className="text-xs text-gray-500 mb-4">
            Draft thoughtful engagement comments for target accounts.
            {linkedinTargets ? '' : ' Set LinkedIn Target Accounts in the AI Workers tab for personalized results.'}
          </p>

          <button
            onClick={draftEngagementComments}
            disabled={engagementLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 mb-4"
          >
            {engagementLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            Draft Engagement Comments
          </button>

          {engagementComments && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 relative">
              <div className="absolute top-3 right-3">
                <CopyButton text={engagementComments} />
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap pr-8">{engagementComments}</p>
            </div>
          )}
        </div>
      )}

      {/* Draft Queue */}
      {drafts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Draft Queue ({drafts.filter(d => d.status === 'draft').length} pending)
          </h3>
          <div className="space-y-3">
            {drafts.map(d => (
              <div key={d.id} className="border border-gray-200 rounded-xl p-4 relative">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{platformIcon(d.platform)}</span>
                  <span className="text-sm font-medium text-gray-900">{d.platform}</span>
                  {d.day && <span className="text-xs text-gray-400">· {d.day}</span>}
                  <span className="text-xs text-gray-400">· {d.topic}</span>
                  <div className="ml-auto">
                    {d.status === 'draft' ? (
                      <DraftBadge />
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                        ✓ Posted
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{d.body}</p>
                <div className="flex items-center gap-2 mt-3">
                  <CopyButton text={d.body} />
                  {d.status === 'draft' && (
                    <button
                      onClick={() => markAsPosted(d.id)}
                      className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium"
                    >
                      <Check className="w-3 h-3" /> Mark as Posted
                    </button>
                  )}
                  <button
                    onClick={() => deleteDraft(d.id)}
                    className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sequences View ───────────────────────────────────────────────────────────

interface EmailSequence {
  id: string;
  name: string;
  status: string;
  step_count: number;
  created_at: string;
}

function SequencesView({ client }: { client: AgencyClient }) {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agency/email/sequences');
      if (res.ok) { const data = await res.json(); setSequences(Array.isArray(data) ? data : data.sequences || []); }
    } catch (err) { console.error('[marketing-tab] sequences', err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusBadge = (status: string) => {
    if (status === 'active') return 'bg-green-100 text-green-700';
    if (status === 'paused') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-500';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Email Sequences</h3>
          <p className="text-xs text-gray-500 mt-0.5">Automated multi-step email campaigns for {client.name}.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4" />Create Sequence
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : sequences.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-center">
          <Mail className="w-8 h-8 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No sequences yet</p>
          <p className="text-xs text-gray-400 mt-1">Create a sequence to start automating your email outreach.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Sequence</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Steps</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sequences.map(seq => (
                <tr key={seq.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{seq.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(seq.status)}`}>
                      {seq.status.charAt(0).toUpperCase() + seq.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{seq.step_count} steps</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(seq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'social', label: 'Social', icon: Smartphone },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'sequences', label: 'Sequences', icon: Mail },
  { id: 'campaigns', label: 'Campaigns', icon: Zap },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'workflows', label: 'Workflows', icon: Zap },
];

// Only Kyra's main agency (ConversionSystem) gets full Marketing access
const KYRA_MAIN_AGENCY_ID = '1511e077-77ef-4c47-81fd-06a3bc9f1dbb';

export default function MarketingTab({ client }: { client: AgencyClient }) {
  const [subTab, setSubTab] = useState<SubTab>('dashboard');

  // Lock Marketing for all agencies except Kyra's main account
  const isKyraMain = client.agency_id === KYRA_MAIN_AGENCY_ID;

  if (!isKyraMain) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-6">
          <Sparkles className="w-8 h-8 text-indigo-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Marketing Command Center</h2>
        <p className="text-gray-500 max-w-md mb-1">AI-powered content creation, competitor intelligence, social media, email campaigns, and more.</p>
        <span className="inline-block mt-4 px-5 py-2 bg-indigo-50 text-indigo-600 text-sm font-semibold rounded-full border border-indigo-200">Coming Soon</span>
        <p className="text-xs text-gray-400 mt-4 max-w-sm">The Marketing Command Center is currently in private beta. It will be available to all agencies in an upcoming release.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Marketing Command Center</h2>
        <p className="text-sm text-gray-500 mt-0.5">Social, email, campaigns &amp; workflows — powered by your AI Marketing Worker.</p>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex flex-nowrap gap-1 border-b border-gray-200 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
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
      {subTab === 'dashboard' && <DashboardView client={client} onNavigate={setSubTab} />}
      {subTab === 'social' && <SocialView client={client} />}
      {subTab === 'email' && <EmailMarketingTab client={client} />}
      {subTab === 'sequences' && <EmailSequencesDashboard />}
      {subTab === 'sms' && <SMSCampaignsSubTab client={client} />}
      {subTab === 'campaigns' && <CampaignsSubTab client={client} />}
      {subTab === 'reviews' && <ReviewsSubTab client={client} />}
      {subTab === 'workflows' && <WorkflowsTab client={client} />}
    </div>
  );
}
