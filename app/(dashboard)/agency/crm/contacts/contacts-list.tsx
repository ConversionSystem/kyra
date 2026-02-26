'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users, Search, Plus, Filter, Mail, Phone, Clock,
  ArrowUpDown, ChevronLeft, ChevronRight, X, Building2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ContactWithCompany, ContactFilters } from '@/lib/crm/types';
import { getInitials, getAvatarColor, getScoreBadge, getStageBadge } from '@/lib/crm/types';

const STAGE_TABS = [
  { key: '', label: 'All' },
  { key: 'lead', label: 'Leads' },
  { key: 'contact', label: 'Contacts' },
  { key: 'customer', label: 'Customers' },
  { key: 'churned', label: 'Churned' },
];

export function ContactsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [stage, setStage] = useState('');
  const [sort, setSort] = useState<ContactFilters['sort']>('created');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (stage) params.set('stage', stage);
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
  }, [search, stage, sort, page]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const totalPages = Math.ceil(total / 50);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" /> Contacts
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} contacts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/agency/pipeline')}>
            <Upload className="h-4 w-4 mr-1" /> Import
          </Button>
          <Button size="sm" onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="h-4 w-4 mr-1" /> Add Contact
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
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
        <select
          value={sort}
          onChange={e => setSort(e.target.value as ContactFilters['sort'])}
          className="border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="created">Newest</option>
          <option value="last_activity">Last Active</option>
          <option value="score">Score</option>
          <option value="name">Name</option>
        </select>
      </div>

      {/* Stage Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
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
          {contacts.map(contact => (
            <ContactCard key={contact.id} contact={contact} onClick={() => router.push(`/agency/crm/contacts/${contact.id}`)} />
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
    </div>
  );
}

function ContactCard({ contact, onClick }: { contact: ContactWithCompany; onClick: () => void }) {
  const initials = getInitials(contact.first_name, contact.last_name);
  const color = contact.avatar_color || getAvatarColor(contact.first_name, contact.last_name);
  const scoreBadge = getScoreBadge(contact.score, contact.score_label);
  const stageBadge = getStageBadge(contact.stage);
  const name = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unnamed Contact';

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition cursor-pointer flex items-center gap-4"
    >
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
  );
}

function AddContactModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', title: '', company_name: '' });
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

    const res = await fetch('/api/agency/crm/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
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
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
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
