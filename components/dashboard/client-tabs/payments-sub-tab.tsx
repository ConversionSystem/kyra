'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Send, Clock, CheckCircle2, AlertCircle,
  Plus, Loader2, X, Copy, ExternalLink, RefreshCw,
  TrendingUp,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PaymentStats {
  totalSent: number;
  totalPaid: number;
  totalOverdue: number;
  amountCollected: number;
  amountPending: number;
  collectionRate: number;
}

interface PaymentRequest {
  id: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  amount: number;
  currency: string;
  description: string;
  service: string | null;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'reminded' | 'escalated' | 'cancelled';
  payment_url: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   className: 'bg-gray-100 text-gray-600',       icon: <Clock size={12} /> },
  sent:      { label: 'Sent',      className: 'bg-blue-50 text-blue-700',         icon: <Send size={12} /> },
  paid:      { label: 'Paid',      className: 'bg-emerald-50 text-emerald-700',   icon: <CheckCircle2 size={12} /> },
  overdue:   { label: 'Overdue',   className: 'bg-red-50 text-red-700',           icon: <AlertCircle size={12} /> },
  reminded:  { label: 'Reminded',  className: 'bg-amber-50 text-amber-700',       icon: <Clock size={12} /> },
  escalated: { label: 'Escalated', className: 'bg-orange-50 text-orange-700',     icon: <AlertCircle size={12} /> },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-400',        icon: <X size={12} /> },
};

// ─── New Payment Form ─────────────────────────────────────────────────────────

function NewPaymentForm({ clientId, onClose, onSuccess }: {
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    amount: '',
    description: '',
    service: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ paymentUrl: string | null; message: string; amount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contactName || !form.amount || !form.description) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: form.contactName,
          contactEmail: form.contactEmail || undefined,
          contactPhone: form.contactPhone || undefined,
          amount: Math.round(parseFloat(form.amount) * 100),
          description: form.description,
          service: form.service || undefined,
          clientId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment');

      setResult({
        paymentUrl: data.paymentUrl ?? null,
        message: data.message ?? 'Payment request created',
        amount: Math.round(parseFloat(form.amount) * 100),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = () => {
    if (result?.paymentUrl) {
      navigator.clipboard.writeText(result.paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (result) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <p className="text-sm font-semibold text-emerald-800">Payment link created!</p>
        </div>
        <p className="text-sm text-emerald-700">
          {fmtMoney(result.amount)} for {form.contactName}
        </p>
        {result.paymentUrl && (
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-emerald-200 rounded-lg px-3 py-2 font-mono text-emerald-800 truncate">
              {result.paymentUrl}
            </code>
            <button onClick={copyUrl} className="shrink-0 px-3 py-2 text-xs font-medium border border-emerald-200 rounded-lg hover:bg-white transition-colors">
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <a href={result.paymentUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 px-3 py-2 text-xs font-medium border border-emerald-200 rounded-lg hover:bg-white transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
        <button onClick={onClose} className="text-xs text-emerald-600 hover:text-emerald-800">
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">New Payment Request</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Contact Name *</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.contactName}
            onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount ($) *</label>
          <input
            type="number"
            step="0.01"
            min="0.50"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
        <input
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Website redesign - Phase 1"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input
            type="email"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.contactEmail}
            onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.contactPhone}
            onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !form.contactName || !form.amount || !form.description}
        className="w-full bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
        {loading ? 'Creating...' : 'Create Payment Link'}
      </button>
    </form>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PaymentsSubTab({ clientId }: { clientId: string }) {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      const [statsRes, listRes] = await Promise.all([
        fetch(`/api/payments?clientId=${clientId}`),
        fetch(`/api/payments/list?clientId=${clientId}`),
      ]);
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats ?? null);
      }
      if (listRes.ok) {
        const data = await listRes.json();
        setPayments(data.payments ?? []);
      }
    } catch (err) {
      console.error('[payments-sub-tab]', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = statusFilter === 'all'
    ? payments
    : payments.filter(p => p.status === statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Send className="w-4 h-4" />Sent</div>
            <div className="text-lg font-semibold text-gray-900">{stats.totalSent}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-emerald-500 text-xs mb-1"><CheckCircle2 className="w-4 h-4" />Paid</div>
            <div className="text-lg font-semibold text-gray-900">{fmtMoney(stats.amountCollected)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-amber-500 text-xs mb-1"><Clock className="w-4 h-4" />Pending</div>
            <div className="text-lg font-semibold text-gray-900">{fmtMoney(stats.amountPending)}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-indigo-500 text-xs mb-1"><TrendingUp className="w-4 h-4" />Collection Rate</div>
            <div className="text-lg font-semibold text-gray-900">{stats.collectionRate}%</div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 overflow-x-auto scrollbar-hide">
          {['all', 'sent', 'paid', 'overdue', 'pending'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                statusFilter === s ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadData()} className="border border-gray-200 rounded-lg h-8 w-8 flex items-center justify-center text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg px-3 h-8 text-xs font-medium transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> New Payment
          </button>
        </div>
      </div>

      {/* New payment form */}
      {showNew && (
        <NewPaymentForm
          clientId={clientId}
          onClose={() => setShowNew(false)}
          onSuccess={() => { setShowNew(false); loadData(); }}
        />
      )}

      {/* Payment list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <DollarSign className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm font-medium">No payments yet</p>
            <p className="text-xs mt-1">Create your first payment request above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(p => {
              const cfg = statusConfig[p.status] ?? statusConfig.pending;
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{p.contact_name}</div>
                      <div className="text-xs text-gray-500 truncate">{p.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-gray-900">{fmtMoney(p.amount)}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.className}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="text-[11px] text-gray-400">{timeAgo(p.created_at)}</span>
                    {p.payment_url && (
                      <a href={p.payment_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
