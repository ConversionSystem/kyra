'use client';

import { useState } from 'react';
import type { AgencyClient } from '@/lib/agency/queries';
import AIPersonalityTab from './ai-personality-tab';
import SkillsTab from './skills-tab';
import KnowledgeTab from './knowledge-tab';

const SUB_TABS = ['personality', 'knowledge', 'skills'] as const;
type SubTab = typeof SUB_TABS[number];

const SUB_TAB_LABELS: Record<SubTab, string> = {
  personality: 'Personality',
  knowledge: 'Knowledge',
  skills: 'Skills',
};

interface TrainTabProps {
  client: AgencyClient;
  defaultSubTab?: SubTab;
}

export default function TrainTab({ client, defaultSubTab = 'personality' }: TrainTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(defaultSubTab);

  return (
    <div className="space-y-6">
      {/* Sub-nav pills */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeSubTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {SUB_TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {activeSubTab === 'personality' && (
        <AIPersonalityTab client={client} />
      )}
      {activeSubTab === 'knowledge' && (
        <KnowledgeTab client={client} />
      )}
      {activeSubTab === 'skills' && (
        <SkillsTab client={client} />
      )}
    </div>
  );
}
