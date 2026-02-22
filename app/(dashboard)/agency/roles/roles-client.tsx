'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { agentRoles, type AgentRole } from './roles-data';

const colorMap: Record<string, { border: string; bg: string; text: string; pill: string }> = {
  indigo: { border: 'border-l-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', pill: 'border-indigo-200 bg-indigo-50 text-indigo-600' },
  green:  { border: 'border-l-green-500',  bg: 'bg-green-50',  text: 'text-green-700',  pill: 'border-green-200 bg-green-50 text-green-600' },
  purple: { border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', pill: 'border-purple-200 bg-purple-50 text-purple-600' },
  orange: { border: 'border-l-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', pill: 'border-orange-200 bg-orange-50 text-orange-600' },
  amber:  { border: 'border-l-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700',  pill: 'border-amber-200 bg-amber-50 text-amber-600' },
  cyan:   { border: 'border-l-cyan-500',   bg: 'bg-cyan-50',   text: 'text-cyan-700',   pill: 'border-cyan-200 bg-cyan-50 text-cyan-600' },
  blue:   { border: 'border-l-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   pill: 'border-blue-200 bg-blue-50 text-blue-600' },
  red:    { border: 'border-l-red-500',     bg: 'bg-red-50',    text: 'text-red-700',    pill: 'border-red-200 bg-red-50 text-red-600' },
};

function RoleCard({ role }: { role: AgentRole }) {
  const [showSoul, setShowSoul] = useState(false);
  const colors = colorMap[role.color] ?? colorMap.indigo;

  return (
    <div className={`rounded-xl border border-gray-200 bg-white border-l-4 ${colors.border} overflow-hidden`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <span className="text-3xl">{role.emoji}</span>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{role.name}</h3>
            <p className="text-sm font-semibold text-gray-600">{role.tagline}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 leading-relaxed mb-4">{role.description}</p>

        {/* Best for tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-xs text-gray-400 mr-1">Best for:</span>
          {role.bestFor.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-500"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Trait badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {role.traits.map((trait) => (
            <Badge key={trait} className={`text-[11px] ${colors.pill}`}>
              {trait}
            </Badge>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link href={`/agency/clients/new?role=${role.id}`} className="flex-1">
            <Button size="sm" className="w-full gap-2 text-xs">
              Deploy for Client
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowSoul(!showSoul)}
          >
            {showSoul ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Preview SOUL
          </Button>
        </div>
      </div>

      {/* Expandable SOUL.md preview */}
      {showSoul && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {role.soulMd}
          </pre>
        </div>
      )}
    </div>
  );
}

export function RolesPageClient() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Agent Roles</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pre-configured AI personalities for any client. Pick a role, set the North Star, deploy in minutes.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Roles work with any industry template &mdash; they define HOW your AI thinks, not what it knows.
        </p>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {agentRoles.map((role) => (
          <RoleCard key={role.id} role={role} />
        ))}
      </div>

      {/* Custom Role CTA */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-indigo-50/30 p-6">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Want a custom role?</h3>
            <p className="text-sm text-gray-500">
              Every AI employee can have a fully custom persona configured in their workspace files.
              Contact us to build a bespoke role for your agency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
