'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Loader2, Search, Zap, Sparkles, Upload, Users, Download, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateSummary {
  id: string;
  name: string;
  industry: string;
  emoji: string;
  description: string;
  tags: string[];
  popularity: number;
  variableCount: number;
  toolCount: number;
}

interface TemplateDetail {
  id: string;
  name: string;
  industry: string;
  emoji: string;
  description: string;
  tags: string[];
  variables: Array<{ key: string; label: string; placeholder: string; required: boolean }>;
  suggestedTools: string[];
  sampleFaqs: Array<{ q: string; a: string }>;
  automations: Array<{ name: string; description: string }>;
  soulTemplate: string;
}

interface Props {
  agencyId: string;
  businessName: string;
}

const TOOL_LABELS: Record<string, string> = {
  book_appointment: '📅 Appointment Booking',
  tag_contact: '🏷️ Contact Tagging',
  create_opportunity: '💰 Deal Creation',
  escalate_to_human: '🚨 Human Escalation',
};

export function TemplateStoreClient({ agencyId, businessName }: Props) {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [generatedSoul, setGeneratedSoul] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Community / Publish state (must be at top level — React hooks rules)
  const [storeTab, setStoreTab] = useState<'official' | 'community' | 'publish'>('official');
  const [communityTemplates, setCommunityTemplates] = useState<Array<Record<string, unknown>>>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communitySearch, setCommunitySearch] = useState('');
  const [communitySort, setCommunitySort] = useState<'popular' | 'newest' | 'name'>('popular');
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [publishForm, setPublishForm] = useState({
    name: '', industry: '', description: '', icon: '🤖',
    tags: '', soul_template: '', suggested_tools: [] as string[],
  });
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  const fetchCommunity = useCallback(async () => {
    setCommunityLoading(true);
    try {
      const params = new URLSearchParams({ sort: communitySort });
      if (communitySearch) params.set('q', communitySearch);
      const res = await fetch(`/api/agency/templates/community?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCommunityTemplates(data.templates || []);
      }
    } catch { /* silent */ }
    setCommunityLoading(false);
  }, [communitySearch, communitySort]);

  useEffect(() => {
    if (storeTab === 'community') fetchCommunity();
  }, [storeTab, fetchCommunity]);

  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(d => { setTemplates(d.templates ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    fetch(`/api/templates?id=${selectedId}`)
      .then(r => r.json())
      .then(d => {
        setDetail(d.template);
        const vars: Record<string, string> = {};
        for (const v of (d.template?.variables ?? [])) {
          if (v.key === 'business_name' || v.key === 'firm_name' || v.key === 'photographer_name') {
            vars[v.key] = businessName;
          } else {
            vars[v.key] = '';
          }
        }
        setVariables(vars);
        setApplied(false);
        setGeneratedSoul(null);
      });
  }, [selectedId, businessName]);

  const handleApply = async () => {
    if (!detail) return;
    setApplying(true);
    setApplyError(null);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: detail.id, variables }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApplyError((data as { error?: string }).error || 'Failed to apply template.');
      } else if (data.success) {
        setApplied(true);
        setGeneratedSoul(data.soul);
      }
    } catch { setApplyError('Network error. Please try again.'); }
    setApplying(false);
  };

  const filtered = templates.filter(t => {
    if (!search) return true;
    const s = search.toLowerCase();
    return t.name.toLowerCase().includes(s) ||
      t.industry.toLowerCase().includes(s) ||
      t.description.toLowerCase().includes(s) ||
      t.tags.some(tag => tag.includes(s));
  }).sort((a, b) => b.popularity - a.popularity);

  // ── Detail View ───────────────────────────────────────────────────────

  if (detail) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="text-gray-500 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to templates
        </Button>

        <div className="flex items-center gap-4">
          <span className="text-4xl">{detail.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{detail.name}</h1>
            <p className="text-gray-500">{detail.description}</p>
          </div>
        </div>

        {applied && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-green-800 font-semibold">Template Applied!</p>
              <p className="text-green-700 text-sm">Your AI worker is now configured for {detail.industry}.</p>
            </div>
          </div>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-500">Tools Included</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {detail.suggestedTools.map(t => (
                <Badge key={t} variant="outline" className="border-gray-200 text-gray-700">
                  {TOOL_LABELS[t] ?? t}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Customize for Your Business
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.variables.map(v => (
              <div key={v.key}>
                <label className="text-sm text-gray-600 mb-1 block">
                  {v.label} {v.required && <span className="text-red-500">*</span>}
                </label>
                {v.placeholder.includes('\n') ? (
                  <textarea
                    placeholder={v.placeholder}
                    value={variables[v.key] ?? ''}
                    onChange={(e) => setVariables(prev => ({ ...prev, [v.key]: e.target.value }))}
                    rows={4}
                    className="w-full bg-white border border-gray-200 text-gray-900 rounded-md p-2 text-sm resize-y focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                ) : (
                  <Input
                    placeholder={v.placeholder}
                    value={variables[v.key] ?? ''}
                    onChange={(e) => setVariables(prev => ({ ...prev, [v.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {detail.sampleFaqs.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-500">Sample Conversations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.sampleFaqs.map((faq, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Customer:</p>
                  <p className="text-gray-900 text-sm mb-2">{faq.q}</p>
                  <p className="text-gray-500 text-xs mb-1">AI Worker:</p>
                  <p className="text-gray-700 text-sm">{faq.a}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {detail.automations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-500">Included Automations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {detail.automations.map((a, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-gray-900 text-sm font-medium">{a.name}</p>
                    <p className="text-gray-500 text-xs">{a.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {generatedSoul && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-500">Generated Personality (SOUL.md)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-50 rounded-lg p-4 text-gray-700 text-xs overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto border border-gray-200">
                {generatedSoul}
              </pre>
            </CardContent>
          </Card>
        )}

        {applyError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {applyError}
          </div>
        )}

        <Button
          onClick={handleApply}
          disabled={applying || applied}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg"
        >
          {applying ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Applying template...</>
          ) : applied ? (
            <><CheckCircle2 className="w-5 h-5 mr-2" /> Template Applied!</>
          ) : (
            <><Sparkles className="w-5 h-5 mr-2" /> Apply Template to My AI Worker</>
          )}
        </Button>
      </div>
    );
  }

  // ── Store View ────────────────────────────────────────────────────────

  const installCommunityTemplate = async (templateId: string) => {
    setInstallingId(templateId);
    try {
      const res = await fetch('/api/agency/templates/community/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });
      if (res.ok) {
        setCommunityTemplates(prev => prev.map(t =>
          t.id === templateId ? { ...t, installs: ((t.installs as number) || 0) + 1, _installed: true } : t
        ));
      } else {
        const data = await res.json().catch(() => ({}));
        setStoreError((data as { error?: string }).error || 'Install failed');
      }
    } catch { /* silent */ }
    setInstallingId(null);
  };

  const handlePublish = async () => {
    setPublishing(true);
    setPublishSuccess(false);
    try {
      const res = await fetch('/api/agency/templates/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...publishForm,
          tags: publishForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        setPublishSuccess(true);
        setPublishForm({ name: '', industry: '', description: '', icon: '🤖', tags: '', soul_template: '', suggested_tools: [] });
      } else {
        const data = await res.json().catch(() => ({}));
        setStoreError((data as { error?: string }).error || 'Publish failed');
      }
    } catch { /* silent */ }
    setPublishing(false);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Template Store</h1>
        <p className="text-gray-500 mt-1">
          Pick a template for your industry, browse community templates, or publish your own.
        </p>
      </div>

      {storeError && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 flex items-center justify-between">
          {storeError}
          <button onClick={() => setStoreError(null)} className="text-red-500 hover:text-red-700 ml-2">&times;</button>
        </div>
      )}

      {/* Store tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setStoreTab('official')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            storeTab === 'official' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
          }`}
        >
          Official ({templates.length})
        </button>
        <button
          onClick={() => setStoreTab('community')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
            storeTab === 'community' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Community
        </button>
        <button
          onClick={() => setStoreTab('publish')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
            storeTab === 'publish' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'
          }`}
        >
          <Upload className="h-3.5 w-3.5" /> Publish Yours
        </button>
      </div>

      {/* Official templates */}
      {storeTab === 'official' && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search templates (plumber, dental, restaurant...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
              Loading templates...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className="text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{t.emoji}</span>
                    <Badge variant="outline" className="text-xs border-gray-200 text-gray-500">
                      {t.toolCount} tools
                    </Badge>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{t.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">{t.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {t.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-400">
              <p>No templates match &quot;{search}&quot;</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </>
      )}

      {/* Community marketplace */}
      {storeTab === 'community' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
            <h3 className="text-sm font-semibold text-indigo-900">Community Templates</h3>
            <p className="mt-1 text-xs text-indigo-700">
              Templates created by other agencies. Install to use, or publish your own and earn 5 credits per install.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search community templates..."
                value={communitySearch}
                onChange={(e) => setCommunitySearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={communitySort}
              onChange={(e) => setCommunitySort(e.target.value as 'popular' | 'newest' | 'name')}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="name">A-Z</option>
            </select>
          </div>

          {communityLoading ? (
            <div className="text-center py-12 text-gray-400">
              <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
              Loading community templates...
            </div>
          ) : communityTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-8 h-8 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No community templates yet.</p>
              <p className="text-sm text-gray-400 mt-1">Be the first to publish one!</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setStoreTab('publish')}>
                <Upload className="w-4 h-4 mr-1" /> Publish a Template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {communityTemplates.map((t) => (
                <div key={t.id as string} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-200 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{(t.icon as string) || '🤖'}</span>
                    <div className="flex items-center gap-2">
                      {(t.installs as number) > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <TrendingUp className="h-3 w-3" /> {t.installs as number}
                        </span>
                      )}
                      {(t as Record<string, unknown>)._installed ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Installed
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => installCommunityTemplate(t.id as string)}
                          disabled={installingId === t.id}
                          className="text-xs"
                        >
                          {installingId === t.id
                            ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Installing...</>
                            : <><Download className="w-3 h-3 mr-1" /> Install</>}
                        </Button>
                      )}
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900">{t.name as string}</h3>
                  <p className="text-gray-500 text-sm mt-1">{t.description as string}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {((t.tags as string[]) || []).slice(0, 3).map(tag => (
                        <span key={tag} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                    <span className="text-[11px] text-gray-400">by {(t.creator_name as string) || 'Anonymous'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Publish form */}
      {storeTab === 'publish' && (
        <div className="space-y-4 max-w-2xl">
          <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4">
            <h3 className="text-sm font-semibold text-amber-900">Publish a Template</h3>
            <p className="mt-1 text-xs text-amber-700">
              Share your template with the community. You earn <strong>5 credits</strong> every time another agency installs it.
            </p>
          </div>

          {publishSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-emerald-800 font-semibold">Template Published!</p>
                <p className="text-emerald-700 text-sm">It&apos;s now available in the community marketplace.</p>
              </div>
            </div>
          )}

          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Template Name *</label>
                  <Input
                    placeholder="e.g., Cannabis Dispensary Pro"
                    value={publishForm.name}
                    onChange={(e) => setPublishForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Industry *</label>
                  <Input
                    placeholder="e.g., Cannabis, Healthcare, Legal"
                    value={publishForm.industry}
                    onChange={(e) => setPublishForm(p => ({ ...p, industry: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Icon (emoji)</label>
                  <Input
                    placeholder="🤖"
                    value={publishForm.icon}
                    onChange={(e) => setPublishForm(p => ({ ...p, icon: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Tags (comma-separated)</label>
                  <Input
                    placeholder="sales, support, booking"
                    value={publishForm.tags}
                    onChange={(e) => setPublishForm(p => ({ ...p, tags: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Description *</label>
                <Input
                  placeholder="What does this template do? Who is it for?"
                  value={publishForm.description}
                  onChange={(e) => setPublishForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">AI Personality (SOUL.md) *</label>
                <textarea
                  placeholder="You are a friendly AI assistant for {{business_name}}..."
                  value={publishForm.soul_template}
                  onChange={(e) => setPublishForm(p => ({ ...p, soul_template: e.target.value }))}
                  rows={8}
                  className="w-full bg-white border border-gray-200 text-gray-900 rounded-md p-3 text-sm resize-y focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Use {'{{variable_name}}'} for customizable fields. Example: {'{{business_name}}'}, {'{{phone}}'}, {'{{hours}}'}
                </p>
              </div>
              <Button
                onClick={handlePublish}
                disabled={publishing || !publishForm.name || !publishForm.industry || !publishForm.soul_template}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {publishing
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</>
                  : <><Upload className="w-4 h-4 mr-2" /> Publish to Community</>}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
