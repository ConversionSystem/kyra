'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail, Send, Plus, Search, Upload, Trash2, Eye, X, Users,
  BarChart3, FileText, Clock, CheckCircle2, AlertTriangle, Loader2,
  ArrowLeft, ChevronDown,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  subject: string;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  html_body: string;
  text_body: string | null;
  template_id: string | null;
  status: string;
  segment_tags: string[];
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_complained: number;
  total_unsubscribed: number;
  created_at: string;
}

interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  tags: string[];
  source: string;
  status: string;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  category: string;
  is_system: boolean;
  created_at: string;
}

interface EmailMarketingTabProps {
  client: { id: string; name?: string };
}

type SubTab = 'campaigns' | 'contacts' | 'templates' | 'analytics';

// ── Helpers ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    sent: 'bg-green-50 text-green-700 border-green-200',
    draft: 'bg-gray-50 text-gray-600 border-gray-200',
    scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
    sending: 'bg-amber-50 text-amber-700 border-amber-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
    active: 'bg-green-50 text-green-700 border-green-200',
    unsubscribed: 'bg-gray-50 text-gray-500 border-gray-200',
    bounced: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}

function pct(num: number, denom: number): string {
  if (!denom) return '0%';
  return `${((num / denom) * 100).toFixed(1)}%`;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── System Email Templates HTML ────────────────────────────────────────────────

const SYSTEM_TEMPLATES = [
  {
    name: 'Welcome',
    subject: 'Welcome to {{business_name}}!',
    category: 'welcome',
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:0;">
<div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:40px 32px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:white;margin:0;font-size:28px;">Welcome! 🎉</h1>
<p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:16px;">We're excited to have you</p>
</div>
<div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{first_name}},</p>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Thank you for joining us! We're thrilled to have you on board.</p>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">Here's what you can expect from us — helpful updates, exclusive offers, and insider tips delivered straight to your inbox.</p>
<div style="text-align:center;"><a href="#" style="display:inline-block;background:#4f46e5;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Get Started →</a></div>
</div></div>`,
  },
  {
    name: 'Promotion',
    subject: '🔥 Special Offer Just for You',
    category: 'promotion',
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:0;">
<div style="background:linear-gradient(135deg,#dc2626,#f97316);padding:40px 32px;border-radius:12px 12px 0 0;text-align:center;">
<p style="color:rgba(255,255,255,0.9);margin:0 0 4px;font-size:14px;text-transform:uppercase;letter-spacing:2px;">Limited Time</p>
<h1 style="color:white;margin:0;font-size:36px;font-weight:800;">20% OFF</h1>
<p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:16px;">Don't miss this exclusive deal</p>
</div>
<div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{first_name}},</p>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">We have a special offer waiting for you. Use the code below at checkout to save big on your next purchase.</p>
<div style="background:#fef3c7;border:2px dashed #f59e0b;padding:16px;border-radius:8px;text-align:center;margin:0 0 24px;">
<p style="margin:0;color:#92400e;font-size:14px;">Your Promo Code</p>
<p style="margin:4px 0 0;color:#92400e;font-size:28px;font-weight:800;letter-spacing:4px;">SAVE20</p>
</div>
<div style="text-align:center;"><a href="#" style="display:inline-block;background:#dc2626;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Shop Now →</a></div>
</div></div>`,
  },
  {
    name: 'Newsletter',
    subject: '📬 Your Monthly Update',
    category: 'newsletter',
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:0;">
<div style="background:#4f46e5;padding:32px;border-radius:12px 12px 0 0;">
<h1 style="color:white;margin:0;font-size:22px;">📬 Monthly Newsletter</h1>
</div>
<div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{first_name}},</p>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">Here's what's been happening this month:</p>
<div style="border-left:4px solid #4f46e5;padding:12px 16px;margin:0 0 16px;background:#f5f3ff;border-radius:0 8px 8px 0;">
<h3 style="color:#4f46e5;margin:0 0 4px;font-size:16px;">🚀 What's New</h3>
<p style="color:#6b7280;margin:0;font-size:14px;">We've launched exciting new features to help you succeed.</p>
</div>
<div style="border-left:4px solid #059669;padding:12px 16px;margin:0 0 16px;background:#ecfdf5;border-radius:0 8px 8px 0;">
<h3 style="color:#059669;margin:0 0 4px;font-size:16px;">📊 By the Numbers</h3>
<p style="color:#6b7280;margin:0;font-size:14px;">Our community continues to grow with amazing results.</p>
</div>
<div style="border-left:4px solid #f59e0b;padding:12px 16px;margin:0 0 24px;background:#fffbeb;border-radius:0 8px 8px 0;">
<h3 style="color:#f59e0b;margin:0 0 4px;font-size:16px;">💡 Pro Tip</h3>
<p style="color:#6b7280;margin:0;font-size:14px;">Discover how to get the most out of our platform.</p>
</div>
<div style="text-align:center;"><a href="#" style="display:inline-block;background:#4f46e5;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Read More →</a></div>
</div></div>`,
  },
  {
    name: 'Follow-up',
    subject: 'How was your experience?',
    category: 'follow-up',
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:0;">
<div style="background:white;padding:32px;border:1px solid #e5e7eb;border-radius:12px;">
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{first_name}},</p>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Thanks for your recent visit! We'd love to hear about your experience.</p>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">Your feedback helps us improve and serve you better. It only takes a minute!</p>
<div style="text-align:center;margin:0 0 24px;">
<a href="#" style="display:inline-block;background:#4f46e5;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Share Feedback →</a>
</div>
<p style="color:#9ca3af;font-size:14px;margin:0;text-align:center;">Thank you for being a valued customer!</p>
</div></div>`,
  },
  {
    name: 'Announcement',
    subject: '🎉 Big News — Something Exciting is Here!',
    category: 'announcement',
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:0;">
<div style="background:linear-gradient(135deg,#4f46e5,#06b6d4);padding:40px 32px;border-radius:12px 12px 0 0;text-align:center;">
<p style="color:rgba(255,255,255,0.9);margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:2px;">Announcement</p>
<h1 style="color:white;margin:0;font-size:28px;">Something Big is Here!</h1>
</div>
<div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{first_name}},</p>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">We're thrilled to announce our latest offering that we've been working hard on.</p>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">This is designed to make your life easier and help you achieve more. We can't wait for you to try it!</p>
<div style="text-align:center;"><a href="#" style="display:inline-block;background:#4f46e5;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Learn More →</a></div>
</div></div>`,
  },
  {
    name: 'Re-engagement',
    subject: 'We miss you! Come back for a special treat',
    category: 're-engagement',
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:0;">
<div style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:40px 32px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:white;margin:0;font-size:28px;">We Miss You! 💜</h1>
<p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:16px;">It's been a while</p>
</div>
<div style="background:white;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Hi {{first_name}},</p>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">It's been a while since we've seen you, and we wanted to reach out. We've been making some great improvements that we think you'll love.</p>
<p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">As a welcome-back gesture, here's something special just for you:</p>
<div style="background:#f5f3ff;border:2px solid #7c3aed;padding:20px;border-radius:8px;text-align:center;margin:0 0 24px;">
<p style="margin:0;color:#7c3aed;font-size:24px;font-weight:800;">15% OFF</p>
<p style="margin:4px 0 0;color:#6b7280;font-size:14px;">Use code: COMEBACK15</p>
</div>
<div style="text-align:center;"><a href="#" style="display:inline-block;background:#7c3aed;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Come Back →</a></div>
</div></div>`,
  },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function EmailMarketingTab({ client }: EmailMarketingTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('campaigns');
  const subTabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
    { id: 'campaigns', label: 'Campaigns', icon: Send },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        {subTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              subTab === t.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'campaigns' && <CampaignsView clientId={client.id} />}
      {subTab === 'contacts' && <ContactsView clientId={client.id} />}
      {subTab === 'templates' && <TemplatesView clientId={client.id} />}
      {subTab === 'analytics' && <AnalyticsView clientId={client.id} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CAMPAIGNS VIEW
// ══════════════════════════════════════════════════════════════════════════════

function CampaignsView({ clientId }: { clientId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'compose' | 'detail'>('list');
  const [selected, setSelected] = useState<Campaign | null>(null);

  // Compose state
  const [form, setForm] = useState({
    name: '', subject: '', from_name: '', from_email: '', reply_to: '',
    html_body: '', text_body: '', segment_tags: [] as string[], template_id: '',
  });
  const [showPreview, setShowPreview] = useState(false);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendConfirm, setSendConfirm] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/agency/clients/${clientId}/email/campaigns`);
    const data = await res.json();
    setCampaigns(data.campaigns || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const loadAudience = useCallback(async (tags: string[]) => {
    const params = new URLSearchParams();
    tags.forEach(t => params.append('tag', t));
    const res = await fetch(`/api/agency/clients/${clientId}/email/contacts?status=active&limit=1`);
    const data = await res.json();
    setAudienceCount(data.total || 0);
  }, [clientId]);

  const loadTemplates = useCallback(async () => {
    const res = await fetch(`/api/agency/clients/${clientId}/email/templates`);
    const data = await res.json();
    setTemplates(data.templates || []);
  }, [clientId]);

  const handleCompose = () => {
    setForm({ name: '', subject: '', from_name: '', from_email: '', reply_to: '', html_body: '', text_body: '', segment_tags: [], template_id: '' });
    setView('compose');
    setShowPreview(false);
    setSendConfirm(false);
    loadAudience([]);
    loadTemplates();
  };

  const handleTemplateSelect = (templateId: string) => {
    const t = templates.find(t => t.id === templateId);
    if (t) {
      setForm(f => ({ ...f, template_id: templateId, subject: t.subject, html_body: t.html_body }));
    }
  };

  const handleSave = async () => {
    const res = await fetch(`/api/agency/clients/${clientId}/email/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setView('list');
      load();
    }
  };

  const handleSend = async (campaignId: string) => {
    setSending(true);
    await fetch(`/api/agency/clients/${clientId}/email/campaigns/${campaignId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    setSending(false);
    setSendConfirm(false);
    setView('list');
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/agency/clients/${clientId}/email/campaigns/${id}`, { method: 'DELETE' });
    load();
  };

  // ── List View ──
  if (view === 'list') {
    return (
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Campaigns</h3>
          <button onClick={handleCompose} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No campaigns yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {campaigns.map(c => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => { setSelected(c); setView('detail'); }}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{c.subject}</p>
                </div>
                <div className="flex items-center gap-6 text-xs text-gray-500 ml-4">
                  {c.status === 'sent' && (
                    <>
                      <span>{c.total_sent} sent</span>
                      <span>{pct(c.total_opened, c.total_sent)} opens</span>
                      <span>{pct(c.total_clicked, c.total_sent)} clicks</span>
                    </>
                  )}
                  <span>{fmtDate(c.sent_at || c.created_at)}</span>
                  {c.status === 'draft' && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Detail View ──
  if (view === 'detail' && selected) {
    return (
      <div className="space-y-4">
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back to campaigns
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">{selected.name}</h3>
            <StatusBadge status={selected.status} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Sent', value: selected.total_sent, color: 'text-gray-900' },
              { label: 'Delivered', value: selected.total_delivered, color: 'text-green-600' },
              { label: 'Opened', value: `${selected.total_opened} (${pct(selected.total_opened, selected.total_sent)})`, color: 'text-indigo-600' },
              { label: 'Clicked', value: `${selected.total_clicked} (${pct(selected.total_clicked, selected.total_sent)})`, color: 'text-blue-600' },
              { label: 'Bounced', value: selected.total_bounced, color: 'text-red-600' },
              { label: 'Complained', value: selected.total_complained, color: 'text-orange-600' },
              { label: 'Unsubscribed', value: selected.total_unsubscribed, color: 'text-gray-500' },
              { label: 'Recipients', value: selected.total_recipients, color: 'text-gray-900' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-lg font-semibold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500 mb-1">Subject: <span className="text-gray-900">{selected.subject}</span></p>
            <p className="text-sm text-gray-500 mb-1">From: <span className="text-gray-900">{selected.from_name} &lt;{selected.from_email}&gt;</span></p>
            {selected.sent_at && <p className="text-sm text-gray-500">Sent: <span className="text-gray-900">{fmtDate(selected.sent_at)}</span></p>}
          </div>
        </div>
      </div>
    );
  }

  // ── Compose View ──
  return (
    <div className="space-y-4">
      <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Back to campaigns
      </button>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">New Campaign</h3>

        {/* Template selector */}
        {templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start from template</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
              value={form.template_id}
              onChange={e => handleTemplateSelect(e.target.value)}
            >
              <option value="">— None —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.category})</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="March Newsletter" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Your monthly update" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Kyra AI" value={form.from_name} onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Email</label>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="noreply@kyra.conversionsystem.com" value={form.from_email} onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))} />
          </div>
        </div>

        {/* Email body */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Email Body (HTML)</label>
            <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700">
              <Eye className="w-3.5 h-3.5" /> {showPreview ? 'Edit' : 'Preview'}
            </button>
          </div>
          {showPreview ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <iframe
                srcDoc={form.html_body}
                className="w-full h-96 bg-white"
                sandbox=""
                title="Email preview"
              />
            </div>
          ) : (
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono h-64"
              placeholder="<div>Your email content here...</div>"
              value={form.html_body}
              onChange={e => setForm(f => ({ ...f, html_body: e.target.value }))}
            />
          )}
        </div>

        {/* Audience */}
        <div className="flex items-center gap-4 p-3 bg-indigo-50 rounded-lg">
          <Users className="w-5 h-5 text-indigo-600" />
          <div>
            <p className="text-sm font-medium text-indigo-900">
              Sending to {audienceCount !== null ? <span className="font-bold">{audienceCount}</span> : '...'} contacts
            </p>
            <p className="text-xs text-indigo-600">All active, non-unsubscribed contacts</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleSave} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
            Save as Draft
          </button>
          {!sendConfirm ? (
            <button
              onClick={async () => {
                // Save first, then confirm
                const res = await fetch(`/api/agency/clients/${clientId}/email/campaigns`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(form),
                });
                if (res.ok) {
                  const data = await res.json();
                  setSelected(data.campaign);
                  setSendConfirm(true);
                }
              }}
              disabled={!form.name || !form.subject || !form.from_name || !form.from_email || !form.html_body}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" /> Send Campaign
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-600 font-medium">Are you sure?</span>
              <button
                onClick={() => selected && handleSend(selected.id)}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Yes, Send Now
              </button>
              <button onClick={() => setSendConfirm(false)} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTACTS VIEW
// ══════════════════════════════════════════════════════════════════════════════

function ContactsView({ clientId }: { clientId: string }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', first_name: '', last_name: '', phone: '', tags: '' });
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/agency/clients/${clientId}/email/contacts?${params}`);
    const data = await res.json();
    setContacts(data.contacts || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [clientId, search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const tags = addForm.tags ? addForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    await fetch(`/api/agency/clients/${clientId}/email/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, tags }),
    });
    setShowAdd(false);
    setAddForm({ email: '', first_name: '', last_name: '', phone: '', tags: '' });
    load();
  };

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { setImporting(false); return; }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const emailIdx = headers.indexOf('email');
    if (emailIdx === -1) { setImporting(false); alert('CSV must have an "email" column'); return; }

    const fnIdx = headers.indexOf('first_name');
    const lnIdx = headers.indexOf('last_name');
    const phIdx = headers.indexOf('phone');
    const tagIdx = headers.indexOf('tags');

    const rows = lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim());
      return {
        email: cols[emailIdx],
        first_name: fnIdx >= 0 ? cols[fnIdx] : undefined,
        last_name: lnIdx >= 0 ? cols[lnIdx] : undefined,
        phone: phIdx >= 0 ? cols[phIdx] : undefined,
        tags: tagIdx >= 0 && cols[tagIdx] ? cols[tagIdx].split(';').map(t => t.trim()) : undefined,
      };
    }).filter(r => r.email);

    await fetch(`/api/agency/clients/${clientId}/email/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    });
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
    load();
  };

  const handleDeleteSelected = async (ids: string[]) => {
    await fetch(`/api/agency/clients/${clientId}/email/contacts`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    load();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-gray-900">Contacts <span className="text-sm text-gray-400 font-normal">({total})</span></h3>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            <input
              className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm w-48"
              placeholder="Search..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          {/* Status filter */}
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="bounced">Bounced</option>
          </select>
          {/* CSV import */}
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import CSV
          </button>
          {/* Add contact */}
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Add contact modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Add Contact</h4>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Email *" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="First Name" value={addForm.first_name} onChange={e => setAddForm(f => ({ ...f, first_name: e.target.value }))} />
              <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Last Name" value={addForm.last_name} onChange={e => setAddForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Phone" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} />
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Tags (comma separated)" value={addForm.tags} onChange={e => setAddForm(f => ({ ...f, tags: e.target.value }))} />
            <button onClick={handleAdd} disabled={!addForm.email} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              Add Contact
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No contacts yet</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Tags</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Source</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contacts.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-900">{c.email}</td>
                    <td className="px-4 py-2.5 text-gray-700">{[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td className="px-4 py-2.5">
                      {c.tags?.map(t => (
                        <span key={t} className="inline-block bg-indigo-50 text-indigo-700 text-xs px-1.5 py-0.5 rounded mr-1">{t}</span>
                      ))}
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-2.5 text-gray-500">{c.source}</td>
                    <td className="px-4 py-2.5 text-gray-400">{fmtDate(c.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleDeleteSelected([c.id])} className="text-gray-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {total > 50 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Page {page} of {Math.ceil(total / 50)}</p>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50">Prev</button>
                <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPLATES VIEW
// ══════════════════════════════════════════════════════════════════════════════

function TemplatesView({ clientId }: { clientId: string }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [preview, setPreview] = useState<Template | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', subject: '', html_body: '', category: 'custom' });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/agency/clients/${clientId}/email/templates`);
    const data = await res.json();
    setTemplates(data.templates || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    await fetch(`/api/agency/clients/${clientId}/email/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    });
    setShowCreate(false);
    setCreateForm({ name: '', subject: '', html_body: '', category: 'custom' });
    load();
  };

  const categoryColors: Record<string, string> = {
    welcome: 'bg-green-50 text-green-700',
    promotion: 'bg-red-50 text-red-700',
    newsletter: 'bg-indigo-50 text-indigo-700',
    'follow-up': 'bg-amber-50 text-amber-700',
    announcement: 'bg-blue-50 text-blue-700',
    're-engagement': 'bg-purple-50 text-purple-700',
    custom: 'bg-gray-50 text-gray-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Email Templates</h3>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Create Template
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">Create Template</h4>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Template Name" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
            <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Subject Line" value={createForm.subject} onChange={e => setCreateForm(f => ({ ...f, subject: e.target.value }))} />
            <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white" value={createForm.category} onChange={e => setCreateForm(f => ({ ...f, category: e.target.value }))}>
              <option value="custom">Custom</option>
              <option value="welcome">Welcome</option>
              <option value="promotion">Promotion</option>
              <option value="newsletter">Newsletter</option>
              <option value="follow-up">Follow-up</option>
              <option value="announcement">Announcement</option>
              <option value="re-engagement">Re-engagement</option>
            </select>
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono h-48" placeholder="HTML Body" value={createForm.html_body} onChange={e => setCreateForm(f => ({ ...f, html_body: e.target.value }))} />
            <button onClick={handleCreate} disabled={!createForm.name || !createForm.subject || !createForm.html_body} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              Create Template
            </button>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">{preview.name}</h4>
              <button onClick={() => setPreview(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-3">Subject: {preview.subject}</p>
            <iframe
              srcDoc={preview.html_body}
              className="w-full h-96 border border-gray-200 rounded-lg bg-white"
              sandbox=""
              title="Template preview"
            />
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => setPreview(t)}>
              <div className="h-32 bg-gray-50 relative overflow-hidden">
                <iframe
                  srcDoc={t.html_body}
                  className="w-full h-full pointer-events-none"
                  sandbox=""
                  title={t.name}
                  style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '200%' }}
                />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">{t.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${categoryColors[t.category] || categoryColors.custom}`}>{t.category}</span>
                </div>
                <p className="text-xs text-gray-400">{t.is_system ? 'System template' : fmtDate(t.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS VIEW
// ══════════════════════════════════════════════════════════════════════════════

function AnalyticsView({ clientId }: { clientId: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/agency/clients/${clientId}/email/campaigns`);
    const data = await res.json();
    setCampaigns((data.campaigns || []).filter((c: Campaign) => c.status === 'sent'));
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>;

  const totals = campaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + c.total_sent,
      opened: acc.opened + c.total_opened,
      clicked: acc.clicked + c.total_clicked,
      bounced: acc.bounced + c.total_bounced,
    }),
    { sent: 0, opened: 0, clicked: 0, bounced: 0 },
  );

  const recent10 = campaigns.slice(0, 10);
  const maxOpenRate = Math.max(...recent10.map(c => c.total_sent ? (c.total_opened / c.total_sent) * 100 : 0), 1);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sent', value: totals.sent.toLocaleString(), icon: Send, color: 'text-gray-900' },
          { label: 'Open Rate', value: pct(totals.opened, totals.sent), icon: Eye, color: 'text-indigo-600' },
          { label: 'Click Rate', value: pct(totals.clicked, totals.sent), icon: CheckCircle2, color: 'text-blue-600' },
          { label: 'Bounce Rate', value: pct(totals.bounced, totals.sent), icon: AlertTriangle, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign performance table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Campaign Performance</h3>
        </div>
        {campaigns.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">No sent campaigns yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="px-4 py-2">Campaign</th>
                  <th className="px-4 py-2 text-right">Sent</th>
                  <th className="px-4 py-2 text-right">Opens</th>
                  <th className="px-4 py-2 text-right">Clicks</th>
                  <th className="px-4 py-2 text-right">Bounces</th>
                  <th className="px-4 py-2 text-right">Unsubs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <p className="text-gray-900 font-medium">{c.name}</p>
                      <p className="text-xs text-gray-400">{fmtDate(c.sent_at)}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{c.total_sent}</td>
                    <td className="px-4 py-2.5 text-right text-indigo-600">{c.total_opened} ({pct(c.total_opened, c.total_sent)})</td>
                    <td className="px-4 py-2.5 text-right text-blue-600">{c.total_clicked} ({pct(c.total_clicked, c.total_sent)})</td>
                    <td className="px-4 py-2.5 text-right text-red-600">{c.total_bounced}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{c.total_unsubscribed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bar chart — last 10 campaigns open rates */}
      {recent10.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Open Rate — Last {recent10.length} Campaigns</h3>
          <div className="flex items-end gap-2 h-40">
            {recent10.map(c => {
              const rate = c.total_sent ? (c.total_opened / c.total_sent) * 100 : 0;
              const height = (rate / maxOpenRate) * 100;
              return (
                <div key={c.id} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{rate.toFixed(0)}%</span>
                  <div className="w-full bg-indigo-100 rounded-t-md relative" style={{ height: '120px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-indigo-500 rounded-t-md transition-all"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 truncate max-w-full" title={c.name}>{c.name.slice(0, 8)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
