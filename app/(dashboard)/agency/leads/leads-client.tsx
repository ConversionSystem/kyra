'use client';

import { useState, useCallback } from 'react';
import {
  Target, Mail, Linkedin,
  ChevronRight, Flame, Zap,
  Search, Trophy, Copy, CheckCircle2,
  Send, Rocket, Loader2, AlertCircle, ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import OutreachWebhookSetup from '@/components/dashboard/outreach-webhook-setup';

// ─── Lead Data ────────────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  agency: string;
  owner: string;
  niche: string;
  location: string;
  clients: string;
  ghlTier: string;
  warmth: 'hot' | 'warm' | 'cold';
  linkedin?: string;
  email?: string;
  why: string;
  angle: string;
}

const LEADS: Lead[] = [
  {
    id: 'l01', agency: 'Apex Digital Solutions', owner: 'Marcus Rivera', niche: 'Dental & Med Spa', location: 'Dallas, TX',
    clients: '30-60', ghlTier: 'Agency Pro', warmth: 'hot',
    email: 'marcus@apexdigital.io',
    why: 'Runs 35+ dental clients, all on GHL. Ideal match — dental AI follow-up drives instant ROI.',
    angle: 'Marcus — I see you run dental practices on GHL. We just helped a dental group book 40% more appointments with an AI that handles SMS follow-up in 60 seconds.',
  },
  {
    id: 'l02', agency: 'Funnel Architects', owner: 'Priya Nair', niche: 'Real Estate', location: 'Phoenix, AZ',
    clients: '15-30', ghlTier: 'Agency Starter', warmth: 'hot',
    linkedin: 'linkedin.com/in/priyanair',
    why: 'Real estate is Kyra\'s #2 use case — instant lead response is a massive pain point.',
    angle: 'Priya — real estate leads go cold in 5 minutes. We have an AI that replies to every inbound GHL lead in under 60 seconds. Interested in a demo?',
  },
  {
    id: 'l03', agency: 'GreenLeaf Marketing', owner: 'Tyler Brooks', niche: 'Cannabis', location: 'Denver, CO',
    clients: '8-15', ghlTier: 'Agency Starter', warmth: 'hot',
    why: 'Cannabis = our strongest vertical. Proven AI SMS results. Easy pitch.',
    angle:
      "Tyler — we've used AI SMS to drive significant revenue for cannabis clients. Would love to show you what that looks like inside GHL.",
  },
  {
    id: 'l04', agency: 'ScaleUp Agency', owner: 'Jordan Kim', niche: 'Home Services', location: 'Atlanta, GA',
    clients: '25-50', ghlTier: 'Agency Pro', warmth: 'warm',
    email: 'jordan@scaleup.agency',
    why: 'Home services = high call volume, massive SMS follow-up problem.',
    angle: 'Jordan — home services agencies lose 60% of leads because no one follows up fast enough. Our AI handles that automatically. Worth a quick look?',
  },
  {
    id: 'l05', agency: 'Velocity Digital', owner: 'Sarah Chen', niche: 'Auto Dealerships', location: 'Los Angeles, CA',
    clients: '20-40', ghlTier: 'Agency Pro', warmth: 'warm',
    linkedin: 'linkedin.com/in/sarahchen-velocity',
    why: 'Auto dealerships have high-value leads and are early AI adopters.',
    angle: 'Sarah — auto dealers spend $400+ per lead and then let them sit for hours. We cut response time to 60 seconds with AI. How many dealers are you running on GHL?',
  },
  {
    id: 'l06', agency: 'Momentum Marketing', owner: 'Alex Johnson', niche: 'Fitness & Gyms', location: 'Miami, FL',
    clients: '30-60', ghlTier: 'Agency Pro', warmth: 'warm',
    email: 'alex@momentummarketing.com',
    why: 'Fitness clubs have constant trial sign-up follow-up — perfect AI use case.',
    angle: 'Alex — gym leads who don\'t hear back in 10 minutes cancel 80% of the time. We\'ve solved this with AI. Worth 15 minutes to see how?',
  },
  {
    id: 'l07', agency: 'Click Funnels Agency', owner: 'Ryan Mitchell', niche: 'Law Firms', location: 'New York, NY',
    clients: '10-20', ghlTier: 'Agency Starter', warmth: 'hot',
    why: 'Law firm intake is a nightmare — AI handles it perfectly.',
    angle: 'Ryan — law firms lose clients to whoever answers fastest. Our AI handles intake SMS in under a minute, 24/7. Running any law firms on GHL?',
  },
  {
    id: 'l08', agency: 'Digital Surge', owner: 'Keisha Washington', niche: 'Restaurants', location: 'Chicago, IL',
    clients: '40-80', ghlTier: 'Agency Pro', warmth: 'cold',
    linkedin: 'linkedin.com/in/keishawashington',
    why: 'Restaurant reservation + catering inquiry handling = clear AI use case.',
    angle: 'Keisha — restaurants get dozens of inbound SMS and DMs they miss every day. AI handles reservations and catering inquiries automatically. Interested?',
  },
  {
    id: 'l09', agency: 'ProGrowth Partners', owner: 'David Lee', niche: 'Insurance', location: 'Houston, TX',
    clients: '15-35', ghlTier: 'Agency Starter', warmth: 'warm',
    email: 'david@progrowthpartners.com',
    why: 'Insurance quote follow-up has an insane drop-off — AI closes the gap.',
    angle: 'David — insurance prospects who don\'t get a quote response in 5 min move on. We keep them engaged automatically. Running any insurance clients on GHL?',
  },
  {
    id: 'l10', agency: 'Pinnacle Agency Group', owner: 'Micah Gaudio', niche: 'Multi-Niche', location: 'Austin, TX',
    clients: '50-100', ghlTier: 'Agency Pro', warmth: 'hot',
    linkedin: 'linkedin.com/in/micahgaudio',
    why: 'GHL Top 1% AI — strong signal. Multi-niche = can white-label Kyra for all clients.',
    angle: 'Micah — love what you\'re building in the GHL space. We built a platform specifically for agencies at your scale to offer AI employees to every client. Worth a quick call?',
  },
  {
    id: 'l11', agency: 'Funnel Gator', owner: 'Asma Ishaq', niche: 'E-commerce / Info Products', location: 'Tampa, FL',
    clients: '20-40', ghlTier: 'Agency Pro', warmth: 'hot',
    linkedin: 'linkedin.com/in/asmaishaq',
    why: 'Known in the GHL community — perfect early adopter + potential integration partner.',
    angle: 'Asma — saw your GHL work. We built something that plugs directly into GHL and acts as an AI employee for every client — SMS, follow-up, booking, the works. Curious?',
  },
  {
    id: 'l12', agency: 'SkyRocket Digital', owner: 'Brian Torres', niche: 'Chiropractic / Wellness', location: 'San Diego, CA',
    clients: '25-50', ghlTier: 'Agency Pro', warmth: 'warm',
    email: 'brian@skyrocketdigital.com',
    why: 'Chiro clinics = high appointment volume, AI booking saves front desk time.',
    angle: 'Brian — chiropractors are drowning in missed appointment follow-ups. Our AI handles the entire scheduling SMS sequence automatically. Any chiro clients on GHL?',
  },
  {
    id: 'l13', agency: 'Leverage Marketing', owner: 'Natalie Cruz', niche: 'Med Spa / Aesthetics', location: 'Scottsdale, AZ',
    clients: '15-30', ghlTier: 'Agency Starter', warmth: 'hot',
    why: 'Med spa = high ticket + high inbound inquiry volume = perfect AI match.',
    angle: 'Natalie — med spas get tons of "how much is Botox?" texts they never answer fast enough. Our AI replies instantly and books consultations. Running any aesthetics clients?',
  },
  {
    id: 'l14', agency: 'Digital Domination Agency', owner: 'Chris Thompson', niche: 'Roofing / Construction', location: 'Nashville, TN',
    clients: '20-45', ghlTier: 'Agency Pro', warmth: 'warm',
    email: 'chris@digitaldomination.agency',
    why: 'Roofing is high-ticket with lots of storm season inbound volume — AI screens perfectly.',
    angle: 'Chris — roofing contractors miss storm leads constantly. Our AI qualifies inbound SMS in 60 seconds and pushes hot leads to your clients. GHL-native.',
  },
  {
    id: 'l15', agency: 'Revenue Rockets', owner: 'Monica Patel', niche: 'Education / Tutoring', location: 'Boston, MA',
    clients: '10-20', ghlTier: 'Agency Starter', warmth: 'cold',
    linkedin: 'linkedin.com/in/monicapatel-revenue',
    why: 'Education enrollment inquiries go unanswered constantly — AI handles at scale.',
    angle: 'Monica — education clients miss 60%+ of enrollment inquiries. Our AI handles every inbound message, qualifies the lead, and books a call. Worth exploring?',
  },
  {
    id: 'l16', agency: 'Convert Digital', owner: 'James Wilson', niche: 'Solar', location: 'Las Vegas, NV',
    clients: '15-30', ghlTier: 'Agency Starter', warmth: 'warm',
    email: 'james@convertdigital.io',
    why: 'Solar = high cost per lead, AI follow-up saves thousands in wasted spend.',
    angle: 'James — solar agencies lose $300+ per lead when follow-up is slow. Our AI engages every inbound text in under a minute, 24/7. Any solar clients on GHL?',
  },
  {
    id: 'l17', agency: 'GHL Experts Co', owner: 'Samantha Reed', niche: 'Coaching / Consulting', location: 'Remote',
    clients: '20-50', ghlTier: 'Agency Pro', warmth: 'hot',
    linkedin: 'linkedin.com/in/samanthareed-ghl',
    why: 'GHL-branded agency = deep platform knowledge, natural Kyra partner.',
    angle: 'Samantha — we built something exclusively for GHL agencies that want to offer AI employees as a white-labeled service. Would love to show you in 15 minutes.',
  },
  {
    id: 'l18', agency: 'MaxImpact Agency', owner: 'Derek Moore', niche: 'HVAC / Plumbing', location: 'Columbus, OH',
    clients: '30-60', ghlTier: 'Agency Pro', warmth: 'cold',
    email: 'derek@maximpact.agency',
    why: 'HVAC/Plumbing = emergency service, 24/7 response time is massive.',
    angle: 'Derek — HVAC clients miss emergency service calls at night constantly. Our AI is always on, responds in 60 seconds, and routes hot leads immediately. Interested?',
  },
  {
    id: 'l19', agency: 'Agency Accelerator', owner: 'Lisa Park', niche: 'Financial Services', location: 'Seattle, WA',
    clients: '10-25', ghlTier: 'Agency Starter', warmth: 'warm',
    linkedin: 'linkedin.com/in/lisapark-agencyacc',
    why: 'Financial services + fast lead response = strong compliance and conversion play.',
    angle: 'Lisa — financial clients who respond to leads within a minute close 3x more. Our AI does that automatically, compliantly. Running any financial services on GHL?',
  },
  {
    id: 'l20', agency: 'Catalyst Growth Agency', owner: 'Tom Reynolds', niche: 'Pest Control', location: 'Orlando, FL',
    clients: '20-40', ghlTier: 'Agency Pro', warmth: 'warm',
    email: 'tom@catalystgrowth.co',
    why: 'Pest control = high frequency inbound, seasonal spikes, perfect for AI.',
    angle: 'Tom — pest control businesses get swamped with calls in summer and miss half of them. Our AI handles every inbound text 24/7. How many pest control clients do you run?',
  },
  {
    id: 'l21', agency: 'Digital Blueprint', owner: 'Amanda Foster', niche: 'Veterinary Clinics', location: 'Charlotte, NC',
    clients: '15-35', ghlTier: 'Agency Starter', warmth: 'cold',
    linkedin: 'linkedin.com/in/amandafoster-blueprint',
    why: 'Vet clinic appointment booking is ripe for AI — high emotional urgency.',
    angle: 'Amanda — pet owners text vet clinics at 2am and hear nothing. Our AI responds instantly and handles appointment booking automatically. Any vet clients on GHL?',
  },
  {
    id: 'l22', agency: 'Impact Media Group', owner: 'Carlos Ruiz', niche: 'Mortgage / Lending', location: 'Miami, FL',
    clients: '12-25', ghlTier: 'Agency Starter', warmth: 'hot',
    email: 'carlos@impactmedia.group',
    why: 'Mortgage = high value lead, time is critical, AI pre-qualification is huge.',
    angle: 'Carlos — mortgage leads that wait more than 5 minutes are 80% less likely to close. Our AI pre-qualifies via SMS instantly. Running any mortgage brokers on GHL?',
  },
  {
    id: 'l23', agency: 'TractionAI Agency', owner: 'Rachel Kim', niche: 'Ecom / Shopify Brands', location: 'Remote',
    clients: '10-20', ghlTier: 'Agency Starter', warmth: 'warm',
    linkedin: 'linkedin.com/in/rachelkim-traction',
    why: 'AI in "AI Agency" name signals strong product fit — they get AI value props.',
    angle: 'Rachel — you\'re already selling AI. We built the infrastructure that lets you add an actual AI employee to every client\'s GHL account. Worth a quick look?',
  },
  {
    id: 'l24', agency: 'Elevate Marketing Solutions', owner: 'Nathan Brooks', niche: 'Spa / Beauty Salons', location: 'Austin, TX',
    clients: '25-55', ghlTier: 'Agency Pro', warmth: 'warm',
    email: 'nathan@elevatemarketing.solutions',
    why: 'Beauty salons = booking is the entire business, AI booking = huge value.',
    angle: 'Nathan — salons lose 40% of new client requests because they don\'t reply fast enough. Our AI handles booking SMS automatically. How many salons are you managing on GHL?',
  },
  {
    id: 'l25', agency: 'Breakthrough Digital', owner: 'Jessica Long', niche: 'Senior Care / Home Health', location: 'Phoenix, AZ',
    clients: '8-20', ghlTier: 'Agency Starter', warmth: 'cold',
    email: 'jessica@breakthroughdigital.co',
    why: 'Senior care = high emotional urgency, families need instant response.',
    angle: 'Jessica — families looking for senior care make decisions fast. Our AI responds to every inbound inquiry in under 60 seconds, 24/7. Running any senior care clients?',
  },
];

// ─── Pipeline Config ──────────────────────────────────────────────────────────

const STAGES = [
  { id: 'new',       label: 'New',           color: 'bg-gray-100 text-gray-700',    dot: 'bg-gray-400',   count: 0 },
  { id: 'outreach',  label: 'Outreach Sent', color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500',   count: 0 },
  { id: 'replied',   label: 'Replied ✉️',    color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500',  count: 0 },
  { id: 'demo',      label: 'Demo Booked',   color: 'bg-purple-100 text-purple-700',dot: 'bg-purple-500', count: 0 },
  { id: 'trial',     label: 'In Trial',      color: 'bg-indigo-100 text-indigo-700',dot: 'bg-indigo-500', count: 0 },
  { id: 'closed',    label: 'Closed ✅',     color: 'bg-green-100 text-green-700',  dot: 'bg-green-500',  count: 0 },
  { id: 'no',        label: 'Not Interested',color: 'bg-red-100 text-red-600',      dot: 'bg-red-400',    count: 0 },
] as const;

type StageId = typeof STAGES[number]['id'];

const warmthConfig = {
  hot:  { label: '🔥 Hot',  className: 'bg-red-100 text-red-700' },
  warm: { label: '⚡ Warm', className: 'bg-amber-100 text-amber-700' },
  cold: { label: '🧊 Cold', className: 'bg-blue-100 text-blue-600' },
};

interface Props {
  initialPipelineState: Record<string, string>;
}

// ─── GHL Campaign Launch ──────────────────────────────────────────────────────

type CampaignStatus = 'idle' | 'launching' | 'enrolled' | 'error' | 'no_webhook';

// ─── Component ────────────────────────────────────────────────────────────────

export function LeadsPipelineClient({ initialPipelineState }: Props) {
  const [pipeline, setPipeline] = useState<Record<string, StageId>>(() => {
    const state: Record<string, StageId> = {};
    for (const lead of LEADS) {
      state[lead.id] = (initialPipelineState[lead.id] as StageId) || 'new';
    }
    return state;
  });
  const [saving, setSaving] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filter, setFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // ── Campaign state ──────────────────────────────────────────────────────────
  const [campaignStatus, setCampaignStatus] = useState<Record<string, CampaignStatus>>({});
  const [bulkLaunching, setBulkLaunching] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ enrolled: number; errors: number; noWebhook?: boolean } | null>(null);

  const updateStage = useCallback(async (leadId: string, stage: StageId) => {
    const next = { ...pipeline, [leadId]: stage };
    setPipeline(next);
    setSaving(true);
    try {
      await fetch('/api/agency/sales-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline: next }),
      });
    } finally {
      setSaving(false);
    }
  }, [pipeline]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Enroll single lead in GHL campaign ──────────────────────────────────────
  const enrollLead = async (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation();
    if (campaignStatus[lead.id] === 'launching' || campaignStatus[lead.id] === 'enrolled') return;

    setCampaignStatus(prev => ({ ...prev, [lead.id]: 'launching' }));
    try {
      const res = await fetch('/api/agency/leads/push-ghl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: [lead] }),
      });
      const data = await res.json();

      if (data.status === 'no_webhook') {
        setCampaignStatus(prev => ({ ...prev, [lead.id]: 'no_webhook' }));
      } else if (data.enrolled > 0) {
        setCampaignStatus(prev => ({ ...prev, [lead.id]: 'enrolled' }));
        // Auto-advance to "outreach" stage
        await updateStage(lead.id, 'outreach');
      } else {
        setCampaignStatus(prev => ({ ...prev, [lead.id]: 'error' }));
      }
    } catch {
      setCampaignStatus(prev => ({ ...prev, [lead.id]: 'error' }));
    }
  };

  // ── Bulk launch all hot leads ────────────────────────────────────────────────
  const launchAllHotLeads = async () => {
    if (bulkLaunching) return;
    const hotLeadsList = LEADS.filter(l => l.warmth === 'hot' && pipeline[l.id] === 'new');
    if (hotLeadsList.length === 0) return;

    setBulkLaunching(true);
    setBulkResult(null);

    // Set all to launching
    const statusUpdate: Record<string, CampaignStatus> = {};
    for (const l of hotLeadsList) statusUpdate[l.id] = 'launching';
    setCampaignStatus(prev => ({ ...prev, ...statusUpdate }));

    try {
      const res = await fetch('/api/agency/leads/push-ghl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: hotLeadsList, bulkMode: true }),
      });
      const data = await res.json();

      if (data.status === 'no_webhook') {
        const noWebhookUpdate: Record<string, CampaignStatus> = {};
        for (const l of hotLeadsList) noWebhookUpdate[l.id] = 'no_webhook';
        setCampaignStatus(prev => ({ ...prev, ...noWebhookUpdate }));
        setBulkResult({ enrolled: 0, errors: 0, noWebhook: true });
      } else if (data.results) {
        const resultUpdate: Record<string, CampaignStatus> = {};
        for (const r of data.results as Array<{ id: string; status: string }>) {
          resultUpdate[r.id] = r.status === 'enrolled' ? 'enrolled' : 'error';
        }
        setCampaignStatus(prev => ({ ...prev, ...resultUpdate }));

        // Auto-advance enrolled leads to "outreach" stage
        const newPipeline = { ...pipeline };
        for (const r of data.results as Array<{ id: string; status: string }>) {
          if (r.status === 'enrolled') newPipeline[r.id] = 'outreach';
        }
        setPipeline(newPipeline);
        setSaving(true);
        await fetch('/api/agency/sales-pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pipeline: newPipeline }),
        }).finally(() => setSaving(false));

        setBulkResult({ enrolled: data.enrolled ?? 0, errors: data.errors ?? 0 });
      }
    } catch {
      const errUpdate: Record<string, CampaignStatus> = {};
      for (const l of hotLeadsList) errUpdate[l.id] = 'error';
      setCampaignStatus(prev => ({ ...prev, ...errUpdate }));
      setBulkResult({ enrolled: 0, errors: hotLeadsList.length });
    } finally {
      setBulkLaunching(false);
    }
  };

  const filtered = LEADS.filter(l => {
    if (filter !== 'all' && l.warmth !== filter) return false;
    if (search && !l.agency.toLowerCase().includes(search.toLowerCase()) &&
        !l.niche.toLowerCase().includes(search.toLowerCase()) &&
        !l.owner.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const hotLeads = LEADS.filter(l => l.warmth === 'hot').length;
  const hotNew = LEADS.filter(l => l.warmth === 'hot' && pipeline[l.id] === 'new').length;
  const inProgress = LEADS.filter(l => !['new', 'no'].includes(pipeline[l.id])).length;
  const closed = LEADS.filter(l => pipeline[l.id] === 'closed').length;
  const enrolled = Object.values(campaignStatus).filter(s => s === 'enrolled').length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-500" />
            Sales Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            25 curated GHL agencies — warm leads, personalized openers, one-click outreach.
          </p>
        </div>

        {/* 🚀 Bulk Launch Button */}
        <div className="flex flex-col items-end gap-2">
          <Button
            onClick={launchAllHotLeads}
            disabled={bulkLaunching || hotNew === 0}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-sm font-semibold text-sm px-4 py-2 flex items-center gap-2"
          >
            {bulkLaunching
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Launching…</>
              : <><Rocket className="h-4 w-4" /> 🔥 Launch All Hot Leads ({hotNew})</>}
          </Button>
          {saving && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
        </div>
      </div>

      {/* Bulk result banner */}
      {bulkResult && (
        <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${
          bulkResult.noWebhook
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : bulkResult.enrolled > 0
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {bulkResult.noWebhook ? (
            <div className="space-y-1">
              <p className="font-semibold">⚠️ GHL webhook not connected</p>
              <p className="text-sm">Connect the webhook in the setup panel above to auto-enroll leads in GHL email campaigns.</p>
            </div>
          ) : (
            <p>
              <CheckCircle2 className="h-4 w-4 inline mr-1 text-green-600" />
              <strong>{bulkResult.enrolled} leads enrolled</strong> in GHL campaign
              {bulkResult.errors > 0 && ` · ${bulkResult.errors} failed`}.
              {' '}Pipeline stages auto-advanced to "Outreach Sent".
            </p>
          )}
        </div>
      )}

      {/* Outreach Webhook Setup — shows only when GHL webhook not connected */}
      <OutreachWebhookSetup compact />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Flame,     label: 'Hot leads',     value: hotLeads,    color: 'text-red-500' },
          { icon: Zap,       label: 'In progress',   value: inProgress,  color: 'text-indigo-500' },
          { icon: Trophy,    label: 'Closed',        value: closed,      color: 'text-green-600' },
          { icon: Send,      label: 'In Campaign',   value: enrolled,    color: 'text-blue-500' },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
              <p className="text-2xl font-black text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agencies…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        {(['all', 'hot', 'warm', 'cold'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'hot' ? '🔥' : f === 'warm' ? '⚡' : f === 'cold' ? '🧊' : ''}
            {f === 'all' ? 'All leads' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Pipeline Kanban — desktop stages summary */}
      <div className="hidden lg:grid grid-cols-7 gap-2">
        {STAGES.map(stage => {
          const count = filtered.filter(l => pipeline[l.id] === stage.id).length;
          return (
            <div key={stage.id} className={`rounded-lg px-3 py-2 text-center ${stage.color}`}>
              <p className="text-xs font-semibold truncate">{stage.label}</p>
              <p className="text-xl font-black mt-0.5">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Lead cards */}
      <div className="space-y-2">
        {filtered.map(lead => {
          const stage = pipeline[lead.id] || 'new';
          const stageInfo = STAGES.find(s => s.id === stage)!;
          const warmth = warmthConfig[lead.warmth];
          const cStatus = campaignStatus[lead.id] ?? 'idle';

          return (
            <div
              key={lead.id}
              className={`border rounded-xl p-4 cursor-pointer transition-all hover:shadow-sm hover:border-indigo-200 ${
                selectedLead?.id === lead.id ? 'border-indigo-300 bg-indigo-50/50 shadow-sm' : 'border-gray-200 bg-white'
              }`}
              onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
            >
              {/* Lead row */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm">{lead.agency}</p>
                    <span className="text-xs text-gray-400">·</span>
                    <p className="text-xs text-gray-500">{lead.owner}</p>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${warmth.className}`}>
                      {warmth.label}
                    </span>
                    {/* Campaign badge */}
                    {cStatus === 'enrolled' && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                        <Send className="h-2.5 w-2.5" /> In Campaign
                      </span>
                    )}
                    {cStatus === 'error' && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-2.5 w-2.5" /> Failed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lead.niche} · {lead.location} · {lead.clients} clients
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${stageInfo.color}`}>
                    {stageInfo.label}
                  </span>
                  <ChevronRight className={`h-4 w-4 text-gray-300 transition-transform ${selectedLead?.id === lead.id ? 'rotate-90' : ''}`} />
                </div>
              </div>

              {/* Expanded detail */}
              {selectedLead?.id === lead.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                  {/* Why they're a fit */}
                  <div className="flex gap-2 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <span className="text-lg leading-none">💡</span>
                    <p className="text-xs text-amber-800">{lead.why}</p>
                  </div>

                  {/* Opening line */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-gray-600">Personalized opener</p>
                      <button
                        onClick={e => { e.stopPropagation(); copy(lead.angle, lead.id + '_angle'); }}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        {copied === lead.id + '_angle'
                          ? <><CheckCircle2 className="h-3 w-3 text-green-500" /> Copied</>
                          : <><Copy className="h-3 w-3" /> Copy</>}
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-100 italic">
                      "{lead.angle}"
                    </p>
                  </div>

                  {/* Contact links + pitch link + GHL enroll */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {lead.email && (
                      <a
                        href={(() => {
                          const niche = lead.niche.toLowerCase().replace(/[^a-z]/g, '');
                          const params = new URLSearchParams({ name: lead.owner, agency: lead.agency, niche });
                          const pitchUrl = `https://kyra.conversionsystem.com/for?${params.toString()}`;
                          const subject = encodeURIComponent(`Quick question about AI for your ${lead.niche} clients`);
                          const body = encodeURIComponent(`${lead.angle}\n\nI put together a quick page just for you: ${pitchUrl}\n\nWorth a look? Happy to jump on a 15-minute call.\n\nAngel`);
                          return `mailto:${lead.email}?subject=${subject}&body=${body}`;
                        })()}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
                      >
                        <Mail className="h-3.5 w-3.5" /> Send Email
                      </a>
                    )}
                    {lead.linkedin && (
                      <a
                        href={`https://${lead.linkedin}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                      >
                        <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                      </a>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        const niche = lead.niche.toLowerCase().replace(/[^a-z]/g, '');
                        const params = new URLSearchParams({
                          name: lead.owner,
                          agency: lead.agency,
                          niche: niche,
                        });
                        const url = `https://kyra.conversionsystem.com/for?${params.toString()}`;
                        copy(url, lead.id + '_pitch');
                      }}
                      className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
                    >
                      {copied === lead.id + '_pitch'
                        ? <><CheckCircle2 className="h-3 w-3 text-green-500" /> Pitch link copied!</>
                        : <><Copy className="h-3 w-3" /> Copy pitch link</>}
                    </button>

                    {/* GHL Campaign Enroll button */}
                    <button
                      onClick={e => enrollLead(lead, e)}
                      disabled={cStatus === 'launching' || cStatus === 'enrolled'}
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                        cStatus === 'enrolled'
                          ? 'bg-blue-100 text-blue-700 cursor-default'
                          : cStatus === 'launching'
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : cStatus === 'error'
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                      }`}
                    >
                      {cStatus === 'launching' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {cStatus === 'enrolled'  && <CheckCircle2 className="h-3 w-3 text-blue-600" />}
                      {cStatus === 'error'     && <AlertCircle className="h-3 w-3" />}
                      {cStatus === 'idle'      && <Send className="h-3 w-3" />}
                      {cStatus === 'no_webhook' && <AlertCircle className="h-3 w-3" />}
                      {cStatus === 'launching'  ? 'Enrolling…'
                        : cStatus === 'enrolled'  ? 'In Campaign ✓'
                        : cStatus === 'error'     ? 'Retry'
                        : cStatus === 'no_webhook'? 'No Webhook'
                        : '📧 Enroll in GHL'}
                    </button>
                  </div>

                  {/* No-webhook hint */}
                  {cStatus === 'no_webhook' && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                      <strong>GHL webhook not connected.</strong>{' '}
                      Use the setup panel at the top of this page to connect your GHL outreach workflow in ~5 minutes.
                    </div>
                  )}

                  {/* Stage buttons */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">Move to stage:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {STAGES.map(s => (
                        <button
                          key={s.id}
                          onClick={e => { e.stopPropagation(); updateStage(lead.id, s.id); }}
                          className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all ${
                            pipeline[lead.id] === s.id
                              ? `${s.color} ring-2 ring-offset-1 ring-current`
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm border border-dashed rounded-xl">
          No leads match your filter.
        </div>
      )}
    </div>
  );
}
