'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Brain, Building2, TrendingUp, Target, Users, AlertTriangle,
  CheckCircle2, ArrowRight, Zap, Bot, RefreshCw, ChevronDown,
  ChevronRight, Sparkles, DollarSign, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompanyIntel {
  company_id: string;
  company_name: string;
  contacts: Array<{
    id: string;
    name: string;
    title: string | null;
    role: string;
    engagement: string;
    score: number;
  }>;
  coverage: string;
  suggestions: string[];
  decision_maker: string | null;
  unengaged: string[];
}

interface DealForecast {
  deal_id: string;
  deal_name: string;
  stage: string;
  value: number;
  stage_probability: number;
  ai_probability: number;
  confidence: number;
  reasoning: string;
  risk_factors: string[];
  positive_signals: string[];
}

interface AutopilotDigest {
  deals_worked: number;
  follow_ups_drafted: number;
  deals_progressed: number;
  actions: Array<{
    deal_name: string;
    contact_name: string;
    action_type: string;
    description: string;
    ai_draft?: string;
    priority: string;
  }>;
  summary: string;
}

export function IntelligenceDashboard() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyIntel[]>([]);
  const [forecasts, setForecasts] = useState<DealForecast[]>([]);
  const [digest, setDigest] = useState<AutopilotDigest | null>(null);
  const [weightedPipeline, setWeightedPipeline] = useState({ stage: 0, ai: 0 });
  const [loading, setLoading] = useState(true);
  const [runningAutopilot, setRunningAutopilot] = useState(false);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/agency/crm/intelligence?type=companies').then(r => r.ok ? r.json() : { companies: [] }),
      fetch('/api/agency/crm/intelligence?type=forecast').then(r => r.ok ? r.json() : { forecasts: [], total_weighted_pipeline: 0, total_ai_weighted_pipeline: 0 }),
    ]).then(([compData, foreData]) => {
      setCompanies(compData.companies || []);
      setForecasts(foreData.forecasts || []);
      setWeightedPipeline({
        stage: foreData.total_weighted_pipeline || 0,
        ai: foreData.total_ai_weighted_pipeline || 0,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const runAutopilot = async () => {
    setRunningAutopilot(true);
    const res = await fetch('/api/agency/crm/autopilot', { method: 'POST' });
    if (res.ok) setDigest(await res.json());
    setRunningAutopilot(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400 animate-pulse">Loading intelligence...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-6 w-6 text-indigo-600" /> AI Intelligence
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Cross-contact intelligence, revenue forecasting, deal autopilot
          </p>
        </div>
        <Button onClick={runAutopilot} disabled={runningAutopilot}
          className="bg-indigo-600 hover:bg-indigo-700 text-white">
          {runningAutopilot ? (
            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Running...</>
          ) : (
            <><Zap className="h-4 w-4 mr-2" /> Run Deal Autopilot</>
          )}
        </Button>
      </div>

      {/* Autopilot Digest */}
      {digest && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Bot className="h-4 w-4 text-indigo-600" /> DEAL AUTOPILOT DIGEST
          </h2>
          <p className="text-sm text-gray-700 mb-3">{digest.summary}</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center p-2 bg-white/60 rounded-xl">
              <p className="text-xl font-bold text-gray-900">{digest.deals_worked}</p>
              <p className="text-[10px] text-gray-500">Deals Analyzed</p>
            </div>
            <div className="text-center p-2 bg-white/60 rounded-xl">
              <p className="text-xl font-bold text-indigo-700">{digest.follow_ups_drafted}</p>
              <p className="text-[10px] text-gray-500">Follow-ups Drafted</p>
            </div>
            <div className="text-center p-2 bg-white/60 rounded-xl">
              <p className="text-xl font-bold text-purple-700">{digest.deals_progressed}</p>
              <p className="text-[10px] text-gray-500">Recommendations</p>
            </div>
          </div>
          {digest.actions.length > 0 && (
            <div className="space-y-2">
              {digest.actions.map((a, i) => (
                <div key={i} className="bg-white/80 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      a.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>{a.priority}</span>
                    <span className="font-medium text-gray-900">{a.deal_name}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">{a.contact_name}</span>
                  </div>
                  <p className="text-gray-600">{a.description}</p>
                  {a.ai_draft && (
                    <div className="mt-2 bg-indigo-50 rounded-lg p-2 text-xs text-indigo-800 italic">
                      &ldquo;{a.ai_draft}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Revenue Forecast */}
      {forecasts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-green-500" /> AI REVENUE FORECAST
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <p className="text-xs text-gray-500 mb-1">Stage-Based Pipeline</p>
              <p className="text-2xl font-bold text-gray-900">${weightedPipeline.stage.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-indigo-50 rounded-xl text-center">
              <p className="text-xs text-indigo-600 mb-1">AI-Predicted Pipeline</p>
              <p className="text-2xl font-bold text-indigo-700">${weightedPipeline.ai.toLocaleString()}</p>
            </div>
          </div>

          <div className="space-y-2">
            {forecasts.map(f => (
              <div key={f.deal_id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{f.deal_name}</span>
                    <span className="text-xs text-gray-500">${f.value.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500">{f.reasoning}</p>
                </div>

                {/* Probability comparison */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-center">
                    <p className="text-xs text-gray-400">Stage</p>
                    <p className="text-sm font-bold text-gray-600">{f.stage_probability}%</p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-gray-300" />
                  <div className="text-center">
                    <p className="text-xs text-indigo-500">AI</p>
                    <p className={`text-sm font-bold ${
                      f.ai_probability > f.stage_probability ? 'text-green-600' : 'text-red-600'
                    }`}>{f.ai_probability}%</p>
                  </div>
                </div>

                {/* Signals */}
                <div className="flex gap-1 shrink-0">
                  {f.positive_signals.length > 0 && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                      {f.positive_signals.length} ✓
                    </span>
                  )}
                  {f.risk_factors.length > 0 && (
                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                      {f.risk_factors.length} ⚠
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-Contact Intelligence */}
      {companies.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-purple-500" /> CROSS-CONTACT INTELLIGENCE
            <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {companies.length} companies
            </span>
          </h2>

          <div className="space-y-2">
            {companies.map(co => (
              <div key={co.company_id} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedCompany(expandedCompany === co.company_id ? null : co.company_id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{co.company_name}</span>
                    <span className="text-xs text-gray-500">{co.contacts.length} contacts</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      co.coverage === 'deep' ? 'bg-green-100 text-green-700' :
                      co.coverage === 'multi_thread' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{co.coverage.replace('_', ' ')}</span>
                    {co.decision_maker && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                        DM: {co.decision_maker}
                      </span>
                    )}
                  </div>
                  {expandedCompany === co.company_id ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                </button>

                {expandedCompany === co.company_id && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    {/* Contacts */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {co.contacts.map(c => (
                        <div key={c.id}
                          onClick={() => router.push(`/agency/crm/contacts/${c.id}`)}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer text-sm">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            c.engagement === 'active' ? 'bg-green-100 text-green-700' :
                            c.engagement === 'passive' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{c.engagement}</span>
                          <span className="font-medium text-gray-900">{c.name}</span>
                          {c.title && <span className="text-xs text-gray-400">{c.title}</span>}
                          <span className={`text-[10px] ml-auto ${
                            c.role === 'decision_maker' ? 'text-indigo-600 font-bold' : 'text-gray-400'
                          }`}>{c.role.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>

                    {/* Suggestions */}
                    {co.suggestions.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {co.suggestions.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <Sparkles className="h-3 w-3 text-indigo-500 shrink-0 mt-0.5" />
                            <span className="text-gray-700">{s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty states */}
      {companies.length === 0 && forecasts.length === 0 && !digest && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
          <Brain className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-500">Intelligence builds over time</p>
          <p className="text-sm text-gray-400 mt-1">
            Add contacts, create deals, and run pipeline campaigns. AI will analyze patterns and provide insights.
          </p>
        </div>
      )}
    </div>
  );
}
