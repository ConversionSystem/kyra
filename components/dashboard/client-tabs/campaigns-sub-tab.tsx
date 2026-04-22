'use client';

import { useState, useCallback } from 'react';
import {
  Sparkles, Loader2, Mail, MessageSquare, Share2, Globe,
  ChevronDown, ChevronUp, Zap, Send,
  Smartphone, Facebook, Instagram, Linkedin, Edit3,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/queries';
import type { CampaignPlan, CampaignEmail, CampaignSMS, CampaignSocialPost } from '@/lib/campaigns/ai-campaign-engine';
import { sanitizeGeneratedHTML } from '@/lib/sites/html-sanitizer';
import { CopyButton } from '@/components/ui/copy-button';

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, count }: { icon: React.ElementType; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-indigo-600" />
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      {count !== undefined && (
        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{count}</span>
      )}
    </div>
  );
}

const TYPE_LABELS: Record<string, string> = {
  teaser: '🎯 Teaser',
  launch: '🚀 Launch Day',
  last_chance: '⏰ Last Chance',
  follow_up: '📩 Follow Up',
};

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Share2,
};

// ── Email Card ────────────────────────────────────────────────────────────────

function EmailCard({ email, index }: { email: CampaignEmail; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
            {index + 1}
          </span>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900">{email.subject}</p>
            <p className="text-xs text-gray-500">{TYPE_LABELS[email.type] || email.type} • Day {email.sendDay}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={`Subject: ${email.subject}\n\n${email.body}`} />
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-2">
          <p className="text-xs text-gray-500">Preheader: {email.preheader}</p>
          {/* AI-generated HTML — sanitized before render. Strips <script>,
              on* handlers, javascript: URLs, untrusted iframes. */}
          <div
            className="text-sm text-gray-700 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizeGeneratedHTML(email.body) }}
          />
        </div>
      )}
    </div>
  );
}

// ── SMS Card ──────────────────────────────────────────────────────────────────

function SMSCard({ sms }: { sms: CampaignSMS }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Smartphone className="w-4 h-4 text-green-600 mt-0.5" />
          <div>
            <p className="text-xs text-gray-500 mb-1">{sms.timing}</p>
            <p className="text-sm text-gray-900">{sms.body}</p>
            <p className="text-xs text-gray-400 mt-1">{sms.body.length}/160 chars</p>
          </div>
        </div>
        <CopyButton text={sms.body} />
      </div>
    </div>
  );
}

// ── Social Card ───────────────────────────────────────────────────────────────

function SocialCard({ post }: { post: CampaignSocialPost }) {
  const PlatformIcon = PLATFORM_ICONS[post.platform] || Share2;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <PlatformIcon className="w-4 h-4 text-blue-600 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-gray-500 capitalize mb-1">{post.platform} • {post.timing}</p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{post.body}</p>
            {post.hashtags.length > 0 && (
              <p className="text-xs text-indigo-600 mt-1">{post.hashtags.map(h => `#${h}`).join(' ')}</p>
            )}
            {post.imagePrompt && (
              <p className="text-xs text-gray-400 mt-1 italic">📷 {post.imagePrompt}</p>
            )}
          </div>
        </div>
        <CopyButton text={`${post.body}\n\n${post.hashtags.map(h => `#${h}`).join(' ')}`} />
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CampaignsSubTab({ client }: { client: AgencyClient }) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<CampaignPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'emails' | 'sms' | 'social' | 'landing'>('emails');

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/agency/clients/${client.id}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim() }),
      });
      const data = await res.json() as { campaign?: CampaignPlan; error?: string };
      if (!res.ok || data.error) {
        setError(data.error || 'Failed to generate campaign.');
      } else if (data.campaign) {
        setCampaign(data.campaign);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [client.id, description]);

  return (
    <div className="space-y-6">
      {/* Generator */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-gray-900">AI Campaign Generator</h3>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Describe your campaign and AI will generate emails, SMS, social posts, and landing page copy — ready to edit and launch.
        </p>
        <div className="space-y-3">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder='e.g. "Run a Black Friday campaign — 30% off all services for existing customers"'
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            rows={3}
            disabled={loading}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">⚡ Costs 3 credits per generation</p>
            <button
              onClick={handleGenerate}
              disabled={loading || !description.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate Campaign
                </>
              )}
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-3 rounded-lg bg-red-50 border border-red-100 px-4 py-2">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Campaign Preview */}
      {campaign && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{campaign.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">Generated {new Date(campaign.generatedAt).toLocaleDateString()}</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
              Draft
            </span>
          </div>

          {/* Section tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              { id: 'emails' as const, label: 'Emails', icon: Mail, count: campaign.emails.length },
              { id: 'sms' as const, label: 'SMS', icon: MessageSquare, count: campaign.smsMessages.length },
              { id: 'social' as const, label: 'Social', icon: Share2, count: campaign.socialPosts.length },
              { id: 'landing' as const, label: 'Landing Page', icon: Globe, count: 1 },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeSection === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                <span className="text-xs text-gray-400">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Section content */}
          {activeSection === 'emails' && (
            <div className="space-y-3">
              <SectionHeader icon={Mail} title="Email Sequence" count={campaign.emails.length} />
              {campaign.emails.map((email, i) => (
                <EmailCard key={i} email={email} index={i} />
              ))}
            </div>
          )}

          {activeSection === 'sms' && (
            <div className="space-y-3">
              <SectionHeader icon={MessageSquare} title="SMS Messages" count={campaign.smsMessages.length} />
              {campaign.smsMessages.map((sms, i) => (
                <SMSCard key={i} sms={sms} />
              ))}
            </div>
          )}

          {activeSection === 'social' && (
            <div className="space-y-3">
              <SectionHeader icon={Share2} title="Social Media Posts" count={campaign.socialPosts.length} />
              {campaign.socialPosts.map((post, i) => (
                <SocialCard key={i} post={post} />
              ))}
            </div>
          )}

          {activeSection === 'landing' && (
            <div className="space-y-3">
              <SectionHeader icon={Globe} title="Landing Page Copy" />
              <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{campaign.landingPageCopy.headline}</h2>
                  <p className="text-base text-gray-600 mt-1">{campaign.landingPageCopy.subheadline}</p>
                </div>
                {/* AI-generated landing-page body — sanitized. */}
                <div
                  className="text-sm text-gray-700 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeGeneratedHTML(campaign.landingPageCopy.bodyHtml) }}
                />
                <div className="flex items-center gap-4">
                  <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors">
                    {campaign.landingPageCopy.ctaText}
                  </button>
                </div>
                {campaign.landingPageCopy.socialProof && (
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-600 italic">&ldquo;{campaign.landingPageCopy.socialProof}&rdquo;</p>
                  </div>
                )}
                {campaign.landingPageCopy.urgencyElement && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="text-sm text-amber-800 font-medium">⏰ {campaign.landingPageCopy.urgencyElement}</p>
                  </div>
                )}
                <div className="flex justify-end">
                  <CopyButton text={`${campaign.landingPageCopy.headline}\n\n${campaign.landingPageCopy.subheadline}\n\n${campaign.landingPageCopy.bodyHtml}`} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!campaign && !loading && (
        <div className="text-center py-12 px-6">
          <Sparkles className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No campaigns yet</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Describe a campaign above and AI will generate all the assets you need.
          </p>
        </div>
      )}
    </div>
  );
}
