'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Send, Clock, CheckCircle2, AlertCircle,
  Plus, Loader2, X, Copy, ExternalLink, RefreshCw,
  TrendingUp, BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  pending:   { label: 'Pending',   className: 'bg-gray-100 text-gray-600 border-gray-200',       icon: <Clock size={12} /> },
  sent:      { label: 'Sent',      className: 'bg-blue-50 text-blue-700 border-blue-200',         icon: <Send size={12} /> },
  paid:      { label: 'Paid',      className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> },
  overdue:   { label: 'Overdue',   className: 'bg-red-50 text-red-700 border-red-200',            icon: <AlertCircle size={12} /> },
  reminded:  { label: 'Reminded',  className: 'bg-amber-50 text-amber-700 border-amber-200',      icon: <Clock size={12} /> },
  escalated: { label: 'Escalated', className: 'bg-orange-50 text-orange-700 border-orange-200',   icon: <AlertCircle size={12} /> },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-400 border-gray-200',        icon: <X size={12} /> },
};

// ─── New Payment Form ─────────────────────────────────────────────────────────

interface NewPaymentFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

function NewPaymentForm({ onClose, onSuccess }: NewPaymentFormProps) {
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
          amount: parseFloat(form.amount),
          description: form.description,
          service: form.service || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment');
      setResult(data);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!result?.paymentUrl) return;
    await navigator.clipboard.writeText(result.paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <span className="font-semibold">Payment request created!</span>
        </div>
        <p className="text-sm text-gray-600">
          A payment link for <strong>{fmtMoney(result.amount)}</strong> has been created for <strong>{form.contactName}</strong>.
        </p>
        {result.paymentUrl && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <span className="text-xs text-gray-500 truncate flex-1">{result.paymentUrl}</span>
            <button
              onClick={copyLink}
              className="shrink-0 p-1.5 hover:bg-gray-200 rounded text-gray-500"
            >
              {copied ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
            <a href={result.paymentUrl} target="_blank" rel="noreferrer" className="shrink-0 p-1.5 hover:bg-gray-200 rounded text-gray-500">
              <ExternalLink size={14} />
            </a>
          </div>
        )}
        {!result.paymentUrl && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
            ⚠️ Stripe not configured — payment recorded but no link generated.
          </p>
        )}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Message preview</p>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans">{result.message}</pre>
        </div>
        <Button onClick={onClose} className="w-full">Done</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Customer Name *</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Jane Smith"
            value={form.contactName}
            onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="jane@example.com"
            value={form.contactEmail}
            onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="+1 555 000 0000"
            value={form.contactPhone}
            onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Amount (USD) *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="275.00"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Service</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="AC Repair"
            value={form.service}
            onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
          <input
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="AC unit repair — 142 Oak St"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            required
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin mr-2" /> : <Send size={14} className="mr-2" />}
          Create Payment Request
        </Button>
      </div>
    </form>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, color = 'indigo',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: 'indigo' | 'emerald' | 'red' | 'amber';
}) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={cn('p-2.5 rounded-lg', colors[color])}>{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function PaymentsDashboard() {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, paymentsRes] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/payments/list'),
      ]);
      if (statsRes.ok) {
        const { stats } = await statsRes.json();
        setStats(stats);
      }
      if (paymentsRes.ok) {
        const { payments } = await paymentsRes.json();
        setPayments(payments || []);
      }
    } catch (err) {
      console.error('[payments] Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = filter === 'all'
    ? payments
    : payments.filter(p => p.status === filter);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Send payment requests and track collections</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="text-gray-600"
          >
            <RefreshCw size={14} className={cn('mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setShowNewForm(true)}
          >
            <Plus size={14} className="mr-1.5" />
            New Payment Request
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<DollarSign size={18} />}
            label="Collected"
            value={fmtMoney(stats.amountCollected)}
            sub={`${stats.totalPaid} paid`}
            color="emerald"
          />
          <StatCard
            icon={<Clock size={18} />}
            label="Pending"
            value={fmtMoney(stats.amountPending)}
            sub={`${stats.totalSent - stats.totalPaid} open`}
            color="amber"
          />
          <StatCard
            icon={<AlertCircle size={18} />}
            label="Overdue"
            value={stats.totalOverdue.toString()}
            sub="requests"
            color="red"
          />
          <StatCard
            icon={<TrendingUp size={18} />}
            label="Collection Rate"
            value={`${stats.collectionRate}%`}
            sub={`${stats.totalSent} total sent`}
            color="indigo"
          />
        </div>
      )}

      {/* New Payment Modal */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">New Payment Request</h2>
              <button
                onClick={() => setShowNewForm(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                <X size={16} />
              </button>
            </div>
            <NewPaymentForm
              onClose={() => setShowNewForm(false)}
              onSuccess={fetchData}
            />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-0 border-b border-gray-100 px-4 pt-3 overflow-x-auto">
          {['all', 'pending', 'sent', 'paid', 'overdue', 'reminded', 'escalated'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-2 text-sm font-medium capitalize whitespace-nowrap border-b-2 mr-1 transition-colors',
                filter === f
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {f === 'all' ? `All (${payments.length})` : f}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <BarChart3 size={40} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">No payments yet</p>
            <p className="text-xs mt-1">Create your first payment request above</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(p => {
              const sc = statusConfig[p.status] || statusConfig.pending;
              return (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm text-gray-900 truncate">{p.contact_name}</span>
                      <Badge
                        variant="outline"
                        className={cn('text-xs flex items-center gap-1 shrink-0', sc.className)}
                      >
                        {sc.icon}
                        {sc.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{p.description}</p>
                    {p.contact_email && (
                      <p className="text-xs text-gray-400">{p.contact_email}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm text-gray-900">{fmtMoney(p.amount)}</p>
                    <p className="text-xs text-gray-400">
                      {p.status === 'paid' ? `Paid ${timeAgo(p.paid_at)}` : `Sent ${timeAgo(p.sent_at)}`}
                    </p>
                  </div>
                  {p.payment_url && p.status !== 'paid' && (
                    <a
                      href={p.payment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                      title="Open payment link"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
