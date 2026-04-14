'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Globe,
  Check,
  Copy,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  BarChart3,
  Paintbrush,
  X,
  Edit3,
  Settings,
  Search,
  Bot,
  Link2,
  Star,
  Shield,
  Trash2,
  FileText,
  Palette,
} from 'lucide-react';

interface SiteData {
  id: string;
  business_name: string;
  site_domain: string | null;
  site_subdomain: string | null;
  ga4_id: string | null;
  white_label: boolean | null;
  status: string;
  client_id?: string | null;
  color_primary: string | null;
  design_style: string | null;
  ai_name: string | null;
  booking_url: string | null;
  google_review_url: string | null;
  search_console_connected?: boolean;
}

const VPS_IP = '15.204.91.157';

const DESIGN_STYLES = [
  { value: 'modern-dark', label: 'Modern Dark' },
  { value: 'clean-light', label: 'Clean Light' },
  { value: 'bold', label: 'Bold' },
  { value: 'minimal', label: 'Minimal' },
];

export default function SiteSettings() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Domain
  const [customDomain, setCustomDomain] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // Branding
  const [colorPrimary, setColorPrimary] = useState('#dc2626');
  const [designStyle, setDesignStyle] = useState('modern-dark');
  const [whiteLabel, setWhiteLabel] = useState(false);

  // Analytics
  const [ga4Id, setGa4Id] = useState('');
  const [checkingGsc, setCheckingGsc] = useState(false);
  const [gscStatus, setGscStatus] = useState<'unknown' | 'connected' | 'not_connected'>('unknown');

  // AI Config
  const [aiName, setAiName] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');

  useEffect(() => {
    async function fetchSite() {
      try {
        const res = await fetch(`/api/agency/sites/${siteId}`);
        if (res.ok) {
          const result = await res.json();
          const s = result.data as SiteData;
          setSite(s);
          setCustomDomain(s.site_domain || '');
          setGa4Id(s.ga4_id || '');
          setWhiteLabel(s.white_label ?? false);
          setColorPrimary(s.color_primary || '#dc2626');
          setDesignStyle(s.design_style || 'modern-dark');
          setAiName(s.ai_name || '');
          setBookingUrl(s.booking_url || '');
          setGoogleReviewUrl(s.google_review_url || '');
          setGscStatus(s.search_console_connected ? 'connected' : 'not_connected');
        }
      } catch {
        setError('Failed to load site data');
      } finally {
        setLoading(false);
      }
    }
    fetchSite();
  }, [siteId]);

  const save = async (section: string, updates: Record<string, unknown>) => {
    setSaving(section);
    setError(null);
    try {
      const res = await fetch(`/api/agency/sites/${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setSaved(section);
        setTimeout(() => setSaved(null), 2500);
        // Refresh site data
        const refreshed = await fetch(`/api/agency/sites/${siteId}`);
        if (refreshed.ok) {
          const result = await refreshed.json();
          setSite(result.data);
        }
      } else {
        const result = await res.json();
        setError(result.error || 'Failed to save');
      }
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const checkGscConnection = async () => {
    setCheckingGsc(true);
    try {
      const res = await fetch(`/api/agency/sites/${siteId}`);
      if (res.ok) {
        const result = await res.json();
        setGscStatus(result.data?.search_console_connected ? 'connected' : 'not_connected');
        setSite(result.data);
      }
    } catch {
      // ignore
    } finally {
      setCheckingGsc(false);
    }
  };

  const subdomain = site?.site_subdomain || '';
  const siteUrl = site?.site_domain ? `https://${site.site_domain}` : subdomain ? `https://${subdomain}` : null;
  const backHref = site?.client_id ? `/agency/clients/${site.client_id}` : '/agency/website';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href={backHref} className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-gray-900">
              {site?.business_name || 'Site Settings'}
            </h1>
            <p className="text-xs text-gray-400">Configure domain, branding, analytics &amp; more</p>
          </div>
          {siteUrl && (
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
            >
              <ExternalLink className="h-3 w-3" />
              Visit Site
            </a>
          )}
        </div>
        {/* Sub-navigation tabs */}
        <div className="flex border-t border-gray-100 px-4">
          {[
            { href: `/agency/website/${siteId}/editor`, icon: <Edit3 className="h-3.5 w-3.5" />, label: 'Editor', active: false },
            { href: `/agency/website/${siteId}/settings`, icon: <Settings className="h-3.5 w-3.5" />, label: 'Settings', active: true },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab.active
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            Section 1: Domain
           ══════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900">Domain</h3>
          </div>

          {/* Current URL */}
          {subdomain ? (
            <div className="mb-5">
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Current URL</label>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex-1 text-gray-700 font-mono truncate">
                  https://{subdomain}
                </code>
                <a
                  href={`https://${subdomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-xs text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Visit
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-5">No subdomain assigned yet — build the site first.</p>
          )}

          {/* Custom Domain */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Custom Domain</label>
            <p className="text-xs text-gray-400 mb-3">
              Connect your own domain. Update DNS records with your registrar.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
                placeholder="yourdomain.com"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => save('domain', { site_domain: customDomain || null })}
                disabled={saving === 'domain'}
                className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving === 'domain' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saved === 'domain' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : null}
                Save
              </button>
            </div>

            {/* DNS Instructions */}
            {customDomain && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3 mt-4">
                <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">DNS Records Required</p>
                <p className="text-xs text-blue-700">
                  Add these records in your DNS provider (Cloudflare, GoDaddy, Namecheap, etc.):
                </p>

                {/* A Record */}
                <div className="bg-white rounded-lg border border-blue-100 p-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Option A — Root domain</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-400 text-[10px] mb-0.5">TYPE</p>
                      <p className="font-mono font-medium">A</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-400 text-[10px] mb-0.5">NAME</p>
                      <p className="font-mono font-medium">@</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2 flex items-start justify-between">
                      <div>
                        <p className="text-gray-400 text-[10px] mb-0.5">VALUE</p>
                        <p className="font-mono font-medium">{VPS_IP}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(VPS_IP, 'ip')}
                        className="ml-1 text-gray-400 hover:text-gray-600"
                      >
                        {copied === 'ip' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* CNAME Record */}
                <div className="bg-white rounded-lg border border-blue-100 p-3">
                  <p className="text-xs font-medium text-gray-700 mb-2">Option B — www subdomain</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-400 text-[10px] mb-0.5">TYPE</p>
                      <p className="font-mono font-medium">CNAME</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-400 text-[10px] mb-0.5">NAME</p>
                      <p className="font-mono font-medium">www</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2 flex items-start justify-between">
                      <div>
                        <p className="text-gray-400 text-[10px] mb-0.5">VALUE</p>
                        <p className="font-mono font-medium truncate">{subdomain || 'your-subdomain.sites.kyra.conversionsystem.com'}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(subdomain, 'cname')}
                        className="ml-1 text-gray-400 hover:text-gray-600"
                      >
                        {copied === 'cname' ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-100 rounded-lg p-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  DNS changes can take up to 48 hours. SSL auto-provisions via Let&apos;s Encrypt.
                </div>
              </div>
            )}

            {site?.site_domain && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl p-3 mt-3">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Custom domain saved: <strong>{site.site_domain}</strong>. Rebuild to activate.
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            Section 2: Branding
           ══════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-5 w-5 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900">Branding</h3>
          </div>

          <div className="space-y-5">
            {/* Primary Color */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colorPrimary}
                  onChange={(e) => setColorPrimary(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={colorPrimary}
                  onChange={(e) => setColorPrimary(e.target.value)}
                  placeholder="#dc2626"
                  className="w-32 rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div
                  className="w-20 h-10 rounded-xl border border-gray-200"
                  style={{ backgroundColor: colorPrimary }}
                />
              </div>
            </div>

            {/* Design Style */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Design Style</label>
              <select
                value={designStyle}
                onChange={(e) => setDesignStyle(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {DESIGN_STYLES.map((style) => (
                  <option key={style.value} value={style.value}>
                    {style.label}
                  </option>
                ))}
              </select>
            </div>

            {/* White Label Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">White-Label Mode</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Remove all Kyra / Conversion System branding
                </p>
              </div>
              <button
                onClick={() => setWhiteLabel(!whiteLabel)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  whiteLabel ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                    whiteLabel ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={() =>
                save('branding', {
                  color_primary: colorPrimary,
                  design_style: designStyle,
                  white_label: whiteLabel,
                })
              }
              disabled={saving === 'branding'}
              className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving === 'branding' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saved === 'branding' ? (
                <Check className="h-3.5 w-3.5" />
              ) : null}
              {saved === 'branding' ? 'Saved!' : 'Save Branding'}
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            Section 3: Analytics & Tracking
           ══════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900">Analytics &amp; Tracking</h3>
          </div>

          <div className="space-y-6">
            {/* GA4 */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                Google Analytics 4 — Measurement ID
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Track visitors on your site.{' '}
                <a
                  href="https://analytics.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  Create a free GA4 property →
                </a>
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ga4Id}
                  onChange={(e) => setGa4Id(e.target.value.trim().toUpperCase())}
                  placeholder="G-XXXXXXXXXX"
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => save('ga4', { ga4_id: ga4Id || null })}
                  disabled={saving === 'ga4'}
                  className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving === 'ga4' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : saved === 'ga4' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : null}
                  Save
                </button>
              </div>
              {site?.ga4_id && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl p-3 mt-3">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  GA4 active: <strong>{site.ga4_id}</strong>. Injected on next rebuild.
                </div>
              )}
            </div>

            {/* Google Search Console */}
            <div className="border-t border-gray-100 pt-5">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-gray-500" />
                <label className="text-xs font-medium text-gray-500">Google Search Console</label>
                {gscStatus === 'connected' ? (
                  <span className="text-[10px] font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Connected
                  </span>
                ) : (
                  <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Not Connected
                  </span>
                )}
              </div>

              {gscStatus === 'connected' ? (
                <p className="text-xs text-green-600">
                  Search Console is connected and providing data to the Growth Engine.
                </p>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs text-gray-600">
                    Connect Google Search Console to unlock real keyword data in the Growth Engine.
                  </p>
                  <ol className="text-xs text-gray-500 space-y-2 list-decimal list-inside">
                    <li>
                      Go to{' '}
                      <a
                        href={`https://search.google.com/search-console/welcome?resource_id=${encodeURIComponent(siteUrl || '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        Google Search Console
                      </a>{' '}
                      and add your site as a property
                    </li>
                    <li>Choose &quot;URL Prefix&quot; and enter: <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-[11px]">{siteUrl || 'your site URL'}</code></li>
                    <li>Verify ownership using DNS TXT record or HTML file upload</li>
                    <li>
                      Once verified, the system will detect the connection within 24 hours.{' '}
                      <span className="text-gray-400">Server-side integration requires a Google Service Account.</span>
                    </li>
                  </ol>
                  <button
                    onClick={checkGscConnection}
                    disabled={checkingGsc}
                    className="px-3 py-2 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {checkingGsc ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Search className="h-3 w-3" />
                    )}
                    Check Connection
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            Section 4: AI Configuration
           ══════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="h-5 w-5 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900">AI Configuration</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">AI Worker Name</label>
              <p className="text-xs text-gray-400 mb-2">
                The name your AI chat widget introduces itself as.
              </p>
              <input
                type="text"
                value={aiName}
                onChange={(e) => setAiName(e.target.value)}
                placeholder={`e.g. ${site?.business_name || 'Your Business'} Assistant`}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Booking URL</label>
              <p className="text-xs text-gray-400 mb-2">
                Where the AI directs users to book appointments (e.g. Calendly link).
              </p>
              <input
                type="url"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="https://calendly.com/your-business"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Google Review URL</label>
              <p className="text-xs text-gray-400 mb-2">
                Link to your Google Business reviews page for the AI to share.
              </p>
              <input
                type="url"
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/your-business/review"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={() =>
                save('ai', {
                  ai_name: aiName || null,
                  booking_url: bookingUrl || null,
                  google_review_url: googleReviewUrl || null,
                })
              }
              disabled={saving === 'ai'}
              className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {saving === 'ai' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saved === 'ai' ? (
                <Check className="h-3.5 w-3.5" />
              ) : null}
              {saved === 'ai' ? 'Saved!' : 'Save AI Config'}
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            Section 5: SEO Defaults
           ══════════════════════════════════════════════════════════════ */}
        <SeoDefaultsSection siteId={siteId} />

        {/* ══════════════════════════════════════════════════════════════
            Section 6: Danger Zone
           ══════════════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-red-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-red-500" />
            <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">Irreversible actions. Please be careful.</p>
          <button
            onClick={async () => {
              if (!confirm(`Are you sure you want to delete "${site?.business_name}"? This cannot be undone.`)) return;
              const res = await fetch(`/api/agency/sites/${siteId}`, { method: 'DELETE' });
              if (res.ok) {
                window.location.href = site?.client_id ? `/agency/clients/${site.client_id}` : '/agency/website';
              }
            }}
            className="px-4 py-2.5 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete This Site
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SEO Defaults Section ─────────────────────────────────────────────────────

function SeoDefaultsSection({ siteId }: { siteId: string }) {
  const [metaTitle, setMetaTitle] = useState('{{page_title}} | {{business_name}} in {{city}}');
  const [metaDescription, setMetaDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/agency/sites/${siteId}/seo?fields=defaults`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.defaults) {
          if (data.defaults.meta_title_template) setMetaTitle(data.defaults.meta_title_template);
          if (data.defaults.meta_description_template) setMetaDescription(data.defaults.meta_description_template);
        }
      })
      .catch(() => {});
  }, [siteId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/agency/sites/${siteId}/seo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_defaults',
          meta_title_template: metaTitle,
          meta_description_template: metaDescription,
        }),
      });
      if (!res.ok) {
        const result = await res.json();
        setError(result.error || 'Failed to save');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError('Failed to save SEO defaults');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-indigo-500" />
        <h3 className="text-sm font-semibold text-gray-900">SEO Defaults</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Default Meta Title Template</label>
          <p className="text-xs text-gray-400 mb-2">
            Variables: {'{{page_title}}'}, {'{{business_name}}'}, {'{{city}}'}, {'{{state}}'}
          </p>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder="{{page_title}} | {{business_name}} in {{city}}"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">Default Meta Description Template</label>
          <p className="text-xs text-gray-400 mb-2">
            Variables: {'{{business_name}}'}, {'{{city}}'}, {'{{state}}'}, {'{{industry}}'}
          </p>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            placeholder="{{business_name}} provides top-rated {{industry}} services in {{city}}, {{state}}. Call today for a free estimate."
            rows={3}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saved ? (
            <Check className="h-3.5 w-3.5" />
          ) : null}
          {saved ? 'Saved!' : 'Save SEO Defaults'}
        </button>
      </div>
    </div>
  );
}
