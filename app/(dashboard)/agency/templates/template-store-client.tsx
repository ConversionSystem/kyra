'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Loader2, Search, Zap, Sparkles } from 'lucide-react';
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
  const [generatedSoul, setGeneratedSoul] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load templates
  useEffect(() => {
    fetch('/api/templates')
      .then(r => r.json())
      .then(d => { setTemplates(d.templates ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Load detail when selected
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    fetch(`/api/templates?id=${selectedId}`)
      .then(r => r.json())
      .then(d => {
        setDetail(d.template);
        // Pre-fill business name
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

  // Apply template
  const handleApply = async () => {
    if (!detail) return;
    setApplying(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: detail.id, variables }),
      });
      const data = await res.json();
      if (data.success) {
        setApplied(true);
        setGeneratedSoul(data.soul);
      }
    } catch { /* ignore */ }
    setApplying(false);
  };

  // Filter templates
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
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="text-gray-400 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to templates
        </Button>

        <div className="flex items-center gap-4">
          <span className="text-4xl">{detail.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold text-white">{detail.name}</h1>
            <p className="text-gray-400">{detail.description}</p>
          </div>
        </div>

        {applied && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <div>
              <p className="text-green-400 font-semibold">Template Applied!</p>
              <p className="text-green-300 text-sm">Your AI worker is now configured for {detail.industry}.</p>
            </div>
          </div>
        )}

        {/* Tools included */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-400">Tools Included</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {detail.suggestedTools.map(t => (
                <Badge key={t} variant="outline" className="border-gray-700 text-gray-300">
                  {TOOL_LABELS[t] ?? t}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Variables form */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Customize for Your Business
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.variables.map(v => (
              <div key={v.key}>
                <label className="text-sm text-gray-400 mb-1 block">
                  {v.label} {v.required && <span className="text-red-400">*</span>}
                </label>
                {v.placeholder.includes('\n') ? (
                  <textarea
                    placeholder={v.placeholder}
                    value={variables[v.key] ?? ''}
                    onChange={(e) => setVariables(prev => ({ ...prev, [v.key]: e.target.value }))}
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-md p-2 text-sm resize-y"
                  />
                ) : (
                  <Input
                    placeholder={v.placeholder}
                    value={variables[v.key] ?? ''}
                    onChange={(e) => setVariables(prev => ({ ...prev, [v.key]: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sample FAQs */}
        {detail.sampleFaqs.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400">Sample Conversations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.sampleFaqs.map((faq, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Customer:</p>
                  <p className="text-white text-sm mb-2">{faq.q}</p>
                  <p className="text-gray-400 text-xs mb-1">AI Worker:</p>
                  <p className="text-gray-300 text-sm">{faq.a}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Automations */}
        {detail.automations.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400">Included Automations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {detail.automations.map((a, i) => (
                <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
                  <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">{a.name}</p>
                    <p className="text-gray-500 text-xs">{a.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Generated SOUL preview */}
        {generatedSoul && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400">Generated Personality (SOUL.md)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-800 rounded-lg p-4 text-gray-300 text-xs overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                {generatedSoul}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Apply button */}
        <Button
          onClick={handleApply}
          disabled={applying || applied}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Template Store</h1>
        <p className="text-gray-400 mt-1">
          Pick a template for your industry. Your AI worker will be configured instantly with the right personality, tools, and knowledge.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Search templates (plumber, dental, restaurant...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-800 border-gray-700 text-white pl-10"
        />
      </div>

      {/* Templates grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
          Loading templates...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className="text-left bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{t.emoji}</span>
                <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                  {t.toolCount} tools
                </Badge>
              </div>
              <h3 className="font-bold text-white text-lg">{t.name}</h3>
              <p className="text-gray-400 text-sm mt-1">{t.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {t.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="bg-gray-800 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p>No templates match &quot;{search}&quot;</p>
          <p className="text-sm mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
