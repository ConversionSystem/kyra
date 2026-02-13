'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Check } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { AgencyTemplate } from '@/lib/agency/queries';

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

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

  const builtInTemplates = templates.filter((t) => t.agency_id === null);
  const customTemplates = templates.filter((t) => t.agency_id !== null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
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
    } catch (err) {
      setError('Failed to create client. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
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
          <CardTitle>Template</CardTitle>
          <CardDescription>
            Choose a starter template to configure this client&apos;s AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* No template option */}
            <button
              type="button"
              onClick={() => setTemplateId(null)}
              className={`w-full text-left rounded-lg border p-4 transition-colors ${
                templateId === null
                  ? 'border-violet-500/50 bg-violet-500/5'
                  : 'border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-zinc-100">Blank — Start from scratch</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Configure everything manually after creation
                  </p>
                </div>
                {templateId === null && (
                  <Check className="h-5 w-5 text-violet-400 shrink-0" />
                )}
              </div>
            </button>

            {/* Built-in templates */}
            {builtInTemplates.length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Built-in Templates
                </p>
                <div className="space-y-2">
                  {builtInTemplates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplateId(t.id)}
                      className={`w-full text-left rounded-lg border p-4 transition-colors ${
                        templateId === t.id
                          ? 'border-violet-500/50 bg-violet-500/5'
                          : 'border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-zinc-100">{t.name}</p>
                            <Badge variant="outline" className="text-[10px]">
                              {t.industry}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-500 mt-1">{t.description}</p>
                        </div>
                        {templateId === t.id && (
                          <Check className="h-5 w-5 text-violet-400 shrink-0 ml-3" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom agency templates */}
            {customTemplates.length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  Your Templates
                </p>
                <div className="space-y-2">
                  {customTemplates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplateId(t.id)}
                      className={`w-full text-left rounded-lg border p-4 transition-colors ${
                        templateId === t.id
                          ? 'border-violet-500/50 bg-violet-500/5'
                          : 'border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-zinc-100">{t.name}</p>
                          <p className="text-xs text-zinc-500 mt-1">{t.description}</p>
                        </div>
                        {templateId === t.id && (
                          <Check className="h-5 w-5 text-violet-400 shrink-0 ml-3" />
                        )}
                      </div>
                    </button>
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
  );
}
