'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users, Search, Plus, Mail, Phone, Clock, Download,
  ChevronLeft, ChevronRight, X, Building2, Upload, Tag,
  ArrowRight, Trash2, CheckSquare, Square, Filter, Save,
  Loader2, MoreHorizontal, Globe, MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContactWithCompany, ContactFilters, CrmCompany } from '@/lib/crm/types';
import { getInitials, getAvatarColor, getScoreBadge, getStageBadge } from '@/lib/crm/types';

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

export function ContactsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<'people' | 'companies'>(searchParams.get('view') === 'companies' ? 'companies' : 'people');
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [stage, setStage] = useState('');
  const [scoreLabel, setScoreLabel] = useState('');
  const [source, setSource] = useState('');
  const [sort, setSort] = useState<ContactFilters['sort']>('created');
  const [page, setPage] = useState(1);
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

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (stage) params.set('stage', stage);
    if (scoreLabel) params.set('score_label', scoreLabel);
    if (source) params.set('source', source);
    if (sort) params.set('sort', sort);
    params.set('page', String(page));
    params.set('order', sort === 'score' ? 'desc' : sort === 'name' ? 'asc' : 'desc');

    const res = await fetch(`/api/agency/crm/contacts?${params}`);
    if (res.ok) {
      const data = await res.json();
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [search, stage, scoreLabel, source, sort, page]);

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

  useEffect(() => { if (viewMode === 'companies') fetchCompanies(); }, [viewMode, fetchCompanies]);

  const totalPages = Math.ceil(total / 50);
  const allSelected = contacts.length > 0 && contacts.every(c => selectedIds.has(c.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
  };

  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
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
          body: JSON.stringify({
            action: bulkAction,
            contact_ids: ids,
            payload,
          }),
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
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" /> Contacts
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {viewMode === 'people' ? `${total} contacts` : `${companyTotal} companies`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {viewMode === 'people' && (
            <>
              <Button variant="outline" size="sm" onClick={() => router.push('/agency/crm/import')}>
                <Upload className="h-4 w-4 mr-1" /> Import
              </Button>
              <Button variant="outline" size="sm" className="hidden sm:flex" onClick={async () => {
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
              }}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
              <Button size="sm" onClick={() => setShowAddModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="h-4 w-4 mr-1" /> Add Contact
              </Button>
            </>
          )}
          {viewMode === 'companies' && (
            <Button size="sm" onClick={() => setShowAddCompany(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-4 w-4 mr-1" /> Add Company
            </Button>
          )}
        </div>
      </div>

      {/* People / Companies Toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setViewMode('people')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
            viewMode === 'people' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          <Users className="h-4 w-4" /> People
        </button>
        <button
          onClick={() => setViewMode('companies')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
            viewMode === 'companies' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}>
          <Building2 className="h-4 w-4" /> Companies
          {companyTotal > 0 && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{companyTotal}</span>}
        </button>
      </div>

      {/* ═══ COMPANIES VIEW ═══ */}
      {viewMode === 'companies' && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="Search companies..."
              value={companySearch}
              onChange={e => { setCompanySearch(e.target.value); setCompanyPage(1); }}
            />
          </div>

          {companyLoading ? (
            <div className="py-12 text-center text-gray-400 animate-pulse">Loading companies...</div>
          ) : companies.length === 0 ? (
            <div className="py-12 text-center">
              <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No companies yet</p>
              <p className="text-sm text-gray-400 mt-1">Companies are auto-created when you add contacts with a company name.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {companies.map(co => (
                <div key={co.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition cursor-pointer">
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

          {Math.ceil(companyTotal / 50) > 1 && (
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={companyPage <= 1} onClick={() => setCompanyPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-gray-500">Page {companyPage} of {Math.ceil(companyTotal / 50)}</span>
              <Button variant="outline" size="sm" disabled={companyPage >= Math.ceil(companyTotal / 50)} onClick={() => setCompanyPage(p => p + 1)}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {showAddCompany && (
            <AddCompanyModal onClose={() => setShowAddCompany(false)} onCreated={() => { setShowAddCompany(false); fetchCompanies(); }} />
          )}
        </>
      )}

      {/* ═══ PEOPLE VIEW ═══ */}
      {viewMode === 'people' && <>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={e => setSort(e.target.value as ContactFilters['sort'])}
            className="border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none flex-1 sm:flex-none"
          >
            <option value="created">Newest</option>
            <option value="last_activity">Last Active</option>
            <option value="score">Score</option>
            <option value="name">Name</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : ''}
          >
            <Filter className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Filters</span>
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Score</label>
            <select
              value={scoreLabel}
              onChange={e => { setScoreLabel(e.target.value); setPage(1); }}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {SCORE_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Source</label>
            <select
              value={source}
              onChange={e => { setSource(e.target.value); setPage(1); }}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {SOURCE_FILTERS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          {(scoreLabel || source) && (
            <Button variant="ghost" size="sm" onClick={() => { setScoreLabel(''); setSource(''); }}>
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      )}

      {/* Stage Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {STAGE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setStage(tab.key); setPage(1); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
              stage === tab.key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex flex-wrap items-center gap-2 sm:gap-3 sticky top-0 z-10">
          <span className="text-sm font-medium text-indigo-700">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2 flex-wrap flex-1">
            <Button size="sm" variant="outline" className="text-xs h-7"
              onClick={() => { setBulkAction('tag'); }}>
              <Tag className="h-3 w-3 mr-1" /> Tag
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7"
              onClick={() => { setBulkAction('stage'); }}>
              <ArrowRight className="h-3 w-3 mr-1" /> Change Stage
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7"
              onClick={() => { setBulkAction('export'); executeBulkAction(); }}>
              <Download className="h-3 w-3 mr-1" /> Export
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 hover:bg-red-50"
              onClick={() => { setBulkAction('delete'); }}>
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
        <div className="bg-white border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
          <Tag className="h-4 w-4 text-indigo-600" />
          <input
            className="border rounded-lg px-3 py-2 text-sm flex-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Tag name..."
            value={bulkTag}
            onChange={e => setBulkTag(e.target.value)}
            autoFocus
          />
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={!bulkTag.trim() || bulkLoading}
            onClick={executeBulkAction}>
            {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply Tag'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setBulkAction(null)}>Cancel</Button>
        </div>
      )}

      {bulkAction === 'stage' && (
        <div className="bg-white border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
          <ArrowRight className="h-4 w-4 text-indigo-600" />
          <select
            className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            value={bulkStage}
            onChange={e => setBulkStage(e.target.value)}
          >
            <option value="lead">Lead</option>
            <option value="contact">Contact</option>
            <option value="customer">Customer</option>
            <option value="churned">Churned</option>
          </select>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={bulkLoading}
            onClick={executeBulkAction}>
            {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Change Stage'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setBulkAction(null)}>Cancel</Button>
        </div>
      )}

      {bulkAction === 'delete' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <Trash2 className="h-4 w-4 text-red-600" />
          <p className="text-sm text-red-700 flex-1">
            Delete {selectedIds.size} contact{selectedIds.size > 1 ? 's' : ''}? This cannot be undone.
          </p>
          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" disabled={bulkLoading}
            onClick={executeBulkAction}>
            {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setBulkAction(null)}>Cancel</Button>
        </div>
      )}

      {/* Contact Cards */}
      {loading ? (
        <div className="py-12 text-center text-gray-400 animate-pulse">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="py-12 text-center">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No contacts yet</p>
          <p className="text-sm text-gray-400 mt-1">Add contacts manually or run an AI Pipeline campaign.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select All */}
          <div className="flex items-center gap-2 px-2">
            <button onClick={toggleAll} className="text-gray-400 hover:text-indigo-600 transition">
              {allSelected ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4" />}
            </button>
            <span className="text-xs text-gray-500">Select all</span>
          </div>

          {contacts.map(contact => (
            <ContactCard
              key={contact.id}
              contact={contact}
              selected={selectedIds.has(contact.id)}
              onToggle={() => toggleOne(contact.id)}
              onClick={() => router.push(`/agency/crm/contacts/${contact.id}`)}
            />
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

      {/* Add Contact Modal */}
      {showAddModal && (
        <AddContactModal onClose={() => setShowAddModal(false)} onCreated={() => { setShowAddModal(false); fetchContacts(); }} />
      )}

      </>}
    </div>
  );
}

function ContactCard({ contact, selected, onToggle, onClick }: {
  contact: ContactWithCompany;
  selected: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  const initials = getInitials(contact.first_name, contact.last_name);
  const color = contact.avatar_color || getAvatarColor(contact.first_name, contact.last_name);
  const scoreBadge = getScoreBadge(contact.score, contact.score_label);
  const stageBadge = getStageBadge(contact.stage);
  const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unnamed Contact';

  return (
    <div className={`bg-white border rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition flex items-center gap-4 ${
      selected ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-200'
    }`}>
      {/* Checkbox */}
      <button
        onClick={e => { e.stopPropagation(); onToggle(); }}
        className="shrink-0 text-gray-400 hover:text-indigo-600 transition"
      >
        {selected ? <CheckSquare className="h-4 w-4 text-indigo-600" /> : <Square className="h-4 w-4" />}
      </button>

      {/* Avatar + Info */}
      <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <div className={`w-11 h-11 rounded-full ${color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">{name}</span>
            {contact.title && <span className="text-xs text-gray-500">· {contact.title}</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {contact.company && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {contact.company.name}
              </span>
            )}
            {contact.email && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Mail className="h-3 w-3" /> {contact.email}
              </span>
            )}
            {contact.phone && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Phone className="h-3 w-3" /> {contact.phone}
              </span>
            )}
          </div>
          {contact.tags?.length > 0 && (
            <div className="flex gap-1 mt-1">
              {contact.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
              {contact.tags.length > 3 && (
                <span className="text-[10px] text-gray-400">+{contact.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${scoreBadge.color}`}>
            {scoreBadge.text}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stageBadge.color}`}>
            {stageBadge.text}
          </span>
        </div>

        {contact.last_activity_at && (
          <span className="text-[10px] text-gray-400 shrink-0 flex items-center gap-1">
            <Clock className="h-3 w-3" /> {timeAgo(contact.last_activity_at)}
          </span>
        )}
      </div>
    </div>
  );
}

function AddContactModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', title: '', company_name: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() && !form.email.trim()) {
      setError('Name or email required');
      return;
    }
    setSaving(true);
    setError('');

    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);

    const res = await fetch('/api/agency/crm/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tags: tags.length > 0 ? tags : undefined }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.existing) {
        setError('A contact with this email/phone already exists.');
        setSaving(false);
        return;
      }
      onCreated();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to create contact');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-indigo-600" /> Add Contact
        </h3>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}
