'use client';

import { useState } from 'react';
import { Target, Zap, BarChart3, FlaskConical } from 'lucide-react';
import PipelineClient from './pipeline-client';
import IntegrationsPage from './integrations-page';
import PipelineAnalytics from './pipeline-analytics';
import PipelineABTests from './pipeline-ab-tests';

export default function PipelinePage() {
  const [tab, setTab] = useState<'pipeline' | 'analytics' | 'ab_tests' | 'integrations'>('pipeline');

  return (
    <div>
      {/* Tab toggle */}
      <div className="px-4 sm:px-6 md:px-8 pt-4 max-w-7xl flex items-center gap-2">
        <button
          onClick={() => setTab('pipeline')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'pipeline' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Target className="h-4 w-4" /> Pipeline
        </button>
        <button
          onClick={() => setTab('analytics')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'analytics' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <BarChart3 className="h-4 w-4" /> Analytics
        </button>
        <button
          onClick={() => setTab('ab_tests')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'ab_tests' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <FlaskConical className="h-4 w-4" /> A/B Tests
        </button>
        <button
          onClick={() => setTab('integrations')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'integrations' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Zap className="h-4 w-4" /> Integrations
        </button>
      </div>

      {tab === 'pipeline' ? (
        <PipelineClient />
      ) : tab === 'analytics' ? (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl">
          <PipelineAnalytics />
        </div>
      ) : tab === 'ab_tests' ? (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl">
          <PipelineABTests />
        </div>
      ) : (
        <div className="p-4 sm:p-6 md:p-8 max-w-5xl">
          <IntegrationsPage />
        </div>
      )}
    </div>
  );
}
