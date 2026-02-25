'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, ChevronDown, ChevronUp, Mail, UserCheck, UserPlus, CheckCircle, Loader2, X } from 'lucide-react';
import { agentRoles, PRODUCT_ROLE_IDS, type AgentRole } from './roles-data';

const colorMap: Record<string, { border: string; bg: string; text: string; pill: string }> = {
  indigo: { border: 'border-l-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', pill: 'border-indigo-200 bg-indigo-50 text-indigo-600' },
  green:  { border: 'border-l-green-500',  bg: 'bg-green-50',  text: 'text-green-700',  pill: 'border-green-200 bg-green-50 text-green-600' },
  purple: { border: 'border-l-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', pill: 'border-purple-200 bg-purple-50 text-purple-600' },
  orange: { border: 'border-l-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', pill: 'border-orange-200 bg-orange-50 text-orange-600' },
  amber:  { border: 'border-l-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700',  pill: 'border-amber-200 bg-amber-50 text-amber-600' },
  cyan:   { border: 'border-l-cyan-500',   bg: 'bg-cyan-50',   text: 'text-cyan-700',   pill: 'border-cyan-200 bg-cyan-50 text-cyan-600' },
  blue:   { border: 'border-l-blue-500',   bg: 'bg-blue-50',   text: 'text-blue-700',   pill: 'border-blue-200 bg-blue-50 text-blue-600' },
  red:    { border: 'border-l-red-500',     bg: 'bg-red-50',    text: 'text-red-700',    pill: 'border-red-200 bg-red-50 text-red-600' },
};

interface ClientOption {
  id: string;
  name: string;
  industry: string;
  status: string;
  container_config: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deploy Modal (plain Tailwind — no Radix/shadcn Dialog needed)
// ─────────────────────────────────────────────────────────────────────────────
function DeployModal({
  role,
  open,
  onClose,
}: {
  role: AgentRole;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const colors = colorMap[role.color] ?? colorMap.indigo;

  const [tab, setTab]           = useState<'existing' | 'new'>('existing');
  const [clients, setClients]   = useState<ClientOption[]>([]);
  const [loading, setLoading]   = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [applying, setApplying] = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');

  // Close on Escape
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, handleKey]);

  // Fetch clients when modal opens
  useEffect(() => {
    if (!open) { setDone(false); setSelectedId(''); setError(''); setTab('existing'); return; }
    setLoading(true);
    fetch('/api/agency/clients')
      .then(r => r.json())
      .then(data => {
        setClients(Array.isArray(data) ? data : (data.clients ?? []));
        setLoading(false);
      })
      .catch(() => { setLoading(false); setError('Failed to load clients'); });
  }, [open]);

  async function handleApply() {
    if (!selectedId) return;
    setApplying(true);
    setError('');
    try {
      const res = await fetch('/api/agency/roles/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId:    selectedId,
          roleName:    role.name,
          roleTagline: role.tagline,
          roleSoulMd:  role.soulMd,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error || 'Failed to apply role');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setApplying(false);
    }
  }

  if (!open) return null;

  const selectedClient = clients.find(c => c.id === selectedId);
  const currentRole = selectedClient?.container_config?.role_name as string | undefined;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>{role.emoji}</span> Deploy {role.name}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{role.tagline}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Trait pills */}
          <div className="flex flex-wrap gap-1.5">
            {role.traits.map(t => (
              <Badge key={t} className={`text-[11px] ${colors.pill}`}>{t}</Badge>
            ))}
          </div>

          {/* Tab switcher */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setTab('existing')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors
                ${tab === 'existing' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              <UserCheck className="h-4 w-4" />
              Existing Client
            </button>
            <button
              onClick={() => setTab('new')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors
                ${tab === 'new' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              <UserPlus className="h-4 w-4" />
              New Client
            </button>
          </div>

          {/* ── Existing client tab ── */}
          {tab === 'existing' && (
            <div className="space-y-4">
              {done ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                  <div>
                    <p className="font-semibold text-gray-900">Role Applied! 🎉</p>
                    <p className="text-sm text-gray-500 mt-1">
                      <strong>{selectedClient?.name}</strong> is now running as{' '}
                      <strong>{role.name}</strong>. Business instructions and booking links
                      are preserved.
                    </p>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
                    <Button
                      size="sm"
                      onClick={() => { router.push(`/agency/clients/${selectedId}`); onClose(); }}
                    >
                      Open Client →
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                      Choose a client
                    </label>
                    {loading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading clients…
                      </div>
                    ) : clients.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">
                        No clients yet — use the &quot;New Client&quot; tab to create one.
                      </p>
                    ) : (
                      <select
                        value={selectedId}
                        onChange={e => setSelectedId(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select a client…</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.industry ? ` (${c.industry})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Current role indicator */}
                  {selectedClient && (
                    <div className={`rounded-lg border p-3 text-sm ${colors.bg}`}>
                      <p className={colors.text}>
                        {currentRole ? (
                          <>Currently: <strong>{currentRole}</strong> → will be replaced with <strong>{role.name}</strong></>
                        ) : (
                          <>No role set. <strong>{role.name}</strong> will be applied as the AI personality. Business instructions are preserved.</>
                        )}
                      </p>
                    </div>
                  )}

                  {error && (
                    <p className="text-sm text-red-500 rounded-lg bg-red-50 border border-red-100 px-3 py-2">{error}</p>
                  )}

                  <Button
                    className="w-full gap-2"
                    disabled={!selectedId || applying || loading}
                    onClick={handleApply}
                  >
                    {applying ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Applying role…</>
                    ) : (
                      <>Apply {role.name} <ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>

                  <p className="text-xs text-gray-400 text-center">
                    Business knowledge, instructions, and booking links are never overwritten.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── New client tab ── */}
          {tab === 'new' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Create a new client with <strong>{role.name}</strong> pre-configured as their
                AI personality from the start.
              </p>
              <Link href={`/agency/clients/new?role=${role.id}`} onClick={onClose}>
                <Button className="w-full gap-2">
                  <UserPlus className="h-4 w-4" />
                  Create New Client with this Role
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Card
// ─────────────────────────────────────────────────────────────────────────────
type Plan = 'free' | 'starter' | 'pro' | 'scale' | 'beta';

function RoleCard({
  role,
  plan,
  onDeploy,
}: {
  role: AgentRole;
  plan: Plan;
  onDeploy: (role: AgentRole) => void;
}) {
  const [showSoul, setShowSoul] = useState(false);
  const colors = colorMap[role.color] ?? colorMap.indigo;

  const isProductRole = PRODUCT_ROLE_IDS.includes(role.id as (typeof PRODUCT_ROLE_IDS)[number]);
  const isProOrScale = plan === 'pro' || plan === 'scale';

  return (
    <div className={`rounded-xl border border-gray-200 bg-white border-l-4 ${colors.border} overflow-hidden`}>
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-3xl">{role.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-gray-900 text-lg break-words">{role.name}</h3>
              {isProductRole && (
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    isProOrScale
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}
                >
                  {isProOrScale ? 'Included in Pro & Scale' : 'Upgrade to Pro/Scale to deploy'}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-gray-600 mt-0.5">{role.tagline}</p>
          </div>
        </div>

        <p className="text-sm text-gray-500 leading-relaxed mb-4">{role.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-xs text-gray-400 mr-1">Best for:</span>
          {role.bestFor.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-500"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {role.traits.map((trait) => (
            <Badge key={trait} className={`text-[11px] ${colors.pill}`}>
              {trait}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 gap-2 text-xs"
            onClick={() => onDeploy(role)}
            disabled={isProductRole && !isProOrScale}
          >
            {isProductRole && !isProOrScale ? 'Upgrade to Pro/Scale to deploy' : 'Deploy for Client'}
            <ArrowRight className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowSoul(!showSoul)}
          >
            {showSoul ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Preview SOUL
          </Button>
        </div>
      </div>

      {showSoul && (
        <div className="border-t border-gray-100 bg-gray-50 p-4">
          <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {role.soulMd}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export function RolesPageClient({ plan }: { plan: Plan }) {
  const [activeRole, setActiveRole] = useState<AgentRole | null>(null);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Agent Roles</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pre-configured AI personalities for any client. Pick a role, set the North Star, deploy in minutes.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Roles work with any industry template &mdash; they define HOW your AI thinks, not what it knows.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {agentRoles.map((role) => (
          <RoleCard key={role.id} role={role} plan={plan} onDeploy={setActiveRole} />
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-indigo-50/30 p-6">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Want a custom role?</h3>
            <p className="text-sm text-gray-500">
              Every AI worker can have a fully custom persona configured in their workspace files.
              Contact us to build a bespoke role for your agency.
            </p>
          </div>
        </div>
      </div>

      {/* Deploy Modal — rendered at page root for proper z-index */}
      {activeRole && (
        <DeployModal
          role={activeRole}
          open={!!activeRole}
          onClose={() => setActiveRole(null)}
        />
      )}
    </div>
  );
}
