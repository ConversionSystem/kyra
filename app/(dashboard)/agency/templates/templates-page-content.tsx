'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { AgencyTemplate, SuggestedSkill, SampleResponse } from '@/lib/agency/queries';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText, Plus, Clock, Zap, ArrowRight, MessageSquare,
  Search, Target, Shield, Smartphone, Phone, ClipboardList,
  MessageCircle, BarChart3,
} from 'lucide-react';

// ============================================================================
// Role Templates
// ============================================================================
const roleTemplates = [
  {
    slug: 'researcher',
    icon: Search,
    emoji: '🔍',
    name: 'Researcher',
    description: 'Monitors trends, compiles reports, surfaces insights daily',
    northStar: 'Surface 3 actionable insights per week from industry news and competitor activity',
    aiName: 'Sage',
  },
  {
    slug: 'sales-qualifier',
    icon: Target,
    emoji: '🎯',
    name: 'Sales Qualifier',
    description: 'Qualifies inbound leads, scores them, books meetings',
    northStar: 'Qualify every inbound lead within 5 minutes and book meetings with prospects scoring 7+',
    aiName: 'Quinn',
  },
  {
    slug: 'brand-voice',
    icon: Shield,
    emoji: '🛡️',
    name: 'Brand Voice Guard',
    description: 'Reviews outgoing content, ensures it matches brand guidelines',
    northStar: 'Ensure every client-facing message aligns with brand voice before it goes out',
    aiName: 'Nova',
  },
  {
    slug: 'social-scout',
    icon: Smartphone,
    emoji: '📱',
    name: 'Social Scout',
    description: 'Tracks social media mentions, trends, competitor activity',
    northStar: 'Track brand mentions and surface trending topics relevant to our audience daily',
    aiName: 'Scout',
  },
  {
    slug: 'appointment-setter',
    icon: Phone,
    emoji: '📞',
    name: 'Appointment Setter',
    description: 'Books calls, sends reminders, handles reschedules',
    northStar: 'Convert every qualified lead into a booked appointment within 24 hours',
    aiName: 'Aria',
  },
  {
    slug: 'intake-specialist',
    icon: ClipboardList,
    emoji: '📋',
    name: 'Intake Specialist',
    description: 'Collects client info, fills intake forms, routes to right person',
    northStar: 'Collect complete client intake information and route to the right team member',
    aiName: 'Blake',
  },
  {
    slug: 'community-manager',
    icon: MessageCircle,
    emoji: '💬',
    name: 'Community Manager',
    description: 'Answers FAQs, moderates tone, escalates when needed',
    northStar: 'Answer 90% of FAQs instantly and escalate complex issues within 1 hour',
    aiName: 'Cleo',
  },
  {
    slug: 'weekly-reporter',
    icon: BarChart3,
    emoji: '📊',
    name: 'Weekly Reporter',
    description: 'Compiles weekly activity into a summary report for the client',
    northStar: 'Deliver a clear weekly summary of all AI activity every Monday morning',
    aiName: 'Atlas',
  },
];

// ============================================================================
// Industry Colors
// ============================================================================
const industryColors: Record<string, string> = {
  'Dental / Medical':          'border-cyan-500/50 bg-cyan-50 text-cyan-600',
  'Real Estate':               'border-emerald-500/50 bg-emerald-50 text-emerald-600',
  'Home Services':             'border-orange-500/50 bg-orange-50 text-orange-600',
  'Retail / E-commerce':       'border-indigo-200 bg-indigo-50 text-indigo-600',
  'Legal':                     'border-amber-200 bg-amber-50 text-amber-600',
  'Finance':                   'border-blue-200 bg-blue-50 text-blue-600',
  'Fitness & Wellness':        'border-green-200 bg-green-50 text-green-600',
  'Fitness / Wellness':        'border-green-200 bg-green-50 text-green-600',
  'Restaurant / Hospitality':  'border-red-200 bg-red-50 text-red-600',
  'Restaurant & Food':         'border-red-200 bg-red-50 text-red-600',
  'Education':                 'border-emerald-500/50 bg-emerald-50 text-emerald-600',
  'Sales & Consulting':        'border-violet-500/50 bg-violet-50 text-violet-600',
  'Market Intelligence':       'border-rose-500/50 bg-rose-50 text-rose-600',
  'Media & Content':           'border-teal-500/50 bg-teal-50 text-teal-600',
  'Cannabis & Dispensary':     'border-green-500/50 bg-green-50 text-green-700',
  'Automotive':                'border-slate-400/50 bg-slate-50 text-slate-600',
  'Spa & Beauty':              'border-pink-300/50 bg-pink-50 text-pink-600',
  'Medical Aesthetics':        'border-purple-300/50 bg-purple-50 text-purple-600',
  'Chiropractic & Physical Therapy': 'border-sky-300/50 bg-sky-50 text-sky-600',
  'Events & Venues':           'border-yellow-400/50 bg-yellow-50 text-yellow-700',
  'Mortgage & Lending':        'border-blue-400/50 bg-blue-50 text-blue-700',
  'Hospitality':               'border-amber-400/50 bg-amber-50 text-amber-700',
  'Insurance':                 'border-indigo-400/50 bg-indigo-50 text-indigo-700',
  'General':                   'border-indigo-200 bg-indigo-50 text-indigo-600',
};

function getIndustryColor(industry: string) {
  return industryColors[industry] ?? industryColors['General'];
}

// ============================================================================
// Main Component
// ============================================================================
interface TemplatesPageContentProps {
  templates: AgencyTemplate[];
}

export function TemplatesPageContent({ templates }: TemplatesPageContentProps) {
  const [activeTab, setActiveTab] = useState<'role' | 'industry'>('role');

  const builtIn = templates.filter((t) => t.agency_id === null);
  const custom = templates.filter((t) => t.agency_id !== null);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pre-configured AI setups to get started fast
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('role')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'role'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          By Role
        </button>
        <button
          onClick={() => setActiveTab('industry')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'industry'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          By Industry
        </button>
      </div>

      {/* By Role Tab */}
      {activeTab === 'role' && (
        <div>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-4 py-3 mb-6">
            <p className="text-sm text-indigo-700">
              <span className="font-semibold">Role templates</span> — pre-configured by what your AI <em>does</em>, not what industry it&apos;s in. Pick a role and your agent is ready to go.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roleTemplates.map((role) => {
              const Icon = role.icon;
              return (
                <Card
                  key={role.slug}
                  className="group hover:border-indigo-200 hover:shadow-md transition-all border-gray-200"
                >
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-indigo-100 text-indigo-600">
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <span className="text-lg">{role.emoji}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{role.name}</h3>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{role.description}</p>
                    <p className="text-[11px] text-gray-400 mb-4 line-clamp-2 italic">
                      &ldquo;{role.northStar}&rdquo;
                    </p>
                    <div className="mt-auto">
                      <Link href={`/agency/clients/new?role=${role.slug}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          Use Template
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* By Industry Tab */}
      {activeTab === 'industry' && (
        <>
          {/* Built-in Templates */}
          <div className="mb-10">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Industry Templates
            </h2>
            {builtIn.length === 0 ? (
              <Card>
                <CardContent className="p-4 sm:p-6 lg:p-8 text-center">
                  <FileText className="h-8 w-8 text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">No built-in templates available yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {builtIn.map((template) => {
                  const suggestedSkills = (template.suggested_skills ?? []) as SuggestedSkill[];
                  const sampleResponses = (template.sample_responses ?? []) as SampleResponse[];

                  return (
                    <Card key={template.id} className="group hover:border-gray-200 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{template.icon || '🤖'}</span>
                            <div>
                              <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                                {template.name}
                              </h3>
                              <Badge className={`mt-1 text-[10px] ${getIndustryColor(template.industry)}`}>
                                {template.industry}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                          {template.description}
                        </p>

                        {suggestedSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {suggestedSkills.slice(0, 4).map((skill) => (
                              <span
                                key={skill.id}
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500"
                              >
                                <Zap className="h-2.5 w-2.5" />
                                {skill.name}
                              </span>
                            ))}
                            {suggestedSkills.length > 4 && (
                              <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] text-gray-400">
                                +{suggestedSkills.length - 4} more
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
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

          {/* Custom Templates */}
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
              Your Templates
            </h2>
            {custom.length === 0 ? (
              <Card>
                <CardContent className="p-4 sm:p-6 lg:p-8 text-center">
                  <div className="rounded-full bg-gray-100 h-12 w-12 flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium mb-1">No custom templates yet</p>
                  <p className="text-sm text-gray-400 mb-4">
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
                    <Card key={template.id} className="group hover:border-gray-200 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{template.icon || '🤖'}</span>
                            <div>
                              <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                                {template.name}
                              </h3>
                              <Badge className={`mt-1 text-[10px] ${getIndustryColor(template.industry)}`}>
                                {template.industry}
                              </Badge>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-200">
                            Custom
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                          {template.description}
                        </p>

                        {suggestedSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {suggestedSkills.slice(0, 4).map((skill) => (
                              <span
                                key={skill.id}
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500"
                              >
                                <Zap className="h-2.5 w-2.5" />
                                {skill.name}
                              </span>
                            ))}
                            {suggestedSkills.length > 4 && (
                              <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] text-gray-400">
                                +{suggestedSkills.length - 4} more
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-400 mb-4">
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
        </>
      )}
    </div>
  );
}
