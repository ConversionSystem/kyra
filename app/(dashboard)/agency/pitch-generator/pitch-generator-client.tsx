'use client';

import { useState } from 'react';
import { Copy, CheckCircle2, ExternalLink, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const INDUSTRIES = [
  { id: 'dental',      emoji: '🦷', label: 'Dental',      desc: 'AI receptionist — books appointments, insurance questions' },
  { id: 'realestate',  emoji: '🏡', label: 'Real Estate',  desc: 'AI lead qualifier — books showings, qualifies buyers' },
  { id: 'auto',        emoji: '🚗', label: 'Auto',         desc: 'AI sales assistant — inventory Q&A, test drive bookings' },
  { id: 'cannabis',    emoji: '🌿', label: 'Cannabis',     desc: 'AI budtender — age verification, product guidance' },
  { id: 'restaurant',  emoji: '🍽️', label: 'Restaurant',   desc: 'AI host — reservations, menu questions, catering' },
  { id: 'medspa',      emoji: '✨', label: 'Med Spa',       desc: 'AI concierge — consultation bookings, treatment info' },
];

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://kyra.conversionsystem.com';

interface Props { agencyId: string; agencyName: string; }

export default function PitchGeneratorClient({ agencyId, agencyName }: Props) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const pitchUrl = (industry: string) =>
    `${BASE_URL}/pitch/${agencyId}/${industry}`;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl space-y-6">
      {/* General pitch deck (not white-labeled) */}
      <div className="bg-indigo-600 rounded-xl p-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-bold text-white text-sm">🎯 General Sales Pitch Deck</p>
          <p className="text-indigo-200 text-xs mt-0.5">10-slide interactive deck — share this URL in any sales call or email</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href="/pitch" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-2 rounded-lg transition">
            <ExternalLink className="h-3.5 w-3.5" /> Preview
          </a>
          <button onClick={() => copy(`${BASE_URL}/pitch`, 'pitch-deck')}
            className="flex items-center gap-1.5 bg-white text-indigo-600 hover:bg-indigo-50 text-xs font-bold px-3 py-2 rounded-lg transition">
            {copied === 'pitch-deck' ? <><CheckCircle2 className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy link</>}
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Link2 className="h-6 w-6 text-indigo-500" />
          White-Label Pitch Pages
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Send these links to prospects. Each page shows an animated AI demo for their industry, a ROI calculator, and your agency's branding — no login required.
        </p>
      </div>

      {/* How it works */}
      <Card className="bg-indigo-50 border-indigo-100">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap gap-6 text-sm">
            {[
              { n: '1', text: 'Copy the link for their industry' },
              { n: '2', text: 'Paste it in a text, email, or DM' },
              { n: '3', text: 'Prospect sees a live AI demo + ROI calculator' },
              { n: '4', text: 'They click "Book a Demo" — it goes straight to you' },
            ].map(step => (
              <div key={step.n} className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{step.n}</div>
                <span className="text-gray-700">{step.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Industry links grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {INDUSTRIES.map(ind => {
          const url = pitchUrl(ind.id);
          const key = ind.id;
          const isCopied = copied === key;

          return (
            <Card key={ind.id} className="hover:border-indigo-200 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{ind.emoji}</span>
                  <div>
                    <CardTitle className="text-base">{ind.label}</CardTitle>
                    <CardDescription className="text-xs">{ind.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-500 font-mono truncate flex-1">{url}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => copy(url, key)}
                  >
                    {isCopied
                      ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Copied!</>
                      : <><Copy className="h-3.5 w-3.5" /> Copy link</>
                    }
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1.5"
                    onClick={() => window.open(url, '_blank')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Copy all links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Copy all links at once</CardTitle>
          <CardDescription className="text-xs">Paste this into your CRM or sales tracking sheet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 font-mono text-xs text-blue-700 space-y-1 mb-3">
            {INDUSTRIES.map(ind => (
              <div key={ind.id}>{ind.label}: {pitchUrl(ind.id)}</div>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5"
            onClick={() => copy(
              INDUSTRIES.map(ind => `${ind.label}: ${pitchUrl(ind.id)}`).join('\n'),
              'all'
            )}
          >
            {copied === 'all' ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy all</>}
          </Button>
        </CardContent>
      </Card>

      {/* Tip */}
      <div className="text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-3">
        <strong className="text-gray-600">💡 Pro tip:</strong> Add your booking calendar link in <strong>Settings → Calendar URL</strong> and it automatically populates the "Book a Demo" button on all your pitch pages.
      </div>
    </div>
  );
}
