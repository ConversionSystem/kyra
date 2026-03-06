'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users, Search, Plus, Mail, Phone, Clock, Download,
  ChevronLeft, ChevronRight, X, Building2, Upload, Tag,
  ArrowRight, Trash2, CheckSquare, Square, Filter,
  Loader2, Globe, MapPin, ChevronUp, ChevronDown,
  MoreHorizontal, ArrowUpDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContactWithCompany, ContactFilters, CrmCompany } from '@/lib/crm/types';
import { getInitials, getAvatarColor, getScoreBadge, getStageBadge } from '@/lib/crm/types';

// ═══════════════════════════════════════════════════════════════════════════
// Top-level tabs (GHL-style)
// ═══════════════════════════════════════════════════════════════════════════
type TopTab = 'contacts' | 'companies';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════
const STAGE_TABS = [
  { key: '', label: 'All' },
  { key: 'lead', label: 'Leads' },
  { key: 'contact', label: 'Contacts' },
  { key: 'customer', label: 'Customers' },
  { key: 'churned', label: 'Churned' },
];

const SCORE_FILTERS = [
  { key: '', label: 'All scores' },
  { key: 'hot', label: '🔥 Hot' },
  { key: 'warm', label: 'Warm' },
  { key: 'cold', label: 'Cold' },
  { key: 'new', label: 'New' },
];

const SOURCE_FILTERS = [
  { key: '', label: 'All sources' },
  { key: 'manual', label: 'Manual' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'ghl', label: 'GHL' },
  { key: 'import', label: 'Import' },
  { key: 'web_lead', label: 'Web Lead' },
];

const PAGE_SIZES = [25, 50, 100];

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════
export function ContactsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topTab, setTopTab] = useState<TopTab>(
    searchParams.get('view') === 'companies' ? 'companies' : 'contacts'
  );

  // Contact state
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [stage, setStage] = useState('');
  const [scoreLabel, setScoreLabel] = useState('');
  const [source, setSource] = useState('');
  const [sort, setSort] = useState<ContactFilters['sort']>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Companies
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  const [companyTotal, setCompanyTotal] = useState(0);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [companyPage, setCompanyPage] = useState(1);
  const [showAddCompany, setShowAddCompany] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [bulkTag, setBulkTag] = useState('');
  const [bulkStage, setBulkStage] = useState('lead');
  const [bulkLoading, setBulkLoading] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (stage) params.set('stage', stage);
    if (scoreLabel) params.set('score_label', scoreLabel);
    if (source) params.set('source', source);
    if (sort) params.set('sort', sort);
    params.set('page', String(page));
    params.set('limit', String(pageSize));
    params.set('order', sortOrder);

    const res = await fetch(`/api/agency/crm/contacts?${params}`);
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [search, stage, scoreLabel, source, sort, sortOrder, page, pageSize]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const fetchCompanies = useCallback(async () => {
    setCompanyLoading(true);
    const params = new URLSearchParams();
    if (companySearch) params.set('search', companySearch);
    params.set('page', String(companyPage));
    const res = await fetch(`/api/agency/crm/companies?${params}`);
    if (res.ok) {
      const data = await res.json();
      setCompanies(data.companies || []);
      setCompanyTotal(data.total || 0);
    }
    setCompanyLoading(false);
  }, [companySearch, companyPage]);

  useEffect(() => { if (topTab === 'companies') fetchCompanies(); }, [topTab, fetchCompanies]);

  const totalPages = Math.ceil(total / pageSize);
  const allSelected = contacts.length > 0 && contacts.every(c => selectedIds.has(c.id));

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(contacts.map(c => c.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const handleSort = (col: ContactFilters['sort']) => {
    if (sort === col) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(col);
      setSortOrder(col === 'name' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const executeBulkAction = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    try {
      if (bulkAction === 'export') {
        const res = await fetch('/api/agency/crm/export?type=contacts');
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        const payload: Record<string, unknown> = {};
        if (bulkAction === 'tag') payload.tag = bulkTag;
        if (bulkAction === 'stage') payload.stage = bulkStage;
        await fetch('/api/agency/crm/contacts/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: bulkAction, contact_ids: ids, payload }),
        });
      }
      setSelectedIds(new Set());
      setBulkAction(null);
      fetchContacts();
    } catch (err) {
      console.error('Bulk action failed:', err);
    }
    setBulkLoading(false);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-0">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
            {topTab === 'contacts' ? `${total} Contacts` : `${companyTotal} Companies`}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/agency/crm/import')}>
            <Upload className="h-4 w-4 mr-1.5" /> Import
          </Button>
          <Button size="sm" onClick={() => topTab === 'contacts' ? setShowAddModal(true) : setShowAddCompany(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="h-4 w-4 mr-1.5" /> Add {topTab === 'contacts' ? 'Contact' : 'Company'}
          </Button>
        </div>
      </div>

      {/* ═══ TOP TABS (GHL-style) ═══ */}
      <div className="flex items-center border-b border-gray-200 mb-4">
        {[
          { key: 'contacts' as TopTab, label: 'Contacts' },
          { key: 'companies' as TopTab, label: 'Companies' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setTopTab(tab.key); setSelectedIds(new Set()); }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              topTab === tab.key
                ? 'text-indigo-600 border-indigo-600'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ═══ CONTACTS TAB ═══ */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {topTab === 'contacts' && (
        <>
          {/* Stage sub-tabs */}
          <div className="flex items-center gap-1 mb-4 overflow-x-auto">
            {STAGE_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setStage(tab.key); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  stage === tab.key
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}
                className={`text-xs ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : ''}`}>
                <Filter className="h-3.5 w-3.5 mr-1" /> Advanced Filters
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => handleSort(sort)}>
                <ArrowUpDown className="h-3.5 w-3.5 mr-1" /> Sort
              </Button>
            </div>
            <div className="flex-1" />
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                placeholder="Search Contacts"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 flex gap-3 flex-wrap items-end mb-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Score</label>
                <select value={scoreLabel} onChange={e => { setScoreLabel(e.target.value); setPage(1); }}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  {SCORE_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Source</label>
                <select value={source} onChange={e => { setSource(e.target.value); setPage(1); }}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  {SOURCE_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
              {(scoreLabel || source) && (
                <Button variant="ghost" size="sm" onClick={() => { setScoreLabel(''); setSource(''); }}>
                  <X className="h-3.5 w-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>
          )}

          {/* Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex flex-wrap items-center gap-2 mb-4 sticky top-0 z-10">
              <span className="text-sm font-medium text-indigo-700">{selectedIds.size} selected</span>
              <div className="flex gap-2 flex-wrap flex-1">
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setBulkAction('tag')}>
                  <Tag className="h-3 w-3 mr-1" /> Tag
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setBulkAction('stage')}>
                  <ArrowRight className="h-3 w-3 mr-1" /> Stage
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setBulkAction('export'); executeBulkAction(); }}>
                  <Download className="h-3 w-3 mr-1" /> Export
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 hover:bg-red-50" onClick={() => setBulkAction('delete')}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              </div>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setSelectedIds(new Set()); setBulkAction(null); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Bulk Action Dialogs */}
          {bulkAction === 'tag' && (
            <div className="bg-white border border-indigo-200 rounded-lg p-4 flex items-center gap-3 mb-4">
              <Tag className="h-4 w-4 text-indigo-600 shrink-0" />
              <input className="border rounded-lg px-3 py-2 text-sm flex-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Tag name..." value={bulkTag} onChange={e => setBulkTag(e.target.value)} autoFocus />
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={!bulkTag.trim() || bulkLoading} onClick={executeBulkAction}>
                {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setBulkAction(null)}>Cancel</Button>
            </div>
          )}
          {bulkAction === 'stage' && (
            <div className="bg-white border border-indigo-200 rounded-lg p-4 flex items-center gap-3 mb-4">
              <ArrowRight className="h-4 w-4 text-indigo-600 shrink-0" />
              <select className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={bulkStage} onChange={e => setBulkStage(e.target.value)}>
                <option value="lead">Lead</option><option value="contact">Contact</option>
                <option value="customer">Customer</option><option value="churned">Churned</option>
              </select>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={bulkLoading} onClick={executeBulkAction}>
                {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Change'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setBulkAction(null)}>Cancel</Button>
            </div>
          )}
          {bulkAction === 'delete' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 mb-4">
              <Trash2 className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-700 flex-1">Delete {selectedIds.size} contact{selectedIds.size > 1 ? 's' : ''}? This cannot be undone.</p>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" disabled={bulkLoading} onClick={executeBulkAction}>
                {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setBulkAction(null)}>Cancel</Button>
            </div>
          )}

          {/* ═══ DATA TABLE ═══ */}
          {loading ? (
            <div className="py-16 text-center text-gray-400 animate-pulse">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No contacts yet</p>
              <p className="text-sm text-gray-400 mt-1">Add contacts manually or import from a CSV.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="w-10 pl-4 pr-1 py-3">
                        <button onClick={toggleAll} className="text-gray-400 hover:text-indigo-600">
                          {allSelected ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4" />}
                        </button>
                      </th>
                      <SortHeader label="Contact Name" sortKey="name" current={sort} order={sortOrder} onClick={handleSort} />
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Company</th>
                      <SortHeader label="Created" sortKey="created" current={sort} order={sortOrder} onClick={handleSort} className="hidden sm:table-cell" />
                      <SortHeader label="Last Activity" sortKey="last_activity" current={sort} order={sortOrder} onClick={handleSort} className="hidden md:table-cell" />
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Tags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {contacts.map(contact => (
                      <ContactRow
                        key={contact.id}
                        contact={contact}
                        selected={selectedIds.has(contact.id)}
                        onToggle={() => toggleOne(contact.id)}
                        onClick={() => router.push(`/agency/crm/contacts/${contact.id}`)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
              <div className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-3">
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="border rounded-lg px-2 py-1.5 text-sm text-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(1)} className="px-2">
                    <ChevronLeft className="h-4 w-4" /><ChevronLeft className="h-4 w-4 -ml-2" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    Prev
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    Next
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="px-2">
                    <ChevronRight className="h-4 w-4" /><ChevronRight className="h-4 w-4 -ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showAddModal && (
            <AddContactModal onClose={() => setShowAddModal(false)} onCreated={() => { setShowAddModal(false); fetchContacts(); }} />
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ═══ COMPANIES TAB ═══ */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {topTab === 'companies' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Search companies..."
                value={companySearch}
                onChange={e => { setCompanySearch(e.target.value); setCompanyPage(1); }}
              />
            </div>
          </div>

          {companyLoading ? (
            <div className="py-16 text-center text-gray-400 animate-pulse">Loading companies...</div>
          ) : companies.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No companies yet</p>
              <p className="text-sm text-gray-400 mt-1">Companies are auto-created when you add contacts with a company name.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Industry</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Phone</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Location</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Website</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {companies.map(co => (
                    <tr key={co.id} className="hover:bg-gray-50 transition cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-indigo-600" />
                          </div>
                          <span className="font-medium text-gray-900 truncate">{co.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-gray-500 hidden sm:table-cell">{co.industry || '—'}</td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        {co.phone ? (
                          <span className="flex items-center gap-1 text-gray-500">
                            <Phone className="h-3 w-3 text-green-500" /> {co.phone}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        {co.email ? (
                          <span className="text-gray-500 truncate block max-w-[200px]">{co.email}</span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3 text-gray-500 hidden lg:table-cell">
                        {co.city ? `${co.city}${co.state ? `, ${co.state}` : ''}` : '—'}
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        {co.website ? (
                          <a href={co.website} target="_blank" rel="noopener" className="text-indigo-600 hover:underline truncate block max-w-[160px]">
                            {co.website.replace(/^https?:\/\//, '')}
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {Math.ceil(companyTotal / 50) > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-gray-500">Page {companyPage} of {Math.ceil(companyTotal / 50)}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={companyPage <= 1} onClick={() => setCompanyPage(p => p - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={companyPage >= Math.ceil(companyTotal / 50)} onClick={() => setCompanyPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}

          {showAddCompany && (
            <AddCompanyModal onClose={() => setShowAddCompany(false)} onCreated={() => { setShowAddCompany(false); fetchCompanies(); }} />
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Sortable Column Header
// ═══════════════════════════════════════════════════════════════════════════
function SortHeader({ label, sortKey, current, order, onClick, className = '' }: {
  label: string;
  sortKey: ContactFilters['sort'];
  current: ContactFilters['sort'];
  order: 'asc' | 'desc';
  onClick: (key: ContactFilters['sort']) => void;
  className?: string;
}) {
  const active = current === sortKey;
  return (
    <th className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}>
      <button onClick={() => onClick(sortKey)} className="flex items-center gap-1 hover:text-gray-700 transition">
        {label}
        <span className="inline-flex flex-col leading-none">
          <ChevronUp className={`h-2.5 w-2.5 ${active && order === 'asc' ? 'text-indigo-600' : 'text-gray-300'}`} />
          <ChevronDown className={`h-2.5 w-2.5 -mt-0.5 ${active && order === 'desc' ? 'text-indigo-600' : 'text-gray-300'}`} />
        </span>
      </button>
    </th>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Contact Table Row
// ═══════════════════════════════════════════════════════════════════════════
function ContactRow({ contact, selected, onToggle, onClick }: {
  contact: ContactWithCompany;
  selected: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  const initials = getInitials(contact.first_name, contact.last_name);
  const color = contact.avatar_color || getAvatarColor(contact.first_name, contact.last_name);
  const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || '—';
  const tags = contact.tags || [];

  return (
    <tr className={`hover:bg-gray-50 transition group ${selected ? 'bg-indigo-50/40' : ''}`}>
      {/* Checkbox */}
      <td className="w-10 pl-4 pr-1 py-3">
        <button onClick={e => { e.stopPropagation(); onToggle(); }} className="text-gray-400 hover:text-indigo-600">
          {selected ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4" />}
        </button>
      </td>

      {/* Contact Name */}
      <td className="px-3 py-3 cursor-pointer" onClick={onClick}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
            {initials}
          </div>
          <span className="font-medium text-gray-900 group-hover:text-indigo-600 transition truncate max-w-[180px]">
            {name}
          </span>
        </div>
      </td>

      {/* Phone */}
      <td className="px-3 py-3 cursor-pointer" onClick={onClick}>
        {contact.phone ? (
          <span className="flex items-center gap-1.5 text-gray-600">
            <Phone className="h-3 w-3 text-green-500 shrink-0" /> {contact.phone}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>

      {/* Email */}
      <td className="px-3 py-3 cursor-pointer hidden md:table-cell" onClick={onClick}>
        {contact.email ? (
          <span className="flex items-center gap-1.5 text-gray-600">
            <Mail className="h-3 w-3 text-gray-400 shrink-0" />
            <span className="truncate max-w-[200px]">{contact.email}</span>
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>

      {/* Company */}
      <td className="px-3 py-3 text-gray-600 hidden lg:table-cell cursor-pointer" onClick={onClick}>
        {contact.company?.name || '—'}
      </td>

      {/* Created */}
      <td className="px-3 py-3 text-gray-500 whitespace-nowrap hidden sm:table-cell cursor-pointer" onClick={onClick}>
        {formatDate(contact.created_at)}
      </td>

      {/* Last Activity */}
      <td className="px-3 py-3 hidden md:table-cell cursor-pointer" onClick={onClick}>
        {contact.last_activity_at ? (
          <span className="flex items-center gap-1 text-gray-500">
            <Clock className="h-3 w-3 text-gray-400" />
            {timeAgo(contact.last_activity_at)}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>

      {/* Tags */}
      <td className="px-3 py-3 hidden lg:table-cell">
        {tags.length > 0 ? (
          <div className="flex items-center gap-1">
            {tags.slice(0, 2).map(tag => (
              <span key={tag} className="inline-block text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full truncate max-w-[100px]">
                {tag}
              </span>
            ))}
            {tags.length > 2 && (
              <span className="text-[11px] text-indigo-600 font-medium">+{tags.length - 2}</span>
            )}
          </div>
        ) : null}
      </td>
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Add Contact Modal
// ═══════════════════════════════════════════════════════════════════════════
function AddContactModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', title: '', company_name: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() && !form.email.trim()) { setError('Name or email required'); return; }
    setSaving(true); setError('');
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const res = await fetch('/api/agency/crm/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tags: tags.length > 0 ? tags : undefined }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.existing) { setError('A contact with this email/phone already exists.'); setSaving(false); return; }
      onCreated();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to create contact');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-indigo-600" /> Add Contact
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="First name" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            <input className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Last name" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Title (e.g. VP of Marketing)" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Company name" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Tags (comma separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <div className="flex gap-2 mt-5">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={saving}>
            {saving ? 'Creating...' : 'Create Contact'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Add Company Modal
// ═══════════════════════════════════════════════════════════════════════════
function AddCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', website: '', industry: '', phone: '', email: '', city: '', state: '' });
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
    if (res.ok) onCreated();
    else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}
