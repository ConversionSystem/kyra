'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category: string;
}

const AVAILABLE_SKILLS: Skill[] = [
  { id: 'web-search', name: 'Web Search', desc: 'Search the internet for live information and answer questions with current data', icon: '🔍', category: 'Research' },
  { id: 'web-fetch', name: 'Web Scraper', desc: 'Extract content from any URL or webpage automatically', icon: '🌐', category: 'Research' },
  { id: 'browser', name: 'Web Browser', desc: 'Navigate websites, fill forms, and take screenshots', icon: '🖥️', category: 'Research' },
  { id: 'email', name: 'Email (IMAP/SMTP)', desc: 'Read, send, and manage emails from any email account', icon: '📧', category: 'Communication' },
  { id: 'google-workspace', name: 'Google Workspace', desc: 'Gmail, Calendar, Drive, Sheets, and Docs integration', icon: '📅', category: 'Communication' },
  { id: 'voice-tts', name: 'Text-to-Speech', desc: 'Convert text responses to natural-sounding voice audio', icon: '🔊', category: 'Communication' },
  { id: 'pdf-analysis', name: 'PDF Analysis', desc: 'Read, analyze, and extract data from PDF documents', icon: '📄', category: 'Knowledge' },
  { id: 'summarize', name: 'Summarize', desc: 'Summarize URLs, podcasts, YouTube videos, and documents', icon: '📝', category: 'Knowledge' },
  { id: 'image-analysis', name: 'Image Analysis', desc: 'Analyze and describe images using vision AI', icon: '🖼️', category: 'Knowledge' },
  { id: 'blog-monitor', name: 'Blog Monitor', desc: 'Track RSS feeds, blogs, and news sources for updates', icon: '📡', category: 'Monitoring' },
  { id: 'weather', name: 'Weather', desc: 'Current weather and forecasts for any location', icon: '🌤️', category: 'Utilities' },
  { id: 'code-execution', name: 'Code Runner', desc: 'Execute code, scripts, and shell commands securely', icon: '⚡', category: 'Utilities' },
];

const CATEGORIES = ['All', 'Research', 'Communication', 'Knowledge', 'Monitoring', 'Utilities'];

interface Props {
  client: { id: string; settings?: Record<string, unknown> | null };
}

export default function SkillsTab({ client }: Props) {
  const initial = ((client.settings as Record<string, unknown>)?.enabled_skills as string[]) || [];
  const [enabledSkills, setEnabledSkills] = useState<string[]>(initial);
  const [activeCategory, setActiveCategory] = useState('All');
  const [savingSkill, setSavingSkill] = useState<string | null>(null);

  const filtered = activeCategory === 'All'
    ? AVAILABLE_SKILLS
    : AVAILABLE_SKILLS.filter(s => s.category === activeCategory);

  const toggleSkill = async (skillId: string) => {
    const isEnabled = enabledSkills.includes(skillId);
    const updated = isEnabled
      ? enabledSkills.filter(s => s !== skillId)
      : [...enabledSkills, skillId];

    setSavingSkill(skillId);
    setEnabledSkills(updated);

    try {
      const res = await fetch(`/api/agency/clients/${client.id}/skills`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, enabled: !isEnabled }),
      });
      if (!res.ok) {
        setEnabledSkills(enabledSkills); // rollback
      }
    } catch {
      setEnabledSkills(enabledSkills); // rollback
    } finally {
      setSavingSkill(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">AI Skills</h2>
          <p className="text-sm text-gray-500">Choose what your AI worker can do</p>
        </div>
        <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
          {enabledSkills.length} of {AVAILABLE_SKILLS.length} enabled
        </span>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-indigo-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Skills grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(skill => {
          const isEnabled = enabledSkills.includes(skill.id);
          const isSaving = savingSkill === skill.id;

          return (
            <div
              key={skill.id}
              className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                isEnabled
                  ? 'border-indigo-200 bg-indigo-50/50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="text-2xl mt-0.5">{skill.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{skill.name}</p>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {skill.category}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{skill.desc}</p>
              </div>
              <button
                onClick={() => toggleSkill(skill.id)}
                disabled={isSaving}
                className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${
                  isEnabled ? 'bg-indigo-500' : 'bg-gray-300'
                } ${isSaving ? 'opacity-50' : ''}`}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                ) : (
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
