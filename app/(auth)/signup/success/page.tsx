// /signup/success — Post-signup referral viral screen
// Dark public page (Kyra brand: bg-[#0a0a0f])
// Shows referral link, early bird countdown, share templates
// Sent here after both solo and agency signup

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Zap, Gift, Users } from 'lucide-react';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { EarlyBirdCountdown } from './countdown';
import { CopyButton, CopyTextarea } from './copy-button';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ agencyId?: string; next?: string }> };

function generateCode(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default async function SignupSuccessPage({ searchParams }: Props) {
  const { agencyId, next = '/agency' } = await searchParams;
  if (!agencyId) redirect(next);

  const db = createServiceClientWithoutCookies();

  // Load agency info for early bird + invite link
  const { data: agency } = await db
    .from('agencies')
    .select('id, name, created_at, settings')
    .eq('id', agencyId)
    .single();

  if (!agency) redirect(next);

  const settings = (agency.settings ?? {}) as Record<string, unknown>;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kyra.conversionsystem.com';

  // Get or create invite code
  let inviteCode = settings.invite_code as string | undefined;
  if (!inviteCode) {
    inviteCode = generateCode();
    await db
      .from('agencies')
      .update({ settings: { ...settings, invite_code: inviteCode, invite_clicks: 0 } })
      .eq('id', agency.id);
  }

  const referralUrl = `${appUrl}/invite/${inviteCode}`;
  const createdAt = new Date(agency.created_at).getTime();
  const earlyBirdExpiresAt = createdAt + 48 * 3_600_000;
  const isEarlyBirdActive = Date.now() < earlyBirdExpiresAt;

  // Share message templates
  const shareMessages = {
    sms: `Hey — I've been using this to deploy AI workers for my business. Handles inbound messages in 60 seconds, books appointments, updates CRM automatically. You get 100 free AI credits just for signing up: ${referralUrl}`,
    twitter: `🤖 Free OpenClaw AI tokens — just started using Kyra to deploy AI workers. No code required. You get 100 free credits to try it: ${referralUrl}`,
    linkedin: `If you want AI workers handling inbound without writing code, this is worth 5 minutes. 100 free AI credits to get started: ${referralUrl}`,
    email: `Subject: 100 free AI credits (no card needed)\n\nHey,\n\nI'm using Kyra to deploy AI workers — handles inbound messages in 60 seconds, books appointments, and updates CRM automatically.\n\nFree to start, here are 100 credits on me: ${referralUrl}`,
  };

  const twitterText = encodeURIComponent(shareMessages.twitter);
  const whatsappText = encodeURIComponent(shareMessages.sms);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-4 py-16">
      {/* Logo */}
      <div className="mb-10 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">K</div>
        <span className="font-bold text-lg tracking-tight text-white">Kyra</span>
      </div>

      <div className="w-full max-w-xl space-y-6">

        {/* Success header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-2">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
          </div>
          <h1 className="text-3xl font-black text-white">You&apos;re in!</h1>
          <p className="text-slate-400 text-lg">
            <span className="text-white font-semibold">100 free AI credits</span> added to your account.
          </p>
        </div>

        {/* Early Bird Card */}
        {isEarlyBirdActive && (
          <div className="relative overflow-hidden rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/80 to-purple-950/60 p-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -translate-y-8 translate-x-8" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-400/20">
                  <Zap className="h-4 w-4 text-amber-400" />
                </div>
                <span className="text-amber-400 font-bold text-sm uppercase tracking-wider">Early Bird Bonus</span>
              </div>
              <div className="mb-4">
                <p className="text-white font-semibold text-lg mb-1">Share in the next</p>
                <EarlyBirdCountdown expiresAt={earlyBirdExpiresAt} />
                <p className="text-slate-400 text-sm mt-2">
                  and earn <span className="text-white font-bold">150 credits</span> per referral
                  <span className="text-slate-500"> (vs 100 after timer)</span>
                </p>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-400">
                <Gift className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                <span>Your friend also gets <span className="text-white font-semibold">100 free AI credits</span> just for joining — no purchase needed.</span>
              </div>
            </div>
          </div>
        )}

        {/* Standard referral info (shown if early bird expired) */}
        {!isEarlyBirdActive && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-indigo-400" />
              <span className="font-bold text-white">Refer friends, earn free AI credits</span>
            </div>
            <p className="text-slate-400 text-sm">
              Share your link and you&apos;ll both get <span className="text-white font-semibold">100 free AI credits</span> — no purchase required.
            </p>
          </div>
        )}

        {/* Referral link */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your referral link</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-slate-300 truncate">
                {referralUrl}
              </div>
              <CopyButton text={referralUrl} label="Copy" />
            </div>
          </div>

          {/* Share buttons */}
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://twitter.com/intent/tweet?text=${twitterText}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black border border-white/10 hover:border-white/30 text-sm font-semibold text-white transition"
            >
              <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Share on X
            </a>
            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366]/20 border border-[#25D366]/30 hover:border-[#25D366]/60 text-sm font-semibold text-white transition"
            >
              <svg className="h-4 w-4 fill-[#25D366]" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          </div>
        </div>

        {/* Share message templates */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ready-to-send messages</p>
          <div className="space-y-3">
            {[
              { label: 'SMS / DM', key: 'sms', text: shareMessages.sms },
              { label: 'LinkedIn', key: 'linkedin', text: shareMessages.linkedin },
              { label: 'Cold Email', key: 'email', text: shareMessages.email },
            ].map(({ label, text }) => (
              <div key={label}>
                <p className="text-xs text-slate-500 mb-1.5 font-medium">{label}</p>
                <CopyTextarea text={text} />
              </div>
            ))}
          </div>
        </div>

        {/* Skip */}
        <div className="text-center pt-2">
          <Link
            href={next}
            className="text-sm text-slate-500 hover:text-slate-300 transition underline underline-offset-4"
          >
            Skip for now → Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
