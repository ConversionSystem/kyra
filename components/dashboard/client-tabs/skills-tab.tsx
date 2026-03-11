'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';

interface SkillDefinition {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category: 'Research' | 'Communication' | 'Knowledge' | 'Monitoring' | 'Utilities';
}

const SKILLS: SkillDefinition[] = [
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

interface SkillsTabProps {
  client: AgencyClient;
}

export default function SkillsTab({ client }: SkillsTabProps) {
  const [enabledSkills, setEnabledSkills] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>('All');
  const [loading, setLoading] = useState(true);
  const [savingSkillId, setSavingSkillId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initial = (client.settings?.enabled_skills as string[] | undefined) ?? [];
    setEnabledSkills(initial);
    setError(null);
    setLoading(false);
  }, [client.id, client.settings]);

  const visibleSkills = useMemo(() => {
    if (activeCategory === 'All') return SKILLS;
    return SKILLS.filter((skill) => skill.category === activeCategory);
  }, [activeCategory]);

  const toggleSkill = async (skillId: string) => {
    const currentlyEnabled = enabledSkills.includes(skillId);
    const nextEnabledSkills = currentlyEnabled
      ? enabledSkills.filter((id) => id !== skillId)
      : [...enabledSkills, skillId];

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
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Skills</h2>
            <p className="mt-1 text-sm text-gray-500">Enable capabilities your AI worker can use for this client.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
            <ShieldCheck className="h-4 w-4" />
            {enabledSkills.length} of {SKILLS.length} enabled
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => {
          const active = category === activeCategory;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {category}
            </button>
          );
        })}
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
              <div
                key={skill.id}
                className={`rounded-xl border p-4 transition-colors ${
                  enabled ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="text-2xl leading-none">{skill.icon}</span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">{skill.name}</h3>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          {skill.category}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{skill.desc}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSkill(skill.id)}
                    disabled={saving}
                    aria-pressed={enabled}
                    aria-label={`Toggle ${skill.name}`}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      enabled ? 'bg-indigo-600' : 'bg-gray-300'
                    } ${saving ? 'cursor-not-allowed opacity-70' : ''}`}
                  >
                    {saving ? (
                      <Loader2 className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
                    ) : (
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                          enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
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
          No skills found in this category.
        </div>
      )}
    </div>
  );
}
