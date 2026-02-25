'use client';

import { useState } from 'react';
import { FileText, Download, Copy, CheckCircle2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const INDUSTRIES = [
  { label: '🌿 Cannabis & Dispensary', price: '$1,500–$2,500', benefit: 'Handle 100s of daily product inquiries, recommend strains by effect, reduce phone calls 70%. Compliance-aware — never makes medical claims.' },
  { label: '🦷 Dental & Medical', price: '$800–$2,000', benefit: 'Books appointments, answers insurance questions, sends reminders, follows up on no-shows. Works 24/7 when staff can\'t.' },
  { label: '🏠 Real Estate', price: '$500–$1,500', benefit: 'Qualifies buyers and sellers 24/7, schedules showings, answers property questions. Never misses a 2am inquiry from a hot lead.' },
  { label: '⚖️ Legal / Law Firm', price: '$2,000–$5,000', benefit: 'Pre-qualifies clients, gathers case details, schedules consultations. Turns website visitors into booked consultations automatically.' },
  { label: '🚗 Automotive', price: '$1,000–$3,000', benefit: 'Qualifies buyers, schedules test drives, answers inventory and financing questions. Works nights and weekends when dealerships are closed.' },
  { label: '🍽️ Restaurant & Food', price: '$300–$800', benefit: 'Takes reservations, answers menu questions, handles special event bookings. Reduces phone interruptions during service 80%.' },
  { label: '💪 Fitness & Wellness', price: '$400–$1,200', benefit: 'Handles membership inquiries, books classes and personal training, converts trial visitors. Reduces front desk load during peak hours.' },
  { label: '🏨 Hotel & Hospitality', price: '$600–$2,000', benefit: 'Books rooms, answers amenity questions, makes local recommendations. 24/7 concierge at a fraction of the cost.' },
  { label: '📋 Insurance', price: '$1,500–$4,000', benefit: 'Gathers quote information, explains coverage options, books agent calls. Increases qualified leads without adding headcount.' },
  { label: '🧘 Spa & Beauty', price: '$400–$1,200', benefit: 'Books appointments, upsells packages, handles rescheduling. Reduces no-shows with automated reminders.' },
  { label: '🏦 Mortgage & Lending', price: '$1,000–$3,000', benefit: 'Pre-qualifies borrowers, explains loan products, books loan officer calls. Converts website traffic into applications.' },
  { label: '🎉 Events & Venues', price: '$500–$2,000', benefit: 'Checks availability, explains packages, books site tours. Never misses a venue inquiry while you\'re hosting an event.' },
  { label: '🔧 Home Services', price: '$400–$1,000', benefit: 'Handles service requests, books appointments, provides quotes. Captures leads at 11pm when competitors\' phones are off.' },
];

export default function ProposalPage() {
  const [agencyName, setAgencyName] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState(INDUSTRIES[0]);
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [copied, setCopied] = useState(false);

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const proposal = `AI EMPLOYEE PROPOSAL
${today}

Prepared by: ${agencyName || 'Your Agency'}
Prepared for: ${clientName || 'Your Client'}
Industry: ${selectedIndustry.label}

────────────────────────────────────────

WHAT WE'RE PROPOSING

An AI worker for ${clientName || 'your business'} that works 24 hours a day, 7 days a week — answering customer questions, booking appointments, and following up on leads. No sick days. No overtime. No training costs.

WHAT IT DOES

${selectedIndustry.benefit}

WHAT YOU GET

✓ AI worker live on your phone number (SMS) and website within 72 hours
✓ Configured specifically for ${selectedIndustry.label.split(' ').slice(1).join(' ')} industry
✓ Handles common customer questions without staff involvement
✓ Works 24/7 including nights, weekends, and holidays
✓ Full conversation logs so you see every interaction
✓ Setup, configuration, and ongoing management included

INVESTMENT

${monthlyPrice ? `$${monthlyPrice}/month` : selectedIndustry.price + '/month'}
Month-to-month. Cancel anytime.

For context: Most businesses spend 2–5 hours/week on the exact inquiries this AI will handle automatically. At $25–$50/hour, that's $200–$1,000/month in staff time — this pays for itself.

HOW WE START

1. You approve this proposal
2. We configure your AI worker (72 hours)
3. You test it and approve the responses
4. We connect it to your phone number / website
5. Done — your AI worker goes live

────────────────────────────────────────

Questions? Let's talk.

${agencyName || 'Your Agency'}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(proposal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="h-5 w-5 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900">Proposal Generator</h1>
        </div>
        <p className="text-sm text-gray-500">
          Fill in the details, copy the proposal, paste it into an email or doc, and send it to your prospect.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Config panel */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700">Proposal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Your Agency Name</label>
                <Input
                  placeholder="e.g. Conversion System"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Client / Prospect Name</label>
                <Input
                  placeholder="e.g. Purple Lotus Dispensary"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Industry</label>
                <div className="relative">
                  <select
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 appearance-none pr-8"
                    value={selectedIndustry.label}
                    onChange={(e) => {
                      const found = INDUSTRIES.find(i => i.label === e.target.value);
                      if (found) setSelectedIndustry(found);
                    }}
                  >
                    {INDUSTRIES.map((i) => (
                      <option key={i.label} value={i.label}>{i.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-xs text-green-600 mt-1.5 font-medium">Typical price: {selectedIndustry.price}/mo</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Your Monthly Price (optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input
                    className="pl-7"
                    placeholder={selectedIndustry.price.split('–')[0].replace('$', '').replace(',', '')}
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleCopy} className="w-full gap-2" size="lg">
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied to clipboard!' : 'Copy Proposal to Clipboard'}
          </Button>

          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <p className="text-xs font-semibold text-amber-800 mb-1">Pro tip</p>
            <p className="text-xs text-amber-700">
              Paste this into an email, Notion, or Google Doc. Add your logo at the top. 
              Most agencies close 40–60% of proposals sent to warm prospects.
            </p>
          </div>
        </div>

        {/* Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preview</p>
            <Badge variant="outline" className="text-[10px]">Live preview</Badge>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 font-mono text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
            {proposal}
          </div>
        </div>
      </div>
    </div>
  );
}
