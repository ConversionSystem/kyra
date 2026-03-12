'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Rocket,
  Bot,
  Building2,
  FileText,
  Zap,
  Globe,
  Loader2,
  Save,
  Plus,
  X,
  Clock,
  Phone,
  MapPin,
  Calendar,
  Sparkles,
  BookOpen,
  UploadCloud,
  Trash2,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import AISuggestionsCard from '@/components/dashboard/ai-suggestions-card';

// ── Knowledge source helpers ─────────────────────────────────────────────────

interface KnowledgeSource {
  id: string;
  type: 'file' | 'url';
  name: string;
  url?: string;
  size?: number;
  addedAt: string;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['pdf', 'txt', 'md', 'docx', 'csv'];
const ACCEPTED_FILE_INPUT = '.pdf,.txt,.md,.docx,.csv';

function formatFileSize(size?: number) {
  if (!size) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Wake word types ──────────────────────────────────────────────────────────

type WakeWordAction = 'pause' | 'escalate' | 'custom';
interface WakeWord { keyword: string; action: WakeWordAction; response: string }

// ── Languages ────────────────────────────────────────────────────────────────

const LANGUAGES = [
  'English', 'Spanish (Español)', 'Portuguese (Português)', 'French (Français)',
  'German (Deutsch)', 'Italian (Italiano)', 'Chinese (中文)', 'Japanese (日本語)',
  'Korean (한국어)', 'Arabic (العربية)', 'Hindi (हिन्दी)', 'Russian (Русский)',
  'Dutch (Nederlands)', 'Polish (Polski)', 'Turkish (Türkçe)',
];

// ── Component ────────────────────────────────────────────────────────────────

export default function AIPersonalityTab({ client }: { client: AgencyClient }) {
  const cfg = (client.container_config as Record<string, unknown>) || {};
  const bhCfg = (cfg.business_hours as { enabled?: boolean; start?: string; end?: string; timezone?: string }) || {};

  // Quick Setup
  const [websiteUrl, setWebsiteUrl] = useState((cfg.website_url as string) || '');
  const [isAutoTraining, setIsAutoTraining] = useState(false);
  const [autoTrainResult, setAutoTrainResult] = useState<{
    documentsCreated: number;
    documents: string[];
    pagesScraped: number;
    persona?: string | null;
    personaUpdated?: boolean;
  } | null>(null);

  // AI Identity
  const [persona, setPersona] = useState(cfg.persona as string || '');
  const [greeting, setGreeting] = useState(cfg.greeting as string || '');
  const [responseLanguage, setResponseLanguage] = useState((cfg.response_language as string) || 'English');

  // Business Info
  const [industry, setIndustry] = useState((cfg.industry as string) || client.industry || '');
  const [services, setServices] = useState((cfg.services as string) || '');
  const [businessPhone, setBusinessPhone] = useState((cfg.business_phone as string) || '');
  const [businessAddress, setBusinessAddress] = useState((cfg.business_address as string) || '');
  const [bhEnabled, setBhEnabled] = useState(bhCfg.enabled ?? false);
  const [bhStart, setBhStart] = useState(bhCfg.start ?? '09:00');
  const [bhEnd, setBhEnd] = useState(bhCfg.end ?? '17:00');
  const [bhTimezone, setBhTimezone] = useState(bhCfg.timezone ?? 'America/New_York');
  const [calendarUrl, setCalendarUrl] = useState((cfg.calendar_url as string) || '');
  const [instructions, setInstructions] = useState(cfg.instructions as string || '');

  // Training Documents
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [kbLoading, setKbLoading] = useState(true);
  const [kbSaving, setKbSaving] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Automation
  const [proactiveEnabled, setProactiveEnabled] = useState((cfg.proactive_enabled as boolean) ?? false);
  const [proactiveGreeting, setProactiveGreeting] = useState((cfg.proactive_greeting as string) ?? '');
  const [wakeWords, setWakeWords] = useState<WakeWord[]>((cfg.wake_words as WakeWord[]) ?? []);

  // Global save state
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Knowledge Base logic ─────────────────────────────────────────────────

  useEffect(() => {
    const initial = (client.settings?.knowledge_sources as KnowledgeSource[] | undefined) ?? [];
    setSources(initial);
    setKbError(null);
    setKbLoading(false);
  }, [client.id, client.settings]);

  const persistSources = async (nextSources: KnowledgeSource[]) => {
    setKbSaving(true);
    setKbError(null);
    try {
      const response = await fetch(`/api/agency/clients/${client.id}/knowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ knowledge_sources: nextSources }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'Failed to save knowledge sources');
      }
      setSources(nextSources);
    } catch (err) {
      setKbError(err instanceof Error ? err.message : 'Failed to save knowledge sources');
    } finally {
      setKbSaving(false);
    }
  };

  const handleFileSelection = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newItems: KnowledgeSource[] = [];
    Array.from(fileList).forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!ACCEPTED_EXTENSIONS.includes(extension)) {
        setKbError(`Unsupported file type: ${file.name}`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setKbError(`File too large: ${file.name} (max 10MB)`);
        return;
      }
      newItems.push({
        id: crypto.randomUUID(),
        type: 'file',
        name: file.name,
        size: file.size,
        addedAt: new Date().toISOString(),
      });
    });
    if (!newItems.length) return;
    void persistSources([...sources, ...newItems]);
  };

  const addUrl = async () => {
    const raw = urlInput.trim();
    if (!raw) return;
    try {
      const parsed = new URL(raw);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setKbError('Only HTTP and HTTPS URLs are allowed.');
        return;
      }
      const nextSources: KnowledgeSource[] = [
        ...sources,
        { id: crypto.randomUUID(), type: 'url', name: parsed.hostname, url: parsed.toString(), addedAt: new Date().toISOString() },
      ];
      await persistSources(nextSources);
      setUrlInput('');
    } catch {
      setKbError('Please enter a valid URL (e.g. https://example.com).');
    }
  };

  const deleteSource = async (id: string) => {
    await persistSources(sources.filter((s) => s.id !== id));
  };

  // ── Auto-train (scrape + generate persona) ────────────────────────────────

  const handleAutoTrain = async () => {
    if (!websiteUrl.trim()) return;
    setIsAutoTraining(true);
    setMessage(null);
    setAutoTrainResult(null);
    try {
      const res = await fetch('/api/agency/knowledge/auto-train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, websiteUrl: websiteUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auto-training failed');
      setAutoTrainResult(data);
      if (data.personaUpdated && data.persona) setPersona(data.persona);
      setMessage({ type: 'success', text: `Trained from ${data.pagesScraped} pages — created ${data.documentsCreated} knowledge documents!` });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Auto-training failed' });
    } finally {
      setIsAutoTraining(false);
    }
  };

  // ── Wake words ───────────────────────────────────────────────────────────

  const addWakeWord = () => setWakeWords((prev) => [...prev, { keyword: '', action: 'escalate', response: '' }]);
  const removeWakeWord = (i: number) => setWakeWords((prev) => prev.filter((_, idx) => idx !== i));
  const updateWakeWord = (i: number, patch: Partial<WakeWord>) =>
    setWakeWords((prev) => prev.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));

  // ── Save all ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/agency/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          container_config: {
            ...cfg,
            greeting,
            instructions,
            persona,
            business_hours: { enabled: bhEnabled, start: bhStart, end: bhEnd, timezone: bhTimezone },
            calendar_url: calendarUrl.trim() || undefined,
            response_language: responseLanguage || 'English',
            proactive_enabled: proactiveEnabled,
            proactive_greeting: proactiveGreeting.trim() || undefined,
            wake_words: wakeWords.filter((w) => w.keyword.trim()),
            website_url: websiteUrl.trim() || undefined,
            business_phone: businessPhone.trim() || undefined,
            business_address: businessAddress.trim() || undefined,
            services: services.trim() || undefined,
            industry: industry.trim() || undefined,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setMessage({ type: 'success', text: 'All changes saved.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save. Try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const fileSources = sources.filter((s) => s.type === 'file');
  const urlSources = sources.filter((s) => s.type === 'url');

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* AI Suggestions */}
      <AISuggestionsCard clientId={client.id} />

      {/* Status message */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* ================================================================== */}
      {/* Section 1: Quick Setup                                             */}
      {/* ================================================================== */}
      <Card className="border-indigo-200 bg-indigo-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-gray-900">
            <Rocket className="h-5 w-5 text-indigo-600" />
            Quick Setup
          </CardTitle>
          <CardDescription className="text-gray-500">
            Enter your website URL and we&apos;ll automatically train your AI worker — building its knowledge base and generating a personality from your content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://yourbusiness.com"
              className="bg-white flex-1"
            />
            <Button
              onClick={handleAutoTrain}
              disabled={!websiteUrl.trim() || isAutoTraining}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
            >
              {isAutoTraining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isAutoTraining ? 'Training...' : 'Auto-Train'}
            </Button>
          </div>
          {autoTrainResult && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              Scraped {autoTrainResult.pagesScraped} pages, created {autoTrainResult.documentsCreated} documents.
              {autoTrainResult.personaUpdated && ' Persona was also updated.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Section 2: AI Identity                                             */}
      {/* ================================================================== */}
      <Card className="border-gray-200 bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-gray-900">
            <Bot className="h-5 w-5 text-indigo-600" />
            AI Identity
          </CardTitle>
          <CardDescription className="text-gray-500">
            Define who the AI is — its name, personality, and how it greets customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Persona */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Persona</label>
            <p className="text-xs text-gray-400">A short description like &quot;Friendly dental receptionist named Sarah&quot;</p>
            <Input
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              placeholder="e.g., Professional dental receptionist named Sarah who is warm and helpful"
              className="bg-gray-50"
            />
          </div>

          {/* Greeting */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Greeting Message</label>
            <p className="text-xs text-gray-400">The first message sent to new contacts. Leave empty for an auto-greeting.</p>
            <Textarea
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="e.g., Hi! Thanks for reaching out to Smile Dental. How can I help you today?"
              rows={3}
              className="bg-gray-50"
            />
          </div>

          {/* Response Language */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Response Language</label>
            <p className="text-xs text-gray-400">The AI will always respond in this language.</p>
            <select
              value={responseLanguage}
              onChange={(e) => setResponseLanguage(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Section 3: Business Info                                           */}
      {/* ================================================================== */}
      <Card className="border-gray-200 bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-gray-900">
            <Building2 className="h-5 w-5 text-indigo-600" />
            Business Info
          </CardTitle>
          <CardDescription className="text-gray-500">
            Give the AI context about the business so it can answer customer questions accurately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Industry */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Industry</label>
            <Input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g., Dental, Real Estate, Home Services"
              className="bg-gray-50"
            />
          </div>

          {/* Services & Pricing */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Services &amp; Pricing</label>
            <p className="text-xs text-gray-400">List services with prices, one per line.</p>
            <Textarea
              value={services}
              onChange={(e) => setServices(e.target.value)}
              placeholder={`e.g.,\nTeeth Cleaning - $150\nWhitening - $300\nCrowns - $800-1200\nEmergency Visits - Call for pricing`}
              rows={5}
              className="bg-gray-50"
            />
          </div>

          {/* Phone & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                <Phone className="h-3.5 w-3.5 text-gray-400" />
                Business Phone
              </label>
              <Input
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                Business Address
              </label>
              <Input
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="123 Main St, Springfield, IL 62701"
                className="bg-gray-50"
              />
            </div>
          </div>

          {/* Business Hours */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="bh-enabled"
                checked={bhEnabled}
                onChange={(e) => setBhEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              <label htmlFor="bh-enabled" className="flex items-center gap-1.5 text-sm text-gray-700 font-medium">
                <Clock className="h-3.5 w-3.5 text-gray-400" />
                Enable business hours restriction
              </label>
            </div>
            <p className="text-xs text-gray-400">AI only replies during these hours. Outside hours, messages are queued.</p>
            {bhEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Open</label>
                  <Input type="time" value={bhStart} onChange={(e) => setBhStart(e.target.value)} className="bg-gray-50" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Close</label>
                  <Input type="time" value={bhEnd} onChange={(e) => setBhEnd(e.target.value)} className="bg-gray-50" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Timezone</label>
                  <select
                    value={bhTimezone}
                    onChange={(e) => setBhTimezone(e.target.value)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                  >
                    <option value="America/New_York">Eastern (ET)</option>
                    <option value="America/Chicago">Central (CT)</option>
                    <option value="America/Denver">Mountain (MT)</option>
                    <option value="America/Los_Angeles">Pacific (PT)</option>
                    <option value="America/Phoenix">Arizona (AZ)</option>
                    <option value="Europe/London">London (GMT/BST)</option>
                    <option value="Europe/Bratislava">Bratislava (CET)</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Calendar URL */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              Booking / Calendar URL
            </label>
            <Input
              value={calendarUrl}
              onChange={(e) => setCalendarUrl(e.target.value)}
              placeholder="https://booking.leadconnectorhq.com/your-calendar-id"
              className="bg-gray-50 font-mono text-sm"
            />
            <p className="text-xs text-gray-400">
              Get this from GHL &rarr; Calendars &rarr; your calendar &rarr; Share Link.
            </p>
          </div>

          {/* Additional Rules & FAQs */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900">Additional Rules &amp; FAQs</label>
            <p className="text-xs text-gray-400">Anything else the AI should know: policies, rules, competitor handling, etc.</p>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Never discuss competitor pricing. For emergencies, direct to call (555) 123-4567. We offer 10% discount for new patients."
              rows={5}
              className="bg-gray-50"
            />
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Section 4: Training Documents                                      */}
      {/* ================================================================== */}
      <Card className="border-gray-200 bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-gray-900">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            Training Documents
          </CardTitle>
          <CardDescription className="text-gray-500">
            Upload documents or add URLs for your AI to learn from.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(kbLoading || kbSaving) && (
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
              {kbLoading ? 'Loading knowledge sources...' : 'Saving changes...'}
            </div>
          )}

          {kbError && <p className="text-sm text-red-600">{kbError}</p>}

          {/* File upload */}
          <div className="space-y-3">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFileSelection(e.dataTransfer.files); }}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:border-indigo-300'
              }`}
            >
              <UploadCloud className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm font-medium text-gray-700">Drag &amp; drop files here or click to upload</p>
              <p className="mt-1 text-xs text-gray-500">Accepted: PDF, TXT, MD, DOCX, CSV (max 10MB each)</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_INPUT}
              multiple
              onChange={(e) => handleFileSelection(e.target.files)}
              className="hidden"
            />
            {fileSources.length > 0 && (
              <div className="space-y-2">
                {fileSources.map((source) => (
                  <div key={source.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <FileText className="h-4 w-4 shrink-0 text-gray-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{source.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(source.size)} &middot; {formatDate(source.addedAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteSource(source.id)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-red-600"
                      aria-label={`Delete ${source.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* URL import */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Globe className="h-4 w-4 text-indigo-600" />
              Add URL
            </h4>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addUrl(); } }}
                placeholder="https://example.com"
                className="bg-gray-50 flex-1"
              />
              <Button
                onClick={() => void addUrl()}
                disabled={!urlInput.trim() || kbSaving}
                className="gap-1.5"
              >
                {kbSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add URL
              </Button>
            </div>
            {urlSources.length > 0 && (
              <div className="space-y-2">
                {urlSources.map((source) => (
                  <div key={source.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <Globe className="h-4 w-4 shrink-0 text-gray-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{source.url}</p>
                      <p className="text-xs text-gray-500">Added {formatDate(source.addedAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteSource(source.id)}
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-red-600"
                      aria-label={`Delete ${source.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!kbLoading && sources.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No training documents yet. Upload files or add URLs above.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Section 5: Automation                                              */}
      {/* ================================================================== */}
      <Card className="border-gray-200 bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-gray-900">
            <Zap className="h-5 w-5 text-indigo-600" />
            Automation
          </CardTitle>
          <CardDescription className="text-gray-500">
            Proactive messaging and keyword-triggered actions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Proactive Greeting */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Proactive Greeting</h4>
            <p className="text-xs text-gray-400">When a new GHL contact is added, the AI can reach out first.</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setProactiveEnabled(!proactiveEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${proactiveEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${proactiveEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <span className="text-sm font-medium text-gray-700">
                {proactiveEnabled ? 'AI reaches out to new contacts' : 'Proactive greeting disabled'}
              </span>
            </div>
            {proactiveEnabled && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Opening message</label>
                <Textarea
                  value={proactiveGreeting}
                  onChange={(e) => setProactiveGreeting(e.target.value)}
                  placeholder={`Hi {{firstName}}, this is ${client.name}'s AI assistant! How can I help you today?`}
                  className="bg-gray-50 min-h-[80px] text-sm"
                />
                <p className="text-xs text-gray-400">Use {'{{firstName}}'} and {'{{lastName}}'} to personalize with GHL contact data.</p>
              </div>
            )}
          </div>

          {/* Wake Words */}
          <div className="space-y-3 border-t border-gray-100 pt-6">
            <h4 className="text-sm font-semibold text-gray-900">Wake Words</h4>
            <p className="text-xs text-gray-400">Keywords that trigger a specific AI behavior when a customer says them.</p>
            {wakeWords.length === 0 && (
              <p className="text-sm text-gray-400 italic">No wake words configured.</p>
            )}
            {wakeWords.map((w, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Keyword (e.g. STOP)"
                    value={w.keyword}
                    onChange={(e) => updateWakeWord(i, { keyword: e.target.value })}
                    className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400 uppercase"
                  />
                  <select
                    value={w.action}
                    onChange={(e) => updateWakeWord(i, { action: e.target.value as WakeWordAction })}
                    className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
                  >
                    <option value="pause">Pause AI responses</option>
                    <option value="escalate">Escalate to human</option>
                    <option value="custom">Reply with custom text</option>
                  </select>
                  {w.action === 'custom' && (
                    <input
                      type="text"
                      placeholder="Custom reply text..."
                      value={w.response}
                      onChange={(e) => updateWakeWord(i, { response: e.target.value })}
                      className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeWakeWord(i)}
                  className="shrink-0 mt-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addWakeWord}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              <Plus className="h-4 w-4" /> Add wake word
            </button>
            <p className="text-xs text-gray-400">
              Common: STOP (pause), UNSUBSCRIBE (pause), HUMAN / AGENT (escalate), PRICE (custom reply).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Save All Button                                                    */}
      {/* ================================================================== */}
      <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-indigo-600 hover:bg-indigo-700" size="lg">
        {isSaving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
        ) : (
          <><Save className="h-4 w-4" /> Save All Changes</>
        )}
      </Button>
    </div>
  );
}
