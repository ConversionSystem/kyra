'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Save,
  Loader2,
  Trash2,
  UserPlus,
  Crown,
  Shield,
  User,
} from 'lucide-react';
import type { Agency, AgencyMember, AgencyRole, AgencySettings } from '@/lib/agency/types';

// ---------- Role helpers ----------

const roleConfig: Record<AgencyRole, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: 'Owner', icon: Crown, color: 'border-amber-500/50 bg-amber-500/10 text-amber-400' },
  admin: { label: 'Admin', icon: Shield, color: 'border-violet-500/50 bg-violet-500/10 text-violet-400' },
  member: { label: 'Member', icon: User, color: 'border-zinc-500/50 bg-zinc-500/10 text-zinc-400' },
};

// ---------- Types ----------

interface MemberWithUser extends AgencyMember {
  user: { email: string; id: string } | null;
}

interface SettingsFormProps {
  agency: Agency;
  currentRole: AgencyRole;
  members: MemberWithUser[];
}

// ============================================================================
// Settings Form (client component)
// ============================================================================

export function SettingsForm({ agency, currentRole, members: initialMembers }: SettingsFormProps) {
  const router = useRouter();
  const isAdmin = currentRole === 'owner' || currentRole === 'admin';
  const isOwner = currentRole === 'owner';
  const isPremium = agency.plan === 'pro' || agency.plan === 'scale';

  // --- General settings ---
  const [name, setName] = useState(agency.name);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- White-label settings ---
  const settings = (agency.settings ?? {}) as AgencySettings;
  const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? '');
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color ?? '#8b5cf6');
  const [companyName, setCompanyName] = useState(settings.company_name ?? '');
  const [supportEmail, setSupportEmail] = useState(settings.support_email ?? '');

  // --- Invite form ---
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // --- Members ---
  const [members, setMembers] = useState(initialMembers);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // --- Delete agency ---
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // ======== Save settings ========
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/agency/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          settings: {
            logo_url: logoUrl.trim() || undefined,
            primary_color: primaryColor.trim() || undefined,
            company_name: companyName.trim() || undefined,
            support_email: supportEmail.trim() || undefined,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to save settings');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      router.refresh();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // ======== Invite member ========
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    try {
      const res = await fetch('/api/agency/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to invite member');
      }

      setInviteEmail('');
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
      router.refresh();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  // ======== Remove member ========
  const handleRemoveMember = async (memberId: string) => {
    setRemovingId(memberId);
    try {
      const res = await fetch(`/api/agency/members?id=${memberId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to remove member');
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      // silently fail for now
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic agency information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Agency Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin}
              className="bg-zinc-800 border-zinc-700 max-w-md"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Slug</label>
            <Input
              value={agency.slug}
              disabled
              className="bg-zinc-800/50 border-zinc-700 font-mono text-xs text-zinc-500 max-w-md"
            />
            <p className="text-xs text-zinc-500">Slug cannot be changed after creation.</p>
          </div>

          {isAdmin && (
            <div className="pt-2">
              {saveError && (
                <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-sm text-red-400 mb-3">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="rounded-md bg-green-500/10 border border-green-500/30 px-4 py-2.5 text-sm text-green-400 mb-3">
                  Settings saved successfully.
                </div>
              )}
              <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* White-label Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle>White-label Settings</CardTitle>
            {!isPremium && (
              <Badge className="border-violet-500/50 bg-violet-500/10 text-violet-400 text-[10px]">
                Pro / Scale
              </Badge>
            )}
          </div>
          <CardDescription>
            {isPremium
              ? 'Customize the branding your clients see'
              : 'Upgrade to Pro or Scale to customize branding for your clients'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Logo URL</label>
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              disabled={!isPremium || !isAdmin}
              className="bg-zinc-800 border-zinc-700 max-w-md"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Primary Color</label>
            <div className="flex items-center gap-3 max-w-md">
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#8b5cf6"
                disabled={!isPremium || !isAdmin}
                className="bg-zinc-800 border-zinc-700 font-mono text-sm flex-1"
              />
              <div
                className="h-9 w-9 rounded-md border border-zinc-700 shrink-0"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Company Name Override</label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Brand Name"
              disabled={!isPremium || !isAdmin}
              className="bg-zinc-800 border-zinc-700 max-w-md"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Support Email</label>
            <Input
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@example.com"
              disabled={!isPremium || !isAdmin}
              className="bg-zinc-800 border-zinc-700 max-w-md"
            />
          </div>

          {isPremium && isAdmin && (
            <div className="pt-2">
              <Button onClick={handleSave} disabled={saving || !name.trim()} variant="outline" className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save White-label
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? 's' : ''} in your agency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-6">
            {members.map((member) => {
              const config = roleConfig[member.role as AgencyRole] ?? roleConfig.member;
              const RoleIcon = config.icon;
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/30 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-semibold text-zinc-300">
                      {(member.user?.email?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-100">
                        {member.user?.email ?? 'Unknown user'}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Joined {new Date(member.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
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
                        className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                        title="Remove member"
                      >
                        {removingId === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Invite form */}
          {isAdmin && (
            <form onSubmit={handleInvite} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-sm font-medium text-zinc-300 mb-3">Invite New Member</p>
              {inviteError && (
                <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400 mb-3">
                  {inviteError}
                </div>
              )}
              {inviteSuccess && (
                <div className="rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-400 mb-3">
                  Invitation sent successfully.
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="bg-zinc-800 border-zinc-700 flex-1"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <Button type="submit" disabled={inviting || !inviteEmail.trim()} className="gap-2 shrink-0">
                  {inviting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Invite
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isOwner && (
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-400">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions. Please be careful.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Agency
              </Button>
            ) : (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                <p className="text-sm text-red-300 mb-3">
                  Type <span className="font-mono font-bold">{agency.slug}</span> to confirm
                  deletion. This will permanently remove your agency, all clients, and all data.
                </p>
                <div className="flex gap-3">
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={agency.slug}
                    className="bg-zinc-900 border-red-500/30 font-mono text-sm max-w-xs"
                  />
                  <Button
                    variant="outline"
                    disabled={deleteConfirmText !== agency.slug}
                    className="border-red-500/50 text-red-400 hover:bg-red-500/20 gap-2 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                    Confirm Delete
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
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
