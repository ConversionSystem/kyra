'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FlaskConical, Plus, Loader2, Trophy, Pause, Play,
  TrendingUp, Target, CheckCircle2, ArrowRight,
  BarChart3, Users, MessageSquare, Calendar,
  Sparkles, ChevronDown, ChevronRight, X,
  Crown, Zap, BookOpen, Copy, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ABTestVariant {
  label: string;
  instruction: string;
  tone?: string;
  subject_instruction?: string;
  opener_instruction?: string;
}

interface ABTestStats {
  assigned: number;
  sent: number;
  opened: number;
  replied: number;
  interested: number;
  booked: number;
  closed: number;
}

interface ABTest {
  id: string;
  campaign_id: string;
  name: string;
  status: 'active' | 'paused' | 'completed';
  test_type: string;
  variant_a: ABTestVariant;
  variant_b: ABTestVariant;
  stats_a: ABTestStats;
  stats_b: ABTestStats;
  winner: 'a' | 'b' | null;
  confidence: number | null;
  winning_metric: string;
  auto_optimize: boolean;
  min_sample_size: number;
  created_at: string;
  completed_at: string | null;
}

interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  tone: string | null;
  instruction: string;
  example_subject: string | null;
  usage_count: number;
  avg_response_rate: number | null;
}

interface Campaign {
  id: string;
  name: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PipelineABTests() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  // ─── Load data ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [testsRes, campsRes] = await Promise.all([
        fetch('/api/agency/pipeline/ab-tests?templates=true'),
        fetch('/api/agency/pipeline/campaigns'),
      ]);

      const testsData = await testsRes.json();
      const campsData = await campsRes.json();

      setTests(testsData.tests || []);
      setTemplates(testsData.templates || []);
      setMigrationPending(!!testsData.migration_pending);
      setCampaigns(campsData.campaigns || []);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const handleAction = async (testId: string, action: string, extra?: Record<string, unknown>) => {
    await fetch('/api/agency/pipeline/ab-tests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test_id: testId, action, ...extra }),
    });
    await fetchData();
  };

  // ─── Loading state ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading A/B tests...</span>
      </div>
    );
  }

  // ─── Migration pending banner ───────────────────────────────────────────────

  const activeTests = tests.filter(t => t.status === 'active');
  const completedTests = tests.filter(t => t.status === 'completed');

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-violet-500" />
            A/B Message Testing
          </h2>
          <p className="text-sm text-gray-500">Test different outreach styles and let data pick the winner</p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
        >
          <Plus className="h-4 w-4 mr-1" /> New Test
        </Button>
      </div>

      {/* Migration pending */}
      {migrationPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Zap className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Migration required</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Run <code className="bg-amber-100 px-1 rounded">20260228001_pipeline_ab_tests.sql</code> in Supabase SQL Editor to enable A/B testing.
              You can still explore the UI and templates below.
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {tests.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-violet-600">{tests.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Total Tests</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{activeTests.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Active</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{completedTests.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Winners Found</div>
          </div>
        </div>
      )}

      {/* Active Tests */}
      {activeTests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5 text-green-500" /> Active Tests
          </h3>
          {activeTests.map(test => (
            <ABTestCard
              key={test.id}
              test={test}
              expanded={expandedTest === test.id}
              onToggle={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
              onAction={handleAction}
              campaigns={campaigns}
            />
          ))}
        </div>
      )}

      {/* Completed Tests */}
      {completedTests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-500" /> Completed Tests
          </h3>
          {completedTests.map(test => (
            <ABTestCard
              key={test.id}
              test={test}
              expanded={expandedTest === test.id}
              onToggle={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
              onAction={handleAction}
              campaigns={campaigns}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {tests.length === 0 && !migrationPending && (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No A/B Tests Yet</h3>
            <p className="text-sm text-gray-500 mb-1 max-w-md mx-auto">
              Test different outreach styles to find what resonates with your prospects.
              Professional vs casual? Pain-first vs value-first? Let the data decide.
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Requires at least one campaign with leads in the pipeline.
            </p>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1" /> Create First Test
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template Library */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            Message Strategy Library
            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
              {templates.length} strategies
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-500 mb-4">
            Pre-built outreach strategies you can use as variants in A/B tests. Pick two, test them, and learn what your audience responds to.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map(t => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Test Modal */}
      {showCreate && (
        <CreateTestModal
          campaigns={campaigns}
          templates={templates}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchData(); }}
        />
      )}
    </div>
  );
}

// ─── A/B Test Card ────────────────────────────────────────────────────────────

function ABTestCard({
  test,
  expanded,
  onToggle,
  onAction,
  campaigns,
}: {
  test: ABTest;
  expanded: boolean;
  onToggle: () => void;
  onAction: (id: string, action: string, extra?: Record<string, unknown>) => void;
  campaigns: Campaign[];
}) {
  const campaign = campaigns.find(c => c.id === test.campaign_id);
  const totalA = test.stats_a.sent || 0;
  const totalB = test.stats_b.sent || 0;
  const metric = test.winning_metric || 'replied';
  const metricA = (test.stats_a as unknown as Record<string, number>)[metric] || 0;
  const metricB = (test.stats_b as unknown as Record<string, number>)[metric] || 0;
  const rateA = totalA > 0 ? Math.round((metricA / totalA) * 100) : 0;
  const rateB = totalB > 0 ? Math.round((metricB / totalB) * 100) : 0;

  const isActive = test.status === 'active';
  const hasWinner = test.winner != null;
  const winnerLabel = hasWinner
    ? (test.winner === 'a' ? test.variant_a.label : test.variant_b.label)
    : null;

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition ${
      isActive ? 'border-violet-200 shadow-sm' : hasWinner ? 'border-green-200' : 'border-gray-200'
    }`}>
      {/* Header */}
      <button onClick={onToggle} className="w-full text-left p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              isActive ? 'bg-violet-100' : hasWinner ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {hasWinner ? (
                <Trophy className={`h-4 w-4 ${test.winner === 'a' ? 'text-blue-500' : 'text-orange-500'}`} />
              ) : isActive ? (
                <FlaskConical className="h-4 w-4 text-violet-500" />
              ) : (
                <Pause className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 truncate">{test.name}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-green-100 text-green-700' :
                  hasWinner ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {isActive ? '● LIVE' : hasWinner ? '🏆 WINNER' : 'PAUSED'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                {campaign && <span>{campaign.name}</span>}
                <span className="text-gray-300">·</span>
                <span className="capitalize">{test.test_type}</span>
                <span className="text-gray-300">·</span>
                <span>Optimizing: {metric}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Quick variant comparison */}
            <div className="hidden sm:flex items-center gap-2">
              <VariantBadge label={test.variant_a.label} rate={rateA} isWinner={test.winner === 'a'} color="blue" />
              <span className="text-xs text-gray-400">vs</span>
              <VariantBadge label={test.variant_b.label} rate={rateB} isWinner={test.winner === 'b'} color="orange" />
            </div>
            {test.confidence != null && test.confidence > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                test.confidence >= 95 ? 'bg-green-100 text-green-700' :
                test.confidence >= 80 ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {test.confidence}% confidence
              </span>
            )}
            <ChevronDown className={`h-4 w-4 text-gray-400 transition ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Variant Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <VariantPanel
              label={test.variant_a.label}
              variant={test.variant_a}
              stats={test.stats_a}
              metric={metric}
              isWinner={test.winner === 'a'}
              color="blue"
            />
            <VariantPanel
              label={test.variant_b.label}
              variant={test.variant_b}
              stats={test.stats_b}
              metric={metric}
              isWinner={test.winner === 'b'}
              color="orange"
            />
          </div>

          {/* Metrics Comparison Bar */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Head-to-Head Comparison
            </h4>
            <div className="space-y-3">
              {(['sent', 'replied', 'interested', 'booked', 'closed'] as const).map(m => {
                const vA = (test.stats_a as unknown as Record<string, number>)[m] || 0;
                const vB = (test.stats_b as unknown as Record<string, number>)[m] || 0;
                const max = Math.max(vA, vB, 1);
                return (
                  <div key={m} className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-500 w-20 text-right capitalize">{m}</span>
                    <div className="flex-1 flex items-center gap-1 h-5">
                      <div
                        className="h-full bg-blue-400 rounded-l transition-all duration-500"
                        style={{ width: `${(vA / max) * 50}%`, minWidth: vA > 0 ? '4px' : '0' }}
                      />
                      <div className="text-[10px] font-bold text-gray-600 w-14 text-center">
                        {vA} / {vB}
                      </div>
                      <div
                        className="h-full bg-orange-400 rounded-r transition-all duration-500"
                        style={{ width: `${(vB / max) * 50}%`, minWidth: vB > 0 ? '4px' : '0' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400">
              <span className="text-blue-500">← {test.variant_a.label}</span>
              <span className="text-orange-500">{test.variant_b.label} →</span>
            </div>
          </div>

          {/* Insight */}
          {(totalA > 0 || totalB > 0) && (
            <div className={`p-3 rounded-lg border ${
              hasWinner ? 'bg-green-50 border-green-200' : 'bg-violet-50 border-violet-200'
            }`}>
              <p className={`text-xs ${hasWinner ? 'text-green-800' : 'text-violet-800'}`}>
                {hasWinner ? (
                  <>🏆 <strong>{winnerLabel}</strong> won with {Math.max(rateA, rateB)}% {metric} rate
                    vs {Math.min(rateA, rateB)}% — {test.confidence?.toFixed(1)}% statistical confidence.
                    All new leads will use the winning style.</>
                ) : totalA >= (test.min_sample_size || 20) && totalB >= (test.min_sample_size || 20) ? (
                  <>🔬 Both variants have enough data. {rateA !== rateB
                    ? `"${rateA > rateB ? test.variant_a.label : test.variant_b.label}" is leading (${Math.max(rateA, rateB)}% vs ${Math.min(rateA, rateB)}%).`
                    : 'Both are performing equally.'
                  } {test.confidence && test.confidence > 0 ? `Current confidence: ${test.confidence.toFixed(1)}%.` : ''} Need 95% to declare a winner.</>
                ) : (
                  <>⏳ Collecting data — need {test.min_sample_size || 20} sent messages per variant minimum.
                    A: {totalA}/{test.min_sample_size || 20}, B: {totalB}/{test.min_sample_size || 20}</>
                )}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            {isActive && (
              <Button size="sm" variant="outline" onClick={() => onAction(test.id, 'pause')} className="text-xs">
                <Pause className="h-3 w-3 mr-1" /> Pause
              </Button>
            )}
            {test.status === 'paused' && (
              <Button size="sm" variant="outline" onClick={() => onAction(test.id, 'resume')} className="text-xs text-green-600 border-green-200 hover:bg-green-50">
                <Play className="h-3 w-3 mr-1" /> Resume
              </Button>
            )}
            {!hasWinner && (totalA > 0 || totalB > 0) && (
              <>
                <div className="flex-1" />
                <span className="text-[10px] text-gray-400">Manual override:</span>
                <Button size="sm" variant="outline" onClick={() => onAction(test.id, 'declare_winner', { winner: 'a' })} className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50">
                  <Crown className="h-3 w-3 mr-1" /> A Wins
                </Button>
                <Button size="sm" variant="outline" onClick={() => onAction(test.id, 'declare_winner', { winner: 'b' })} className="text-xs text-orange-600 border-orange-200 hover:bg-orange-50">
                  <Crown className="h-3 w-3 mr-1" /> B Wins
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Variant Badge ────────────────────────────────────────────────────────────

function VariantBadge({
  label, rate, isWinner, color,
}: {
  label: string;
  rate: number;
  isWinner: boolean;
  color: 'blue' | 'orange';
}) {
  const colors = {
    blue: isWinner ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-blue-50 text-blue-600 border-blue-100',
    orange: isWinner ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-orange-50 text-orange-600 border-orange-100',
  };

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium ${colors[color]}`}>
      {isWinner && <Crown className="h-3 w-3" />}
      <span className="truncate max-w-[80px]">{label}</span>
      <span className="font-bold">{rate}%</span>
    </div>
  );
}

// ─── Variant Panel ────────────────────────────────────────────────────────────

function VariantPanel({
  label, variant, stats, metric, isWinner, color,
}: {
  label: string;
  variant: ABTestVariant;
  stats: ABTestStats;
  metric: string;
  isWinner: boolean;
  color: 'blue' | 'orange';
}) {
  const sent = stats.sent || 0;
  const metricVal = (stats as unknown as Record<string, number>)[metric] || 0;
  const rate = sent > 0 ? Math.round((metricVal / sent) * 100) : 0;

  const bgColor = color === 'blue' ? 'bg-blue-50' : 'bg-orange-50';
  const borderColor = isWinner
    ? (color === 'blue' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-orange-400 ring-2 ring-orange-100')
    : (color === 'blue' ? 'border-blue-200' : 'border-orange-200');
  const accentColor = color === 'blue' ? 'text-blue-600' : 'text-orange-600';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-4 relative`}>
      {isWinner && (
        <div className="absolute -top-2 -right-2 bg-amber-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
          <Trophy className="h-2.5 w-2.5" /> WINNER
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-bold uppercase tracking-wider ${accentColor}`}>
          Variant {color === 'blue' ? 'A' : 'B'}
        </span>
        <span className="text-sm font-semibold text-gray-900">{label}</span>
      </div>

      {/* Key metric */}
      <div className="text-center mb-3">
        <div className={`text-3xl font-bold ${accentColor}`}>{rate}%</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wide capitalize">{metric} rate</div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-sm font-semibold text-gray-900">{stats.assigned}</div>
          <div className="text-[9px] text-gray-400">Assigned</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{sent}</div>
          <div className="text-[9px] text-gray-400">Sent</div>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">{metricVal}</div>
          <div className="text-[9px] text-gray-400 capitalize">{metric}</div>
        </div>
      </div>

      {/* Instruction preview */}
      <details className="mt-3 group">
        <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600 flex items-center gap-0.5">
          <ChevronRight className="h-2.5 w-2.5 group-open:rotate-90 transition-transform" />
          View instruction
        </summary>
        <p className="text-[11px] text-gray-600 mt-1 p-2 bg-white/50 rounded-lg line-clamp-4">
          {variant.instruction}
        </p>
      </details>
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({ template }: { template: MessageTemplate }) {
  const [copied, setCopied] = useState(false);

  const toneColors: Record<string, string> = {
    professional: 'bg-blue-50 text-blue-700 border-blue-200',
    casual: 'bg-green-50 text-green-700 border-green-200',
    empathetic: 'bg-pink-50 text-pink-700 border-pink-200',
    generous: 'bg-amber-50 text-amber-700 border-amber-200',
    bold: 'bg-red-50 text-red-700 border-red-200',
    narrative: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const colorClass = toneColors[template.tone || ''] || 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div className={`border rounded-xl p-3 ${colorClass.includes('border') ? colorClass.split(' ').find(c => c.startsWith('border-')) || 'border-gray-200' : 'border-gray-200'} bg-white hover:shadow-sm transition`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">{template.name}</p>
          {template.tone && (
            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 ${colorClass}`}>
              {template.tone}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(template.instruction);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-gray-300 hover:text-gray-500 p-1"
          title="Copy instruction"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <p className="text-xs text-gray-600 line-clamp-3">{template.instruction}</p>
      {template.example_subject && (
        <p className="text-[10px] text-gray-400 mt-2 italic">
          Example: &quot;{template.example_subject}&quot;
        </p>
      )}
      {template.avg_response_rate != null && template.avg_response_rate > 0 && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-green-600">
          <TrendingUp className="h-2.5 w-2.5" />
          {template.avg_response_rate}% avg response rate
        </div>
      )}
    </div>
  );
}

// ─── Create Test Modal ────────────────────────────────────────────────────────

function CreateTestModal({
  campaigns,
  templates,
  onClose,
  onCreated,
}: {
  campaigns: Campaign[];
  templates: MessageTemplate[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    campaign_id: campaigns[0]?.id || '',
    test_type: 'message' as string,
    winning_metric: 'replied',
    auto_optimize: true,
    min_sample_size: 20,
    variant_a: { label: '', instruction: '' } as ABTestVariant,
    variant_b: { label: '', instruction: '' } as ABTestVariant,
  });

  // Quick-pick from templates
  const applyTemplate = (target: 'a' | 'b', template: MessageTemplate) => {
    setForm(f => ({
      ...f,
      [`variant_${target}`]: {
        label: template.name,
        instruction: template.instruction,
        tone: template.tone || undefined,
      },
    }));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Give your test a name'); return; }
    if (!form.campaign_id) { setError('Select a campaign'); return; }
    if (!form.variant_a.label || !form.variant_a.instruction) { setError('Variant A needs a label and instruction'); return; }
    if (!form.variant_b.label || !form.variant_b.instruction) { setError('Variant B needs a label and instruction'); return; }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/agency/pipeline/ab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: form.campaign_id,
          name: form.name,
          test_type: form.test_type,
          variant_a: form.variant_a,
          variant_b: form.variant_b,
          winning_metric: form.winning_metric,
          auto_optimize: form.auto_optimize,
          min_sample_size: form.min_sample_size,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.message || 'Failed to create test');
        return;
      }

      onCreated();
    } catch {
      setError('Network error — try again');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b shrink-0 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-violet-500" />
              Create A/B Test
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Test two outreach strategies against each other</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Error banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 flex items-center gap-2">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
            </div>
          )}

          {/* Test Name + Campaign */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Test name *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                placeholder="e.g. Professional vs Casual"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Campaign *</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                value={form.campaign_id}
                onChange={e => setForm(f => ({ ...f, campaign_id: e.target.value }))}
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Test type</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                value={form.test_type}
                onChange={e => setForm(f => ({ ...f, test_type: e.target.value }))}
              >
                <option value="message">Full message</option>
                <option value="tone">Tone / Style</option>
                <option value="subject">Subject line</option>
                <option value="opener">SMS opener</option>
                <option value="strategy">Strategy</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Optimize for</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                value={form.winning_metric}
                onChange={e => setForm(f => ({ ...f, winning_metric: e.target.value }))}
              >
                <option value="replied">Reply rate</option>
                <option value="interested">Interest rate</option>
                <option value="booked">Booking rate</option>
                <option value="closed">Close rate</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Min samples</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:outline-none"
                value={form.min_sample_size}
                onChange={e => setForm(f => ({ ...f, min_sample_size: Number(e.target.value) }))}
              >
                <option value={10}>10 per variant</option>
                <option value={20}>20 per variant (recommended)</option>
                <option value={50}>50 per variant</option>
                <option value={100}>100 per variant</option>
              </select>
            </div>
          </div>

          {/* Variant A */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-blue-700 flex items-center gap-1.5">
                <span className="bg-blue-200 text-blue-800 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">A</span>
                Variant A {!form.variant_a.label && '(Control)'}
              </h3>
              {templates.length > 0 && (
                <TemplateQuickPick
                  templates={templates}
                  onPick={(t) => applyTemplate('a', t)}
                  color="blue"
                />
              )}
            </div>
            <div className="space-y-2">
              <input
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                placeholder="Label (e.g. Professional)"
                value={form.variant_a.label}
                onChange={e => setForm(f => ({ ...f, variant_a: { ...f.variant_a, label: e.target.value } }))}
              />
              <textarea
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white min-h-[80px]"
                placeholder="AI instruction: how should the message be written? (e.g. 'Write in a professional, direct tone...')"
                value={form.variant_a.instruction}
                onChange={e => setForm(f => ({ ...f, variant_a: { ...f.variant_a, instruction: e.target.value } }))}
              />
            </div>
          </div>

          {/* VS divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-gray-200" />
            <span className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">VS</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          {/* Variant B */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-orange-700 flex items-center gap-1.5">
                <span className="bg-orange-200 text-orange-800 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">B</span>
                Variant B {!form.variant_b.label && '(Challenger)'}
              </h3>
              {templates.length > 0 && (
                <TemplateQuickPick
                  templates={templates}
                  onPick={(t) => applyTemplate('b', t)}
                  color="orange"
                />
              )}
            </div>
            <div className="space-y-2">
              <input
                className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white"
                placeholder="Label (e.g. Casual & Friendly)"
                value={form.variant_b.label}
                onChange={e => setForm(f => ({ ...f, variant_b: { ...f.variant_b, label: e.target.value } }))}
              />
              <textarea
                className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white min-h-[80px]"
                placeholder="AI instruction: how should the message be written differently? (e.g. 'Write like you're texting a friend...')"
                value={form.variant_b.instruction}
                onChange={e => setForm(f => ({ ...f, variant_b: { ...f.variant_b, instruction: e.target.value } }))}
              />
            </div>
          </div>

          {/* How it works */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">How it works</h4>
            <div className="flex items-start gap-3 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="bg-violet-100 text-violet-700 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">1</span>
                <span>New leads randomly get Style A or B</span>
              </div>
              <ArrowRight className="h-3 w-3 text-gray-300 mt-0.5 shrink-0" />
              <div className="flex items-center gap-2">
                <span className="bg-violet-100 text-violet-700 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">2</span>
                <span>AI writes messages in that style</span>
              </div>
              <ArrowRight className="h-3 w-3 text-gray-300 mt-0.5 shrink-0" />
              <div className="flex items-center gap-2">
                <span className="bg-violet-100 text-violet-700 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">3</span>
                <span>Winner auto-selected at 95% confidence</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto_optimize"
              checked={form.auto_optimize}
              onChange={e => setForm(f => ({ ...f, auto_optimize: e.target.checked }))}
              className="h-3.5 w-3.5 text-violet-600 rounded border-gray-300"
            />
            <label htmlFor="auto_optimize" className="text-xs text-gray-600">
              Auto-optimize (declare winner at 95% confidence)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} className="text-sm">Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={creating}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FlaskConical className="h-4 w-4 mr-1" />}
              Start Test
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Template Quick Pick ──────────────────────────────────────────────────────

function TemplateQuickPick({
  templates,
  onPick,
  color,
}: {
  templates: MessageTemplate[];
  onPick: (t: MessageTemplate) => void;
  color: 'blue' | 'orange';
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`text-[10px] font-medium px-2 py-1 rounded-lg border transition ${
          color === 'blue'
            ? 'text-blue-600 border-blue-200 hover:bg-blue-100'
            : 'text-orange-600 border-orange-200 hover:bg-orange-100'
        }`}
      >
        <BookOpen className="h-3 w-3 inline mr-0.5" /> Use template
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-64 max-h-48 overflow-y-auto">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => { onPick(t); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-0"
              >
                <p className="text-xs font-medium text-gray-900">{t.name}</p>
                <p className="text-[10px] text-gray-500 line-clamp-1">{t.instruction}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
