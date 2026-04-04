'use client';

import { useState } from 'react';
import TrainTab from './train-tab';
import AIWorkersTab from './ai-workers-tab';
import BookingConfigTab from './booking-config-tab';
import { Brain, Bot, Calendar } from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';

type SubTab = 'train' | 'workers' | 'booking';

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
  const [activeTab, setActiveTab] = useState<SubTab>('train');

  const tabs = [
    { id: 'train' as SubTab, label: 'Train AI', icon: Brain },
    { id: 'workers' as SubTab, label: 'AI Workers', icon: Bot },
    { id: 'booking' as SubTab, label: 'Booking', icon: Calendar },
  ];

  return (
    <div>
      {/* Sub-tab navigation */}
      <div className="flex flex-nowrap gap-1 mb-6 border-b border-gray-200 pb-2 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-white border-b-2 border-indigo-600 text-indigo-600 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'train' && <TrainTab client={client} />}
      {activeTab === 'workers' && <AIWorkersTab client={client} agencyId={agencyId} plan={plan} />}
      {activeTab === 'booking' && <BookingConfigTab clientId={clientId} />}
    </div>
  );
}
