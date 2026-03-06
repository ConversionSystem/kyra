'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AISuggestButton } from '@/components/ai/suggest-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Bot, Send, ChevronDown, ChevronUp, Loader2, Zap, Info, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionNav } from '@/components/dashboard/section-nav';

interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  description: string;
  defaultPersonality: string;
  suggestedTools: string[];
  triggerKeywords: string[];
  priority: number;
  enabled: boolean;
  customPersonality: string | null;
}

interface RoutingResult {
  routedTo: { id: string; name: string; emoji: string; description: string };
  generatedPromptPreview: string;
}

const TOOL_LABELS: Record<string, string> = {
  book_appointment: '📅 Appointments',
  tag_contact: '🏷️ Tagging',
  create_opportunity: '💰 Deals',
  escalate_to_human: '🚨 Escalation',
  send_payment_link: '💳 Payments',
};

export function AgentsClient() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [routingEnabled, setRoutingEnabled] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [testResult, setTestResult] = useState<RoutingResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agency/agents')
      .then(r => r.json())
      .then(d => {
        setAgents(d.agents ?? []);
        setRoutingEnabled(d.routingEnabled ?? false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleAgent = async (roleId: string, enabled: boolean) => {
    setSaving(roleId);
    const agent = agents.find(a => a.id === roleId);
    await fetch('/api/agency/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_agent',
        roleId,
        enabled,
        customPersonality: agent?.customPersonality ?? undefined,
      }),
    });
    setAgents(prev => prev.map(a => a.id === roleId ? { ...a, enabled } : a));
    setSaving(null);
  };

  const savePersonality = async (roleId: string, customPersonality: string) => {
    setSaving(roleId);
    const agent = agents.find(a => a.id === roleId);
    await fetch('/api/agency/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_agent',
        roleId,
        enabled: agent?.enabled ?? false,
        customPersonality: customPersonality || undefined,
      }),
    });
    setAgents(prev => prev.map(a => a.id === roleId ? { ...a, customPersonality } : a));
    setSaving(null);
  };

  const toggleRouting = async (enabled: boolean) => {
    setRoutingEnabled(enabled);
    await fetch('/api/agency/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_routing', enabled }),
    });
  };

  const testRouting = async () => {
    if (!testMessage.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/agency/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_routing', message: testMessage }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch { /* ignore */ }
    setTesting(false);
  };

  const enabledCount = agents.filter(a => a.enabled).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <SectionNav currentHref="/agency/agents" />
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between overflow-x-hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bot className="w-6 h-6" /> AI Teams
          </h1>
          <p className="text-gray-500 mt-1">
            Give your AI worker a full team. Each specialist handles what they&apos;re best at — booking, sales, support, follow-up — automatically.
          </p>
        </div>
        <Badge variant="outline" className="border-gray-200 text-gray-700 text-sm">
          {enabledCount} active
        </Badge>
      </div>

      {/* Smart Routing Toggle */}
      <Card className="bg-white border-gray-200">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-gray-900 font-medium">Smart Routing</p>
              <p className="text-gray-500 text-sm">
                Auto-route incoming messages to the right agent based on intent
              </p>
            </div>
          </div>
          <Switch
            checked={routingEnabled}
            onCheckedChange={toggleRouting}
          />
        </CardContent>
      </Card>

      {/* Routing Tester */}
      {routingEnabled && (
        <Card className="bg-white border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
              <FlaskConical className="w-4 h-4" /> Test Routing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Type a customer message to test routing..."
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && testRouting()}
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
              <Button onClick={testRouting} disabled={testing} className="bg-blue-600 hover:bg-blue-700 shrink-0">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            {testResult && (
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <span className="text-2xl">{testResult.routedTo.emoji}</span>
                <div>
                  <p className="text-gray-900 font-medium">
                    → {testResult.routedTo.name}
                  </p>
                  <p className="text-gray-500 text-xs">{testResult.routedTo.description}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <p className="text-blue-700 text-sm">
          Enable agents to specialize your AI worker. When AI Teams is on, customer messages are analyzed and forwarded to the best agent automatically.
        </p>
      </div>

      {/* Agent Cards */}
      <div className="space-y-3">
        {agents.map(agent => {
          const isExpanded = expandedId === agent.id;
          return (
            <Card key={agent.id} className={cn(
              'bg-white border-gray-200 transition-all',
              agent.enabled && 'border-gray-200',
            )}>
              <CardContent className="py-4 space-y-0">
                {/* Main row */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between overflow-x-hidden">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{agent.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-gray-900 font-medium">{agent.name}</p>
                      <p className="text-gray-500 text-xs truncate">{agent.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Switch
                      checked={agent.enabled}
                      onCheckedChange={(v) => toggleAgent(agent.id, v)}
                      disabled={saving === agent.id}
                    />
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : agent.id)}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded config */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                    {/* Tools */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Tools</p>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.suggestedTools.map(t => (
                          <Badge key={t} variant="outline" className="border-gray-200 text-gray-500 text-xs">
                            {TOOL_LABELS[t] ?? t}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Trigger keywords */}
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Routes when message contains</p>
                      <div className="flex flex-wrap gap-1.5">
                        {agent.triggerKeywords.map(kw => (
                          <span key={kw} className="bg-gray-50 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Custom personality */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500">
                          Custom Personality {agent.customPersonality ? '(customized)' : '(using default)'}
                        </p>
                        <AISuggestButton
                          type="role_description"
                          context={{ role: agent.name }}
                          label="Generate"
                          onSelect={(s) => setAgents(prev => prev.map(a =>
                            a.id === agent.id ? { ...a, customPersonality: s } : a
                          ))}
                        />
                      </div>
                      <textarea
                        placeholder={agent.defaultPersonality}
                        value={agent.customPersonality ?? ''}
                        onChange={e => setAgents(prev => prev.map(a =>
                          a.id === agent.id ? { ...a, customPersonality: e.target.value } : a
                        ))}
                        rows={3}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-md p-2 text-sm resize-y"
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-200 text-gray-700 hover:bg-gray-50"
                          disabled={saving === agent.id}
                          onClick={() => savePersonality(agent.id, agent.customPersonality ?? '')}
                        >
                          {saving === agent.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                          Save Personality
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
    </div>
  );
}
