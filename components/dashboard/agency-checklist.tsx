'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, ClipboardList, ArrowRight } from 'lucide-react';

export interface AgencyChecklistProps {
  hasClients: boolean;
  hasRunningClient: boolean;
  hasGhlConnected: boolean;
  hasPersonalitySet: boolean;
  hasConversations: boolean;
  hasBilling: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
  priority: 'critical' | 'important' | 'nice';
}

export default function AgencyChecklist({
  hasClients,
  hasRunningClient,
  hasGhlConnected,
  hasPersonalitySet,
  hasConversations,
  hasBilling,
}: AgencyChecklistProps) {
  const [collapsed, setCollapsed] = useState(false);

  const items: ChecklistItem[] = [
    {
      id: 'add-client',
      label: 'Add your first client',
      description: 'Deploy an AI worker for your first client using a template.',
      done: hasClients,
      href: '/agency/clients/new',
      cta: 'Add client →',
      priority: 'critical',
    },
    {
      id: 'deploy-ai',
      label: 'Get AI live',
      description: 'Launch the AI container so it can start responding to customers.',
      done: hasRunningClient,
      href: '/agency/clients',
      cta: 'View clients →',
      priority: 'critical',
    },
    {
      id: 'connect-ghl',
      label: 'Connect GoHighLevel',
      description: 'Link a GHL sub-account so the AI responds to SMS and contacts.',
      done: hasGhlConnected,
      href: '/agency/ghl-setup',
      cta: 'Connect GHL →',
      priority: 'critical',
    },
    {
      id: 'set-personality',
      label: 'Train your AI personality',
      description: 'Add persona, greeting, and instructions so the AI knows who it is.',
      done: hasPersonalitySet,
      href: '/agency/clients',
      cta: 'Train AI →',
      priority: 'important',
    },
    {
      id: 'first-convo',
      label: 'Have your first conversation',
      description: 'Use Test Chat to verify the AI responds correctly before going live.',
      done: hasConversations,
      href: '/agency/conversations',
      cta: 'View conversations →',
      priority: 'important',
    },
    {
      id: 'billing',
      label: 'Upgrade your plan',
      description: 'Add more client slots to grow your agency.',
      done: hasBilling,
      href: '/agency/billing',
      cta: 'View plans →',
      priority: 'nice',
    },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((doneCount / total) * 100);
  const allDone = doneCount === total;

  // Don't show if fully complete
  if (allDone) return null;

  const criticalRemaining = items.filter((i) => i.priority === 'critical' && !i.done).length;

  return (
    <div className={`mb-6 rounded-2xl border overflow-hidden ${criticalRemaining > 0 ? 'border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-white' : 'border-gray-200 bg-white'}`}>
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`rounded-xl p-2 shrink-0 ${criticalRemaining > 0 ? 'bg-indigo-600' : 'bg-gray-400'}`}>
            <ClipboardList className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">Setup Checklist</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                pct >= 70 ? 'bg-green-100 text-green-700' :
                pct >= 40 ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>{pct}% done</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 max-w-[200px] h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-indigo-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">{doneCount}/{total} steps</span>
            </div>
          </div>
        </div>
        {collapsed
          ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          : <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>

      {/* Items */}
      {!collapsed && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-5 py-3 ${item.done ? 'opacity-50' : ''}`}
            >
              {item.done
                ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                : <Circle className={`h-4 w-4 shrink-0 ${item.priority === 'critical' ? 'text-indigo-400' : item.priority === 'important' ? 'text-amber-400' : 'text-gray-300'}`} />}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${item.done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                  {item.label}
                  {!item.done && item.priority === 'critical' && (
                    <span className="ml-2 text-[10px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded uppercase">Required</span>
                  )}
                </p>
                {!item.done && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                )}
              </div>
              {!item.done && (
                <Link
                  href={item.href}
                  className="shrink-0 flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap"
                >
                  {item.cta} <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
