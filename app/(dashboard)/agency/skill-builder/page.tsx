'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Globe,
  FileText,
  Type,
  Loader2,
  Copy,
  Download,
  Pencil,
  Check,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Brain,
  Lightbulb,
  Zap,
  Upload,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────

interface SkillPack {
  personality: string;
  systemPrompt: string;
  greeting: string;
  sampleResponses: Array<{ question: string; answer: string }>;
  suggestedSkills: string[];
  extractedKnowledge: string[];
  tone: string;
}

interface ClientOption {
  id: string;
  name: string;
}

type SourceType = 'text' | 'url' | 'file';

// ── Constants ────────────────────────────────────────────────────────────────

const industries = [
  'General',
  'Dental / Medical',
  'Real Estate',
  'Home Services',
  'Retail / E-commerce',
  'Legal',
  'Finance',
  'Fitness / Wellness',
  'Restaurant / Hospitality',
  'Education',
  'Sales & Consulting',
  'Market Intelligence',
  'Other',
];

const sourceTypeTabs: Array<{ key: SourceType; label: string; icon: typeof Type }> = [
  { key: 'text', label: 'Paste Text', icon: Type },
  { key: 'url', label: 'Website URL', icon: Globe },
  { key: 'file', label: 'Upload File', icon: Upload },
];

const progressSteps = [
  { label: 'Analyzing content...', icon: Brain },
  { label: 'Extracting knowledge...', icon: Lightbulb },
  { label: 'Building persona...', icon: Sparkles },
  { label: 'Generating responses...', icon: MessageSquare },
];

const skillLabels: Record<string, string> = {
  web_search: '🔍 Web Search',
  web_fetch: '🌐 URL Reader',
  weather: '🌤️ Weather',
  summarize: '📝 Summarize',
  github: '🐙 GitHub',
  notion: '📓 Notion',
  trello: '📋 Trello',
  image_gen: '🎨 Image Gen',
  whisper: '🎙️ Voice Input',
  tts: '🔊 Text-to-Speech',
  image_understanding: '👁️ Vision',
  file_upload: '📎 File Upload',
  browser: '🖥️ Browser',
};

// ── Loading Progress Component ───────────────────────────────────────────────

function GeneratingProgress({ step }: { step: number }) {
  return (
    <Card className="border-indigo-200 bg-indigo-50/30">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Generating Skill Pack</p>
            <p className="text-xs text-gray-500">AI is analyzing your content...</p>
          </div>
        </div>
        <div className="space-y-3">
          {progressSteps.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                  isActive
                    ? 'bg-indigo-100 text-indigo-700'
                    : isDone
                      ? 'text-indigo-600/60'
                      : 'text-gray-400'
                }`}
              >
                {isDone ? (
                  <Check className="h-4 w-4 text-indigo-500" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">{s.label}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Skill Pack Preview Component ─────────────────────────────────────────────

function SkillPackPreview({
  skillPack,
  isEditing,
  editedPack,
  onEdit,
  onEditChange,
  onSaveEdits,
  onCancelEdits,
  onCopyPrompt,
  onDownloadJson,
  clients,
  onApplyToClient,
  isApplying,
  copiedPrompt,
}: {
  skillPack: SkillPack;
  isEditing: boolean;
  editedPack: SkillPack;
  onEdit: () => void;
  onEditChange: (field: keyof SkillPack, value: string) => void;
  onSaveEdits: () => void;
  onCancelEdits: () => void;
  onCopyPrompt: () => void;
  onDownloadJson: () => void;
  clients: ClientOption[];
  onApplyToClient: (clientId: string) => void;
  isApplying: boolean;
  copiedPrompt: boolean;
}) {
  const [expandedQa, setExpandedQa] = useState<number | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pack = isEditing ? editedPack : skillPack;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          Generated Skill Pack
        </h2>
        <div className="flex gap-2 flex-wrap">
          {isEditing ? (
            <>
              <Button size="sm" onClick={onSaveEdits} className="gap-1.5">
                <Check className="h-3.5 w-3.5" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={onCancelEdits}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={onEdit} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit &amp; Refine
            </Button>
          )}
        </div>
      </div>

      {/* Tone & Personality */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Personality</CardTitle>
            <Badge variant="secondary" className="text-xs capitalize">
              {pack.tone}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editedPack.personality}
              onChange={(e) => onEditChange('personality', e.target.value)}
              className="bg-gray-50 border-gray-200 text-sm"
              rows={3}
            />
          ) : (
            <p className="text-sm text-gray-700 leading-relaxed">{pack.personality}</p>
          )}
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">System Prompt</CardTitle>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCopyPrompt}
              className="gap-1.5 h-7 text-xs"
            >
              {copiedPrompt ? (
                <>
                  <Check className="h-3 w-3 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editedPack.systemPrompt}
              onChange={(e) => onEditChange('systemPrompt', e.target.value)}
              className="bg-gray-50 border-gray-200 text-sm font-mono"
              rows={12}
            />
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-lg bg-gray-50 border border-gray-200 p-4">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                {pack.systemPrompt}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Greeting */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Greeting Message</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editedPack.greeting}
              onChange={(e) => onEditChange('greeting', e.target.value)}
              className="bg-gray-50 border-gray-200 text-sm"
              rows={3}
            />
          ) : (
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
              <p className="text-sm text-indigo-900">{pack.greeting}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sample Q&A */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Sample Responses</CardTitle>
          <CardDescription>5 AI-generated Q&amp;A pairs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {pack.sampleResponses.map((qa, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden"
            >
              <button
                onClick={() => setExpandedQa(expandedQa === i ? null : i)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium text-gray-800 pr-4">
                  {qa.question}
                </span>
                {expandedQa === i ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                )}
              </button>
              {expandedQa === i && (
                <div className="px-4 py-3 border-t border-gray-200 bg-white">
                  <p className="text-sm text-gray-600 leading-relaxed">{qa.answer}</p>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Suggested Skills */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Suggested Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {pack.suggestedSkills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skillLabels[skill] || skill}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Extracted Knowledge */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Extracted Knowledge</CardTitle>
          <CardDescription>{pack.extractedKnowledge.length} facts extracted</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {pack.extractedKnowledge.map((fact, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                {fact}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-2">
        {/* Apply to Client */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="default"
            className="gap-1.5"
            onClick={() => setShowClientDropdown(!showClientDropdown)}
            disabled={clients.length === 0 || isApplying}
          >
            {isApplying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Apply to Client
            <ChevronDown className="h-3 w-3" />
          </Button>
          {showClientDropdown && clients.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-56 rounded-lg border border-gray-200 bg-white shadow-lg z-20 py-1 max-h-48 overflow-y-auto">
              {clients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onApplyToClient(c.id);
                    setShowClientDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button variant="outline" onClick={onDownloadJson} className="gap-1.5">
          <Download className="h-4 w-4" />
          Download JSON
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SkillBuilderPage() {
  // Form state
  const [sourceType, setSourceType] = useState<SourceType>('text');
  const [content, setContent] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('General');
  const [additionalContext, setAdditionalContext] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [skillPack, setSkillPack] = useState<SkillPack | null>(null);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedPack, setEditedPack] = useState<SkillPack | null>(null);

  // Client state
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isApplying, setIsApplying] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  // Fetch clients on mount
  useEffect(() => {
    fetch('/api/agency/clients')
      .then((r) => r.json())
      .then((data) => {
        if (data.clients) {
          setClients(
            data.clients.map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Progress animation during generation
  useEffect(() => {
    if (!isGenerating) return;
    setProgressStep(0);
    const timers = [
      setTimeout(() => setProgressStep(1), 2500),
      setTimeout(() => setProgressStep(2), 5500),
      setTimeout(() => setProgressStep(3), 9000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isGenerating]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1] || (reader.result as string);
      setContent(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleGenerate = async () => {
    if (!businessName.trim() || !content.trim()) return;

    setIsGenerating(true);
    setError(null);
    setSkillPack(null);
    setApplySuccess(null);

    try {
      const res = await fetch('/api/agency/skill-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          content,
          businessName: businessName.trim(),
          industry,
          additionalContext: additionalContext.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Generation failed');
        return;
      }

      setSkillPack(data.skillPack);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = () => {
    const pack = isEditing && editedPack ? editedPack : skillPack;
    if (!pack) return;
    navigator.clipboard.writeText(pack.systemPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleDownloadJson = () => {
    const pack = isEditing && editedPack ? editedPack : skillPack;
    if (!pack) return;
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${businessName.toLowerCase().replace(/\s+/g, '-')}-skill-pack.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleApplyToClient = async (clientId: string) => {
    const pack = isEditing && editedPack ? editedPack : skillPack;
    if (!pack) return;

    setIsApplying(true);
    setApplySuccess(null);

    try {
      const res = await fetch('/api/agency/skill-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          sourceType,
          content,
          businessName: businessName.trim(),
          industry,
          additionalContext: additionalContext.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to apply skill pack');
        return;
      }

      const clientName = clients.find((c) => c.id === clientId)?.name || 'client';
      setApplySuccess(`Skill pack applied to ${clientName}!`);
    } catch {
      setError('Failed to apply skill pack. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleEdit = () => {
    if (skillPack) {
      setEditedPack({ ...skillPack });
      setIsEditing(true);
    }
  };

  const handleEditChange = (field: keyof SkillPack, value: string) => {
    if (editedPack) {
      setEditedPack({ ...editedPack, [field]: value });
    }
  };

  const handleSaveEdits = () => {
    if (editedPack) {
      setSkillPack({ ...editedPack });
      setIsEditing(false);
    }
  };

  const handleCancelEdits = () => {
    setIsEditing(false);
    setEditedPack(null);
  };

  const canGenerate = businessName.trim() && content.trim() && !isGenerating;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <Link
          href="/agency"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Agency
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Skill Builder</h1>
            <p className="text-sm text-gray-500">
              Upload a document or website → AI generates a complete skill pack
            </p>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {applySuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 mb-6 flex items-center gap-2">
          <Check className="h-4 w-4" />
          {applySuccess}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-6">
          {error}
        </div>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Input form */}
        <div className="space-y-4">
          {/* Source type tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Source Content</CardTitle>
              <CardDescription>
                Paste text, enter a URL, or upload a document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tabs */}
              <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
                {sourceTypeTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => {
                        setSourceType(tab.key);
                        setContent('');
                        setFileName(null);
                      }}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                        sourceType === tab.key
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Content input */}
              {sourceType === 'text' && (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste your FAQ document, training manual, or business description here..."
                  className="bg-gray-50 border-gray-200 min-h-[200px] text-sm"
                />
              )}

              {sourceType === 'url' && (
                <Input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="https://www.example.com/about"
                  type="url"
                  className="bg-gray-50 border-gray-200"
                />
              )}

              {sourceType === 'file' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.csv,.json,.html,.htm"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
                  >
                    <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    {fileName ? (
                      <p className="text-sm font-medium text-gray-700">{fileName}</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-600">
                          Click to upload a file
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          .txt, .md, .csv, .json, .html
                        </p>
                      </>
                    )}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Dental Practice"
                  className="bg-gray-50 border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
                >
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Additional Context{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <Textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Any notes about the business, preferred tone, specific services to emphasize..."
                  className="bg-gray-50 border-gray-200 text-sm"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full gap-2 h-11"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Skill Pack
              </>
            )}
          </Button>
        </div>

        {/* Right — Preview / Loading */}
        <div>
          {isGenerating && <GeneratingProgress step={progressStep} />}

          {skillPack && !isGenerating && (
            <SkillPackPreview
              skillPack={skillPack}
              isEditing={isEditing}
              editedPack={editedPack || skillPack}
              onEdit={handleEdit}
              onEditChange={handleEditChange}
              onSaveEdits={handleSaveEdits}
              onCancelEdits={handleCancelEdits}
              onCopyPrompt={handleCopyPrompt}
              onDownloadJson={handleDownloadJson}
              clients={clients}
              onApplyToClient={handleApplyToClient}
              isApplying={isApplying}
              copiedPrompt={copiedPrompt}
            />
          )}

          {!isGenerating && !skillPack && (
            <Card className="border-dashed border-gray-300">
              <CardContent className="p-12 text-center">
                <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-sm font-medium text-gray-500">
                  Your generated skill pack will appear here
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Fill in the form and click &ldquo;Generate Skill Pack&rdquo;
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
