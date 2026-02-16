import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyTemplates } from '@/lib/agency/queries';
import type { SuggestedSkill, SampleResponse } from '@/lib/agency/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Clock, Zap, ArrowRight, MessageSquare } from 'lucide-react';

const industryColors: Record<string, string> = {
  'Dental / Medical': 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400',
  'Real Estate': 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  'Home Services': 'border-orange-500/50 bg-orange-500/10 text-orange-400',
  'Retail / E-commerce': 'border-pink-500/50 bg-pink-500/10 text-pink-400',
  'Legal': 'border-amber-500/50 bg-amber-500/10 text-amber-400',
  'Finance': 'border-blue-500/50 bg-blue-500/10 text-blue-400',
  'Fitness / Wellness': 'border-green-500/50 bg-green-500/10 text-green-400',
  'Restaurant / Hospitality': 'border-red-500/50 bg-red-500/10 text-red-400',
  'Education': 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400',
  'General': 'border-violet-500/50 bg-violet-500/10 text-violet-400',
};

function getIndustryColor(industry: string) {
  return industryColors[industry] ?? industryColors['General'];
}

export default async function AgencyTemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/chat');

  const templates = await getAgencyTemplates(result.agency.id);

  const builtIn = templates.filter((t) => t.agency_id === null);
  const custom = templates.filter((t) => t.agency_id !== null);

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Templates</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Pre-configured AI setups for common industries
          </p>
        </div>
      </div>

      {/* Built-in Templates */}
      <div className="mb-10">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
          Industry Templates
        </h2>
        {builtIn.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500">No built-in templates available yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {builtIn.map((template) => {
              const suggestedSkills = (template.suggested_skills ?? []) as SuggestedSkill[];
              const sampleResponses = (template.sample_responses ?? []) as SampleResponse[];

              return (
                <Card key={template.id} className="group hover:border-zinc-700 transition-colors">
                  <CardContent className="p-5">
                    {/* Header with icon */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{template.icon || '🤖'}</span>
                        <div>
                          <h3 className="font-semibold text-zinc-100 group-hover:text-white transition-colors">
                            {template.name}
                          </h3>
                          <Badge className={`mt-1 text-[10px] ${getIndustryColor(template.industry)}`}>
                            {template.industry}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                      {template.description}
                    </p>

                    {/* Capabilities */}
                    {suggestedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {suggestedSkills.slice(0, 4).map((skill) => (
                          <span
                            key={skill.id}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-[11px] text-zinc-400"
                          >
                            <Zap className="h-2.5 w-2.5" />
                            {skill.name}
                          </span>
                        ))}
                        {suggestedSkills.length > 4 && (
                          <span className="inline-flex items-center rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-[11px] text-zinc-500">
                            +{suggestedSkills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Stats row */}
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {suggestedSkills.length} capability{suggestedSkills.length !== 1 ? 'ies' : 'y'}
                      </span>
                      {sampleResponses.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {sampleResponses.length} sample{sampleResponses.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {Array.isArray(template.cron_config) && template.cron_config.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {template.cron_config.length} cron job{template.cron_config.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Action */}
                    <Link href={`/agency/clients/new?template=${template.id}`}>
                      <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                        Use Template
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Templates */}
      <div>
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
          Your Templates
        </h2>
        {custom.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="rounded-full bg-zinc-800 h-12 w-12 flex items-center justify-center mx-auto mb-4">
                <Plus className="h-5 w-5 text-zinc-500" />
              </div>
              <p className="text-zinc-400 font-medium mb-1">No custom templates yet</p>
              <p className="text-sm text-zinc-500 mb-4">
                Create templates from your existing client configurations to speed up onboarding.
              </p>
              <Link href="/agency/clients">
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Create from existing client
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {custom.map((template) => {
              const suggestedSkills = (template.suggested_skills ?? []) as SuggestedSkill[];
              const sampleResponses = (template.sample_responses ?? []) as SampleResponse[];

              return (
                <Card key={template.id} className="group hover:border-zinc-700 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{template.icon || '🤖'}</span>
                        <div>
                          <h3 className="font-semibold text-zinc-100 group-hover:text-white transition-colors">
                            {template.name}
                          </h3>
                          <Badge className={`mt-1 text-[10px] ${getIndustryColor(template.industry)}`}>
                            {template.industry}
                          </Badge>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700">
                        Custom
                      </Badge>
                    </div>

                    <p className="text-sm text-zinc-400 mb-4 line-clamp-2">
                      {template.description}
                    </p>

                    {suggestedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {suggestedSkills.slice(0, 4).map((skill) => (
                          <span
                            key={skill.id}
                            className="inline-flex items-center gap-1 rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-[11px] text-zinc-400"
                          >
                            <Zap className="h-2.5 w-2.5" />
                            {skill.name}
                          </span>
                        ))}
                        {suggestedSkills.length > 4 && (
                          <span className="inline-flex items-center rounded-md border border-zinc-700/50 bg-zinc-800/50 px-2 py-0.5 text-[11px] text-zinc-500">
                            +{suggestedSkills.length - 4} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-zinc-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {suggestedSkills.length} capability{suggestedSkills.length !== 1 ? 'ies' : 'y'}
                      </span>
                      {sampleResponses.length > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {sampleResponses.length} sample{sampleResponses.length !== 1 ? 's' : ''}
                        </span>
                      )}
                      {Array.isArray(template.cron_config) && template.cron_config.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {template.cron_config.length} cron job{template.cron_config.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <Link href={`/agency/clients/new?template=${template.id}`}>
                      <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                        Use Template
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
