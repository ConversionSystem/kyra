'use client';

import { useState } from 'react';
import { Download, Users, Target, Loader2, CheckCircle2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ExportPage() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const handleExport = async (type: 'contacts' | 'deals') => {
    setExporting(type);
    setDone(null);

    try {
      const res = await fetch(`/api/agency/crm/export?type=${type}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setDone(type);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
    setExporting(null);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Download className="h-6 w-6 text-indigo-600" /> Export Data
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Download your CRM data as CSV files
        </p>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Contacts</h3>
              <p className="text-xs text-gray-500">All contacts with details</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Includes: name, email, phone, title, company, stage, score, tags, AI summary, dates
          </p>
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            disabled={exporting === 'contacts'}
            onClick={() => handleExport('contacts')}
          >
            {exporting === 'contacts' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exporting...</>
            ) : done === 'contacts' ? (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Downloaded!</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> Export Contacts CSV</>
            )}
          </Button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <Target className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Deals</h3>
              <p className="text-xs text-gray-500">All deals pipeline</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Includes: name, value, stage, probability, close date, contact, company, source, notes
          </p>
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={exporting === 'deals'}
            onClick={() => handleExport('deals')}
          >
            {exporting === 'deals' ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exporting...</>
            ) : done === 'deals' ? (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Downloaded!</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> Export Deals CSV</>
            )}
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <FileText className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
        <div className="text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-1">CSV Format</p>
          <p>Files are exported in standard CSV format, compatible with Excel, Google Sheets, and most CRM import tools. Up to 10,000 records per export.</p>
        </div>
      </div>
    </div>
  );
}
