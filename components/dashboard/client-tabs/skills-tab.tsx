'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles, ShieldCheck, ExternalLink, Search } from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';

interface SkillDefinition {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category: 'Research' | 'Communication' | 'Knowledge' | 'Monitoring' | 'Utilities';
}

// Built-in OpenClaw skills available on every container
const BUILTIN_SKILLS: SkillDefinition[] = [
  { id: 'web-search', name: 'Web Search', desc: 'Search the internet for live information', icon: '🔍', category: 'Research' },
  { id: 'web-fetch', name: 'Web Scraper', desc: 'Extract content from any URL or webpage', icon: '🌐', category: 'Research' },
  { id: 'email', name: 'Email (IMAP/SMTP)', desc: 'Read, send, and manage emails from any account', icon: '📧', category: 'Communication' },
  { id: 'google-workspace', name: 'Google Workspace', desc: 'Gmail, Calendar, Drive, Sheets, and Docs', icon: '📅', category: 'Communication' },
  { id: 'pdf-analysis', name: 'PDF Analysis', desc: 'Read, analyze, and extract data from PDF documents', icon: '📄', category: 'Knowledge' },
  { id: 'summarize', name: 'Summarize', desc: 'Summarize URLs, podcasts, YouTube videos, and documents', icon: '📝', category: 'Knowledge' },
  { id: 'blog-monitor', name: 'Blog Monitor', desc: 'Track RSS feeds, blogs, and news for updates', icon: '📡', category: 'Monitoring' },
  { id: 'weather', name: 'Weather', desc: 'Current weather and forecasts for any location', icon: '🌤️', category: 'Utilities' },
  { id: 'voice-tts', name: 'Text-to-Speech', desc: 'Convert text responses to natural-sounding voice', icon: '🔊', category: 'Communication' },
  { id: 'image-analysis', name: 'Image Analysis', desc: 'Analyze and describe images with vision AI', icon: '🖼️', category: 'Knowledge' },
  { id: 'browser', name: 'Web Browser', desc: 'Navigate websites, fill forms, take screenshots', icon: '🖥️', category: 'Research' },
  { id: 'code-execution', name: 'Code Runner', desc: 'Execute code, scripts, and shell commands', icon: '⚡', category: 'Utilities' },
];

const CATEGORIES: Array<'All' | SkillDefinition['category']> = [
  'All',
  'Research',
  'Communication',
  'Knowledge',
  'Monitoring',
  'Utilities',
];

// ClawHub community skills — popular curated picks
interface ClawHubSkill {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category: string;
  installs: string;
  source: 'clawhub';
}

const CLAWHUB_FEATURED: ClawHubSkill[] = [
  { id: 'ch-github', name: 'GitHub', desc: 'Manage issues, PRs, code review, and CI/CD pipelines', icon: '🐙', category: 'Development', installs: '12K+', source: 'clawhub' },
  { id: 'ch-debug-pro', name: 'Debug Pro', desc: 'Structured debugging with root cause analysis', icon: '🔧', category: 'Development', installs: '8K+', source: 'clawhub' },
  { id: 'ch-docker', name: 'Docker Essentials', desc: 'Container workflows, compose, and orchestration', icon: '🐳', category: 'DevOps', installs: '6K+', source: 'clawhub' },
  { id: 'ch-apple-notes', name: 'Apple Notes', desc: 'Create, search, and manage Apple Notes', icon: '📒', category: 'Productivity', installs: '4K+', source: 'clawhub' },
  { id: 'ch-apple-reminders', name: 'Apple Reminders', desc: 'Manage reminders, lists, and scheduled tasks', icon: '✅', category: 'Productivity', installs: '3K+', source: 'clawhub' },
  { id: 'ch-obsidian', name: 'Obsidian Notes', desc: 'Work with Obsidian vaults and markdown notes', icon: '💎', category: 'Productivity', installs: '5K+', source: 'clawhub' },
  { id: 'ch-things', name: 'Things 3', desc: 'Manage Things 3 tasks, projects, and areas', icon: '☑️', category: 'Productivity', installs: '2K+', source: 'clawhub' },
  { id: 'ch-himalaya', name: 'Email (Himalaya)', desc: 'Advanced IMAP/SMTP email management', icon: '📬', category: 'Communication', installs: '3K+', source: 'clawhub' },
  { id: 'ch-whisper', name: 'Speech-to-Text', desc: 'Transcribe audio with OpenAI Whisper', icon: '🎙️', category: 'AI/ML', installs: '7K+', source: 'clawhub' },
  { id: 'ch-openai-images', name: 'Image Generator', desc: 'Generate images via OpenAI DALL-E API', icon: '🎨', category: 'AI/ML', installs: '9K+', source: 'clawhub' },
  { id: 'ch-nano-pdf', name: 'PDF Editor', desc: 'Edit PDFs with natural language instructions', icon: '✏️', category: 'Utilities', installs: '2K+', source: 'clawhub' },
  { id: 'ch-gifgrep', name: 'GIF Search', desc: 'Search and download GIFs from multiple providers', icon: '🎬', category: 'Utilities', installs: '1K+', source: 'clawhub' },
];

interface SkillsTabProps {
  client: AgencyClient;
}

export default function SkillsTab({ client }: SkillsTabProps) {
  const [enabledSkills, setEnabledSkills] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [loading, setLoading] = useState(true);
  const [savingSkillId, setSavingSkillId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMarketplace, setShowMarketplace] = useState(false);

  useEffect(() => {
    const initial = (client.settings?.enabled_skills as string[] | undefined) ?? [];
    setEnabledSkills(initial);
    setError(null);
    setLoading(false);
  }, [client.id, client.settings]);

  const visibleSkills = useMemo(() => {
    let skills = activeCategory === 'All' ? BUILTIN_SKILLS : BUILTIN_SKILLS.filter((s) => s.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      skills = skills.filter((s) => s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
    }
    return skills;
  }, [activeCategory, searchQuery]);

  const filteredMarketplace = useMemo(() => {
    if (!searchQuery.trim()) return CLAWHUB_FEATURED;
    const q = searchQuery.toLowerCase();
    return CLAWHUB_FEATURED.filter((s) => s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
  }, [searchQuery]);

  const toggleSkill = async (skillId: string) => {
    const currentlyEnabled = enabledSkills.includes(skillId);
    const nextEnabledSkills = currentlyEnabled ? enabledSkills.filter((id) => id !== skillId) : [...enabledSkills, skillId];
    setSavingSkillId(skillId);
    setError(null);
    setEnabledSkills(nextEnabledSkills);
    try {
      const response = await fetch(`/api/agency/clients/${client.id}/skills`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, enabled: !currentlyEnabled }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Failed to update skill');
      }
    } catch (err) {
      setEnabledSkills(enabledSkills);
      setError(err instanceof Error ? err.message : 'Failed to update skill');
    } finally {
      setSavingSkillId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Skills</h2>
            <p className="mt-1 text-sm text-gray-500">Enable capabilities your AI worker can use for this client.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
              <ShieldCheck className="h-4 w-4" />
              {enabledSkills.length} of {BUILTIN_SKILLS.length} enabled
            </div>
          </div>
        </div>
        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
          />
        </div>
      </div>

      {/* Toggle: Built-in vs Marketplace */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowMarketplace(false)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            !showMarketplace ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
          }`}
        >
          Built-in Skills ({BUILTIN_SKILLS.length})
        </button>
        <button
          onClick={() => setShowMarketplace(true)}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
            showMarketplace ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          ClawHub Marketplace ({CLAWHUB_FEATURED.length})
        </button>
      </div>

      {/* Built-in Skills */}
      {!showMarketplace && (
        <>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  category === activeCategory
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
              Loading client skills...
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {visibleSkills.map((skill) => {
                const enabled = enabledSkills.includes(skill.id);
                const saving = savingSkillId === skill.id;
                return (
                  <div key={skill.id} className={`rounded-xl border p-4 transition-colors ${enabled ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="text-2xl leading-none">{skill.icon}</span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900">{skill.name}</h3>
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{skill.category}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{skill.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleSkill(skill.id)}
                        disabled={saving}
                        aria-pressed={enabled}
                        aria-label={`Toggle ${skill.name}`}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${enabled ? 'bg-indigo-600' : 'bg-gray-300'} ${saving ? 'cursor-not-allowed opacity-70' : ''}`}
                      >
                        {saving ? (
                          <Loader2 className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
                        ) : (
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!loading && !visibleSkills.length && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-gray-400" />
              No skills match your search.
            </div>
          )}
        </>
      )}

      {/* ClawHub Marketplace */}
      {showMarketplace && (
        <div className="space-y-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-indigo-900">ClawHub — Community Skills Marketplace</h3>
                <p className="mt-1 text-xs text-indigo-700">Thousands of community-built skills for OpenClaw agents. Browse, install, and extend your AI worker&apos;s capabilities.</p>
              </div>
              <a href="https://clawhub.ai" target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors">
                Browse All <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {filteredMarketplace.map((skill) => (
              <div key={skill.id} className="rounded-xl border border-gray-200 bg-white p-4 hover:border-indigo-200 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none">{skill.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{skill.name}</h3>
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">{skill.category}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">⬇ {skill.installs}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{skill.desc}</p>
                  </div>
                  <a
                    href={`https://clawhub.ai/skills/${skill.id.replace('ch-', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                  >
                    View →
                  </a>
                </div>
              </div>
            ))}
          </div>

          {!filteredMarketplace.length && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-gray-400" />
              No marketplace skills match your search.
            </div>
          )}

          {/* LarryBrain Premium Skills */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-amber-900">🧠 LarryBrain — Premium Skills</h3>
                <p className="mt-1 text-xs text-amber-700">Professional-grade skills with dedicated support, security audits, and enterprise features.</p>
              </div>
              <a href="https://www.larrybrain.com/skills" target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors">
                Browse Premium <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
