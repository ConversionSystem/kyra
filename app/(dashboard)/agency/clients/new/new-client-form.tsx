'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Check, MessageSquare, Zap, X } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { AgencyTemplate, SampleResponse, SuggestedSkill } from '@/lib/agency/queries';

const industries = [
  'General',
  'Dental / Medical',
  'Real Estate',
  'Home Services',
  'Retail / E-commerce',
  'Legal',
  'Finance',
  'Fitness / Wellness',
  'Restaurant / Hospitality',
  'Education',
  'Other',
];

const industryColors: Record<string, string> = {
  'Dental / Medical': 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400',
  'Real Estate': 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  'Home Services': 'border-orange-500/50 bg-orange-500/10 text-orange-400',
  'Retail / E-commerce': 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400',
  General: 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400',
};

function getIndustryColor(industry: string) {
  return industryColors[industry] ?? 'border-zinc-500/50 bg-zinc-500/10 text-zinc-400';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// ============================================================================
// Template Preview Modal
// ============================================================================
function TemplatePreviewModal({
  template,
  onClose,
  onSelect,
}: {
  template: AgencyTemplate;
  onClose: () => void;
  onSelect: () => void;
}) {
  const sampleResponses = (template.sample_responses ?? []) as SampleResponse[];
  const suggestedSkills = (template.suggested_skills ?? []) as SuggestedSkill[];
  const ghlConfig = template.ghl_config ?? {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{template.icon || '🤖'}</span>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">{template.name}</h2>
              <Badge className={`text-[10px] ${getIndustryColor(template.industry)}`}>
                {template.industry}
              </Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <p className="text-sm text-zinc-400 leading-relaxed">{template.description}</p>

          {/* What this AI can do */}
          {suggestedSkills.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-indigo-400" />
                What this AI can do
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestedSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-800/40 p-3"
                  >
                    <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    <div>
                      <p className="text-xs font-medium text-zinc-200">{skill.name}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{skill.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Conversations */}
          {sampleResponses.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                Sample Conversations
              </h3>
              <div className="space-y-3">
                {sampleResponses.map((sample, i) => (
                  <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-800/30 overflow-hidden">
                    {/* Customer message */}
                    <div className="px-4 py-3 border-b border-zinc-800/50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                          Customer
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300">{sample.question}</p>
                    </div>
                    {/* AI response */}
                    <div className="px-4 py-3 bg-indigo-500/[0.03]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-400">
                          AI Response
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300">{sample.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GHL Pipeline Stages */}
          {ghlConfig.pipeline_stages && ghlConfig.pipeline_stages.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-3">
                📊 GHL Pipeline Stages
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {ghlConfig.pipeline_stages.map((stage, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-zinc-700/50 bg-zinc-800/50 px-2.5 py-1 text-[11px] text-zinc-400"
                  >
                    {i > 0 && <span className="text-zinc-600 mr-0.5">→</span>}
                    {stage}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={onClose} className="text-xs">
            Close
          </Button>
          <Button onClick={onSelect} className="gap-2 text-xs">
            <Check className="h-3.5 w-3.5" />
            Use this template
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Template Card
// ============================================================================
function TemplateCard({
  template,
  isSelected,
  onSelect,
  onPreview,
}: {
  template: AgencyTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  const suggestedSkills = (template.suggested_skills ?? []) as SuggestedSkill[];
  const sampleResponses = (template.sample_responses ?? []) as SampleResponse[];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        isSelected
          ? 'border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20'
          : 'border-zinc-700/80 bg-zinc-800/40 hover:bg-zinc-800/70 hover:border-zinc-600'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Icon */}
          <span className="text-2xl shrink-0 mt-0.5">{template.icon || '🤖'}</span>

          <div className="min-w-0">
            {/* Name + Industry */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-zinc-100">{template.name}</p>
              <Badge className={`text-[10px] shrink-0 ${getIndustryColor(template.industry)}`}>
                {template.industry}
              </Badge>
            </div>

            {/* Description */}
            <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{template.description}</p>

            {/* Skill chips (first 3) */}
            {suggestedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {suggestedSkills.slice(0, 3).map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-1 rounded-md border border-zinc-700/40 bg-zinc-800/60 px-1.5 py-0.5 text-[10px] text-zinc-400"
                  >
                    <Zap className="h-2 w-2" />
                    {skill.name}
                  </span>
                ))}
                {suggestedSkills.length > 3 && (
                  <span className="inline-flex items-center rounded-md border border-zinc-700/40 bg-zinc-800/60 px-1.5 py-0.5 text-[10px] text-zinc-500">
                    +{suggestedSkills.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Preview link */}
            {sampleResponses.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onPreview();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation();
                    onPreview();
                  }
                }}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 mt-2 cursor-pointer"
              >
                <MessageSquare className="h-3 w-3" />
                Preview conversations →
              </span>
            )}
          </div>
        </div>

        {/* Checkmark */}
        {isSelected && (
          <div className="shrink-0 rounded-full bg-indigo-500/20 p-1">
            <Check className="h-4 w-4 text-indigo-400" />
          </div>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// Main Form
// ============================================================================
interface NewClientFormProps {
  agencyId: string;
  templates: AgencyTemplate[];
}

export function NewClientForm({ agencyId, templates }: NewClientFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [industry, setIndustry] = useState('General');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<AgencyTemplate | null>(null);

  const builtInTemplates = templates.filter((t) => t.agency_id === null);
  const customTemplates = templates.filter((t) => t.agency_id !== null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  };

  // When a template is selected, auto-set the industry to match
  const handleTemplateSelect = (template: AgencyTemplate | null) => {
    if (template) {
      setTemplateId(template.id);
      // Auto-set industry from template if it matches one of our industry options
      const matchingIndustry = industries.find(
        (ind) => ind.toLowerCase() === template.industry.toLowerCase()
      );
      if (matchingIndustry) {
        setIndustry(matchingIndustry);
      }
    } else {
      setTemplateId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError('Name and slug are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: client, error: insertError } = await supabase
        .from('agency_clients')
        .insert({
          agency_id: agencyId,
          name: name.trim(),
          slug: slug.trim(),
          industry,
          template_id: templateId,
          status: 'setup',
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.message.includes('unique') || insertError.message.includes('duplicate')) {
          setError('A client with this slug already exists. Choose a different name or edit the slug.');
        } else {
          setError(insertError.message);
        }
        setIsSubmitting(false);
        return;
      }

      router.push(`/agency/clients/${client.id}`);
    } catch {
      setError('Failed to create client. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Link
          href="/agency/clients"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Clients
        </Link>

        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 mb-6">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
            <CardDescription>Basic information about this client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Client Name</label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Acme Dental Practice"
                required
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Slug</label>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setSlugManuallyEdited(true);
                }}
                placeholder="acme-dental-practice"
                required
                className="bg-zinc-800 border-zinc-700 font-mono text-xs"
              />
              <p className="text-xs text-zinc-500">
                URL-safe identifier. Auto-generated from the name.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
              >
                {industries.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Template Picker */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AI Template</CardTitle>
            <CardDescription>
              Choose an industry template to pre-configure your client&apos;s AI with personality, skills, and knowledge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* No template option */}
              <button
                type="button"
                onClick={() => handleTemplateSelect(null)}
                className={`w-full text-left rounded-xl border p-4 transition-all ${
                  templateId === null
                    ? 'border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20'
                    : 'border-zinc-700/80 bg-zinc-800/40 hover:bg-zinc-800/70 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <p className="font-semibold text-zinc-100">Blank — Start from scratch</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Configure everything manually after creation
                      </p>
                    </div>
                  </div>
                  {templateId === null && (
                    <div className="shrink-0 rounded-full bg-indigo-500/20 p-1">
                      <Check className="h-4 w-4 text-indigo-400" />
                    </div>
                  )}
                </div>
              </button>

              {/* Built-in templates */}
              {builtInTemplates.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 mt-4">
                    Industry Templates
                  </p>
                  <div className="space-y-2">
                    {builtInTemplates.map((t) => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        isSelected={templateId === t.id}
                        onSelect={() => handleTemplateSelect(t)}
                        onPreview={() => setPreviewTemplate(t)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Custom agency templates */}
              {customTemplates.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 mt-4">
                    Your Templates
                  </p>
                  <div className="space-y-2">
                    {customTemplates.map((t) => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        isSelected={templateId === t.id}
                        onSelect={() => handleTemplateSelect(t)}
                        onPreview={() => setPreviewTemplate(t)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button type="submit" disabled={isSubmitting || !name.trim()} className="w-full gap-2">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Client'
          )}
        </Button>
      </form>

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
          onSelect={() => {
            handleTemplateSelect(previewTemplate);
            setPreviewTemplate(null);
          }}
        />
      )}
    </>
  );
}
