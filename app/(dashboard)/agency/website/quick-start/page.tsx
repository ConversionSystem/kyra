'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Loader2, Globe, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { INDUSTRY_DEFAULTS } from '@/lib/sites/industry-defaults';

const INDUSTRIES = Object.entries(INDUSTRY_DEFAULTS).map(([key, val]) => ({
  key,
  label: val.label,
}));

type Stage = 'form' | 'building' | 'live';

export default function QuickStartPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientIdParam = searchParams.get('cid');
  const clientNameParam = searchParams.get('clientId');

  const [businessName, setBusinessName] = useState(clientNameParam || '');
  const [industry, setIndustry] = useState('hvac');
  const [phone, setPhone] = useState('');
  const [stage, setStage] = useState<Stage>('form');
  const [siteUrl, setSiteUrl] = useState('');
  const [siteId, setSiteId] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Elapsed timer while building
  useEffect(() => {
    if (stage !== 'building') return;
    const t = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [stage]);

  const canStart = businessName.trim().length >= 2 && industry;

  async function handleStart() {
    if (!canStart) return;
    setError('');
    setStage('building');
    setStatusMsg('Creating your website…');
    setElapsedSec(0);

    try {
      // 1. Create site draft
      const createRes = await fetch('/api/agency/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName.trim(),
          industry,
          phone: phone.trim() || null,
          ...(clientIdParam ? { client_id: clientIdParam } : {}),
        }),
      });
      if (!createRes.ok) throw new Error('Failed to create site');
      const { data: site } = await createRes.json();
      const id: string = site.id;
      setSiteId(id);

      // 2. Patch subdomain
      setStatusMsg('Setting up your domain…');
      const slug = businessName.trim().toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 30);
      const subdomain = `${slug}.sites.kyra.conversionsystem.com`;
      await fetch(`/api/agency/sites/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_subdomain: subdomain }),
      });

      // 3. Trigger generation
      setStatusMsg('AI is writing your content…');
      await fetch(`/api/agency/sites/${id}/generate`, { method: 'POST' });

      // 4. Poll for live status
      setStatusMsg('Building your website…');
      const pollStart = Date.now();
      const maxWait = 12 * 60 * 1000; // 12 min (generation ~3min + VPS build ~4min)
      const resolvedId = id; // capture for use in catch
      await new Promise<void>((resolve, reject) => {
        const poll = setInterval(async () => {
          if (Date.now() - pollStart > maxWait) {
            clearInterval(poll);
            // Don't reset to form — redirect to dashboard so they can see status
            reject(new Error('__TIMEOUT__'));
            return;
          }
          try {
            const r = await fetch(`/api/agency/sites/${resolvedId}`);
            if (!r.ok) return;
            const { data: s } = await r.json();
            if (s.status === 'live') {
              const domain = s.site_domain || s.site_subdomain || '';
              setSiteUrl(domain ? `https://${domain}` : '');
              clearInterval(poll);
              resolve();
            } else if (s.status === 'error') {
              clearInterval(poll);
              reject(new Error('Build failed — check dashboard for details'));
            } else if (s.status === 'generating') {
              setStatusMsg('AI is writing your content… (this takes 2–3 min)');
            } else if (s.status === 'building') {
              setStatusMsg('Compiling your site… (almost there!)');
            } else if (s.status === 'deploying') {
              setStatusMsg('Deploying to the web…');
            }
          } catch { /* retry */ }
        }, 5000);
      });

      setStage('live');
    } catch (err) {
      const msg = (err as Error).message || '';
      if (msg === '__TIMEOUT__') {
        // Site is probably still building — redirect to dashboard instead of error
        const dest = siteId
          ? `/agency/clients/${clientIdParam || ''}?tab=website`
          : '/agency/websites';
        router.push(dest);
        return;
      }
      setStage('form');
      setError(msg || 'Something went wrong. Please try again.');
    }
  }

  const clientMsg = `Hey! 🎉 Your AI-powered website is live!\n\n🌐 ${siteUrl}\n\nBuilt with SEO-optimized pages, lead forms, and a 24/7 AI chat widget. Ready for customers right now!\n\nLet me know if you'd like any changes.`;

  if (stage === 'live') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="text-7xl mb-5">🎉</div>
          <h1 className="text-4xl font-bold text-white mb-3">Site is live!</h1>
          <p className="text-gray-400 mb-2">{businessName} — ready for customers.</p>
          <p className="text-gray-600 text-sm mb-8">Built in {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}</p>

          <div className="bg-indigo-950/60 border border-indigo-500/30 rounded-2xl p-5 mb-4">
            <p className="text-indigo-300 font-mono text-sm break-all mb-4">{siteUrl}</p>
            <div className="flex gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(siteUrl); setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2500); }}
                className="flex-1 border border-white/20 text-gray-300 rounded-xl py-2.5 text-sm hover:bg-white/5 transition"
              >
                {copiedUrl ? '✓ Copied!' : '📋 Copy URL'}
              </button>
              <a href={siteUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-500 transition text-center">
                Visit Site →
              </a>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Send to client</p>
            <div className="bg-black/30 rounded-xl p-3 mb-3 text-left max-h-28 overflow-y-auto">
              <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-line">{clientMsg}</p>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(clientMsg); setCopiedMsg(true); setTimeout(() => setCopiedMsg(false), 2500); }}
              className="w-full bg-white/10 border border-white/20 text-gray-200 rounded-xl py-2.5 text-sm hover:bg-white/15 transition"
            >
              {copiedMsg ? '✓ Copied!' : '📋 Copy client message'}
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => router.push(clientIdParam ? `/agency/clients/${clientIdParam}?tab=website` : '/agency/clients')}
              className="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-indigo-500 transition"
            >
              Go to Dashboard
            </button>
            {siteId && (
              <button
                onClick={() => router.push(`/agency/website/create?cid=${clientIdParam || ''}&siteId=${siteId}`)}
                className="px-4 border border-white/20 text-gray-400 rounded-xl py-3 text-sm hover:bg-white/5 transition"
              >
                Customize
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'building') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="h-8 w-8 text-indigo-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Building {businessName}</h2>
          <p className="text-gray-400 mb-2">{statusMsg}</p>
          <p className="text-gray-600 text-sm mb-8">
            {elapsedSec < 60 ? `${elapsedSec}s elapsed` : `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s elapsed`}
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left">
            {[
              {
                label: 'AI content generation',
                // Done when we move past generating stage (statusMsg changes to building)
                done: statusMsg.includes('Compiling') || statusMsg.includes('Deploying') || statusMsg.includes('almost'),
                active: statusMsg.includes('writing') || statusMsg.includes('content'),
              },
              {
                label: 'Service & city pages',
                done: statusMsg.includes('Compiling') || statusMsg.includes('Deploying') || statusMsg.includes('almost'),
                active: statusMsg.includes('writing') || statusMsg.includes('content'),
              },
              {
                label: 'Compiling & building',
                done: statusMsg.includes('Deploying'),
                active: statusMsg.includes('Compiling') || statusMsg.includes('almost'),
              },
              {
                label: 'Deploying to the web',
                done: false,
                active: statusMsg.includes('Deploying'),
              },
            ].map(({ label, done, active }) => (
              <div key={label} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                {done
                  ? <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                  : active
                  ? <Loader2 className="h-4 w-4 text-indigo-400 animate-spin shrink-0" />
                  : <div className="h-4 w-4 rounded-full border border-white/20 shrink-0" />
                }
                <span className={`text-sm ${done ? 'text-green-300' : active ? 'text-white' : 'text-gray-600'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-4 text-center">
            This takes 4–8 minutes total. You can close this tab — we&apos;ll keep building.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Zap className="h-3 w-3" />
            Quick Start — live in minutes
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Build a site<br />in 3 fields</h1>
          <p className="text-gray-400">AI handles the rest — content, SEO, 24/7 chat widget.</p>
        </div>

        {/* Form */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Business name</label>
            <input
              type="text"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              placeholder="e.g. Frost HVAC Services"
              className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Industry</label>
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
            >
              {INDUSTRIES.map(i => (
                <option key={i.key} value={i.key} className="bg-gray-900">{i.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Phone <span className="text-gray-600 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={!canStart}
          className="w-full bg-indigo-600 text-white rounded-xl py-4 text-base font-semibold hover:bg-indigo-500 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Sparkles className="h-5 w-5" />
          Build My Website
          <ArrowRight className="h-5 w-5" />
        </button>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-600">
          <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Live HTTPS domain</span>
          <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> AI chat widget</span>
          <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> SEO optimized</span>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push(clientIdParam ? `/agency/website/create?cid=${clientIdParam}&clientId=${encodeURIComponent(clientNameParam||'')}` : '/agency/website/create')}
            className="text-gray-600 hover:text-gray-400 text-xs transition"
          >
            Need more options? Use the full wizard →
          </button>
        </div>
      </div>
    </div>
  );
}
