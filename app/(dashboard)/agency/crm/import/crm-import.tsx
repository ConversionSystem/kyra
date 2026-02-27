'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, Database, FileText, CheckCircle2, AlertCircle,
  ArrowLeft, Loader2, Download, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
  details: Array<{ name: string; status: string; reason?: string }>;
}

export function CrmImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<'ghl' | 'csv' | 'hubspot' | null>(null);
  const [hubspotKey, setHubspotKey] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);

  const handleGhlImport = async () => {
    setImporting('ghl');
    setError('');
    setResult(null);

    const res = await fetch('/api/agency/crm/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'ghl' }),
    });

    if (res.ok) {
      setResult(await res.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Import failed');
    }
    setImporting(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { setError('CSV must have a header row + data'); return; }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ''));
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { if (values[i]) row[h] = values[i]; });
        return row;
      });

      setCsvRows(rows);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!csvRows.length) return;
    setImporting('csv');
    setError('');
    setResult(null);

    const res = await fetch('/api/agency/crm/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'csv', rows: csvRows }),
    });

    if (res.ok) {
      setResult(await res.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Import failed');
    }
    setImporting(null);
    setCsvRows([]);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <button onClick={() => router.push('/agency/crm/contacts')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Contacts
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Upload className="h-6 w-6 text-indigo-600" /> Import Contacts
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Bring your contacts from GHL, HubSpot, or CSV</p>
      </div>

      {/* Import Sources */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* GHL Import */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-200 transition">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
            <Database className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">GoHighLevel</h3>
          <p className="text-sm text-gray-500 mb-4">
            Import all contacts from your connected GHL account. Includes names, emails, phones, tags.
          </p>
          <Button
            onClick={handleGhlImport}
            disabled={importing === 'ghl'}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {importing === 'ghl' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
            ) : (
              <><Database className="h-4 w-4 mr-2" /> Import from GHL</>
            )}
          </Button>
        </div>

        {/* HubSpot Import */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-200 transition">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mb-4">
            <Database className="h-6 w-6 text-orange-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">HubSpot</h3>
          <p className="text-sm text-gray-500 mb-3">
            Import contacts + deals from HubSpot. Paste your private app access token.
          </p>
          <input
            type="password"
            placeholder="pat-na1-xxxxx..."
            value={hubspotKey}
            onChange={(e) => setHubspotKey(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <Button
            onClick={async () => {
              if (!hubspotKey.trim()) return;
              setImporting('hubspot');
              setError('');
              try {
                const res = await fetch('/api/agency/crm/import', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ source: 'hubspot', api_key: hubspotKey.trim() }),
                });
                const data = await res.json();
                if (!res.ok) setError(data.error || 'Import failed');
                else setResult(data);
              } catch (err) { setError('HubSpot import failed'); }
              setImporting(null);
            }}
            disabled={importing === 'hubspot' || !hubspotKey.trim()}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            {importing === 'hubspot' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
            ) : (
              <><Database className="h-4 w-4 mr-2" /> Import from HubSpot</>
            )}
          </Button>
        </div>

        {/* CSV Import */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-200 transition">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">CSV Upload</h3>
          <p className="text-sm text-gray-500 mb-4">
            Upload a CSV with columns: first_name, last_name, email, phone, company, title, tags
          </p>
          <input type="file" accept=".csv" ref={fileRef} className="hidden" onChange={handleFileSelect} />
          {csvRows.length === 0 ? (
            <Button onClick={() => fileRef.current?.click()} variant="outline" className="w-full">
              <Upload className="h-4 w-4 mr-2" /> Choose CSV File
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-700">{csvRows.length} rows ready</p>
              <div className="flex gap-2">
                <Button onClick={handleCsvImport} disabled={importing === 'csv'}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  {importing === 'csv' ? 'Importing...' : `Import ${csvRows.length} contacts`}
                </Button>
                <Button variant="outline" onClick={() => setCsvRows([])}><X className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSV Template */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">📋 CSV Template</p>
        <code className="text-xs text-gray-600 block bg-white p-3 rounded-lg border">
          first_name,last_name,email,phone,company,title,tags<br/>
          John,Smith,john@acme.com,+15551234567,Acme Corp,VP Marketing,&quot;hot,agency&quot;
        </code>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h3 className="font-bold text-gray-900">Import Complete</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-2xl font-bold text-green-700">{result.imported}</p>
              <p className="text-xs text-green-600">Imported</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-xl">
              <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
              <p className="text-xs text-amber-600">Skipped (duplicates)</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-xl">
              <p className="text-2xl font-bold text-red-700">{result.errors}</p>
              <p className="text-xs text-red-600">Errors</p>
            </div>
          </div>
          {result.details.length > 0 && (
            <div className="max-h-48 overflow-y-auto text-xs space-y-1">
              {result.details.slice(0, 50).map((d, i) => (
                <div key={i} className={`flex justify-between py-1 px-2 rounded ${
                  d.status === 'imported' ? 'bg-green-50' : d.status === 'skipped' ? 'bg-amber-50' : 'bg-red-50'
                }`}>
                  <span>{d.name}</span>
                  <span className="text-gray-500">{d.reason || d.status}</span>
                </div>
              ))}
            </div>
          )}
          <Button onClick={() => router.push('/agency/crm/contacts')} className="w-full mt-4" variant="outline">
            View Contacts
          </Button>
        </div>
      )}
    </div>
  );
}
