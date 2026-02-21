'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Check, MessageSquare, Zap, X, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { AgencyTemplate, SampleResponse, SuggestedSkill } from '@/lib/agency/queries';

// ============================================================================
// Role Template Data
// ============================================================================
const rolePresets: Record<string, { name: string; emoji: string; label: string; northStar: string }> = {
  'researcher':          { name: 'Sage',  emoji: '🔍', label: 'Researcher',        northStar: 'Surface 3 actionable insights per week from industry news and competitor activity' },
  'sales-qualifier':     { name: 'Quinn', emoji: '🎯', label: 'Sales Qualifier',   northStar: 'Qualify every inbound lead within 5 minutes and book meetings with prospects scoring 7+' },
  'brand-voice':         { name: 'Nova',  emoji: '🛡️', label: 'Brand Voice Guard', northStar: 'Ensure every client-facing message aligns with brand voice before it goes out' },
  'social-scout':        { name: 'Scout', emoji: '📱', label: 'Social Scout',      northStar: 'Track brand mentions and surface trending topics relevant to our audience daily' },
  'appointment-setter':  { name: 'Aria',  emoji: '📞', label: 'Appointment Setter', northStar: 'Convert every qualified lead into a booked appointment within 24 hours' },
  'intake-specialist':   { name: 'Blake', emoji: '📋', label: 'Intake Specialist', northStar: 'Collect complete client intake information and route to the right team member' },
  'community-manager':   { name: 'Cleo',  emoji: '💬', label: 'Community Manager', northStar: 'Answer 90% of FAQs instantly and escalate complex issues within 1 hour' },
  'weekly-reporter':     { name: 'Atlas', emoji: '📊', label: 'Weekly Reporter',   northStar: 'Deliver a clear weekly summary of all AI activity every Monday morning' },
};

// ============================================================================
// Setup Wizard (Step 2 — shown after client creation)
// ============================================================================
function SetupWizard({ clientId, clientName, defaultNorthStar, onDone }: { clientId: string; clientName: string; defaultNorthStar?: string; onDone: () => void }) {
  const router = useRouter();
  const [northStar, setNorthStar] = useState(defaultNorthStar ?? '');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [modelPreference, setModelPreference] = useState('auto');
  const [isSaving, setIsSaving] = useState(false);

  const handleLaunch = async () => {
    setIsSaving(true);
    try {
      const settings: Record<string, unknown> = {
        north_star: northStar.trim() || null,
        model_preference: modelPreference,
      };
      const budgetNum = parseInt(monthlyBudget, 10);
      if (!isNaN(budgetNum) && budgetNum > 0) {
        settings.monthly_budget = budgetNum;
      }

      await fetch(`/api/agency/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      router.push(`/agency/clients/${clientId}`);
    } catch {
      router.push(`/agency/clients/${clientId}`);
    }
  };

  const modelOptions = [
    {
      value: 'auto',
      label: '✨ Auto (Recommended)',
      description: 'Kyra picks the right model per conversation.',
    },
    {
      value: 'gpt-4o-mini',
      label: '⚡ Fast & Affordable',
      description: 'Best for high-volume. Handles most conversations with ease.',
    },
    {
      value: 'gpt-4o',
      label: '🧠 Smart & Capable',
      description: 'Better reasoning for complex questions.',
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Success celebration */}
      <div className="rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 via-emerald-50 to-indigo-50 p-8 mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
          <CheckCircle2 className="h-7 w-7 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          Your AI employee is live!
        </h2>
        <p className="text-gray-500">
          <span className="font-medium text-gray-700">{clientName}</span> has been created. Let&apos;s set them up for success.
        </p>
      </div>

      {/* Step 2 card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-4">
          <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider">Step 2</p>
          <h3 className="text-lg font-bold text-white">Set Up Your AI Employee</h3>
        </div>

        <div className="p-6 space-y-6">
          {/* North Star Goal */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              What is this AI employee&apos;s #1 goal?
            </label>
            <textarea
              rows={3}
              value={northStar}
              onChange={(e) => setNorthStar(e.target.value)}
              placeholder="e.g. Book more dental appointments, qualify leads for our sales team, answer cannabis compliance questions 24/7"
              className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
            />
            <p className="text-xs text-gray-400">
              This is the single outcome your AI employee is always working toward.
            </p>
          </div>

          {/* Monthly Conversation Budget */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Monthly conversation limit (optional)
            </label>
            <Input
              type="number"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              placeholder="e.g. 500"
              min="0"
              className="bg-gray-50 border-gray-200"
            />
            <p className="text-xs text-gray-400">
              We&apos;ll alert you when 80% is reached. Leave blank for unlimited.
            </p>
          </div>

          {/* AI Speed */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">AI Speed</label>
            <div className="space-y-2">
              {modelOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setModelPreference(option.value)}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    modelPreference === option.value
                      ? 'border-indigo-200 bg-indigo-50 ring-1 ring-indigo-500/20'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{option.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{option.description}</p>
                    </div>
                    {modelPreference === option.value && (
                      <div className="shrink-0 rounded-full bg-indigo-100 p-1">
                        <Check className="h-3.5 w-3.5 text-indigo-600" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 px-6 py-4 space-y-3">
          <Button onClick={handleLaunch} disabled={isSaving} className="w-full gap-2">
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Launch My AI Employee
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          <button
            type="button"
            onClick={() => router.push(`/agency/clients/${clientId}`)}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
          >
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  );
}

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
  'Sales & Consulting',
  'Market Intelligence',
  'Media & Content',
  'Education',
  'Other',
];

const industryColors: Record<string, string> = {
  'Dental / Medical': 'border-cyan-500/50 bg-cyan-50 text-cyan-600',
  'Real Estate': 'border-emerald-500/50 bg-emerald-50 text-emerald-600',
  'Home Services': 'border-orange-500/50 bg-orange-50 text-orange-600',
  'Retail / E-commerce': 'border-indigo-200 bg-indigo-50 text-indigo-600',
  'Sales & Consulting': 'border-violet-500/50 bg-violet-50 text-violet-600',
  'Market Intelligence': 'border-rose-500/50 bg-rose-50 text-rose-600',
  'Media & Content': 'border-teal-500/50 bg-teal-50 text-teal-600',
  'Education': 'border-emerald-500/50 bg-emerald-50 text-emerald-600',
  General: 'border-indigo-200 bg-indigo-50 text-indigo-600',
};

function getIndustryColor(industry: string) {
  return industryColors[industry] ?? 'border-gray-500/50 bg-gray-500/10 text-gray-500';
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
      <div className="relative z-10 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/95 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{template.icon || '🤖'}</span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{template.name}</h2>
              <Badge className={`text-[10px] ${getIndustryColor(template.industry)}`}>
                {template.industry}
              </Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <p className="text-sm text-gray-500 leading-relaxed">{template.description}</p>

          {/* What this AI can do */}
          {suggestedSkills.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4 text-indigo-600" />
                What this AI can do
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestedSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-100 p-3"
                  >
                    <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    <div>
                      <p className="text-xs font-medium text-gray-800">{skill.name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{skill.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Conversations */}
          {sampleResponses.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-600" />
                Sample Conversations
              </h3>
              <div className="space-y-3">
                {sampleResponses.map((sample, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                    {/* Customer message */}
                    <div className="px-4 py-3 border-b border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                          Customer
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{sample.question}</p>
                    </div>
                    {/* AI response */}
                    <div className="px-4 py-3 bg-indigo-500/[0.03]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-600">
                          AI Response
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{sample.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GHL Pipeline Stages */}
          {ghlConfig.pipeline_stages && ghlConfig.pipeline_stages.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                📊 GHL Pipeline Stages
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {ghlConfig.pipeline_stages.map((stage, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-[11px] text-gray-500"
                  >
                    {i > 0 && <span className="text-gray-500 mr-0.5">→</span>}
                    {stage}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-white/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between gap-3">
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
          ? 'border-indigo-200 bg-indigo-50 ring-1 ring-indigo-500/20'
          : 'border-gray-200/80 bg-gray-100 hover:bg-gray-100/70 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Icon */}
          <span className="text-2xl shrink-0 mt-0.5">{template.icon || '🤖'}</span>

          <div className="min-w-0">
            {/* Name + Industry */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900">{template.name}</p>
              <Badge className={`text-[10px] shrink-0 ${getIndustryColor(template.industry)}`}>
                {template.industry}
              </Badge>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{template.description}</p>

            {/* Skill chips (first 3) */}
            {suggestedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2.5">
                {suggestedSkills.slice(0, 3).map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200/40 bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500"
                  >
                    <Zap className="h-2 w-2" />
                    {skill.name}
                  </span>
                ))}
                {suggestedSkills.length > 3 && (
                  <span className="inline-flex items-center rounded-md border border-gray-200/40 bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">
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
                className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-600 mt-2 cursor-pointer"
              >
                <MessageSquare className="h-3 w-3" />
                Preview conversations →
              </span>
            )}
          </div>
        </div>

        {/* Checkmark */}
        {isSelected && (
          <div className="shrink-0 rounded-full bg-indigo-50 p-1">
            <Check className="h-4 w-4 text-indigo-600" />
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
  defaultTemplateId?: string;
  defaultRole?: string;
}

export function NewClientForm({ agencyId, templates, defaultTemplateId, defaultRole }: NewClientFormProps) {
  const router = useRouter();
  const rolePreset = defaultRole ? rolePresets[defaultRole] ?? null : null;
  const [name, setName] = useState(rolePreset?.name ?? '');
  const [slug, setSlug] = useState(rolePreset ? slugify(rolePreset.name) : '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  // Pre-select template from URL param (e.g. /clients/new?template=abc)
  const defaultTemplate = defaultTemplateId ? templates.find((t) => t.id === defaultTemplateId) ?? null : null;
  const [industry, setIndustry] = useState(defaultTemplate?.industry ?? 'General');
  const [templateId, setTemplateId] = useState<string | null>(defaultTemplate?.id ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<AgencyTemplate | null>(null);
  const [createdClient, setCreatedClient] = useState<{ id: string; name: string } | null>(null);

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

      setCreatedClient({ id: client.id, name: client.name });
    } catch {
      setError('Failed to create client. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Show setup wizard after client creation
  if (createdClient) {
    return (
      <SetupWizard
        clientId={createdClient.id}
        clientName={createdClient.name}
        defaultNorthStar={rolePreset?.northStar}
        onDone={() => router.push(`/agency/clients/${createdClient.id}`)}
      />
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Link
          href="/agency/clients"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Clients
        </Link>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-500/30 px-4 py-3 text-sm text-red-600 mb-6">
            {error}
          </div>
        )}

        {/* Role banner */}
        {rolePreset && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 mb-6 flex items-center gap-3">
            <span className="text-xl">{rolePreset.emoji}</span>
            <div>
              <p className="text-sm font-medium text-indigo-800">
                Setting up: {rolePreset.label}
              </p>
              <p className="text-xs text-indigo-600/70">
                Pre-filled with best practices &mdash; customize anything below
              </p>
            </div>
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
              <label className="text-sm font-medium text-gray-700">Client Name</label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Acme Dental Practice"
                required
                className="bg-gray-100 border-gray-200"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Slug</label>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setSlugManuallyEdited(true);
                }}
                placeholder="acme-dental-practice"
                required
                className="bg-gray-100 border-gray-200 font-mono text-xs"
              />
              <p className="text-xs text-gray-400">
                URL-safe identifier. Auto-generated from the name.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900"
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
                    ? 'border-indigo-200 bg-indigo-50 ring-1 ring-indigo-500/20'
                    : 'border-gray-200/80 bg-gray-100 hover:bg-gray-100/70 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <p className="font-semibold text-gray-900">Blank — Start from scratch</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Configure everything manually after creation
                      </p>
                    </div>
                  </div>
                  {templateId === null && (
                    <div className="shrink-0 rounded-full bg-indigo-50 p-1">
                      <Check className="h-4 w-4 text-indigo-600" />
                    </div>
                  )}
                </div>
              </button>

              {/* Built-in templates */}
              {builtInTemplates.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 mt-4">
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
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 mt-4">
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
