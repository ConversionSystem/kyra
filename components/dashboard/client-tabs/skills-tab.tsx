'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Loader2, Sparkles, ShieldCheck, ExternalLink, Search,
  Download, Check, Trash2, RefreshCw, TrendingUp,
} from 'lucide-react';
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
  'All', 'Research', 'Communication', 'Knowledge', 'Monitoring', 'Utilities',
];

// ClawHub live skill from API
interface ClawHubSkill {
  slug: string;
  name: string;
  description: string;
  version: string;
  author: string;
  downloads: number;
  category: string;
  tags: string[];
  url: string;
}

interface InstalledSkill {
  slug: string;
  version: string;
  installed_at: string;
  status: string;
}

interface SkillsTabProps {
  client: AgencyClient;
}

// Format download count
function formatDownloads(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export default function SkillsTab({ client }: SkillsTabProps) {
  const [enabledSkills, setEnabledSkills] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [loading, setLoading] = useState(true);
  const [savingSkillId, setSavingSkillId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMarketplace, setShowMarketplace] = useState(false);

  // ClawHub live state
  const [clawHubSkills, setClawHubSkills] = useState<ClawHubSkill[]>([]);
  const [clawHubLoading, setClawHubLoading] = useState(false);
  const [clawHubSearch, setClawHubSearch] = useState('');
  const [clawHubSearchInput, setClawHubSearchInput] = useState('');
  const [installedSkills, setInstalledSkills] = useState<InstalledSkill[]>([]);
  const [installingSlug, setInstallingSlug] = useState<string | null>(null);
  const [uninstallingSlug, setUninstallingSlug] = useState<string | null>(null);

  useEffect(() => {
    const initial = (client.settings?.enabled_skills as string[] | undefined) ?? [];
    const installed = (client.settings?.installed_clawhub_skills as InstalledSkill[] | undefined) ?? [];
    setEnabledSkills(initial);
    setInstalledSkills(installed);
    setError(null);
    setLoading(false);
  }, [client.id, client.settings]);

  // Fetch ClawHub skills
  const fetchClawHub = useCallback(async (query?: string) => {
    setClawHubLoading(true);
    try {
      const params = new URLSearchParams();
      if (query && query.trim()) params.set('q', query.trim());
      params.set('limit', '30');

      const res = await fetch(`/api/clawhub?${params}`);
      if (res.ok) {
        const data = await res.json();
        setClawHubSkills(data.skills || []);
      }
    } catch {
      // Silent — will show empty state
    } finally {
      setClawHubLoading(false);
    }
  }, []);

  // Load ClawHub when marketplace tab opens
  useEffect(() => {
    if (showMarketplace && clawHubSkills.length === 0 && !clawHubLoading) {
      fetchClawHub();
    }
  }, [showMarketplace, clawHubSkills.length, clawHubLoading, fetchClawHub]);

  // Search ClawHub with debounce
  useEffect(() => {
    if (!showMarketplace) return;
    const timer = setTimeout(() => {
      setClawHubSearch(clawHubSearchInput);
      fetchClawHub(clawHubSearchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [clawHubSearchInput, showMarketplace, fetchClawHub]);

  const visibleSkills = useMemo(() => {
    let skills = activeCategory === 'All' ? BUILTIN_SKILLS : BUILTIN_SKILLS.filter((s) => s.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      skills = skills.filter((s) => s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
    }
    return skills;
  }, [activeCategory, searchQuery]);

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

  // Install ClawHub skill
  const installSkill = async (slug: string) => {
    setInstallingSlug(slug);
    try {
      const res = await fetch('/api/clawhub/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, skillSlug: slug }),
      });
      if (res.ok) {
        setInstalledSkills((prev) => [
          ...prev,
          { slug, version: 'latest', installed_at: new Date().toISOString(), status: 'installed' },
        ]);
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || 'Failed to install');
      }
    } catch {
      setError('Failed to install skill');
    } finally {
      setInstallingSlug(null);
    }
  };

  // Uninstall ClawHub skill
  const uninstallSkill = async (slug: string) => {
    setUninstallingSlug(slug);
    try {
      const res = await fetch(`/api/clawhub/install?clientId=${client.id}&skillSlug=${slug}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setInstalledSkills((prev) => prev.filter((s) => s.slug !== slug));
      }
    } catch {
      setError('Failed to uninstall skill');
    } finally {
      setUninstallingSlug(null);
    }
  };

  const isInstalled = (slug: string) => installedSkills.some((s) => s.slug === slug);

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
            {installedSkills.length > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                <Download className="h-4 w-4" />
                {installedSkills.length} from ClawHub
              </div>
            )}
          </div>
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
          ClawHub Marketplace
          {installedSkills.length > 0 && (
            <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
              {installedSkills.length} installed
            </span>
          )}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* Built-in Skills */}
      {!showMarketplace && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search built-in skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
          </div>

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

      {/* ClawHub Marketplace — LIVE */}
      {showMarketplace && (
        <div className="space-y-4">
          {/* Search ClawHub */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search ClawHub skills (sales, email, CRM, calendar...)"
              value={clawHubSearchInput}
              onChange={(e) => setClawHubSearchInput(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            />
            {clawHubLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {/* Installed skills section */}
          {installedSkills.length > 0 && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Installed ({installedSkills.length})
              </p>
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {installedSkills.map((skill) => (
                  <div key={skill.slug} className="flex items-center justify-between bg-white rounded-lg border border-emerald-100 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{skill.slug}</p>
                      <p className="text-[11px] text-gray-400">v{skill.version} · installed {new Date(skill.installed_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => uninstallSkill(skill.slug)}
                      disabled={uninstallingSlug === skill.slug}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Uninstall"
                    >
                      {uninstallingSlug === skill.slug
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Browse header */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-indigo-900">ClawHub — Community Skills Marketplace</h3>
                <p className="mt-1 text-xs text-indigo-700">
                  Live skills from clawhub.com. Install to extend your AI worker&apos;s capabilities.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => fetchClawHub(clawHubSearch)}
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" /> Refresh
                </button>
                <a
                  href="https://clawhub.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  Browse All <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Skills grid */}
          {clawHubLoading && clawHubSkills.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading from ClawHub...
            </div>
          ) : clawHubSkills.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-gray-400" />
              {clawHubSearch ? `No skills match "${clawHubSearch}"` : 'No skills found. Try searching for something.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {clawHubSkills.map((skill) => {
                const installed = isInstalled(skill.slug);
                const installing = installingSlug === skill.slug;

                return (
                  <div
                    key={skill.slug}
                    className={`rounded-xl border p-4 transition-colors ${
                      installed ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-white hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-gray-100 p-2 text-lg leading-none shrink-0">
                        {skill.category === 'Development' ? '🔧' :
                         skill.category === 'Communication' ? '💬' :
                         skill.category === 'Productivity' ? '📋' :
                         skill.category === 'AI/ML' ? '🧠' :
                         skill.category === 'DevOps' ? '🚀' :
                         '⚡'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-gray-900">{skill.name}</h3>
                          {skill.category && (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                              {skill.category}
                            </span>
                          )}
                          {skill.downloads > 0 && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 flex items-center gap-0.5">
                              <TrendingUp className="h-2.5 w-2.5" /> {formatDownloads(skill.downloads)}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{skill.description}</p>
                        {skill.author && (
                          <p className="mt-1 text-[11px] text-gray-400">by {skill.author} · v{skill.version}</p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        {installed ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <Check className="h-3 w-3" /> Installed
                          </span>
                        ) : (
                          <button
                            onClick={() => installSkill(skill.slug)}
                            disabled={installing}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                          >
                            {installing
                              ? <><Loader2 className="h-3 w-3 animate-spin" /> Installing...</>
                              : <><Download className="h-3 w-3" /> Install</>}
                          </button>
                        )}
                        <a
                          href={skill.url || `https://clawhub.com/skills/${skill.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-gray-200 p-1 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                          title="View on ClawHub"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
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
