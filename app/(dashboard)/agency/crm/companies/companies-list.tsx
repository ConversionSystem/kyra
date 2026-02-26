'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Search, Plus, Globe, Mail, Phone, MapPin,
  ChevronLeft, ChevronRight, X, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CrmCompany } from '@/lib/crm/types';

export function CompaniesList() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', String(page));

    const res = await fetch(`/api/agency/crm/companies?${params}`);
    if (res.ok) {
      const data = await res.json();
      setCompanies(data.companies || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-indigo-600" /> Companies
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} companies</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="h-4 w-4 mr-1" /> Add Company
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          placeholder="Search companies..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Company Cards */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 animate-pulse">Loading companies...</div>
      ) : companies.length === 0 ? (
        <div className="py-12 text-center">
          <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No companies yet</p>
          <p className="text-sm text-gray-400 mt-1">Companies are auto-created when you add contacts with a company name.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {companies.map(co => (
            <div key={co.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{co.name}</h3>
                  {co.industry && <p className="text-xs text-gray-500">{co.industry}</p>}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {co.website && (
                      <a href={co.website} target="_blank" rel="noopener"
                        className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5">
                        <Globe className="h-3 w-3" /> Website
                      </a>
                    )}
                    {co.email && (
                      <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                        <Mail className="h-3 w-3" /> {co.email}
                      </span>
                    )}
                    {co.phone && (
                      <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                        <Phone className="h-3 w-3" /> {co.phone}
                      </span>
                    )}
                    {co.city && (
                      <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" /> {co.city}{co.state ? `, ${co.state}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Add Company Modal */}
      {showAdd && (
        <AddCompanyModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); fetchCompanies(); }} />
      )}
    </div>
  );
}

function AddCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', website: '', industry: '', phone: '', email: '', city: '', state: '', country: 'US' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Company name required'); return; }
    setSaving(true); setError('');

    const res = await fetch('/api/agency/crm/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) { onCreated(); }
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-600" /> Add Company
        </h3>
        <div className="space-y-3">
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Company name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Website" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Industry" value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            <input className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="State" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <div className="flex gap-2 mt-5">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={saving}>
            {saving ? 'Creating...' : 'Create Company'}
          </Button>
        </div>
      </form>
    </div>
  );
}
