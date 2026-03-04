'use client';

import { getAllPremiumTemplates, type PremiumTemplate } from '@/lib/billing/premium-templates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';

export function PremiumTemplatesPage() {
  const templates = getAllPremiumTemplates();

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-500" />
          Premium AI Worker Templates
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Deploy specialized AI workers for your clients. All LLM tokens, API costs, and infrastructure included — one flat monthly price.
        </p>
      </div>

      {/* Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}

        {/* Coming Soon */}
        <Card className="border-dashed">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full min-h-48">
            <p className="text-sm font-medium text-gray-400 mb-1">More templates coming soon</p>
            <p className="text-xs text-gray-300">Restaurant SEO · Real Estate · Medical Practice · Legal</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: PremiumTemplate }) {
  return (
    <Card className="hover:border-blue-300 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-3xl">{template.icon}</span>
            <h2 className="text-base font-semibold text-gray-900 mt-2">{template.name}</h2>
            <Badge className="mt-1 bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
              {template.category}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">${template.price}</p>
            <p className="text-xs text-gray-400">/mo per client</p>
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">{template.description}</p>

        <div className="space-y-1.5 mb-4">
          {template.features.slice(0, 5).map((feature, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
          {template.features.length > 5 && (
            <p className="text-xs text-gray-400 ml-5">+{template.features.length - 5} more features</p>
          )}
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-emerald-700">
            <span className="font-semibold">Your margin:</span> Charge clients $500–2,000/mo.
            Your cost: ${template.price}/mo. Everything included.
          </p>
        </div>

        <Link href={`/agency/clients?activate_template=${template.id}`}>
          <Button className="w-full">
            Deploy for a Client <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
