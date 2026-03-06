'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Shield, ShieldAlert } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface PermissionToggle {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface PermissionsCardProps {
  clientId: string;
}

// ── Toggle Switch ────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
        ${checked ? 'bg-indigo-600' : 'bg-gray-200'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg
          ring-0 transition-transform duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PermissionsCard({ clientId }: PermissionsCardProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Simplified permission states
  const [canRespond, setCanRespond] = useState(false);
  const [canBook, setCanBook] = useState(false);
  const [canUpdatePipeline, setCanUpdatePipeline] = useState(false);
  const [canAccessContacts, setCanAccessContacts] = useState(false);
  const [monitorOnly, setMonitorOnly] = useState(false);

  // Fetch current permissions
  const fetchPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/permissions`);
      if (!res.ok) throw new Error('Failed to load permissions');
      const data = await res.json();
      const p = data.permissions;

      setCanRespond(p.ghl?.sendMessages ?? false);
      setCanBook(p.ghl?.writeCalendar ?? false);
      setCanUpdatePipeline(p.ghl?.writePipeline ?? false);
      setCanAccessContacts(p.ghl?.readContacts ?? false);
      setMonitorOnly(p.mode === 'readonly');
      setDirty(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // When monitor_only is toggled ON, disable everything else
  const handleMonitorOnlyChange = (val: boolean) => {
    setMonitorOnly(val);
    if (val) {
      setCanRespond(false);
      setCanBook(false);
      setCanUpdatePipeline(false);
      setCanAccessContacts(false);
    }
    setDirty(true);
    setSuccessMsg(null);
  };

  const handleToggle = (setter: (v: boolean) => void) => (val: boolean) => {
    setter(val);
    setDirty(true);
    setSuccessMsg(null);
  };

  // Save permissions via API
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    // Map simplified toggles back to the full permissions model
    const mode = monitorOnly ? 'readonly' : 'supervised';
    const payload = {
      mode,
      ghl: {
        readContacts: monitorOnly ? true : canAccessContacts,
        writeContacts: monitorOnly ? false : canUpdatePipeline, // write contacts follows pipeline
        readConversations: true, // always allowed
        sendMessages: monitorOnly ? false : canRespond,
        readPipeline: true, // always allowed
        writePipeline: monitorOnly ? false : canUpdatePipeline,
        readCalendar: true, // always allowed
        writeCalendar: monitorOnly ? false : canBook,
        triggerWorkflows: monitorOnly ? false : canRespond, // follows respond
      },
      ai: {
        proactiveMessaging: monitorOnly ? false : canRespond,
        webSearch: !monitorOnly,
        maxResponseLength: 0,
        requireApproval: monitorOnly,
      },
    };

    try {
      const res = await fetch(`/api/agency/clients/${clientId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Failed to save permissions');
      }

      setSuccessMsg('Permissions saved!');
      setDirty(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const permissions: PermissionToggle[] = [
    {
      key: 'can_respond',
      label: 'Send Responses',
      description: 'AI can send messages and respond to leads via SMS, email, or WhatsApp',
      enabled: canRespond,
    },
    {
      key: 'can_book',
      label: 'Book Appointments',
      description: 'AI can check calendar availability and book appointments for leads',
      enabled: canBook,
    },
    {
      key: 'can_update_pipeline',
      label: 'Update Pipeline',
      description: 'AI can move contacts through pipeline stages and update deal status',
      enabled: canUpdatePipeline,
    },
    {
      key: 'can_access_contacts',
      label: 'Access Contacts',
      description: 'AI can read contact details including name, email, phone, and tags',
      enabled: canAccessContacts,
    },
  ];

  const toggleSetters: Record<string, (v: boolean) => void> = {
    can_respond: setCanRespond,
    can_book: setCanBook,
    can_update_pipeline: setCanUpdatePipeline,
    can_access_contacts: setCanAccessContacts,
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            AI Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-400">Loading permissions…</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              AI Permissions
            </CardTitle>
            <CardDescription>
              Control what actions this client&apos;s AI can take
            </CardDescription>
          </div>
          {monitorOnly && (
            <Badge className="border-yellow-200 bg-yellow-50 text-yellow-600">
              Monitor Only
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-md border border-green-500/30 bg-green-50 px-4 py-3 text-sm text-green-600">
            {successMsg}
          </div>
        )}

        {/* Monitor Only — special toggle at the top */}
        <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Monitor Only</p>
                <p className="text-sm text-gray-500">
                  AI only observes conversations — never sends messages or takes any actions
                </p>
              </div>
            </div>
            <Toggle checked={monitorOnly} onChange={handleMonitorOnlyChange} />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Permission toggles */}
        <div className="space-y-1">
          {permissions.map((perm) => (
            <div
              key={perm.key}
              className={`flex items-center justify-between rounded-lg px-4 py-3 transition-colors ${
                monitorOnly ? 'opacity-50' : 'hover:bg-gray-50'
              }`}
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{perm.label}</p>
                <p className="text-sm text-gray-500">{perm.description}</p>
              </div>
              <Toggle
                checked={perm.enabled}
                onChange={handleToggle(toggleSetters[perm.key])}
                disabled={monitorOnly}
              />
            </div>
          ))}
        </div>

        {/* Save button */}
        <div className="border-t border-gray-200 pt-4">
          <Button onClick={handleSave} disabled={saving || !dirty} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Permissions
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
