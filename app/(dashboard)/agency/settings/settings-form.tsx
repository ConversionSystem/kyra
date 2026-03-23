'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Save, Loader2, Trash2, UserPlus, Crown, Shield, User,
  ImageIcon, Palette, CheckCircle2, AlertTriangle, X, Zap,
} from 'lucide-react';
import type { Agency, AgencyMember, AgencyRole, AgencySettings } from '@/lib/agency/types';
import { BrandingPreview } from './branding-preview';

// ── Role config ────────────────────────────────────────────────────────────────

const roleConfig: Record<AgencyRole, { label: string; icon: typeof Crown; color: string }> = {
  owner:  { label: 'Owner',  icon: Crown,  color: 'border-amber-200 bg-amber-50 text-amber-600' },
  admin:  { label: 'Admin',  icon: Shield, color: 'border-indigo-200 bg-indigo-50 text-indigo-600' },
  member: { label: 'Member', icon: User,   color: 'border-gray-500/50 bg-gray-500/10 text-gray-500' },
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface MemberWithUser extends AgencyMember {
  user: { email: string; id: string } | null;
}

interface SettingsFormProps {
  agency: Agency;
  currentRole: AgencyRole;
  members: MemberWithUser[];
}

// ── Message component ──────────────────────────────────────────────────────────

function StatusMessage({ type, text, onDismiss }: { type: 'ok' | 'err'; text: string; onDismiss?: () => void }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium ${
      type === 'ok'
        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
        : 'bg-red-50 border border-red-200 text-red-700'
    }`}>
      {type === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
      <span className="flex-1">{text}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 hover:opacity-70">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Settings Form
// ============================================================================

export function SettingsForm({ agency, currentRole, members: initialMembers }: SettingsFormProps) {
  const router = useRouter();
  const isAdmin = currentRole === 'owner' || currentRole === 'admin';
  const isOwner = currentRole === 'owner';

  // ── General ────────────────────────────────────────────────────────────────
  const [name, setName] = useState(agency.name);

  // ── Branding ───────────────────────────────────────────────────────────────
  const settings = (agency.settings ?? {}) as AgencySettings;
  const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? '');
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color ?? '#8b5cf6');
  const [accentColor, setAccentColor] = useState(settings.accent_color ?? '#6366f1');
  const [companyName, setCompanyName] = useState(settings.company_name ?? '');
  const [supportEmail, setSupportEmail] = useState(settings.support_email ?? '');
  const [logoError, setLogoError] = useState(false);
  const [showPoweredBy, setShowPoweredBy] = useState(settings.show_powered_by !== false);
  const canTogglePoweredBy = agency.plan === 'pro' || agency.plan === 'scale';

  // ── Save state ─────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── Team ───────────────────────────────────────────────────────────────────
  const [members, setMembers] = useState(initialMembers);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeMsg, setRemoveMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ════════════════════════════════════════════════════════════════════════════
  // Save all settings
  // ════════════════════════════════════════════════════════════════════════════
  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/agency/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          settings: {
            logo_url: logoUrl.trim() || undefined,
            primary_color: primaryColor.trim() || undefined,
            accent_color: accentColor.trim() || undefined,
            company_name: companyName.trim() || undefined,
            support_email: supportEmail.trim() || undefined,
            show_powered_by: showPoweredBy,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      setSaveMsg({ type: 'ok', text: 'Settings saved successfully.' });
      setTimeout(() => setSaveMsg(null), 4000);
      router.refresh();
    } catch (err: unknown) {
      setSaveMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // Invite member
  // ════════════════════════════════════════════════════════════════════════════
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      const res = await fetch('/api/agency/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      setInviteEmail('');
      setInviteMsg({ type: 'ok', text: 'Member invited successfully.' });
      setTimeout(() => setInviteMsg(null), 4000);
      router.refresh();
    } catch (err: unknown) {
      setInviteMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed to invite member' });
    } finally {
      setInviting(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // Remove member
  // ════════════════════════════════════════════════════════════════════════════
  const handleRemoveMember = async (memberId: string) => {
    setRemovingId(memberId);
    setRemoveMsg(null);
    try {
      const res = await fetch(`/api/agency/members?id=${memberId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      setMembers(prev => prev.filter(m => m.id !== memberId));
      setRemoveMsg({ type: 'ok', text: 'Member removed.' });
      setTimeout(() => setRemoveMsg(null), 3000);
    } catch (err: unknown) {
      setRemoveMsg({ type: 'err', text: err instanceof Error ? err.message : 'Failed to remove member' });
    } finally {
      setRemovingId(null);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // Delete agency
  // ════════════════════════════════════════════════════════════════════════════
  const handleDeleteAgency = async () => {
    if (deleteConfirmText !== agency.slug) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/agency/settings', { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      window.location.href = '/';
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete agency');
    } finally {
      setDeleting(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // Render
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8">

      {/* ── Save message (sticky top) ─────────────────────────────────────── */}
      {saveMsg && (
        <StatusMessage
          type={saveMsg.type}
          text={saveMsg.text}
          onDismiss={saveMsg.type === 'err' ? () => setSaveMsg(null) : undefined}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          GENERAL
          ══════════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Your account name and identifier</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Account Name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!isAdmin}
              className="max-w-md"
              placeholder="Your business name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Slug</label>
            <Input
              value={agency.slug}
              disabled
              className="max-w-md font-mono text-xs text-gray-400"
            />
            <p className="text-xs text-gray-400">Slug cannot be changed after creation.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Support Email</label>
            <Input
              value={supportEmail}
              onChange={e => setSupportEmail(e.target.value)}
              disabled={!isAdmin}
              placeholder="support@yourbusiness.com"
              className="max-w-md"
            />
            <p className="text-xs text-gray-400">Shown to your clients when they need help.</p>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          BRANDING
          ══════════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-500" />
              Branding
            </CardTitle>
          </div>
          <CardDescription>
            Customize the look your clients see — logo, colors, and company name replace Kyra branding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left — fields */}
            <div className="space-y-5">
              {/* Logo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Logo</label>
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                    {logoUrl && !logoError ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-full w-full object-contain p-1"
                        onError={() => setLogoError(true)}
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={logoUrl}
                      onChange={e => { setLogoUrl(e.target.value); setLogoError(false); }}
                      placeholder="https://example.com/logo.png"
                      disabled={!isAdmin}
                    />
                    <p className="text-xs text-gray-400">Square image, at least 128×128px.</p>
                  </div>
                </div>
              </div>

              {/* Company name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Company Name</label>
                <Input
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Your Brand Name"
                  disabled={!isAdmin}
                />
                <p className="text-xs text-gray-400">Replaces &quot;Kyra&quot; branding in client-facing areas.</p>
              </div>

              {/* Primary color */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor || '#8b5cf6'}
                    onChange={e => setPrimaryColor(e.target.value)}
                    disabled={!isAdmin}
                    className="h-9 w-9 rounded-md border border-gray-200 cursor-pointer shrink-0 p-0.5 bg-white disabled:opacity-50"
                  />
                  <Input
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    placeholder="#8b5cf6"
                    disabled={!isAdmin}
                    className="font-mono text-sm flex-1"
                  />
                </div>
                <p className="text-xs text-gray-400">Sidebar, navigation, and primary buttons.</p>
              </div>

              {/* Accent color */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor || '#6366f1'}
                    onChange={e => setAccentColor(e.target.value)}
                    disabled={!isAdmin}
                    className="h-9 w-9 rounded-md border border-gray-200 cursor-pointer shrink-0 p-0.5 bg-white disabled:opacity-50"
                  />
                  <Input
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    placeholder="#6366f1"
                    disabled={!isAdmin}
                    className="font-mono text-sm flex-1"
                  />
                </div>
                <p className="text-xs text-gray-400">Chat bubbles, links, and interactive elements.</p>
              </div>
            </div>

            {/* Right — live preview */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Preview</label>
              <BrandingPreview
                logoUrl={logoUrl}
                companyName={companyName}
                primaryColor={primaryColor}
                accentColor={accentColor}
              />
              <p className="text-xs text-gray-400 text-center">Updates live as you change settings.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          POWERED BY KYRA BADGE
          ══════════════════════════════════════════════════════════════════════ */}
      {canTogglePoweredBy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-indigo-500" />
              Powered by Kyra Badge
            </CardTitle>
            <CardDescription>
              Control whether the &quot;Powered by Kyra&quot; badge appears on your clients&apos; chat widgets.
              Keeping it on helps grow the platform and supports other agencies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Show &quot;Powered by Kyra&quot; badge</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {showPoweredBy ? 'Badge is visible on all chat widgets' : 'Badge is hidden — white-label mode'}
                </p>
              </div>
              <button
                onClick={() => setShowPoweredBy(!showPoweredBy)}
                disabled={!isAdmin}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                  showPoweredBy ? 'bg-indigo-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showPoweredBy ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Save button ───────────────────────────────────────────────────── */}
      {isAdmin && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All Settings
          </Button>
          {saveMsg && (
            <span className={`text-sm font-medium ${saveMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
              {saveMsg.type === 'ok' ? '✓' : '✗'} {saveMsg.text}
            </span>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TEAM MEMBERS
          ══════════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? 's' : ''} in your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Messages */}
          {removeMsg && (
            <div className="mb-3">
              <StatusMessage
                type={removeMsg.type}
                text={removeMsg.text}
                onDismiss={removeMsg.type === 'err' ? () => setRemoveMsg(null) : undefined}
              />
            </div>
          )}

          {/* Member list */}
          <div className="space-y-3 mb-6">
            {members.map(member => {
              const config = roleConfig[member.role as AgencyRole] ?? roleConfig.member;
              const RoleIcon = config.icon;
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.user?.email ?? 'Unknown user'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Joined {new Date(member.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={config.color}>
                      <RoleIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                    {isAdmin && member.role !== 'owner' && member.user_id !== agency.owner_id && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingId === member.id}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        title="Remove member"
                      >
                        {removingId === member.id
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Invite form */}
          {isAdmin && (
            <form onSubmit={handleInvite} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Invite New Member</p>
              {inviteMsg && (
                <div className="mb-3">
                  <StatusMessage
                    type={inviteMsg.type}
                    text={inviteMsg.text}
                    onDismiss={inviteMsg.type === 'err' ? () => setInviteMsg(null) : undefined}
                  />
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="flex-1"
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <Button type="submit" disabled={inviting || !inviteEmail.trim()} className="gap-2 shrink-0">
                  {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Invite
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          DANGER ZONE
          ══════════════════════════════════════════════════════════════════════ */}
      {isOwner && (
        <Card className="border-red-200/50">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions. Please be careful.</CardDescription>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="border-red-200 text-red-600 hover:bg-red-50 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-3">
                <p className="text-sm text-red-600">
                  Type <span className="font-mono font-bold">{agency.slug}</span> to confirm.
                  This permanently deletes your account, all clients, AI workers, and data.
                </p>
                {deleteError && (
                  <StatusMessage type="err" text={deleteError} onDismiss={() => setDeleteError(null)} />
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder={agency.slug}
                    className="font-mono text-sm max-w-xs"
                  />
                  <Button
                    variant="outline"
                    onClick={handleDeleteAgency}
                    disabled={deleteConfirmText !== agency.slug || deleting}
                    className="border-red-200 text-red-600 hover:bg-red-50 gap-2 shrink-0"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {deleting ? 'Deleting…' : 'Confirm Delete'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); setDeleteError(null); }}
                    className="shrink-0"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
