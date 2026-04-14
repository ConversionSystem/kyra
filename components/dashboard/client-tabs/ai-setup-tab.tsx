'use client';

import { useState } from 'react';
import TrainTab from './train-tab';
import AIWorkersTab from './ai-workers-tab';
import BookingConfigTab from './booking-config-tab';
import { Brain, Bot, Calendar } from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';

type SubTab = 'train' | 'workers' | 'booking';

const MASTER_AGENCY_ID = '1511e077-77ef-4c47-81fd-06a3bc9f1dbb';

export default function AiSetupTab({
  client,
  clientId,
  agencyId,
  plan,
}: {
  client: AgencyClient;
  clientId: string;
  agencyId: string;
  plan?: string;
}) {
  const isMaster = agencyId === MASTER_AGENCY_ID;
  const [activeTab, setActiveTab] = useState<SubTab>('train');

  const allTabs = [
    { id: 'train' as SubTab, label: 'Train AI', icon: Brain },
    { id: 'workers' as SubTab, label: 'AI Workers', icon: Bot },
    { id: 'booking' as SubTab, label: 'Booking', icon: Calendar },
  ];
  const tabs = isMaster ? allTabs : allTabs.filter(t => t.id !== 'booking');
  const effectiveTab = tabs.some(t => t.id === activeTab) ? activeTab : 'train';

  return (
    <div>
      {/* Sub-tab navigation */}
      <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              effectiveTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {effectiveTab === 'train' && <TrainTab client={client} />}
      {effectiveTab === 'workers' && <AIWorkersTab client={client} agencyId={agencyId} plan={plan} />}
      {effectiveTab === 'booking' && isMaster && <BookingConfigTab clientId={clientId} />}
    </div>
  );
}
