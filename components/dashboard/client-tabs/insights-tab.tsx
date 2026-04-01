'use client';

import { useState, Component, type ReactNode } from 'react';
import type { AgencyClient } from '@/lib/agency/queries';
import { UsageAnalytics } from '@/app/(dashboard)/agency/clients/[id]/usage-analytics';
import { MemoryBrowser } from '@/app/(dashboard)/agency/clients/[id]/memory-browser';
import { CustomerIntelligence } from '@/app/(dashboard)/agency/clients/[id]/customer-intelligence';
import { SEODashboard } from '@/app/(dashboard)/agency/clients/[id]/seo-dashboard';
import HealthScoreBadge from '@/components/dashboard/health-score-badge';
import ClientActivityHeatmap from '@/components/dashboard/client-activity-heatmap';
import RoiSummaryCard from '@/components/dashboard/roi-summary-card';
import WorkerPerformanceCard from '@/components/dashboard/client-tabs/worker-performance-card';
import TasksCard from '@/components/dashboard/client-tabs/tasks-card';
import {
  BarChart3, ListTodo, Brain, Search, AlertTriangle,
} from 'lucide-react';

// ── Error Boundary ─────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class InsightsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function ErrorFallback({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-12 w-12 rounded-xl bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6 text-red-400" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">Unable to load {label}</h3>
      <p className="text-sm text-gray-500 max-w-sm">Something went wrong. Try refreshing the page.</p>
    </div>
  );
}

const SUB_TABS = ['usage', 'tasks', 'memory', 'seo'] as const;
type SubTab = typeof SUB_TABS[number];

const SUB_TAB_LABELS: Record<SubTab, string> = {
  usage: 'Usage',
  tasks: 'Tasks',
  memory: 'Memory',
  seo: 'SEO',
};

const SUB_TAB_ICONS: Record<SubTab, React.ElementType> = {
  usage: BarChart3,
  tasks: ListTodo,
  memory: Brain,
  seo: Search,
};

interface InsightsTabProps {
  client: AgencyClient;
  defaultSubTab?: SubTab;
  isSeoLocked?: boolean;
  workerRoleId?: string;
}

export default function InsightsTab({ client, defaultSubTab = 'usage', isSeoLocked, workerRoleId }: InsightsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(defaultSubTab);

  return (
    <div className="space-y-6">
      {/* Sub-nav pills */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {SUB_TABS.map((tab) => {
          const Icon = SUB_TAB_ICONS[tab];
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
              <Icon className="w-3.5 h-3.5" />
              {SUB_TAB_LABELS[tab]}
              {tab === 'seo' && isSeoLocked && <span className="ml-1">🔒</span>}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      {activeSubTab === 'tasks' && (
        <InsightsErrorBoundary fallback={<ErrorFallback label="Tasks" />}>
          <div className="space-y-6">
            <TasksCard clientId={client.id} workerRoleId={workerRoleId} />
          </div>
        </InsightsErrorBoundary>
      )}

      {activeSubTab === 'usage' && (
        <InsightsErrorBoundary fallback={<ErrorFallback label="Usage" />}>
          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              Messages handled, response times, and costs for this client&apos;s AI worker.
            </p>
            <WorkerPerformanceCard clientId={client.id} />
            <RoiSummaryCard
              totalConversations={client.usage_this_month ?? 0}
              plan="pro"
              billingCents={client.billing_amount_cents ?? 0}
              showLink={false}
            />
            <HealthScoreBadge clientId={client.id} showDetails />
            <ClientActivityHeatmap clientId={client.id} />
            <UsageAnalytics clientId={client.id} />
          </div>
        </InsightsErrorBoundary>
      )}

      {activeSubTab === 'memory' && (
        <InsightsErrorBoundary fallback={<ErrorFallback label="Memory" />}>
          <div className="space-y-0">
            <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 mb-4">
              <p className="text-sm font-semibold text-indigo-700 mb-1">AI Memory</p>
              <p className="text-xs text-indigo-600">
                Your AI worker builds a memory of each customer over time — facts, preferences, history.
                This memory is injected into every conversation so the AI feels like it knows them.
              </p>
            </div>
            <CustomerIntelligence clientId={client.id} />
            <div className="border-t border-gray-200 mt-6 pt-6 px-4 sm:px-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                AI Context Files (Advanced)
              </p>
              <MemoryBrowser clientId={client.id} clientName={client.name || 'Client'} />
            </div>
          </div>
        </InsightsErrorBoundary>
      )}

      {activeSubTab === 'seo' && (
        isSeoLocked ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Premium Feature</h2>
            <p className="text-gray-500 mb-6 max-w-md">
              <span className="font-medium">SEO</span> is available on Agency plans. Upgrade to unlock all features.
            </p>
            <a
              href="/agency/billing"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Upgrade Plan
            </a>
          </div>
        ) : (
          <InsightsErrorBoundary fallback={<ErrorFallback label="SEO" />}>
            <SEODashboard clientId={client.id} clientName={client.name || 'Client'} />
          </InsightsErrorBoundary>
        )
      )}
    </div>
  );
}
