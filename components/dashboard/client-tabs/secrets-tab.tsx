'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AlertTriangle, Check, Copy, Eye, EyeOff, Key, Plus, Shield, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface SecretRow {
  id: string;
  key_name: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface FormState {
  keyName: string;
  value: string;
  description: string;
}

const SECRET_KEY_REGEX = /^[A-Z][A-Z0-9_]*$/;
const MASKED_VALUE = '••••••••••••';

export default function SecretsTab({ clientId }: { clientId: string }) {
  const [secrets, setSecrets] = useState<SecretRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSecret, setEditingSecret] = useState<SecretRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    keyName: '',
    value: '',
    description: '',
  });

  const isEditing = !!editingSecret;

  const canSubmit = useMemo(() => {
    if (saving) return false;
    if (!isEditing) {
      return SECRET_KEY_REGEX.test(form.keyName.trim()) && form.value.trim().length > 0;
    }

    const descriptionChanged = form.description !== (editingSecret?.description ?? '');
    const hasNewValue = form.value.trim().length > 0;
    return descriptionChanged || hasNewValue;
  }, [saving, isEditing, form, editingSecret]);

  const fetchSecrets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/agency/clients/${clientId}/secrets`, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load secrets');
      }

      setSecrets((data.secrets ?? []) as SecretRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load secrets');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchSecrets();
  }, [fetchSecrets]);

  const openAddModal = () => {
    setEditingSecret(null);
    setForm({ keyName: '', value: '', description: '' });
    setShowValue(false);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (secret: SecretRow) => {
    setEditingSecret(secret);
    setForm({
      keyName: secret.key_name,
      value: '',
      description: secret.description ?? '',
    });
    setShowValue(false);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingSecret(null);
    setFormError(null);
    setShowValue(false);
  };

  const handleSave = async () => {
    setFormError(null);

    if (!isEditing) {
      if (!SECRET_KEY_REGEX.test(form.keyName.trim())) {
        setFormError('Key name must match format: GITHUB_TOKEN');
        return;
      }
      if (form.value.trim().length === 0) {
        setFormError('Value is required');
        return;
      }
    }

    setSaving(true);

    try {
      if (isEditing && editingSecret) {
        const payload: { value?: string; description?: string } = {};

        if (form.value.trim().length > 0) {
          payload.value = form.value;
        }

        if (form.description !== (editingSecret.description ?? '')) {
          payload.description = form.description;
        }

        if (!payload.value && typeof payload.description === 'undefined') {
          setFormError('No changes to save');
          setSaving(false);
          return;
        }

        const res = await fetch(
          `/api/agency/clients/${clientId}/secrets/${editingSecret.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update secret');
        }
      } else {
        const res = await fetch(`/api/agency/clients/${clientId}/secrets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key_name: form.keyName.trim().toUpperCase(),
            value: form.value,
            description: form.description || undefined,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Failed to create secret');
        }
      }

      closeModal();
      await fetchSecrets();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save secret');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (secret: SecretRow) => {
    const ok = window.confirm(`Delete ${secret.key_name}? This cannot be undone.`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/agency/clients/${clientId}/secrets/${secret.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete secret');
      }

      await fetchSecrets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete secret');
    }
  };

  const handleCopy = async (keyName: string) => {
    try {
      await navigator.clipboard.writeText(keyName);
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // ignore clipboard failures
    }
  };

  const maskedTextareaStyle = showValue
    ? undefined
    : ({ WebkitTextSecurity: 'disc' } as CSSProperties);

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-indigo-600 mt-0.5" />
          <p className="text-sm text-gray-600 leading-relaxed">
            <span className="font-semibold text-gray-900">Secrets are encrypted with AES-256</span>{' '}
            and never stored in plain text. Your AI agent can access them securely at runtime via the Secrets API.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="rounded-xl shadow-sm border bg-white p-5 flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Shield className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Secrets Vault</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Securely store API keys and tokens for this client&apos;s AI agent
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Secret
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-xl shadow-sm border bg-white p-8 flex items-center justify-center gap-3 text-gray-600 text-sm">
          <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-indigo-600 animate-spin" />
          Loading secrets...
        </div>
      )}

      {/* Empty state */}
      {!loading && secrets.length === 0 && (
        <div className="rounded-xl shadow-sm border bg-white p-10 text-center">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Key className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No secrets stored</h3>
          <p className="text-sm text-gray-600 mt-1 max-w-lg mx-auto">
            Add your first secret to give the AI agent secure access to external services
          </p>
        </div>
      )}

      {/* Secrets list */}
      {!loading && secrets.length > 0 && (
        <div className="rounded-xl shadow-sm border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Key Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Value</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {secrets.map((secret) => (
                  <tr key={secret.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-gray-50 px-2 py-1 text-xs font-mono text-gray-900 border border-gray-200">
                          {secret.key_name}
                        </code>
                        <button
                          type="button"
                          onClick={() => handleCopy(secret.key_name)}
                          className="inline-flex items-center justify-center rounded-md border border-gray-200 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                          aria-label={`Copy ${secret.key_name}`}
                        >
                          {copiedKey === secret.key_name ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{MASKED_VALUE}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {secret.description?.trim() || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(secret.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(secret)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          <Key className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(secret)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeModal}>
          <div
            className="w-full max-w-2xl rounded-xl shadow-sm border bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                {isEditing ? 'Edit Secret' : 'Add Secret'}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Key Name</label>
                <Input
                  value={form.keyName}
                  disabled={isEditing}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      keyName: event.target.value.toUpperCase().replace(/\s+/g, '_'),
                    }))
                  }
                  placeholder="GITHUB_TOKEN"
                  className="font-mono bg-gray-50"
                />
                {!isEditing && form.keyName.length > 0 && !SECRET_KEY_REGEX.test(form.keyName.trim()) && (
                  <p className="text-xs text-red-600">Use uppercase letters, numbers, and underscores only.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Value</label>
                  <button
                    type="button"
                    onClick={() => setShowValue((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    {showValue ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showValue ? 'Hide' : 'Show'}
                  </button>
                </div>

                <Textarea
                  value={form.value}
                  onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
                  placeholder={isEditing ? 'Leave blank to keep current value' : 'Paste API key or token'}
                  rows={4}
                  className="bg-gray-50 font-mono"
                  style={maskedTextareaStyle}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Description (optional)</label>
                <Input
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="What this secret is used for"
                  className="bg-gray-50"
                />
              </div>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSubmit}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
