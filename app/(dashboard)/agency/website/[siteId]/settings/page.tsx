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
  TrendingUp,
  Settings,
} from 'lucide-react';

interface SiteData {
  id: string;
  business_name: string;
  site_domain: string | null;
  site_subdomain: string | null;
  ga4_id: string | null;
  white_label: boolean | null;
  status: string;
}

const VPS_IP = '15.204.91.157';

export default function SiteSettings() {
  const params = useParams();
  const siteId = params.siteId as string;

  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [customDomain, setCustomDomain] = useState('');
  const [ga4Id, setGa4Id] = useState('');
  const [whiteLabel, setWhiteLabel] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

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
        }
      } catch {
        setError('Failed to load site data');
      } finally {
        setLoading(false);
      }
    }
    fetchSite();
  }, [siteId]);

  const save = async (field: string, value: unknown) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/agency/sites/${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setSaved(field);
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
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const subdomain = site?.site_subdomain || '';

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
          <Link href="/agency/website" className="text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-gray-900">
              {site?.business_name || 'Site Settings'}
            </h1>
            <p className="text-xs text-gray-400">Domain, analytics, and branding</p>
          </div>
        </div>
        {/* Sub-navigation tabs */}
        <div className="flex border-t border-gray-100 px-4">
          {[
            { href: `/agency/website/${siteId}/editor`, icon: <Edit3 className="h-3.5 w-3.5" />, label: 'Editor', active: false },
            { href: `/agency/website/${siteId}/growth`, icon: <TrendingUp className="h-3.5 w-3.5" />, label: 'Growth', active: false },
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
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* ── Current URL ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900">Current URL</h3>
          </div>
          {subdomain ? (
            <div className="flex items-center gap-2 mt-3">
              <code className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-1 text-gray-700 font-mono truncate">
                https://{subdomain}
              </code>
              <a
                href={`https://${subdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                Open
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-2">No subdomain assigned yet — build the site first.</p>
          )}
        </div>

        {/* ── Custom Domain ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900">Custom Domain</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Connect your own domain. You&apos;ll need to update DNS records with your domain registrar.
          </p>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
                placeholder="yourdomain.com or www.yourdomain.com"
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => save('site_domain', customDomain || null)}
                disabled={saving}
                className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving && saved !== 'site_domain' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : saved === 'site_domain' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : null}
                Save
              </button>
            </div>

            {/* DNS Instructions */}
            {customDomain && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">DNS Records Required</p>
                <p className="text-xs text-blue-700">
                  Add these records in your DNS provider (Cloudflare, GoDaddy, Namecheap, etc.):
                </p>

                {/* A Record */}
                <div className="bg-white rounded-lg border border-blue-100 p-3 space-y-1">
                  <p className="text-xs font-medium text-gray-700 mb-2">Option A — Root domain (e.g. yourdomain.com)</p>
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
                <div className="bg-white rounded-lg border border-blue-100 p-3 space-y-1">
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
                  DNS changes can take up to 48 hours to propagate. SSL will auto-provision via Let&apos;s Encrypt.
                </div>
              </div>
            )}

            {site?.site_domain && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl p-3">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Custom domain saved: <strong>{site.site_domain}</strong>. Rebuild the site to activate it.
              </div>
            )}
          </div>
        </div>

        {/* ── Google Analytics ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-gray-900">Google Analytics 4</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Track visitors on your site. Create a free GA4 property at{' '}
            <a
              href="https://analytics.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline"
            >
              analytics.google.com
            </a>
            {' '}and paste your Measurement ID below.
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
              onClick={() => save('ga4_id', ga4Id || null)}
              disabled={saving}
              className="px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {saved === 'ga4_id' ? <Check className="h-3.5 w-3.5" /> : null}
              Save
            </button>
          </div>

          {site?.ga4_id && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl p-3 mt-3">
              <CheckCircle2 className="h-3.5 w-3.5" />
              GA4 tracking active: <strong>{site.ga4_id}</strong>. Will be injected on next rebuild.
            </div>
          )}

          <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-medium text-gray-700">How to get your Measurement ID:</p>
            <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
              <li>Go to analytics.google.com and create a property</li>
              <li>Click Admin → Data Streams → Add Stream → Web</li>
              <li>Enter your website URL and click Create</li>
              <li>Copy the Measurement ID (starts with G-)</li>
            </ol>
          </div>
        </div>

        {/* ── White-Label ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paintbrush className="h-4 w-4 text-indigo-500" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900">White-Label Mode</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Remove all Kyra / Conversion System branding from the deployed site.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const newVal = !whiteLabel;
                setWhiteLabel(newVal);
                save('white_label', newVal);
              }}
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
          {saved === 'white_label' && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <Check className="h-3 w-3" />
              Saved — rebuild to apply
            </p>
          )}
        </div>

        {/* ── Danger Zone ───────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <h3 className="text-sm font-semibold text-red-700 mb-1">Danger Zone</h3>
          <p className="text-xs text-gray-500 mb-4">Irreversible actions. Please be careful.</p>
          <button
            onClick={async () => {
              if (!confirm(`Are you sure you want to delete "${site?.business_name}"? This cannot be undone.`)) return;
              const res = await fetch(`/api/agency/sites/${siteId}`, { method: 'DELETE' });
              if (res.ok) {
                window.location.href = '/agency/website';
              }
            }}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
          >
            Delete This Site
          </button>
        </div>
      </div>
    </div>
  );
}
