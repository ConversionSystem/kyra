'use client';

import { useState } from 'react';
import { Bot, BookOpen, Zap } from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import IdentitySubTab from './identity-sub-tab';
import TrainingSubTab from './training-sub-tab';
import BehaviorSubTab from './behavior-sub-tab';

const SUB_TABS = ['identity', 'training', 'behavior'] as const;
type SubTab = typeof SUB_TABS[number];

const SUB_TAB_CONFIG: Record<SubTab, { label: string; icon: typeof Bot; description: string }> = {
  identity: { label: 'Identity', icon: Bot, description: 'Who the AI is' },
  training: { label: 'Training', icon: BookOpen, description: 'What the AI knows' },
  behavior: { label: 'Behavior', icon: Zap, description: 'How the AI acts' },
};

interface TrainTabProps {
  client: AgencyClient;
  defaultSubTab?: SubTab;
}

export default function TrainTab({ client, defaultSubTab = 'identity' }: TrainTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(defaultSubTab);

  return (
    <div className="space-y-6">
      {/* Sub-nav pills */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {SUB_TABS.map((tab) => {
          const config = SUB_TAB_CONFIG[tab];
          const Icon = config.icon;
          return (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeSubTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab description */}
      <p className="text-xs text-gray-400 -mt-3 px-1">
        {SUB_TAB_CONFIG[activeSubTab].description}
      </p>

      {/* Sub-tab content */}
      {activeSubTab === 'identity' && <IdentitySubTab client={client} />}
      {activeSubTab === 'training' && <TrainingSubTab client={client} />}
      {activeSubTab === 'behavior' && <BehaviorSubTab client={client} />}
    </div>
  );
}
