'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Globe,
  Sparkles,
  Plus,
  X,
  Loader2,
  Check,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
  business_name?: string;
  industry?: string;
}

interface BulkJob {
  clientId: string;
  clientName: string;
  industry: string;
  status: 'pending' | 'creating' | 'done' | 'error';
  siteId?: string;
  error?: string;
}

const INDUSTRIES = [
  'hvac', 'plumbing', 'electrical', 'roofing', 'landscaping',
  'lawn-care', 'cleaning', 'painting', 'flooring', 'remodeling',
  'pest-control', 'locksmith', 'auto-repair', 'dental', 'medical',
  'legal', 'restaurant', 'fitness', 'salon', 'moving',
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BulkSiteGeneration() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [defaultIndustry, setDefaultIndustry] = useState('hvac');
  const [jobs, setJobs] = useState<BulkJob[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch('/api/agency/clients')
      .then((r) => r.json())
      .then((result) => {
        if (Array.isArray(result.data)) setClients(result.data);
      })
      .catch(() => {})
      .finally(() => setLoadingClients(false));
  }, []);

  const toggleClient = (id: string) => {
    setSelectedClients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setClients((prev) => {
      setSelectedClients(new Set(prev.map((c) => c.id)));
      return prev;
    });
  };

  const startBulkGeneration = async () => {
    const selected = clients.filter((c) => selectedClients.has(c.id));
    if (selected.length === 0) return;

    const initialJobs: BulkJob[] = selected.map((c) => ({
      clientId: c.id,
      clientName: c.name || c.business_name || '',
      industry: c.industry || defaultIndustry,
      status: 'pending',
    }));

    setJobs(initialJobs);
    setRunning(true);
    setDone(false);

    // Process one at a time to avoid overwhelming the API
    for (let i = 0; i < initialJobs.length; i++) {
      const job = initialJobs[i];

      setJobs((prev) =>
        prev.map((j, idx) => (idx === i ? { ...j, status: 'creating' } : j))
      );

      try {
        // Create a site for this client with minimal wizard data
        const res = await fetch('/api/agency/sites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: job.clientId,
            business_name: job.clientName,
            industry: job.industry,
            auto_generate: true, // triggers content generation
          }),
        });

        if (res.ok) {
          const result = await res.json();
          setJobs((prev) =>
            prev.map((j, idx) =>
              idx === i ? { ...j, status: 'done', siteId: result.data?.id } : j
            )
          );
        } else {
          const err = await res.json().catch(() => ({ error: 'Failed' }));
          setJobs((prev) =>
            prev.map((j, idx) =>
              idx === i ? { ...j, status: 'error', error: err.error || 'Failed' } : j
            )
          );
        }
      } catch {
        setJobs((prev) =>
          prev.map((j, idx) =>
            idx === i ? { ...j, status: 'error', error: 'Network error' } : j
          )
        );
      }

      // Small delay between requests
      await new Promise((r) => setTimeout(r, 500));
    }

    setRunning(false);
    setDone(true);
  };

  const doneCount = jobs.filter((j) => j.status === 'done').length;
  const errorCount = jobs.filter((j) => j.status === 'error').length;
  const pendingCount = jobs.filter((j) => j.status === 'pending' || j.status === 'creating').length;

  // If running, show progress
  if (jobs.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <Link href="/agency/website" className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            Bulk Site Generation
          </h1>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Progress */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Generating Sites</h2>
              <span className="text-sm text-gray-500">{doneCount}/{jobs.length} done</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${jobs.length > 0 ? (doneCount / jobs.length) * 100 : 0}%` }}
              />
            </div>

            <div className="flex gap-4 text-sm mb-6">
              <span className="text-green-600 font-medium">{doneCount} created</span>
              {errorCount > 0 && <span className="text-red-600 font-medium">{errorCount} failed</span>}
              {pendingCount > 0 && <span className="text-gray-400">{pendingCount} pending</span>}
            </div>

            {done && (
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/agency/website')}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <Globe className="h-4 w-4" />
                  View All Sites
                </button>
              </div>
            )}
          </div>

          {/* Job list */}
          <div className="space-y-2">
            {jobs.map((job, i) => (
              <div
                key={i}
                className={`bg-white rounded-xl border px-4 py-3 flex items-center justify-between ${
                  job.status === 'error' ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {job.status === 'creating' && (
                    <Loader2 className="h-4 w-4 text-indigo-500 animate-spin shrink-0" />
                  )}
                  {job.status === 'done' && (
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                  )}
                  {job.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  {job.status === 'pending' && (
                    <div className="h-4 w-4 rounded-full border-2 border-gray-200 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{job.clientName}</p>
                    {job.error && <p className="text-xs text-red-600">{job.error}</p>}
                    {job.status === 'creating' && (
                      <p className="text-xs text-indigo-500">Generating site...</p>
                    )}
                  </div>
                </div>
                {job.status === 'done' && job.siteId && (
                  <Link
                    href={`/agency/website/${job.siteId}/editor`}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    Edit <ChevronRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/agency/website" className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-600" />
          Bulk Site Generation
        </h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Intro */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-sm text-indigo-800 font-medium mb-1">⚡ Generate websites for multiple clients at once</p>
          <p className="text-sm text-indigo-600">
            Select clients below, choose a default industry, and we&apos;ll kick off site generation for all of them.
            You can customize each site individually after creation.
          </p>
        </div>

        {/* Default industry */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Default Industry <span className="text-gray-400 font-normal">(used for clients without an industry set)</span>
          </label>
          <select
            value={defaultIndustry}
            onChange={(e) => setDefaultIndustry(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Client selection */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-medium text-gray-700">
              Select Clients ({selectedClients.size} selected)
            </label>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedClients(new Set())}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
          </div>

          {loadingClients ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Globe className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No clients found. Add clients first.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {clients.map((client) => {
                const isSelected = selectedClients.has(client.id);
                return (
                  <button
                    key={client.id}
                    onClick={() => toggleClient(client.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{client.name || client.business_name}</p>
                      {client.industry && (
                        <p className="text-xs text-gray-400 capitalize">{client.industry.replace(/-/g, ' ')}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Action */}
        <div className="flex gap-3">
          <Link
            href="/agency/website"
            className="flex-1 px-4 py-3 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Link>
          <button
            onClick={startBulkGeneration}
            disabled={selectedClients.size === 0 || running}
            className="flex-1 px-4 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Generate {selectedClients.size > 0 ? `${selectedClients.size} ` : ''}Sites
          </button>
        </div>
      </div>
    </div>
  );
}
