'use client';

import { useState } from 'react';
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
  ImageIcon,
  Palette,
  Globe,
  Zap,
} from 'lucide-react';
import type { Agency, AgencyMember, AgencyRole, AgencySettings } from '@/lib/agency/types';
import { BrandingPreview } from './branding-preview';

// ---------- Role helpers ----------

const roleConfig: Record<AgencyRole, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: 'Owner', icon: Crown, color: 'border-amber-200 bg-amber-50 text-amber-600' },
  admin: { label: 'Admin', icon: Shield, color: 'border-indigo-200 bg-indigo-50 text-indigo-600' },
  member: { label: 'Member', icon: User, color: 'border-gray-500/50 bg-gray-500/10 text-gray-500' },
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
  const isPremium = true; // All features unlocked during beta

  // --- General settings ---
  const [name, setName] = useState(agency.name);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- White-label / branding settings ---
  const settings = (agency.settings ?? {}) as AgencySettings;
  const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? '');
  const [primaryColor, setPrimaryColor] = useState(settings.primary_color ?? '#8b5cf6');
  const [accentColor, setAccentColor] = useState(settings.accent_color ?? '#6366f1');
  const [companyName, setCompanyName] = useState(settings.company_name ?? '');
  const [customDomain, setCustomDomain] = useState(settings.custom_domain ?? '');
  const [supportEmail, setSupportEmail] = useState(settings.support_email ?? '');
  const [escalationEmail, setEscalationEmail] = useState((settings as any).escalation_email ?? '');
  const [escalationWebhookUrl, setEscalationWebhookUrl] = useState((settings as any).escalation_webhook_url ?? '');
  const [ghlWebhookUrl, setGhlWebhookUrl] = useState((settings as any).ghl_webhook_url ?? '');
  const [logoError, setLogoError] = useState(false);

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
            accent_color: accentColor.trim() || undefined,
            company_name: companyName.trim() || undefined,
            custom_domain: customDomain.trim() || undefined,
            support_email: supportEmail.trim() || undefined,
              escalation_email: escalationEmail.trim() || undefined,
              escalation_webhook_url: escalationWebhookUrl.trim() || undefined,
            ghl_webhook_url: ghlWebhookUrl.trim() || undefined,
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
            <label className="text-sm font-medium text-gray-700">Agency Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin}
              className="bg-gray-100 border-gray-200 max-w-md"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Slug</label>
            <Input
              value={agency.slug}
              disabled
              className="bg-gray-100 border-gray-200 font-mono text-xs text-gray-400 max-w-md"
            />
            <p className="text-xs text-gray-400">Slug cannot be changed after creation.</p>
          </div>

          {isAdmin && (
            <div className="pt-2">
              {saveError && (
                <div className="rounded-md bg-red-50 border border-red-500/30 px-4 py-2.5 text-sm text-red-600 mb-3">
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div className="rounded-md bg-green-50 border border-green-500/30 px-4 py-2.5 text-sm text-green-600 mb-3">
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

      {/* Branding Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-500" />
              Branding
            </CardTitle>
            {!isPremium && (
              <Badge className="border-indigo-200 bg-indigo-50 text-indigo-600 text-[10px]">
                Pro / Scale
              </Badge>
            )}
          </div>
          <CardDescription>
            {isPremium
              ? 'Customize the branding your clients see — logo, colors, and company name replace Kyra branding throughout the platform.'
              : 'Upgrade to Pro or Scale to white-label the platform with your own branding.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column — form fields */}
            <div className="space-y-5">
              {/* Logo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Logo</label>
                <div className="flex items-start gap-4">
                  {/* Logo preview */}
                  <div className="h-16 w-16 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                    {logoUrl && !logoError ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl}
                        alt="Agency logo"
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
                      onChange={(e) => {
                        setLogoUrl(e.target.value);
                        setLogoError(false);
                      }}
                      placeholder="https://example.com/logo.png"
                      disabled={!isPremium || !isAdmin}
                      className="bg-gray-100 border-gray-200"
                    />
                    <p className="text-xs text-gray-400">
                      Enter a URL to your logo image. Recommended: square, at least 128×128px.
                    </p>
                  </div>
                </div>
              </div>

              {/* Company name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Company Name</label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Brand Name"
                  disabled={!isPremium || !isAdmin}
                  className="bg-gray-100 border-gray-200"
                />
                <p className="text-xs text-gray-400">
                  Replaces &quot;Kyra&quot; branding in the client-facing dashboard.
                </p>
              </div>

              {/* Primary color */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor || '#8b5cf6'}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    disabled={!isPremium || !isAdmin}
                    className="h-9 w-9 rounded-md border border-gray-200 cursor-pointer shrink-0 p-0.5 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#8b5cf6"
                    disabled={!isPremium || !isAdmin}
                    className="bg-gray-100 border-gray-200 font-mono text-sm flex-1"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Used for the sidebar, navigation highlights, and primary buttons.
                </p>
              </div>

              {/* Accent color */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor || '#6366f1'}
                    onChange={(e) => setAccentColor(e.target.value)}
                    disabled={!isPremium || !isAdmin}
                    className="h-9 w-9 rounded-md border border-gray-200 cursor-pointer shrink-0 p-0.5 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#6366f1"
                    disabled={!isPremium || !isAdmin}
                    className="bg-gray-100 border-gray-200 font-mono text-sm flex-1"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Used for chat bubbles, links, and interactive elements.
                </p>
              </div>

              {/* Support email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Support Email</label>
                <Input
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@youragency.com"
                  disabled={!isPremium || !isAdmin}
                  className="bg-gray-100 border-gray-200"
                />
              </div>

              {/* Escalation alert email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  🚨 Escalation Alert Email
                </label>
                <Input
                  value={escalationEmail}
                  onChange={(e) => setEscalationEmail(e.target.value)}
                  placeholder="you@youragency.com"
                  disabled={!isAdmin}
                  className="bg-gray-100 border-gray-200"
                />
                <p className="text-xs text-gray-400">
                  When Kyra AI can't resolve a customer issue, you'll get an instant email alert so no lead slips through the cracks.
                </p>
              </div>

              {/* Escalation webhook */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  🔔 Escalation Webhook URL
                </label>
                <Input
                  value={escalationWebhookUrl}
                  onChange={(e) => setEscalationWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/... or https://discord.com/api/webhooks/..."
                  disabled={!isAdmin}
                  className="bg-gray-100 border-gray-200 font-mono text-xs"
                />
                <p className="text-xs text-gray-400">
                  Slack, Discord, Zapier, or Make webhook. Fires instantly when Kyra escalates a customer to your team. Slack format supported natively.
                </p>
              </div>

              {/* Custom domain */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  Custom Domain
                </label>
                <Input
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="ai.youragency.com"
                  disabled={!isPremium || !isAdmin}
                  className="bg-gray-100 border-gray-200"
                />
                <p className="text-xs text-gray-400">
                  Point your domain to Kyra via CNAME. DNS configuration is handled separately —{' '}
                  <span className="text-indigo-500">see docs</span>.
                </p>
              </div>

              {/* Save button */}
              {isPremium && isAdmin && (
                <div className="pt-2">
                  {saveError && (
                    <div className="rounded-md bg-red-50 border border-red-500/30 px-4 py-2.5 text-sm text-red-600 mb-3">
                      {saveError}
                    </div>
                  )}
                  {saveSuccess && (
                    <div className="rounded-md bg-green-50 border border-green-500/30 px-4 py-2.5 text-sm text-green-600 mb-3">
                      Branding saved successfully.
                    </div>
                  )}
                  <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Branding
                  </Button>
                </div>
              )}
            </div>

            {/* Right column — live preview */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Preview</label>
              <BrandingPreview
                logoUrl={logoUrl}
                companyName={companyName}
                primaryColor={primaryColor}
                accentColor={accentColor}
              />
              <p className="text-xs text-gray-400 text-center">
                This preview updates live as you change settings.
              </p>
            </div>
          </div>
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
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {(member.user?.email?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.user?.email ?? 'Unknown user'}
                      </p>
                      <p className="text-xs text-gray-400">
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
                        className="text-gray-400 hover:text-red-600 transition-colors p-1"
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
            <form onSubmit={handleInvite} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Invite New Member</p>
              {inviteError && (
                <div className="rounded-md bg-red-50 border border-red-500/30 px-3 py-2 text-sm text-red-600 mb-3">
                  {inviteError}
                </div>
              )}
              {inviteSuccess && (
                <div className="rounded-md bg-green-50 border border-green-500/30 px-3 py-2 text-sm text-green-600 mb-3">
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
                  className="bg-gray-100 border-gray-200 flex-1"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-900"
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

      {/* GHL Webhook Integration */}
      <Card className="border-indigo-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-500" />
            GHL Workflow Trigger
          </CardTitle>
          <CardDescription>
            Fire a GoHighLevel workflow automatically whenever your AI employee handles a conversation.
            Add a webhook trigger URL from any GHL workflow — Kyra will POST conversation data to it in real time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Webhook URL</label>
            <Input
              value={ghlWebhookUrl}
              onChange={e => setGhlWebhookUrl(e.target.value)}
              placeholder="https://services.leadconnectorhq.com/hooks/..."
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-400">
              In GHL: Automation → Create Workflow → Add Trigger → Webhook → Copy URL → paste here.
            </p>
          </div>
          {ghlWebhookUrl && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-xs text-indigo-700 space-y-1">
              <p className="font-semibold">Kyra will send this payload on each conversation:</p>
              <pre className="text-[10px] leading-relaxed whitespace-pre">{`{
  "event": "conversation",
  "client_name": "ABC Dental",
  "client_id": "uuid",
  "channel": "portal | telegram | sms",
  "user_message": "...",
  "ai_response": "...",
  "timestamp": "2026-02-21T19:00:00Z"
}`}</pre>
            </div>
          )}
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save Webhook URL'}
          </Button>
          {saveSuccess && <p className="text-sm text-green-600">✓ Webhook URL saved</p>}
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isOwner && (
        <Card className="border-red-500/20">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions. Please be careful.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="border-red-500/30 text-red-600 hover:bg-red-50 hover:text-red-600 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Agency
              </Button>
            ) : (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                <p className="text-sm text-red-600 mb-3">
                  Type <span className="font-mono font-bold">{agency.slug}</span> to confirm
                  deletion. This will permanently remove your agency, all clients, and all data.
                </p>
                <div className="flex gap-3">
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={agency.slug}
                    className="bg-white border-red-500/30 font-mono text-sm max-w-xs"
                  />
                  <Button
                    variant="outline"
                    disabled={deleteConfirmText !== agency.slug}
                    className="border-red-200 text-red-600 hover:bg-red-50 gap-2 shrink-0"
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
