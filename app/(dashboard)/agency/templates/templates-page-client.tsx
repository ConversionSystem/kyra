'use client';

import { getAllPremiumTemplates, type PremiumTemplate } from '@/lib/billing/premium-templates';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';

export function PremiumTemplatesPage() {
  const templates = getAllPremiumTemplates();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-400" />
          Premium AI Worker Templates
        </h1>
        <p className="text-gray-400 mt-2">
          Deploy specialized AI workers for your clients. Each template includes all LLM tokens,
          API costs, and infrastructure — one flat monthly price.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}

        {/* Coming Soon placeholder */}
        <div className="bg-gray-800/50 border border-dashed border-gray-700 rounded-xl p-6 flex flex-col items-center justify-center text-center">
          <p className="text-gray-500 text-sm font-medium mb-1">More templates coming soon</p>
          <p className="text-gray-600 text-xs">Restaurant SEO • Real Estate • Medical Practice • Legal</p>
        </div>
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: PremiumTemplate }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:border-indigo-600/50 transition-colors">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-3xl">{template.icon}</span>
            <h2 className="text-lg font-semibold text-white mt-2">{template.name}</h2>
            <Badge className="mt-1 bg-indigo-900/50 text-indigo-300 border-indigo-700 text-xs">
              {template.category}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">${template.price}</p>
            <p className="text-xs text-gray-400">/mo per client</p>
          </div>
        </div>

        <p className="text-sm text-gray-400 mb-4">{template.description}</p>

        <div className="space-y-1.5 mb-6">
          {template.features.slice(0, 5).map((feature, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-300">
              <Check className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
          {template.features.length > 5 && (
            <p className="text-xs text-gray-500 pl-5.5">
              +{template.features.length - 5} more features
            </p>
          )}
        </div>

        <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-400">
            <span className="text-green-400 font-medium">Your margin:</span> Charge clients $500-2,000/mo. 
            Your cost: ${template.price}/mo per worker. Everything included.
          </p>
        </div>

        <Link href={`/agency/clients?activate_template=${template.id}`}>
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
            Deploy for a Client <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
