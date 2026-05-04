'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  FileText,
  Globe,
  Loader2,
  Save,
  Sparkles,
  Trash2,
  UploadCloud,
  Phone,
  MapPin,
  Calendar,
  Clock,
  BookOpen,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import KnowledgeEngineCard from './knowledge-engine-card';

// ── Knowledge source helpers ─────────────────────────────────────────────────
//
// 2026-05-04 source-of-truth fix:
//   Pre-fix, this tab wrote files + URLs as metadata-only entries into
//   `agency_clients.settings.knowledge_sources` — a JSON column that the
//   widget RAG (lib/knowledge/rag.ts) NEVER reads. Files were never extracted,
//   URLs were never fetched. The user thought they'd trained the AI; the AI
//   answered every question generically because it had no actual content.
//
//   Now: files POST to /api/agency/knowledge/import-file (server extracts via
//   mammoth/text), URLs POST to /api/agency/knowledge/import-url (server fetches
//   + strips HTML), and BOTH land as `knowledge_documents` rows that the widget
//   RAG + OpenClaw KNOWLEDGE_BASE.md sync both read. ONE source of truth.
//
//   The dashboard list reads from /api/agency/knowledge?client=<id>, the same
//   table the widget queries — what you see is what the AI sees.

interface KnowledgeDoc {
  id: string;
  title: string;
  source_type: 'file' | 'url' | 'text';
  source_url: string | null;
  file_name: string | null;
  char_count: number | null;
  created_at: string;
  enabled: boolean;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
// PDF deferred — the import-file route returns 415 for now with a friendly
// "convert to .txt or .docx" message. Server-side PDF extraction is a follow-up.
const ACCEPTED_EXTENSIONS = ['txt', 'md', 'docx', 'csv'];
const ACCEPTED_FILE_INPUT = '.txt,.md,.docx,.csv';

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TrainingSubTab({ client }: { client: AgencyClient }) {
  const cfg = (client.container_config as Record<string, unknown>) || {};
  const bhCfg = (cfg.business_hours as { enabled?: boolean; start?: string; end?: string; timezone?: string }) || {};

  // Auto-Train from URL
  const [websiteUrl, setWebsiteUrl] = useState((cfg.website_url as string) || '');
  const [isAutoTraining, setIsAutoTraining] = useState(false);
  const [autoTrainResult, setAutoTrainResult] = useState<{
    documentsCreated: number;
    documents: string[];
    pagesScraped: number;
    persona?: string | null;
    personaUpdated?: boolean;
  } | null>(null);

  // Knowledge Sources (docs + URLs) — backed by the `knowledge_documents`
  // table now, NOT the legacy `settings.knowledge_sources` JSON. See header
  // comment for the source-of-truth fix details.
  const [sources, setSources] = useState<KnowledgeDoc[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [kbLoading, setKbLoading] = useState(true);
  const [kbSaving, setKbSaving] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Knowledge Base logic ─────────────────────────────────────────────────

  // Load the live knowledge_documents the AI is actually using. Filtered to
  // this client (also includes agency-wide docs — those help every client).
  const refetchSources = async () => {
    setKbError(null);
    setKbLoading(true);
    try {
      const res = await fetch(`/api/agency/knowledge?client=${client.id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const docs = (data.documents || []) as KnowledgeDoc[];
      // Show client-scoped + agency-wide; sort newest first.
      setSources(
        docs
          .slice()
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      );
    } catch (err) {
      setKbError(err instanceof Error ? err.message : 'Failed to load training documents');
    } finally {
      setKbLoading(false);
    }
  };

  useEffect(() => {
    void refetchSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  const handleFileSelection = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setKbError(null);
    setKbSaving(true);
    try {
      // Upload each file sequentially. Server extracts text + saves a
      // knowledge_documents row + auto-syncs to OpenClaw.
      for (const file of Array.from(fileList)) {
        const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
        if (!ACCEPTED_EXTENSIONS.includes(extension)) {
          if (extension === 'pdf') {
            setKbError(`PDF extraction isn't supported yet — convert ${file.name} to .docx or .txt and re-upload.`);
          } else {
            setKbError(`Unsupported file type: ${file.name}`);
          }
          continue;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          setKbError(`File too large: ${file.name} (max 10MB)`);
          continue;
        }
        const fd = new FormData();
        fd.append('file', file);
        fd.append('clientId', client.id);
        const res = await fetch('/api/agency/knowledge/import-file', { method: 'POST', body: fd });
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          setKbError(payload.error || `Upload failed for ${file.name}`);
          continue;
        }
      }
      await refetchSources();
    } finally {
      setKbSaving(false);
    }
  };

  const addUrl = async () => {
    const raw = urlInput.trim();
    if (!raw) return;
    setKbError(null);
    try {
      const parsed = new URL(raw);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setKbError('Only HTTP and HTTPS URLs are allowed.');
        return;
      }
      setKbSaving(true);
      // Server fetches the page, strips HTML, saves to knowledge_documents,
      // auto-syncs to OpenClaw. Replaces the metadata-only legacy save.
      const res = await fetch('/api/agency/knowledge/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: parsed.toString(), clientId: client.id }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'Failed to import URL');
      }
      setUrlInput('');
      await refetchSources();
    } catch (err) {
      setKbError(err instanceof Error ? err.message : 'Please enter a valid URL (e.g. https://example.com).');
    } finally {
      setKbSaving(false);
    }
  };

  const deleteSource = async (id: string) => {
    setKbError(null);
    setKbSaving(true);
    try {
      const res = await fetch(`/api/agency/knowledge?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || 'Failed to delete');
      }
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setKbError(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setKbSaving(false);
    }
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
      setMessage({ type: 'success', text: `Trained from ${data.pagesScraped} pages — created ${data.documentsCreated} knowledge documents!` });
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Auto-training failed' });
    } finally {
      setIsAutoTraining(false);
    }
  };

  // ── Save Business Info ─────────────────────────────────────────────────────

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
            instructions,
            business_hours: { enabled: bhEnabled, start: bhStart, end: bhEnd, timezone: bhTimezone },
            calendar_url: calendarUrl.trim() || undefined,
            website_url: websiteUrl.trim() || undefined,
            business_phone: businessPhone.trim() || undefined,
            business_address: businessAddress.trim() || undefined,
            services: services.trim() || undefined,
            industry: industry.trim() || undefined,
          },
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error || 'Failed to save');
      }
      setMessage({ type: 'success', text: 'Training settings saved. Changes are being pushed to your AI worker.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save. Try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  // Derived view of the live knowledge_documents — filter by source_type so
  // URLs render in the URL list, files in the file list, and manual text
  // entries are bucketed with files (they share the "uploaded content" UX).
  const fileSources = sources.filter((s) => s.source_type === 'file' || s.source_type === 'text');
  const urlSources = sources.filter((s) => s.source_type === 'url');

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Status message */}
      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* ================================================================== */}
      {/* Auto-Train from URL                                                */}
      {/* ================================================================== */}
      <Card className="border-indigo-200 bg-indigo-50/50 rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-gray-900">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            Auto-Train from Website
          </CardTitle>
          <CardDescription className="text-gray-500">
            Enter your website URL and we&apos;ll automatically scrape it, extract business knowledge, and train your AI worker.
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
              {autoTrainResult.personaUpdated && ' Persona was also updated — check the Identity tab.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Website Knowledge (manual URL add)                                 */}
      {/* ================================================================== */}
      <Card className="border-gray-200 bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-gray-900">
            <Globe className="h-5 w-5 text-indigo-600" />
            Website Knowledge
          </CardTitle>
          <CardDescription className="text-gray-500">
            Add specific website URLs for your AI to reference when answering questions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void addUrl();
                }
              }}
              placeholder="https://example.com/specific-page"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="button"
              onClick={() => void addUrl()}
              disabled={!urlInput.trim() || kbSaving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {kbSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add URL
            </button>
          </div>

          {kbError && <p className="text-sm text-red-600">{kbError}</p>}

          {urlSources.length > 0 && (
            <div className="space-y-2">
              {urlSources.map((source) => (
                <div key={source.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <Globe className="h-4 w-4 shrink-0 text-gray-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{source.source_url || source.title}</p>
                    <p className="text-xs text-gray-500">
                      {source.char_count ? `${(source.char_count / 1024).toFixed(1)} KB extracted` : 'Added'} • {formatDate(source.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteSource(source.id)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-red-600"
                    aria-label={`Delete ${source.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Training Documents (file upload)                                   */}
      {/* ================================================================== */}
      <Card className="border-gray-200 bg-white rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-gray-900">
            <FileText className="h-5 w-5 text-indigo-600" />
            Training Documents
          </CardTitle>
          <CardDescription className="text-gray-500">
            Upload documents so your AI worker can learn from your business content.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFileSelection(e.dataTransfer.files);
            }}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:border-indigo-300'
            }`}
          >
            <UploadCloud className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-700">Drag & drop files here or click to upload</p>
            <p className="mt-1 text-xs text-gray-500">Accepted: TXT, MD, DOCX, CSV (max 10MB each) — PDF coming soon</p>
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
                    <p className="truncate text-sm font-medium text-gray-900">{source.file_name || source.title}</p>
                    <p className="text-xs text-gray-500">
                      {source.char_count ? `${(source.char_count / 1024).toFixed(1)} KB extracted` : '—'} • {formatDate(source.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteSource(source.id)}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-red-600"
                    aria-label={`Delete ${source.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {(kbLoading || kbSaving) && (
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
              {kbLoading ? 'Loading knowledge sources...' : 'Saving changes...'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================== */}
      {/* Knowledge Engine (auto-extracted — read-only display)               */}
      {/* ================================================================== */}
      <KnowledgeEngineCard clientId={client.id} />

      {/* ================================================================== */}
      {/* Business Info                                                      */}
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
          <p className="text-xs text-amber-600 mt-1">
            ℹ️ These settings are for your AI worker, not your website. Website details are edited in the Website Builder.
          </p>
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
      {/* Save Training Settings                                             */}
      {/* ================================================================== */}
      <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-indigo-600 hover:bg-indigo-700" size="lg">
        {isSaving ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
        ) : (
          <><Save className="h-4 w-4" /> Save Training Settings</>
        )}
      </Button>
    </div>
  );
}
