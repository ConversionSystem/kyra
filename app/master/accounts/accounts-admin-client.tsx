'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search, RefreshCw, Trash2, CreditCard, Settings,
  KeyRound, ChevronDown, X, Check, AlertTriangle,
  Building2, User, Crown, Zap, Shield, ExternalLink,
  Plus, Minus, MoreVertical, Copy,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  name: string;
  slug: string;
  plan: string;
  account_type: 'solo' | 'agency';
  owner_id: string;
  email: string | null;
  created_at: string;
  website_url: string | null;
  credits: { balance: number; lifetime_used: number; lifetime_purchased: number };
  clients: { total: number; running: number };
  solo_client_id: string | null;
}

const PLANS = ['free', 'solo_pro', 'starter', 'pro', 'scale'];
const PLAN_LABELS: Record<string, string> = {
  free: 'Free', solo_pro: 'Solo Pro', starter: 'Lite', pro: 'Pro', scale: 'Scale',
};
const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  solo_pro: 'bg-violet-100 text-violet-700',
  starter: 'bg-blue-100 text-blue-700',
  pro: 'bg-indigo-100 text-indigo-700',
  scale: 'bg-purple-100 text-purple-700',
};

function planColor(plan: string) {
  return PLAN_COLORS[plan] ?? 'bg-gray-100 text-gray-600';
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

// ── Account Drawer ─────────────────────────────────────────────────────────────

function AccountDrawer({
  account,
  onClose,
  onUpdated,
}: {
  account: Account;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [editPlan, setEditPlan] = useState(account.plan);
  const [editType, setEditType] = useState(account.account_type);
  const [editName, setEditName] = useState(account.name);
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function showMsg(type: 'ok' | 'err', text: string) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function applyCredits(delta: number) {
    if (!delta || isNaN(delta)) return;
    setLoading('credits');
    const res = await fetch(`/api/admin/accounts/${account.id}/credits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: delta, note: creditNote }),
    });
    const data = await res.json();
    setLoading(null);
    if (data.ok) {
      showMsg('ok', `Credits updated → balance: ${data.newBalance}`);
      setCreditAmount('');
      setCreditNote('');
      onUpdated();
    } else {
      showMsg('err', data.error ?? 'Failed');
    }
  }

  async function saveEdits() {
    setLoading('edit');
    const res = await fetch(`/api/admin/accounts/${account.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: editPlan, account_type: editType, name: editName }),
    });
    const data = await res.json();
    setLoading(null);
    if (data.ok) {
      showMsg('ok', 'Account updated');
      onUpdated();
    } else {
      showMsg('err', data.error ?? 'Failed');
    }
  }

  async function sendPasswordReset() {
    setLoading('password');
    const res = await fetch(`/api/admin/accounts/${account.id}/reset-password`, { method: 'POST' });
    const data = await res.json();
    setLoading(null);
    if (data.ok) showMsg('ok', `Password reset sent to ${data.email}`);
    else showMsg('err', data.error ?? 'Failed');
  }

  async function deleteAccount() {
    setLoading('delete');
    const res = await fetch(`/api/admin/accounts/${account.id}`, { method: 'DELETE' });
    const data = await res.json();
    setLoading(null);
    if (data.ok) {
      onClose();
      onUpdated();
    } else {
      showMsg('err', data.error ?? 'Delete failed');
    }
  }

  const creditDelta = parseFloat(creditAmount) || 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-200 bg-gray-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${planColor(account.plan)}`}>
                {PLAN_LABELS[account.plan] ?? account.plan}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${account.account_type === 'solo' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {account.account_type}
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{account.name}</h2>
            <p className="text-sm text-gray-500">{account.email ?? 'No email'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Status bar */}
          {msg && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {msg.type === 'ok' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              {msg.text}
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Credits', value: account.credits.balance.toLocaleString(), sub: `${account.credits.lifetime_used.toLocaleString()} used` },
              { label: 'Workers', value: `${account.clients.running}/${account.clients.total}`, sub: 'running' },
              { label: 'Joined', value: relTime(account.created_at), sub: new Date(account.created_at).toLocaleDateString() },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
                <p className="text-lg font-black text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                <p className="text-[10px] text-gray-400">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* IDs */}
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1 text-xs font-mono">
            {[
              { label: 'Agency ID', val: account.id },
              { label: 'Owner ID', val: account.owner_id },
              ...(account.solo_client_id ? [{ label: 'Container ID', val: account.solo_client_id }] : []),
            ].map(row => (
              <div key={row.label} className="flex items-center gap-2">
                <span className="text-gray-400 w-24 shrink-0">{row.label}:</span>
                <span className="text-gray-700 truncate flex-1">{row.val}</span>
                <button onClick={() => navigator.clipboard.writeText(row.val)} className="text-gray-400 hover:text-indigo-600 transition shrink-0">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {/* ── Edit Account ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4 text-indigo-500" /> Edit Account
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Display name</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Plan</label>
                  <select
                    value={editPlan}
                    onChange={e => setEditPlan(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p] ?? p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Account type</label>
                  <select
                    value={editType}
                    onChange={e => setEditType(e.target.value as 'solo' | 'agency')}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                  >
                    <option value="solo">Solo</option>
                    <option value="agency">Agency</option>
                  </select>
                </div>
              </div>
              <button
                onClick={saveEdits}
                disabled={loading === 'edit'}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading === 'edit' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </section>

          {/* ── Credits ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-indigo-500" /> Credits
              <span className="ml-auto text-indigo-600 font-bold">{account.credits.balance.toLocaleString()} balance</span>
            </h3>
            <div className="space-y-3">
              <input
                type="number"
                placeholder="Amount (positive = add, negative = deduct)"
                value={creditAmount}
                onChange={e => setCreditAmount(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="text"
                placeholder="Note (optional)"
                value={creditNote}
                onChange={e => setCreditNote(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => applyCredits(Math.abs(creditDelta))}
                  disabled={!creditDelta || loading === 'credits'}
                  className="flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" /> Add Credits
                </button>
                <button
                  onClick={() => applyCredits(-Math.abs(creditDelta))}
                  disabled={!creditDelta || loading === 'credits'}
                  className="flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" /> Deduct
                </button>
              </div>
              {/* Quick credit buttons */}
              <div className="flex flex-wrap gap-2">
                {[100, 500, 1000, 5000].map(n => (
                  <button key={n} onClick={() => { setCreditAmount(String(n)); }}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-full hover:border-indigo-300 hover:text-indigo-600 transition">
                    +{n.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Password Reset ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-indigo-500" /> Password
            </h3>
            <button
              onClick={sendPasswordReset}
              disabled={loading === 'password' || !account.email}
              className="w-full border border-gray-200 hover:border-indigo-300 text-gray-700 hover:text-indigo-600 text-sm font-medium rounded-xl px-4 py-2.5 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading === 'password' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Send Password Reset Email
            </button>
            {!account.email && <p className="text-xs text-gray-400 mt-1">No email on file — cannot send reset</p>}
          </section>

          {/* ── External links ── */}
          {account.website_url && (
            <a href={account.website_url} target="_blank" rel="noopener"
              className="flex items-center gap-2 text-sm text-indigo-600 hover:underline">
              <ExternalLink className="h-4 w-4" /> {account.website_url}
            </a>
          )}

          {/* ── Delete ── */}
          <section className="border-t border-red-100 pt-5">
            <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> Danger Zone
            </h3>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-xl px-4 py-2.5 transition"
              >
                Delete Account
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-700 font-medium bg-red-50 rounded-xl px-4 py-3">
                  ⚠️ This will delete the account, all clients, containers, and auth user. Cannot be undone.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setConfirmDelete(false)}
                    className="border border-gray-200 text-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button
                    onClick={deleteAccount}
                    disabled={loading === 'delete'}
                    className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading === 'delete' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Client ──────────────────────────────────────────────────────────

export default function AccountsAdminClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selected, setSelected] = useState<Account | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/accounts');
    const data = await res.json();
    setAccounts(Array.isArray(data) ? data : []);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  // Refresh selected account after action
  function onUpdated() {
    fetch_().then(() => {
      // Re-select updated account if still open
      if (selected) {
        setAccounts(prev => {
          const updated = prev.find(a => a.id === selected.id);
          if (updated) setSelected(updated);
          return prev;
        });
      }
    });
  }

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    const matchesSearch = !q || a.name.toLowerCase().includes(q) || (a.email ?? '').toLowerCase().includes(q) || a.id.toLowerCase().includes(q);
    const matchesPlan = filterPlan === 'all' || a.plan === filterPlan;
    const matchesType = filterType === 'all' || a.account_type === filterType;
    return matchesSearch && matchesPlan && matchesType;
  });

  const stats = {
    total: accounts.length,
    paid: accounts.filter(a => a.plan !== 'free').length,
    solo: accounts.filter(a => a.account_type === 'solo').length,
    agency: accounts.filter(a => a.account_type === 'agency').length,
    totalCredits: accounts.reduce((s, a) => s + a.credits.balance, 0),
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-500" /> Admin — All Accounts
          </h1>
          {lastRefresh && <p className="text-xs text-gray-400 mt-0.5">Last refreshed {lastRefresh.toLocaleTimeString()}</p>}
        </div>
        <button onClick={fetch_} disabled={loading}
          className="flex items-center gap-2 text-sm border border-gray-200 rounded-xl px-4 py-2 hover:bg-gray-50 transition disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total Accounts', value: stats.total, color: 'text-gray-900' },
          { label: 'Paid', value: stats.paid, color: 'text-green-700' },
          { label: 'Solo', value: stats.solo, color: 'text-teal-700' },
          { label: 'Agency', value: stats.agency, color: 'text-indigo-700' },
          { label: 'Total Credits', value: stats.totalCredits.toLocaleString(), color: 'text-purple-700' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, ID…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="all">All plans</option>
          {PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
          <option value="all">All types</option>
          <option value="solo">Solo</option>
          <option value="agency">Agency</option>
        </select>
        <span className="flex items-center text-sm text-gray-500 px-1">{filtered.length} accounts</span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50/60">
                <th className="px-4 py-3">Account</th>
                <th className="px-3 py-3 hidden sm:table-cell">Email</th>
                <th className="px-3 py-3">Plan</th>
                <th className="px-3 py-3 hidden md:table-cell">Type</th>
                <th className="px-3 py-3 hidden lg:table-cell">Credits</th>
                <th className="px-3 py-3 hidden lg:table-cell">Workers</th>
                <th className="px-3 py-3 hidden xl:table-cell">Joined</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && accounts.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">Loading accounts…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No accounts match your filters</td></tr>
              ) : (
                filtered.map(a => (
                  <tr key={a.id}
                    onClick={() => setSelected(a)}
                    className="hover:bg-indigo-50/30 cursor-pointer transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${a.account_type === 'solo' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {a.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 group-hover:text-indigo-700 transition">{a.name}</p>
                          <p className="text-xs text-gray-400 sm:hidden">{a.email ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-500 hidden sm:table-cell max-w-[180px] truncate">{a.email ?? '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${planColor(a.plan)}`}>
                        {PLAN_LABELS[a.plan] ?? a.plan}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.account_type === 'solo' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {a.account_type}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <span className={`font-semibold ${a.credits.balance === 0 ? 'text-red-500' : a.credits.balance < 50 ? 'text-amber-600' : 'text-gray-900'}`}>
                        {a.credits.balance.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell text-gray-600">
                      {a.clients.running}/{a.clients.total}
                    </td>
                    <td className="px-3 py-3 hidden xl:table-cell text-gray-400 text-xs">{relTime(a.created_at)}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); setSelected(a); }}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition opacity-0 group-hover:opacity-100"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <AccountDrawer
          account={selected}
          onClose={() => setSelected(null)}
          onUpdated={onUpdated}
        />
      )}
    </div>
  );
}
