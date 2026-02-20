'use client';

import { useState } from 'react';
import { Copy, CheckCircle2, Mail, MessageSquare, PhoneCall, ChevronDown, ChevronRight, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Tab = 'email' | 'linkedin' | 'sms' | 'objections';

interface Template {
  industry: string;
  subject?: string;
  body: string;
  tag?: string;
}

const EMAIL_TEMPLATES: Template[] = [
  {
    industry: '🌿 Cannabis Dispensary',
    tag: 'HIGHEST MARGIN',
    subject: 'Quick question about your dispensary's text messages',
    body: `Hi [Owner Name],

Quick question: how many texts does your dispensary get per day asking about strains, hours, and deals?

Most dispensaries we work with get 50–100+ texts daily. Their staff handles every single one manually. It's killing productivity during peak hours.

We've deployed AI employees for cannabis dispensaries that answer those texts automatically — within 60 seconds, 24/7. Compliance-aware, so they never make medical claims.

One of our dispensary clients reduced phone interruptions by 70% in the first month.

Worth a 15-minute call to see if it makes sense for you?

— [Your Name]
[Agency Name]`,
  },
  {
    industry: '⚖️ Law Firm',
    subject: 'Turning your website visitors into consultations automatically',
    body: `Hi [Attorney Name],

Most law firms lose 40–60% of website inquiries because they come in at night or on weekends when no one's available.

I help law firms deploy an AI intake specialist that works 24/7 — it gathers case details, pre-qualifies leads, and books consultations automatically. Your team only touches cases that are already qualified.

Firms using this typically double their consultation volume without adding staff.

Happy to show you a live demo. 15 minutes?

— [Your Name]`,
  },
  {
    industry: '🦷 Dental Practice',
    subject: 'Reducing no-shows and filling cancellations automatically',
    body: `Hi Dr. [Name],

Dental practices lose an average of $50,000/year to no-shows and last-minute cancellations.

I help practices deploy an AI that handles appointment reminders, fills cancellation slots, and answers new patient questions 24/7. It connects directly to your existing scheduling system.

One of our dental clients reduced no-shows by 45% in 90 days.

Do you have 15 minutes to see how it works for your practice?

— [Your Name]`,
  },
  {
    industry: '🏠 Real Estate Agent',
    subject: '2am leads becoming booked showings by 9am',
    body: `Hi [Agent Name],

Real estate leads contact you at all hours. The agents who win aren't necessarily the best — they're the ones who respond first.

I help agents and brokerages deploy an AI that responds to every inquiry within 60 seconds, qualifies buyers and sellers, and books showings — even at 2am.

Agents using this see 30–50% more booked showings from the same lead volume.

Want to see a 5-minute demo?

— [Your Name]`,
  },
  {
    industry: '🚗 Auto Dealership',
    subject: 'After-hours leads (your biggest missed opportunity)',
    body: `Hi [Manager Name],

Studies show 40% of car buyers research and contact dealerships after 6pm. Most dealerships miss all of those leads.

We deploy AI employees for dealerships that respond to every inquiry 24/7 — answers questions about inventory, financing, and trade-ins, then books test drives.

One dealership we work with added 12 booked appointments in the first week just from after-hours leads they were previously missing.

Quick call to see if it makes sense for your store?

— [Your Name]`,
  },
];

const LINKEDIN_TEMPLATES: Template[] = [
  {
    industry: '🌿 Cannabis / Dispensary',
    body: `Hey [Name] — saw you're running [Dispensary Name]. Quick question: how are you handling the 50+ product inquiries you probably get by text every day? We've built AI employees specifically for dispensaries that handle those automatically. Happy to show you a live demo if you're curious.`,
  },
  {
    industry: '⚖️ Legal',
    body: `Hi [Name] — I noticed your firm handles [practice area]. A lot of firms in your space are using AI intake assistants to capture and qualify leads 24/7. One firm went from missing 60% of after-hours inquiries to booking every single one automatically. Worth 10 minutes to see if it'd work for you?`,
  },
  {
    industry: '🏠 Real Estate',
    body: `Hi [Name] — Love what you're doing with [listings/team name]. Quick question: are you responding to every lead within 5 minutes? We help agents deploy an AI that responds in under 60 seconds and books showings automatically. Doubled booked appointments for one of our agents. Curious?`,
  },
  {
    industry: '💊 Medical/Aesthetics',
    body: `Hi [Name] — Do you find your staff spends a lot of time answering the same questions about procedures and pricing? We deploy AI employees for medical aesthetics practices that handle those automatically — so your team focuses on patients, not phone calls. Happy to show you how it works.`,
  },
];

const SMS_TEMPLATES: Template[] = [
  {
    industry: 'Cold outreach follow-up',
    body: `Hi [Name], this is [Your Name] from [Agency]. I sent you an email about AI employees for [their industry]. Worth a 10-minute call? Can do any time this week — just say when.`,
  },
  {
    industry: 'After demo follow-up',
    body: `Hi [Name] — great talking with you! Here's the proposal I mentioned: [link]. Main thing: your AI employee can be live in 72 hours. Questions? Just text back.`,
  },
  {
    industry: 'Referral ask',
    body: `Hey [Name], quick favor — do you know any [industry] owners who'd want an AI that answers their customers 24/7? If you refer someone who signs up, I'll give you both a discount. Just reply with a name and I'll reach out.`,
  },
];

const OBJECTIONS = [
  {
    objection: '"We already have a chatbot."',
    response: `"Totally get it. Most chatbots are glorified FAQ pages — they match keywords and give canned responses. What we build is a genuine AI employee: it understands context, recommends products, books appointments, and handles multi-turn conversations. The difference is whether it actually replaces staff time or just sits there. Want to see the difference in a live demo?"`,
  },
  {
    objection: '"Our customers prefer talking to real people."',
    response: `"That's true for complex situations — and your team handles those. But 70% of customer questions are 'Are you open?' 'Do you have X?' 'What are your prices?' — those don't need a human, and customers actually prefer getting answers in 30 seconds vs waiting on hold. We free your team for the conversations that actually matter."`,
  },
  {
    objection: '"It's too expensive."',
    response: `"Let me flip that: what does it cost when a lead texts at 9pm and no one replies until morning? Or when a budtender stops helping a customer to answer a phone call? Most of our clients save 10–15 hours of staff time per month. At $25/hr that's $250–$375 in recovered productivity. The AI costs less than that."`,
  },
  {
    objection: '"We're too small / we don't have enough volume."',
    response: `"This actually works best for smaller businesses — you can't afford to hire a dedicated customer service rep, but you DO lose sales every day because you can't answer everyone. One missed customer a week at average transaction value — what does that add up to over a year?"`,
  },
  {
    objection: '"We tried AI before and it didn't work."',
    response: `"That's fair and I hear this a lot. Most AI tools fail because they're generic — they don't know your business, your products, or your customers. What we deploy is specifically trained on your business: your products, your prices, your FAQs, your tone. And we set it up for you — you don't need to configure anything."`,
  },
  {
    objection: '"What if the AI says something wrong?"',
    response: `"Great question. You review and approve every response before we go live. You see every conversation in real-time. If the AI says something off, you can correct it in the dashboard and it learns. It's not a black box — you're always in control. And it's specifically trained on your content, so it can only answer what you've told it."`,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ObjectionCard({ objection, response }: { objection: string; response: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-gray-900 text-sm">{objection}</span>
        {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 bg-green-50 border-t border-gray-100">
          <div className="flex items-start justify-between gap-2 mt-3">
            <p className="text-sm text-gray-700 italic leading-relaxed">{response}</p>
            <CopyButton text={response} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function SalesKitPage() {
  const [activeTab, setActiveTab] = useState<Tab>('email');

  const tabs: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: 'email', label: 'Cold Emails', icon: Mail, count: EMAIL_TEMPLATES.length },
    { id: 'linkedin', label: 'LinkedIn DMs', icon: MessageSquare, count: LINKEDIN_TEMPLATES.length },
    { id: 'sms', label: 'SMS Scripts', icon: PhoneCall, count: SMS_TEMPLATES.length },
    { id: 'objections', label: 'Objection Handling', icon: Zap, count: OBJECTIONS.length },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-bold text-gray-900">Agency Sales Kit</h1>
        </div>
        <p className="text-sm text-gray-500">
          Done-for-you email templates, LinkedIn DMs, SMS scripts, and objection handling. Copy, customize, close.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border border-gray-200 rounded-xl p-1 bg-gray-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className={`text-xs rounded-full px-1.5 ${
              activeTab === tab.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-500'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Email templates */}
      {activeTab === 'email' && (
        <div className="space-y-5">
          <p className="text-xs text-gray-500 italic">These are starting points. Personalize with their name, specific location, and a detail you found on their website or Google Maps.</p>
          {EMAIL_TEMPLATES.map((t) => (
            <Card key={t.industry}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">{t.industry}</CardTitle>
                  {t.tag && <Badge className="text-[10px] bg-green-100 text-green-700 mt-1">{t.tag}</Badge>}
                  {t.subject && <p className="text-xs text-gray-400 mt-1">Subject: <span className="text-gray-600">{t.subject}</span></p>}
                </div>
                <CopyButton text={`Subject: ${t.subject}\n\n${t.body}`} />
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-4 text-xs">
                  {t.body}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* LinkedIn templates */}
      {activeTab === 'linkedin' && (
        <div className="space-y-5">
          <p className="text-xs text-gray-500 italic">Keep LinkedIn DMs short. These work best as connection request messages or first messages after connecting.</p>
          {LINKEDIN_TEMPLATES.map((t) => (
            <Card key={t.industry}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">{t.industry}</CardTitle>
                <CopyButton text={t.body} />
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-4 text-xs">
                  {t.body}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* SMS templates */}
      {activeTab === 'sms' && (
        <div className="space-y-5">
          <p className="text-xs text-gray-500 italic">Keep SMS under 160 chars when possible. These are follow-ups, not cold outreach — text after email or after a conversation.</p>
          {SMS_TEMPLATES.map((t) => (
            <Card key={t.industry}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold">{t.industry}</CardTitle>
                <CopyButton text={t.body} />
              </CardHeader>
              <CardContent>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-4 text-xs">
                  {t.body}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Objection handling */}
      {activeTab === 'objections' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 italic mb-4">
            Click any objection to see how to handle it. These are battle-tested from real sales conversations.
          </p>
          {OBJECTIONS.map((item) => (
            <ObjectionCard key={item.objection} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}
