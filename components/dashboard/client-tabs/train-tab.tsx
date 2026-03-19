'use client';

import { useState } from 'react';
import type { AgencyClient } from '@/lib/agency/queries';
import AIPersonalityTab from './ai-personality-tab';
import SkillsTab from './skills-tab';

const SUB_TABS = ['personality', 'skills'] as const;
type SubTab = typeof SUB_TABS[number];

const SUB_TAB_LABELS: Record<SubTab, string> = {
  personality: 'Personality',
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
      <div className="flex flex-wrap gap-2">
        {SUB_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeSubTab === tab
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
      {activeSubTab === 'skills' && (
        <SkillsTab client={client} />
      )}
    </div>
  );
}
