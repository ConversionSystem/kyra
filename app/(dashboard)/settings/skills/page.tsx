'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Lock, Check, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  needsApiKey: boolean;
  apiKeyLabel?: string;
  apiKeyPlaceholder?: string;
  creditMultiplier: number;
  enabled: boolean;
  apiKeySet: boolean;
  requiredPlan: string[];
}

export default function SkillsSettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [plan, setPlan] = useState('free');
  const [isLoading, setIsLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    try {
      const res = await fetch('/api/skills');
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills);
        setPlan(data.plan);
      }
    } catch (e) {
      console.error('Failed to load skills:', e);
    }
    setIsLoading(false);
  }

  async function toggleSkill(skillId: string, enable: boolean, apiKey?: string) {
    setToggling(skillId);
    setMessage(null);

    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, enabled: enable, apiKey }),
      });

      const data = await res.json();

      if (res.ok) {
        setSkills(prev => prev.map(s =>
          s.id === skillId
            ? { ...s, enabled: enable, apiKeySet: apiKey ? true : s.apiKeySet }
            : s
        ));
        setMessage({ type: 'success', text: `${enable ? 'Enabled' : 'Disabled'} successfully` });
        if (apiKey) {
          setApiKeyInputs(prev => ({ ...prev, [skillId]: '' }));
          setExpandedSkill(null);
        }
      } else {
        if (data.error === 'API key required for this skill') {
          setExpandedSkill(skillId);
        } else if (data.error === 'Plan upgrade required') {
          setMessage({ type: 'error', text: 'Upgrade your plan to use this skill' });
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to update' });
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    }

    setToggling(null);
  }

  const categories = [
    { key: 'utility', label: 'Utilities', emoji: '🔧' },
    { key: 'integration', label: 'Integrations', emoji: '🔗' },
    { key: 'ai', label: 'AI & Advanced', emoji: '🤖' },
    { key: 'media', label: 'Media', emoji: '🎬' },
    { key: 'productivity', label: 'Productivity', emoji: '📊' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Skills</h1>
            <p className="text-sm text-gray-400">Enable tools and integrations for your AI assistant</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {message && (
          <div className={`rounded-md px-4 py-3 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {message.text}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-2">
            <span className="text-lg font-bold text-indigo-600">
              {skills.filter(s => s.enabled).length}
            </span>
            <span className="text-sm text-gray-400 ml-1">enabled</span>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-2">
            <span className="text-lg font-bold text-gray-700">{skills.length}</span>
            <span className="text-sm text-gray-400 ml-1">available</span>
          </div>
          <Badge variant="outline" className="capitalize">{plan} plan</Badge>
        </div>

        {/* Skills by category */}
        {categories.map(cat => {
          const catSkills = skills.filter(s => s.category === cat.key);
          if (catSkills.length === 0) return null;

          return (
            <Card key={cat.key}>
              <CardHeader>
                <CardTitle className="text-base">
                  {cat.emoji} {cat.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {catSkills.map(skill => (
                  <div key={skill.id} className="rounded-lg border border-gray-200 bg-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-2xl shrink-0">{skill.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{skill.name}</p>
                            {skill.creditMultiplier > 1 && (
                              <Badge variant="outline" className="text-xs">
                                {skill.creditMultiplier}x credits
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate sm:whitespace-normal">{skill.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {skill.needsApiKey && skill.enabled && (
                          <button
                            onClick={() => setExpandedSkill(
                              expandedSkill === skill.id ? null : skill.id
                            )}
                            className="p-1 text-gray-400 hover:text-gray-700"
                          >
                            {expandedSkill === skill.id
                              ? <ChevronUp className="h-4 w-4" />
                              : <ChevronDown className="h-4 w-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (skill.enabled) {
                              toggleSkill(skill.id, false);
                            } else if (skill.needsApiKey && !skill.apiKeySet) {
                              setExpandedSkill(skill.id);
                            } else {
                              toggleSkill(skill.id, true);
                            }
                          }}
                          disabled={toggling === skill.id}
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            skill.enabled
                              ? 'bg-indigo-500'
                              : 'bg-gray-500'
                          }`}
                        >
                          {toggling === skill.id ? (
                            <Loader2 className="h-3 w-3 animate-spin absolute top-1.5 left-4 text-gray-900" />
                          ) : (
                            <span className={`block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              skill.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* API Key input panel */}
                    {expandedSkill === skill.id && skill.needsApiKey && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <label className="text-xs font-medium text-gray-500 block mb-2">
                          {skill.apiKeyLabel || 'API Key'}
                          {skill.apiKeySet && (
                            <span className="ml-2 text-green-600 inline-flex items-center gap-1">
                              <Check className="h-3 w-3" /> Saved
                            </span>
                          )}
                        </label>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            value={apiKeyInputs[skill.id] || ''}
                            onChange={(e) => setApiKeyInputs(prev => ({
                              ...prev,
                              [skill.id]: e.target.value,
                            }))}
                            placeholder={skill.apiKeyPlaceholder || 'Enter API key'}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            disabled={!apiKeyInputs[skill.id] || toggling === skill.id}
                            onClick={() => toggleSkill(skill.id, true, apiKeyInputs[skill.id])}
                          >
                            {toggling === skill.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : skill.apiKeySet ? 'Update' : 'Save & Enable'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        {/* Upgrade CTA for free users */}
        {plan === 'free' && (
          <Card className="border-indigo-500/30 bg-indigo-50">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="font-medium text-gray-900">Unlock more skills</p>
                <p className="text-sm text-gray-500">
                  Upgrade to Lite for GitHub, Notion, voice, and more.
                </p>
              </div>
              <Link href="/settings">
                <Button size="sm">Upgrade</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
