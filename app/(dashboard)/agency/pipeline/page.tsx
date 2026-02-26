'use client';

import { useState } from 'react';
import { Target, Webhook } from 'lucide-react';
import PipelineClient from './pipeline-client';
import WebhookSettings from './webhook-settings';

export default function PipelinePage() {
  const [tab, setTab] = useState<'pipeline' | 'webhooks'>('pipeline');

  return (
    <div>
      {/* Tab toggle */}
      <div className="px-4 sm:px-6 md:px-8 pt-4 max-w-7xl flex items-center gap-2">
        <button
          onClick={() => setTab('pipeline')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'pipeline' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Target className="h-4 w-4" /> Pipeline
        </button>
        <button
          onClick={() => setTab('webhooks')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === 'webhooks' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Webhook className="h-4 w-4" /> Integrations
        </button>
      </div>

      {tab === 'pipeline' ? <PipelineClient /> : (
        <div className="p-4 sm:p-6 md:p-8 max-w-4xl">
          <WebhookSettings />
        </div>
      )}
    </div>
  );
}
