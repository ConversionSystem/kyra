/**
 * ClientStatusBanner — renders actionable error banners for a client.
 *
 * Covers four failure modes:
 *   1. Gateway crashed / error state        → red banner + redeploy CTA
 *   2. Gateway never deployed               → amber "not live yet" banner
 *   3. GHL partially connected (no token)   → amber GHL re-auth banner
 *   4. Missing OpenAI API key (BYOK)        → amber key-required banner
 *
 * This is a pure presentational (no hooks) server-compatible component.
 * The parent already has the client data — just pass it in.
 */

import Link from 'next/link';
import {
  AlertTriangle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';

interface Props {
  client: AgencyClient;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 9999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

// ── Individual banners ────────────────────────────────────────────────────────

function ErrorBanner({ title, body, cta }: { title: string; body: string; cta: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-red-900">{title}</p>
        <p className="text-xs text-red-700 mt-0.5 mb-3">{body}</p>
        {cta}
      </div>
    </div>
  );
}

function WarnBanner({ title, body, cta }: { title: string; body: string; cta: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">{title}</p>
        <p className="text-xs text-amber-700 mt-0.5 mb-3">{body}</p>
        {cta}
      </div>
    </div>
  );
}

function Cta({
  href,
  label,
  variant = 'warn',
  external = false,
}: {
  href: string;
  label: string;
  variant?: 'error' | 'warn';
  external?: boolean;
}) {
  const base = 'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors';
  const colors =
    variant === 'error'
      ? 'border-red-300 bg-white text-red-700 hover:bg-red-100'
      : 'border-amber-300 bg-white text-amber-800 hover:bg-amber-100';

  return (
    <Link href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined}
      className={`${base} ${colors}`}>
      {label}
      {external && <ExternalLink className="h-3 w-3 opacity-60" />}
    </Link>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function ClientStatusBanner({ client }: Props) {
  const banners: React.ReactNode[] = [];

  // 1. Gateway crashed
  if (client.gateway_status === 'error') {
    const reason = client.gateway_error
      ? `Error: "${client.gateway_error}"`
      : 'The AI container stopped unexpectedly. This is usually a memory or config issue.';

    banners.push(
      <ErrorBanner
        key="gateway-error"
        title="AI is offline — gateway error"
        body={`${reason} Use the Redeploy button at the top of this page to restart it.`}
        cta={
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-red-700 font-medium">
              👆 Click <strong>Redeploy AI</strong> above to restart the container.
            </span>
          </div>
        }
      />
    );
  }

  // 2. Gateway never deployed (null = never provisioned)
  if (client.gateway_status === null && client.status !== 'paused') {
    banners.push(
      <WarnBanner
        key="gateway-null"
        title="AI not deployed yet"
        body="Your AI worker hasn't been launched. Click the Deploy AI button at the top of the page to go live."
        cta={
          <span className="text-xs text-amber-800 font-medium">
            👆 Click <strong>Deploy AI</strong> in the header above to launch.
          </span>
        }
      />
    );
  }

  // 3. GHL partial connection — location set but no token
  const hasGhlLocation = !!client.ghl_location_id;
  const hasGhlToken = !!(client.ghl_private_token || client.ghl_access_token);

  if (hasGhlLocation && !hasGhlToken) {
    banners.push(
      <WarnBanner
        key="ghl-no-token"
        title="GHL connection incomplete"
        body="A GHL location is linked but the authorization token is missing. The AI can't access GHL contacts or send SMS until you re-connect."
        cta={
          <Cta href={`/agency/clients/${client.id}?tab=ghl`} label="🔗 Re-connect GHL" />
        }
      />
    );
  }

  // 4. GHL token may have expired (no refresh activity in 60+ days)
  if (hasGhlToken && daysSince(client.ghl_connected_at) > 60) {
    banners.push(
      <WarnBanner
        key="ghl-stale"
        title="GHL token may be expired"
        body={`Connected ${daysSince(client.ghl_connected_at)} days ago. GHL Private Integration tokens can expire — verify the connection is still working.`}
        cta={
          <Cta href={`/agency/clients/${client.id}?tab=ghl`} label="🔗 Verify GHL connection" />
        }
      />
    );
  }

  // 5. Missing OpenAI API key (BYOK clients)
  const settings = client.settings as Record<string, unknown>;
  const containerConfig = client.container_config as Record<string, unknown>;
  const missingKey =
    settings?.openai_api_key_missing === true ||
    containerConfig?.openai_api_key_missing === true;

  if (missingKey) {
    banners.push(
      <WarnBanner
        key="no-api-key"
        title="No OpenAI API key configured"
        body="This client uses their own API key (BYOK), but none has been added. The AI can't process any messages until a key is provided."
        cta={
          <div className="flex flex-wrap gap-2">
            <Cta href={`/agency/clients/${client.id}?tab=settings`} label="🔑 Add API key" />
            <Cta href="https://platform.openai.com/api-keys" label="Get key from OpenAI" external />
          </div>
        }
      />
    );
  }

  if (banners.length === 0) return null;

  return <div>{banners}</div>;
}
