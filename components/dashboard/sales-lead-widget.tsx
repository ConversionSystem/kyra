'use client';

// Sales lead widget — shows Angel the hottest uncontacted pipeline lead with a ready-to-send opener
// Master-only, shown on the agency dashboard home

import { useState } from 'react';
import Link from 'next/link';
import { Target, Copy, CheckCircle2, Flame, ChevronRight } from 'lucide-react';

interface Lead {
  id: string;
  agency: string;
  owner: string;
  niche: string;
  location: string;
  warmth: 'hot' | 'warm' | 'cold';
  email?: string;
  angle: string;
}

const HOT_LEADS: Lead[] = [
  {
    id: 'l01', agency: 'Apex Digital Solutions', owner: 'Marcus Rivera', niche: 'Dental & Med Spa', location: 'Dallas, TX', warmth: 'hot', email: 'marcus@apexdigital.io',
    angle: 'Marcus — I see you run dental practices on GHL. We just helped a dental group book 40% more appointments with an AI that handles SMS follow-up in 60 seconds.',
  },
  {
    id: 'l07', agency: 'Click Funnels Agency', owner: 'Ryan Mitchell', niche: 'Law Firms', location: 'New York, NY', warmth: 'hot',
    angle: 'Ryan — law firms lose clients to whoever answers fastest. Our AI handles intake SMS in under a minute, 24/7. Running any law firms on GHL?',
  },
  {
    id: 'l10', agency: 'Pinnacle Agency Group', owner: 'Micah Gaudio', niche: 'Multi-Niche', location: 'Austin, TX', warmth: 'hot',
    angle: 'Micah — love what you\'re building in the GHL space. We built a platform specifically for agencies at your scale to offer AI workers to every client. Worth a quick call?',
  },
  {
    id: 'l11', agency: 'Funnel Gator', owner: 'Asma Ishaq', niche: 'E-commerce / Info Products', location: 'Tampa, FL', warmth: 'hot',
    angle: 'Asma — saw your GHL work. We built something that plugs directly into GHL and acts as an AI worker for every client — SMS, follow-up, booking, the works. Curious?',
  },
  {
    id: 'l13', agency: 'Leverage Marketing', owner: 'Natalie Cruz', niche: 'Med Spa / Aesthetics', location: 'Scottsdale, AZ', warmth: 'hot',
    angle: 'Natalie — med spas get tons of "how much is Botox?" texts they never answer fast enough. Our AI replies instantly and books consultations. Running any aesthetics clients?',
  },
  {
    id: 'l02', agency: 'Funnel Architects', owner: 'Priya Nair', niche: 'Real Estate', location: 'Phoenix, AZ', warmth: 'hot',
    angle: 'Priya — real estate leads go cold in 5 minutes. We have an AI that replies to every inbound GHL lead in under 60 seconds. Interested in a demo?',
  },
  {
    id: 'l03', agency: 'GreenLeaf Marketing', owner: 'Tyler Brooks', niche: 'Cannabis', location: 'Denver, CO', warmth: 'hot',
    angle:
      "Tyler — we've used AI SMS to drive significant revenue for cannabis clients. Would love to show you what that looks like inside GHL.",
  },
  {
    id: 'l22', agency: 'Impact Media Group', owner: 'Carlos Ruiz', niche: 'Mortgage / Lending', location: 'Miami, FL', warmth: 'hot', email: 'carlos@impactmedia.group',
    angle: 'Carlos — mortgage leads that wait more than 5 minutes are 80% less likely to close. Our AI pre-qualifies via SMS instantly. Running any mortgage brokers on GHL?',
  },
];

interface Props {
  // pipeline state from agencies.settings (lead id → stage)
  pipelineState: Record<string, string>;
}

export function SalesLeadWidget({ pipelineState }: Props) {
  const [idx, setIdx] = useState(0);
  const [copied, setCopied] = useState<'dm' | 'link' | null>(null);

  // Filter out already-contacted leads
  const uncontacted = HOT_LEADS.filter(l => {
    const stage = pipelineState[l.id] || 'new';
    return stage === 'new';
  });

  if (uncontacted.length === 0) {
    return (
      <div className="border border-dashed border-gray-200 rounded-xl p-5 text-center text-sm text-gray-400">
        🎉 All hot leads contacted! Check the{' '}
        <Link href="/agency/clients" className="text-indigo-600 underline">full pipeline</Link> for warm leads.
      </div>
    );
  }

  const lead = uncontacted[idx % uncontacted.length];

  const pitchUrl = `https://kyra.conversionsystem.com/for?${new URLSearchParams({
    name: lead.owner,
    agency: lead.agency,
    niche: lead.niche.toLowerCase().replace(/[^a-z]/g, ''),
  }).toString()}`;

  const copy = (text: string, type: 'dm' | 'link') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="border border-indigo-200 bg-indigo-50/50 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-red-500" />
          <p className="text-sm font-bold text-gray-900">Next hot lead to contact</p>
          <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
            {uncontacted.length} remaining
          </span>
        </div>
        <Link href="/agency/clients" className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5">
          Full pipeline <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mb-3">
        <p className="font-semibold text-gray-900">{lead.agency}</p>
        <p className="text-xs text-gray-500">{lead.owner} · {lead.niche} · {lead.location}</p>
      </div>

      <div className="bg-white border border-indigo-100 rounded-lg p-3 mb-3">
        <p className="text-xs text-gray-500 font-semibold mb-1">Personalized opener:</p>
        <p className="text-sm text-gray-700 italic leading-relaxed">"{lead.angle}"</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => copy(lead.angle, 'dm')}
          className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-2 rounded-lg transition"
        >
          {copied === 'dm' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied === 'dm' ? 'Copied!' : 'Copy DM'}
        </button>
        <button
          onClick={() => copy(pitchUrl, 'link')}
          className="flex items-center gap-1.5 text-xs bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold px-3 py-2 rounded-lg transition"
        >
          {copied === 'link' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Target className="h-3.5 w-3.5" />}
          {copied === 'link' ? 'Copied!' : 'Copy pitch link'}
        </button>
        {uncontacted.length > 1 && (
          <button
            onClick={() => setIdx(i => i + 1)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-2 transition"
          >
            Next lead →
          </button>
        )}
      </div>
    </div>
  );
}
