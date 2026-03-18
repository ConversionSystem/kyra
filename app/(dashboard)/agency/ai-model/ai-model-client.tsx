'use client';

import { useState } from 'react';
import { ModelSelector } from '@/components/dashboard/model-selector';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Cpu, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface AiModelClientProps {
  initialModel: string;
  availableProviders: ('openai' | 'anthropic' | 'google')[];
}

export function AiModelClient({ initialModel, availableProviders }: AiModelClientProps) {
  const [aiModel, setAiModel] = useState(initialModel);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleModelChange = async (modelId: string) => {
    setAiModel(modelId);
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/agency/ai-model', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaveMsg({ type: 'success', text: 'AI model updated. Takes effect on next conversation.' });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch {
      setSaveMsg({ type: 'error', text: 'Failed to update model. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Cpu className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Model</h1>
          <p className="text-sm text-gray-500">
            Choose which AI model powers your AI worker. More powerful models cost more credits per conversation turn.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Select Model</CardTitle>
          <CardDescription>
            Every conversation turn is billed at the rate of your selected model. Choose based on the intelligence level your customers need.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {saving && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </div>
          )}
          {saveMsg && (
            <div className={`flex items-center gap-2 text-sm mb-4 ${saveMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {saveMsg.type === 'success'
                ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                : <XCircle className="h-4 w-4 shrink-0" />}
              {saveMsg.text}
            </div>
          )}
          <ModelSelector
            value={aiModel}
            onChange={handleModelChange}
            disabled={saving}
            availableProviders={availableProviders}
          />
        </CardContent>
      </Card>
    </div>
  );
}
