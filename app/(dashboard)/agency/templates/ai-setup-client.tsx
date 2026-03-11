'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, Search, Target, Shield, Smartphone, Phone, ClipboardList,
  MessageCircle, BarChart3, ArrowRight, CheckCircle2, Loader2, Zap,
  Wrench, Flame, Snowflake, Sun, Leaf, Home, Star,
  Bot, UserCheck, Briefcase, Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'roles' | 'industry' | 'packages';

// ─── Role Templates ─────────────────────────────────────────────────────────

const ROLES = [
  { id: 'researcher', emoji: '🔍', icon: Search, name: 'Researcher', desc: 'Monitors trends, compiles reports, surfaces insights daily', color: 'bg-blue-50 border-blue-200' },
  { id: 'sales-qualifier', emoji: '🎯', icon: Target, name: 'Sales Qualifier', desc: 'Qualifies inbound leads, scores them, books meetings', color: 'bg-indigo-50 border-indigo-200' },
  { id: 'brand-voice', emoji: '🛡️', icon: Shield, name: 'Brand Voice Guard', desc: 'Reviews content, ensures brand guideline alignment', color: 'bg-purple-50 border-purple-200' },
  { id: 'social-scout', emoji: '📱', icon: Smartphone, name: 'Social Scout', desc: 'Tracks social mentions, trends, competitor activity', color: 'bg-pink-50 border-pink-200' },
  { id: 'appointment-setter', emoji: '📞', icon: Phone, name: 'Appointment Setter', desc: 'Books calls, sends reminders, handles reschedules', color: 'bg-green-50 border-green-200' },
  { id: 'intake-specialist', emoji: '📋', icon: ClipboardList, name: 'Intake Specialist', desc: 'Collects client info, fills intake forms, routes to team', color: 'bg-amber-50 border-amber-200' },
  { id: 'community-manager', emoji: '💬', icon: MessageCircle, name: 'Community Manager', desc: 'Answers FAQs, moderates tone, escalates when needed', color: 'bg-teal-50 border-teal-200' },
  { id: 'weekly-reporter', emoji: '📊', icon: BarChart3, name: 'Weekly Reporter', desc: 'Compiles weekly activity into a clear summary report', color: 'bg-orange-50 border-orange-200' },
];

// ─── Quick Setup Packages ────────────────────────────────────────────────────

const PACKAGES = [
  { id: 'plumbing', emoji: '🔧', name: 'Plumbing Pro', desc: 'Emergency dispatch, appointment booking, invoice follow-up', agents: 3, automations: 6, color: 'bg-blue-50 border-blue-200' },
  { id: 'hvac', emoji: '❄️', name: 'HVAC Pro', desc: 'Service scheduling, maintenance reminders, emergency routing', agents: 3, automations: 6, color: 'bg-cyan-50 border-cyan-200' },
  { id: 'electrical', emoji: '⚡', name: 'Electrical Pro', desc: 'Quote requests, safety compliance, job scheduling', agents: 3, automations: 6, color: 'bg-amber-50 border-amber-200' },
  { id: 'cleaning', emoji: '🧹', name: 'Cleaning Pro', desc: 'Recurring bookings, quality check-ins, review requests', agents: 3, automations: 6, color: 'bg-green-50 border-green-200' },
  { id: 'landscaping', emoji: '🌿', name: 'Landscaping Pro', desc: 'Seasonal scheduling, weather-aware follow-ups', agents: 3, automations: 6, color: 'bg-emerald-50 border-emerald-200' },
  { id: 'roofing', emoji: '🏠', name: 'Roofing Pro', desc: 'Storm response, inspection scheduling, insurance follow-up', agents: 3, automations: 6, color: 'bg-slate-50 border-slate-200' },
];

// ─── Industry Template Store ─────────────────────────────────────────────────

interface IndustryTemplate {
  id: string;
  name: string;
  industry: string;
  emoji: string;
  description: string;
  tags: string[];
  variableCount: number;
  toolCount: number;
}

interface AISetupProps {
  agencyId: string;
  businessName: string;
  dbTemplates?: Array<{ id: string; name: string; industry: string; icon?: string | null; description?: string | null }>;
}

export function AISetupClient({ agencyId, businessName, dbTemplates }: AISetupProps) {
  const [activeTab, setActiveTab] = useState<Tab>('roles');
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [search, setSearch] = useState('');
  const [activating, setActivating] = useState<string | null>(null);
  const [activated, setActivated] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (activeTab === 'industry' && templates.length === 0) {
      setLoadingTemplates(true);
      fetch('/api/templates')
        .then(r => r.ok ? r.json() : { templates: [] })
        .then(d => { setTemplates(d.templates || []); setLoadingTemplates(false); })
        .catch(() => setLoadingTemplates(false));
    }
  }, [activeTab, templates.length]);

  const handleActivatePackage = async (pkgId: string) => {
    setActivating(pkgId);
    await fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: pkgId }),
    });
    setActivated(prev => new Set([...prev, pkgId]));
    setActivating(null);
  };

  const filteredTemplates = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.industry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-600" /> AI Setup
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your AI worker — pick a role, choose an industry template, or deploy a ready-made package
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {[
          { key: 'roles' as Tab, label: 'By Role', desc: 'What your AI does' },
          { key: 'industry' as Tab, label: 'By Industry', desc: 'Industry-specific AI' },
          { key: 'packages' as Tab, label: 'Quick Packages', desc: 'One-click deploy' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition min-w-[120px] ${
              activeTab === tab.key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ ROLES TAB ═══ */}
      {activeTab === 'roles' && (
        <>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-sm text-indigo-700">
              <span className="font-semibold">Role templates</span> — pre-configured by what your AI <em>does</em>.
              Pick a role and your AI worker is ready to go.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {ROLES.map(role => {
              const Icon = role.icon;
              return (
                <div key={role.id}
                  className={`rounded-xl border p-5 hover:shadow-md transition-all ${role.color}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-white/70 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-gray-700" />
                    </div>
                    <span className="text-lg">{role.emoji}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{role.name}</h3>
                  <p className="text-xs text-gray-600 mb-4 line-clamp-2">{role.desc}</p>
                  <a href={`/agency/clients/new?role=${role.id}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Use Role <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </a>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ═══ INDUSTRY TAB ═══ */}
      {activeTab === 'industry' && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Search by industry or template name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loadingTemplates ? (
            <div className="py-12 text-center text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading templates...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No templates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(t => (
                <div key={t.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-200 hover:shadow-sm transition">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{t.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{t.name}</h3>
                      <Badge className="mt-1 text-[10px] bg-gray-100 text-gray-600 border-gray-200">{t.industry}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{t.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-4">
                    <span className="flex items-center gap-0.5">
                      <Zap className="h-3 w-3" /> {t.toolCount} tools
                    </span>
                    <span>{t.variableCount} variables</span>
                  </div>
                  <a href={`/agency/ai-setup?template=${t.id}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Use Template <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* DB Templates (agency-custom) */}
          {(dbTemplates || []).length > 0 && (
            <>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mt-6">Your Custom Templates</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(dbTemplates || []).map(t => (
                  <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-200 transition">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{t.icon || '🤖'}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{t.name}</h3>
                        <span className="text-[10px] text-gray-400">{t.industry}</span>
                      </div>
                    </div>
                    {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ═══ PACKAGES TAB ═══ */}
      {activeTab === 'packages' && (
        <>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-700">
              <span className="font-semibold">One-click packages</span> — deploys AI agents, autopilot sequences,
              and smart routing for your industry. Everything configured in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PACKAGES.map(pkg => {
              const isDone = activated.has(pkg.id);
              const isLoading = activating === pkg.id;

              return (
                <div key={pkg.id}
                  className={`rounded-xl border p-5 transition-all ${isDone ? 'border-green-300 bg-green-50' : `${pkg.color} hover:shadow-md`}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{pkg.emoji}</span>
                    <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                    {isDone && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
                  </div>
                  <p className="text-xs text-gray-600 mb-3">{pkg.desc}</p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-4">
                    <span className="flex items-center gap-0.5">
                      <Bot className="h-3 w-3" /> {pkg.agents} agents
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Zap className="h-3 w-3" /> {pkg.automations} automations
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className={`w-full text-xs ${isDone ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}
                    disabled={isLoading || isDone}
                    onClick={() => handleActivatePackage(pkg.id)}
                  >
                    {isLoading ? (
                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Deploying...</>
                    ) : isDone ? (
                      <><CheckCircle2 className="h-3 w-3 mr-1" /> Activated</>
                    ) : (
                      <><Zap className="h-3 w-3 mr-1" /> Deploy Package</>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
