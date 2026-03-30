'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Check,
  X,
  Loader2,
  Unplug,
  RefreshCw,
  Key,
  ChevronDown,
  ChevronUp,
  Shield,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface GHLConnectionProps {
  clientId: string;
  ghlLocationId: string | null;
  ghlConnectedAt: string | null;
  hasPrivateToken?: boolean;
  calendarId?: string | null;
  pipelineId?: string | null;
  onDisconnected?: () => void;
  onConnected?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function GHLConnection({
  clientId,
  ghlLocationId,
  ghlConnectedAt,
  hasPrivateToken,
  calendarId,
  pipelineId,
  onDisconnected,
  onConnected,
}: GHLConnectionProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [disconnected, setDisconnected] = useState(false);

  // Token input state
  const [token, setToken] = useState('');
  const [locationIdInput, setLocationIdInput] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [showLocationId, setShowLocationId] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  // Test connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    scopes?: string[];
  } | null>(null);

  const isConnected = !!ghlLocationId && !disconnected;

  const handleTokenConnect = useCallback(async () => {
    if (!token.trim()) {
      setError('Please paste your GHL Private Integration token.');
      return;
    }

    setIsValidating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `/api/agency/clients/${clientId}/ghl/connect-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: token.trim(),
            locationId: locationIdInput.trim() || undefined,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to connect');
      }

      // API returned 200 but needs locationId
      if (data.needsLocationId && !data.success) {
        setError(data.message || 'Please enter your GHL Location ID below and try again.');
        setShowLocationId(true);
        return;
      }

      setSuccess(data.message || 'Connected successfully!');
      setToken('');
      setLocationIdInput('');
      onConnected?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsValidating(false);
    }
  }, [clientId, token, locationIdInput, onConnected]);

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/agency/clients/${clientId}/ghl/disconnect`,
        { method: 'POST' },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error || 'Failed to disconnect',
        );
      }

      setDisconnected(true);
      setConfirmDisconnect(false);
      setTestResult(null);
      onDisconnected?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  }, [clientId, onDisconnected]);

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch(
        `/api/agency/clients/${clientId}/ghl/test-connection`,
        { method: 'POST' },
      );
      const data = await res.json();

      setTestResult({
        ok: data.ok ?? false,
        message: data.message || data.error || 'Unknown result',
        scopes: data.scopes,
      });
    } catch {
      setTestResult({
        ok: false,
        message: 'Network error — could not reach the server.',
      });
    } finally {
      setIsTesting(false);
    }
  }, [clientId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50">
            <span className="text-lg font-bold text-orange-600">G</span>
          </div>
          GoHighLevel Integration
          {isConnected && (
            <span className="ml-2 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
              Connected
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Connect this client&apos;s GHL sub-account to enable CRM features —
          contacts, conversations, pipeline, calendar, and workflows.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-600">
            {success}
          </div>
        )}

        {isConnected ? (
          /* ── Connected State ──────────────────────────────────────────── */
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <Check className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-700">Connected</span>
              {hasPrivateToken && (
                <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Private Token
                </span>
              )}
            </div>

            <div className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Location ID</span>
                <span className="font-mono text-xs text-gray-700">
                  {ghlLocationId}
                </span>
              </div>
              {ghlConnectedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Connected</span>
                  <span className="text-gray-700">
                    {new Date(ghlConnectedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Connection Type</span>
                <span className="text-gray-700">
                  {hasPrivateToken ? 'Private Integration Token' : 'OAuth'}
                </span>
              </div>
              {calendarId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Calendar ID</span>
                  <span className="font-mono text-xs text-gray-700">
                    {calendarId}
                  </span>
                </div>
              )}
              {pipelineId && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Pipeline ID</span>
                  <span className="font-mono text-xs text-gray-700">
                    {pipelineId}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Capabilities</span>
                <span className="text-gray-700">
                  Contacts · Conversations · Pipeline · Calendar · Workflows
                </span>
              </div>
            </div>

            {/* Test Connection Result */}
            {testResult && (
              <div
                className={`rounded-lg border p-3 flex items-start gap-2 ${
                  testResult.ok
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                {testResult.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      testResult.ok ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {testResult.ok ? 'Connection Healthy' : 'Connection Issue'}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      testResult.ok ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {testResult.message}
                  </p>
                </div>
              </div>
            )}

            {/* Reconnect form (hidden by default) */}
            {showReconnect && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">Paste a new Private Integration token:</p>
                <Input
                  type="password"
                  placeholder="pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleTokenConnect} disabled={isValidating || !token.trim()} className="gap-2">
                    {isValidating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                    {isValidating ? 'Validating…' : 'Reconnect'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowReconnect(false); setToken(''); }}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Disconnect confirmation (inline, not browser alert) */}
            {confirmDisconnect && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-2">
                <p className="text-sm text-red-700 font-medium">
                  Are you sure? The AI will lose access to this GHL sub-account.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="text-red-600 border-red-200 hover:bg-red-100 gap-1.5"
                  >
                    {isDisconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
                    {isDisconnecting ? 'Disconnecting…' : 'Yes, disconnect'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDisconnect(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!showReconnect && !confirmDisconnect && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex items-center gap-2"
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                  {isTesting ? 'Testing…' : 'Test Connection'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReconnect(true)}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reconnect
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDisconnect(true)}
                  className="flex items-center gap-2 text-red-600 hover:text-red-600 border-red-500/30 hover:border-red-200 hover:bg-red-50"
                >
                  <Unplug className="h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* ── Disconnected State ───────────────────────────────────────── */
          <div className="space-y-6">
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-4 py-3">
              <X className="h-5 w-5 text-gray-400" />
              <span className="text-gray-500">Not connected</span>
            </div>

            {/* ── Method 1: Private Integration Token (Recommended) ───── */}
            <div className="rounded-lg border-2 border-indigo-200 bg-indigo-50/30 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100">
                  <Key className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900">
                  Connect with API Token
                </h3>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Recommended
                </span>
              </div>

              <p className="text-sm text-gray-600">
                Connect instantly using a GHL Private Integration token. No marketplace approval needed.
              </p>

              {/* Instructions accordion */}
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                {showInstructions ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                How to get your token
              </button>

              {showInstructions && (
                <div className="rounded-lg border border-indigo-100 bg-white p-4 text-sm text-gray-600 space-y-3">
                  <ol className="list-decimal list-inside space-y-2.5">
                    <li>
                      Log into your{' '}
                      <a
                        href="https://app.gohighlevel.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 underline hover:text-indigo-800"
                      >
                        GoHighLevel account
                      </a>
                    </li>
                    <li>
                      Go to{' '}
                      <strong>Settings → Integrations → API Keys</strong>
                    </li>
                    <li>
                      Click{' '}
                      <strong>&quot;Create Private Integration&quot;</strong>
                    </li>
                    <li>
                      Give it a name (e.g., <strong>&quot;Kyra AI&quot;</strong>)
                    </li>
                    <li>
                      Enable <strong>ALL</strong> scopes:
                      <ul className="list-disc list-inside ml-4 mt-1.5 space-y-1 text-gray-500">
                        <li>Contacts (read + write)</li>
                        <li>Conversations (read + write)</li>
                        <li>Conversations / Messages (read + write)</li>
                        <li>Opportunities (read + write)</li>
                        <li>Calendars (read + write)</li>
                      </ul>
                    </li>
                    <li>
                      Click <strong>&quot;Create&quot;</strong> and{' '}
                      <strong>copy the token</strong>
                      <span className="text-amber-600 ml-1 text-xs">(GHL only shows it once!)</span>
                    </li>
                    <li>
                      Paste it above along with your <strong>Location ID</strong>
                      <br />
                      <span className="text-gray-400 text-xs">
                        Found at: Settings → Business Info → scroll down → Company ID
                      </span>
                    </li>
                  </ol>

                  <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 mt-2">
                    <Shield className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      Your token is stored securely and only used to communicate
                      with this client&apos;s GHL sub-account. We never share it
                      with third parties.
                    </p>
                  </div>
                </div>
              )}

              {/* Token input */}
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="ghl-token"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Private Integration Token
                  </label>
                  <Input
                    id="ghl-token"
                    type="password"
                    placeholder="pit-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ghl-location-id"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Location ID{' '}
                    <span className={`font-normal ${showLocationId ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                      {showLocationId
                        ? '← Required — enter it and click Connect again'
                        : '(GHL → Settings → Business Info → Company ID)'}
                    </span>
                  </label>
                  <Input
                    id="ghl-location-id"
                    type="text"
                    placeholder="e.g. ve9EPM428h8vShlRW1KT"
                    value={locationIdInput}
                    onChange={(e) => setLocationIdInput(e.target.value)}
                    className={`font-mono text-sm ${showLocationId ? 'border-amber-400 bg-amber-50' : ''}`}
                  />
                </div>

                <Button
                  onClick={handleTokenConnect}
                  disabled={isValidating || !token.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Validating token…
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" />
                      Connect with Token
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Create Free Sub-Account is hidden until GHL Marketplace app is approved */ }

            {/* ── Capabilities list ───────────────────────────────────── */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 space-y-2">
              <p>
                Connecting GoHighLevel unlocks the AI&apos;s full CRM
                capabilities:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Read & update contacts, tags, and custom fields</li>
                <li>
                  Send messages via SMS, email, and WhatsApp through GHL
                </li>
                <li>Manage the sales pipeline and move deals</li>
                <li>Check calendar availability and book appointments</li>
                <li>Trigger GHL automation workflows</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// CreateFreeSubAccount removed — pending GHL Marketplace app approval.
// The OAuth flow requires a published GHL app. Will be re-enabled post-approval.
// Backend routes (/api/agency/ghl/*, /api/agency/clients/[id]/ghl/create-subaccount)
// are ready and waiting — just need the frontend entry point back once GHL approves.
