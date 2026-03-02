'use client';

import { useState } from 'react';
import { Check, Copy, Mail, AlertCircle, Zap, Clock, PartyPopper, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ── Onboarding Drip Sequence ─────────────────────────────────────────────────

interface SequenceEmail {
  step: number;
  trigger: string;
  triggerIcon: React.ElementType;
  label: string;
  subject: string;
  body: string;
  note: string;
}

const SEQUENCE_EMAILS: SequenceEmail[] = [
  {
    step: 1,
    trigger: 'Sends immediately on signup',
    triggerIcon: Zap,
    label: 'Welcome',
    subject: "You're in — here's how to get your first AI live 🎉",
    body: `Hi {{agency_name}},

Welcome to Kyra. You just signed up for something that's going to change how your agency operates.

Here's your 3-step quickstart:

1. Add your first client → kyra.conversionsystem.com/agency/clients/new
   Pick an industry template — the AI personality is already written. Takes 5 minutes.

2. Connect GoHighLevel → kyra.conversionsystem.com/agency/ghl-setup
   Paste your Private Integration token. That's it. Your AI starts responding to GHL SMS within 60 seconds.

3. Test it → open Test Chat on your client's page and send a message.
   Watch your AI respond in real-time before you go live.

That's it. First AI live in under 30 minutes.

Questions? Reply to this email — Angel reads every one.

— Angel Castro
Founder, Conversion System`,
    note: 'Activate via RESEND_API_KEY in Vercel. Trigger: agency row inserted in Supabase.',
  },
  {
    step: 2,
    trigger: 'Sends 24h after signup — if no client added yet',
    triggerIcon: Clock,
    label: 'First client nudge',
    subject: 'One step standing between you and your first AI worker',
    body: `Hi {{agency_name}},

You signed up for Kyra yesterday but haven't added your first client yet.

Totally normal — most people aren't sure where to start. Here's the fastest path:

Go to: kyra.conversionsystem.com/agency/clients/new

Pick any industry template — dental, cannabis, real estate, restaurant, legal, whatever fits your first client. The AI is pre-trained with a full personality. You just set the business name and you're done.

Your AI can be live in the next 20 minutes.

Still have questions? I'll personally walk you through it — just reply with "demo" and I'll send you a booking link.

— Angel`,
    note: 'Trigger: agency.created_at < 24h ago AND agency_clients count = 0. Check hourly via cron.',
  },
  {
    step: 3,
    trigger: 'Sends when first AI conversation happens',
    triggerIcon: PartyPopper,
    label: 'First conversation 🎉',
    subject: 'Your AI just had its first conversation 🎉',
    body: `Hi {{agency_name}},

Your AI worker just handled its first real customer conversation.

That's not a test. That's a real customer who got a response within 60 seconds — automatically, without anyone on your team lifting a finger.

Here's what to do next:

1. Review the conversation → kyra.conversionsystem.com/agency/conversations
   Make sure the tone and responses match your client's brand.

2. Fine-tune the personality → open your client → Personality tab
   Add specific product names, pricing info, or FAQs so it gets sharper.

3. Tell your client → they'll love seeing AI handle their inquiries in real-time.

This is just the beginning. Add your next client at:
kyra.conversionsystem.com/agency/clients/new

You're building something real.

— Angel`,
    note: 'Trigger: first row in client_conversations for this agency. Fire once only.',
  },
];

function SequenceSection() {
  const [openStep, setOpenStep] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  const handleCopy = async (email: SequenceEmail) => {
    const text = `Subject: ${email.subject}\n\n${email.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(email.step);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Mail className="h-4 w-4 text-indigo-500" />
            Onboarding Email Sequence
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">3 trigger-based emails. Activates when RESEND_API_KEY is set in Vercel.</p>
        </div>
        <Badge className="bg-amber-100 text-amber-700 text-[10px] border-0">Pending Resend</Badge>
      </div>

      <div className="space-y-3">
        {SEQUENCE_EMAILS.map((email) => {
          const TriggerIcon = email.triggerIcon;
          const isOpen = openStep === email.step;
          return (
            <div key={email.step} className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              {/* Header row */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setOpenStep(isOpen ? null : email.step)}
              >
                <div className="flex items-center justify-center h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs shrink-0">
                  {email.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{email.label}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <TriggerIcon className="h-3 w-3" />
                      {email.trigger}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">Subject: {email.subject}</p>
                </div>
                {isOpen
                  ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
              </button>

              {/* Expanded body */}
              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <p className="text-xs font-medium text-gray-600">Subject: <span className="text-gray-900">{email.subject}</span></p>
                    <button
                      onClick={() => handleCopy(email)}
                      className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        copied === email.step
                          ? 'border-green-200 bg-green-50 text-green-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {copied === email.step
                        ? <><Check className="h-3.5 w-3.5" /> Copied!</>
                        : <><Copy className="h-3.5 w-3.5" /> Copy email</>}
                    </button>
                  </div>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-white rounded-lg p-4 border border-gray-100">
                    {email.body}
                  </pre>
                  <p className="mt-3 text-[11px] text-indigo-600 bg-indigo-50 rounded-md px-3 py-2 border border-indigo-100">
                    ⚙️ <strong>Dev note:</strong> {email.note}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── One-off Outreach Drafts ───────────────────────────────────────────────────

interface EmailDraft {
  agency: string;
  recipient: string;
  subject: string;
  body: string;
}

const drafts: EmailDraft[] = [
  {
    agency: 'Purple Lotus',
    recipient: 'Paul Rivera',
    subject: 'White-label AI for Purple Lotus — your own AI worker',
    body: `Hi Paul,

Quick one — you know the AI setup I've been building for Conversion System? I've turned it into a full platform called Kyra.

Idea: we white-label it for Purple Lotus so your dispensary has its own AI worker handling customer questions, compliance FAQs, and product recs 24/7. Branded as yours, managed by me.

Cannabis is the industry I know best. The compliance nuances, the customer sensitivity, the volume of repetitive questions — Kyra handles all of it.

Takes about a week to set up. Happy to show you a demo — 15 minutes on a call?

— Angel`,
  },
  {
    agency: 'Webblex',
    recipient: 'Webblex team',
    subject: 'Add AI workers to your client packages',
    body: `Hi Webblex team,

You build websites for clients. What if every site you ship also came with an AI worker?

With Kyra, you'd offer each client a white-labeled AI that handles their inquiries, qualifies leads, and works 24/7 — all managed from your agency dashboard. Your brand, your pricing, your recurring revenue.

Setup takes under a week per client. No AI expertise needed on your end — I handle the infrastructure.

Worth a quick call to see if this fits your current client packages?

— Angel, Conversion System`,
  },
  {
    agency: 'Join Marathon',
    recipient: 'Join Marathon team',
    subject: 'AI coaching assistant for your community',
    body: `Hi Join Marathon team,

Running communities live on connection and consistency — but your team can't be available every time a member has a question about training plans, nutrition, or race prep.

Kyra gives your community an AI coaching assistant: answers member questions 24/7, reflects your coaching philosophy, and escalates to your human coaches when it matters.

We white-label it under your brand so members interact with "Marathon AI" not some generic chatbot.

Happy to walk you through a demo this week?

— Angel`,
  },
  {
    agency: 'mk',
    recipient: 'mk team',
    subject: 'AI workforce platform for your agency clients',
    body: `Hi mk team,

Building on our work together — I wanted to show you what I've been building.

Kyra is a white-label AI workforce platform for agencies. You add it to your client packages, set up their AI in minutes, and collect recurring revenue while the AI handles their day-to-day conversations.

Dashboard gives you full visibility across all clients. Each AI has its own personality, channels, and goals.

Would love to show you a 10-minute demo. Worth a look?

— Angel`,
  },
];

function EmailCard({ draft }: { draft: EmailDraft }) {
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`outreach-sent-${draft.agency}`) === 'true';
    }
    return false;
  });

  const handleCopy = async () => {
    const fullEmail = `Subject: ${draft.subject}\n\n${draft.body}`;
    await navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSent = () => {
    const newValue = !sent;
    setSent(newValue);
    localStorage.setItem(`outreach-sent-${draft.agency}`, String(newValue));
  };

  return (
    <Card className={sent ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">{draft.agency}</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">To: {draft.recipient}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 text-xs h-7"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy Email
                </>
              )}
            </Button>
            <Button
              variant={sent ? 'default' : 'outline'}
              size="sm"
              onClick={toggleSent}
              className={`gap-1.5 text-xs h-7 ${sent ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              {sent ? (
                <>
                  <Check className="h-3 w-3" />
                  Sent
                </>
              ) : (
                <>
                  <Mail className="h-3 w-3" />
                  Mark as Sent
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xs font-medium text-gray-500 mb-2">
          Subject: {draft.subject}
        </div>
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4 border border-gray-100">
          {draft.body}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Social Content Calendar ───────────────────────────────────────────────────

interface ContentPost {
  platform: 'linkedin' | 'twitter' | 'ghl-community' | 'instagram';
  angle: string;
  label: string;
  content: string;
  hook: string;  // first line — the hook
}

const CONTENT_POSTS: ContentPost[] = [
  {
    platform: 'linkedin', angle: 'Case Study', label: 'Cannabis AI SMS result',
    hook: "We used AI SMS to materially move the needle for a cannabis client. Here's what actually did it.",
    content: `We used AI SMS to materially move the needle for a cannabis client. Here's what actually did it.

Not funnels. Not ads. Not a rebrand.

It was SMS response time.

Their dispensary was getting 200+ text messages a day — product questions, pickup times, compliance FAQs. They were answering maybe 40% of them. The rest went cold.

We plugged in an AI worker that:
→ Replies to every text in under 60 seconds
→ Knows the entire menu + current specials
→ Handles compliance messaging automatically
→ Books consultations for high-ticket products
→ Escalates angry customers to a human immediately

In 90 days, their repeat customer rate went up 34%. Revenue followed.

The tool we use is called Kyra. It runs inside GoHighLevel and takes about 20 minutes to set up per client.

If you're a GHL agency with cannabis clients, DM me "CANNABIS" and I'll show you what the setup looks like.

——
Follow for more on using AI to generate real business results (not just hype).

#GHL #GoHighLevel #CannabisMarketing #AIEmployee #AgencyGrowth`,
  },
  {
    platform: 'linkedin', angle: 'Insight', label: 'Speed-to-lead is the only metric',
    hook: 'Speed-to-lead is the only marketing metric that matters in 2026.',
    content: `Speed-to-lead is the only marketing metric that matters in 2026.

Not CPL. Not ROAS. Not open rates.

How fast you respond to a new lead determines whether you get the sale.

The data is brutal:
• 78% of buyers go with whoever responds first
• 50% of leads buy from the first company that follows up
• Leads contacted in under 5 minutes are 100x more likely to close than leads contacted in 30 minutes

Most of my agency clients' businesses were responding in 2-4 hours. Some weren't responding at all on evenings and weekends.

We fixed that with AI. Every inbound SMS gets a reply in under 60 seconds now — 24/7, including 2am on Sunday.

The clients who made this change saw:
→ 35–45% more booked appointments
→ Lower cost per acquisition (same ads, more conversions)
→ Happier clients who stopped complaining about slow follow-up

Speed is a product feature now. Treat it like one.

What's your current lead response time?

#MarketingStrategy #LeadGeneration #GHL #AIMarketing #AgencyLife`,
  },
  {
    platform: 'linkedin', angle: 'Story', label: 'Friday AI booking story',
    hook: 'I set up an AI for a dental client on a Friday afternoon.',
    content: `I set up an AI for a dental client on a Friday afternoon.

By Monday morning, the AI had booked 3 appointments. While the office was closed.

Here's exactly what happened:

Friday 5pm: I connected the AI to their GoHighLevel account. Took 20 minutes.

Friday 7pm: First inbound text. Someone asking about a cleaning appointment. AI replies in 45 seconds, answers the pricing question, offers two available slots. Patient books Thursday 2pm.

Saturday 11am: Another text. AI handles it. Appointment booked.

Sunday 9pm: Third appointment request. AI books it. Tags the contact. Updates the CRM note.

Monday 8am: The office manager opens GHL. Sees 3 new appointments she didn't have to do anything for.

Her message to me: "What is happening? Did you do this?"

That's the pitch. The AI worked all weekend. The staff walked in to three more patients.

I'm building this for GHL agencies who want to offer it to their clients. DM me "DEMO" and I'll show you how it works in 10 minutes.

#Dental #GoHighLevel #AIEmployee #AgencyOwner #LeadResponse`,
  },
  {
    platform: 'linkedin', angle: 'Education', label: 'How to respond to every lead in 60s',
    hook: 'How to respond to every inbound lead in under 60 seconds — without hiring anyone.',
    content: `How to respond to every inbound lead in under 60 seconds — without hiring anyone.

Step 1: Pick a trigger
Every new contact added to GHL, every new SMS received, every form fill. These are your trigger events.

Step 2: Connect an AI to that trigger
The AI needs three things: a personality (name, tone, industry knowledge), a knowledge base (services, pricing, hours, FAQs), and a channel (SMS, WhatsApp, email).

Step 3: Let it handle the first response
The AI's job isn't to close the deal. It's to:
→ Respond immediately
→ Qualify the lead
→ Book the appointment or request
→ Pass warm leads to a human

Step 4: You step in at the right moment
When the AI flags a hot lead or an escalation, you take over. You're no longer spending time on cold responses — only on leads that are already engaged.

Result: 100% of your leads get responded to. You only talk to the ones that matter.

This is what I've been building for GHL agencies. It's called Kyra. Free to try at kyra.conversionsystem.com.

What's your current process for responding to leads?

#LeadResponse #AIAutomation #GHL #GoHighLevel #AgencyStrategy`,
  },
  {
    platform: 'linkedin', angle: 'Hot Take', label: 'AI chatbots are dead',
    hook: 'AI chatbots are dead. AI workers are the new category.',
    content: `AI chatbots are dead. AI workers are the new category.

Here's the difference:

Chatbots:
→ Answer FAQs
→ Live on a widget
→ Get abandoned when questions get complex
→ Don't connect to your CRM
→ Have no memory of past conversations

AI Workers:
→ Have a name, personality, and role
→ Operate across SMS, WhatsApp, email, and chat
→ Update your CRM in real-time
→ Remember every conversation
→ Know when to escalate to a human
→ Work 24/7 without complaining

The businesses winning in 2026 aren't the ones with a chatbot on their website. They're the ones who've added an AI worker to their sales and customer service team.

The difference isn't technology. It's framing.

Your clients aren't buying a chatbot. They're hiring a digital employee who works for $500/month and never calls in sick.

Sell it that way.

#AIEmployee #GoHighLevel #AgencyModel #SalesStrategy #AITrends`,
  },
  {
    platform: 'linkedin', angle: 'Product', label: 'White-label AI workers for agencies',
    hook: 'GHL agencies: you can now offer AI workers as a white-labeled service.',
    content: `GHL agencies: you can now offer AI workers as a white-labeled service.

Here's what that looks like:

1. You connect a client's GHL account to our platform (2 minutes)
2. You pick an industry template — dental, real estate, cannabis, etc. (the AI personality is pre-built)
3. You customize the AI name and business info (5 minutes)
4. The AI goes live — handling their inbound SMS, booking appointments, updating the CRM

From your client's perspective, they have their own AI worker. It has a name. It knows their business. It responds to every text in under 60 seconds.

From your perspective, you manage all your clients' AIs from one dashboard. You bill them $500–$2,000/month. Your platform cost is flat regardless of how many conversations the AI handles.

At Pro plan ($249/mo) with 15 clients at $997/mo:
→ Revenue: $14,955/mo
→ Platform cost: $249/mo
→ Margin: $14,706/mo

We built this for GHL agencies. It's called Kyra.

Free to start at kyra.conversionsystem.com. DM me if you want to see a demo first.

#GHL #GoHighLevel #WhiteLabel #AgencyRevenue #AIEmployee`,
  },
  {
    platform: 'linkedin', angle: 'Question', label: 'What your clients actually need',
    hook: 'Quick question for GHL agency owners:',
    content: `Quick question for GHL agency owners:

What's the #1 complaint you hear from clients about their marketing?

For the agencies I talk to, it's almost always the same answer:

"Leads come in and nothing happens."

They're spending $2,000/month on ads. Getting 80 new leads. And responding to maybe 40% of them because:
• Staff doesn't see the texts fast enough
• Evenings and weekends go unanswered
• The team is handling everything manually

The cost of this problem is enormous. If your dental client closes 1 in 5 leads and the average patient is worth $1,200, missing 40 leads/month = $9,600/month in lost revenue.

The fix is simple: AI that responds in under 60 seconds, 24/7.

That's what I've been building. And the agencies deploying it are watching their clients' revenue go up without changing a single ad campaign.

What problem do your clients complain about most? Drop it in the comments — I'm curious.

#GHL #AgencyOwner #ClientResults #LeadGeneration #GoHighLevel`,
  },
  {
    platform: 'twitter', angle: 'Thread', label: 'Speed-to-lead thread (Twitter)',
    hook: 'Speed-to-lead math that will hurt your soul:',
    content: `Speed-to-lead math that will hurt your soul: 🧵

A dental practice gets 80 leads/month.
Average value per patient: $1,200/year.
They respond to 60% within 24 hours.
Close rate: 20%.

Monthly revenue from leads: $14,400.

Now watch what happens when response time drops to 60 seconds:

→ 95% of leads reached (vs 60%)
→ Close rate improves to 28% (better engagement → more trust)

Monthly revenue: $31,920.

Same ads. Same leads. Same team.

+$17,520/month from one change: response speed.

This is why I built an AI that replies to every GHL lead in under 60 seconds.

Every niche. Every size. 24/7.

kyra.conversionsystem.com — free to test.`,
  },
  {
    platform: 'ghl-community', angle: 'Community Post', label: 'GHL Facebook group post',
    hook: 'Built something for GHL agencies — wanted to share before I talk to anyone about it.',
    content: `Built something for GHL agencies — wanted to share before I talk to anyone about it.

I've been running a GHL agency for years and kept running into the same problem: clients spend $2k/month on leads and then don't respond to half of them. Nights, weekends, busy seasons — leads go cold.

So I built Kyra — a platform that lets you add an AI worker to any GHL sub-account. It:

✅ Responds to every inbound SMS in under 60 seconds
✅ Books appointments directly into GHL calendar
✅ Tags contacts and updates the CRM automatically
✅ Works for dental, real estate, cannabis, home services, med spa, and 15+ more
✅ White-labeled — your brand, your client, your pricing

We've used AI SMS to drive significant revenue for cannabis clients. Now I'm packaging that playbook for other agencies.

Free to start (includes $2 in credits to test): kyra.conversionsystem.com

If you want to see it in action for a specific niche, comment below or DM me. Happy to do a quick demo.

Not selling anything in this post — just sharing in case it's useful. Would love feedback from people who've tried similar tools.`,
  },
  {
    platform: 'ghl-community', angle: 'Community Value Post', label: 'GHL community: AI response time guide',
    hook: 'Sharing a quick framework we use to evaluate whether a client needs AI response time automation.',
    content: `Sharing a quick framework we use to evaluate whether a client needs AI response time automation.

We call it the "Friday Night Test":

→ What happens when a lead texts your client at 9pm on a Friday?
→ When is the first human who sees that text going to respond?
→ What percentage of Friday night leads turn into booked appointments?

For most clients, the answer is: nothing happens until Monday. And by Monday, that lead has already hired someone else, found another service, or forgotten why they reached out.

The ROI of fixing this is immediate and measurable.

Here's the math we show clients:
- How many leads do you get/month?
- What % are you currently responding to same-day?
- What's your average deal value?
- What's your current close rate?

Plug those in and the missed revenue number is almost always shocking.

We then show them what happens when AI handles every inbound text in under 60 seconds. The math does the selling.

If anyone wants the calculator we use (it's free), it's here: kyra.conversionsystem.com/roi

Would love to know — what's your current "Friday Night Test" score for your best client?`,
  },
];

function ContentCalendarSection() {
  const platforms = ['linkedin', 'twitter', 'ghl-community'] as const;
  const [activePlatform, setActivePlatform] = useState<typeof platforms[number]>('linkedin');
  const [copied, setCopied] = useState<string | null>(null);

  const posts = CONTENT_POSTS.filter(p => p.platform === activePlatform);

  const platformConfig = {
    linkedin: { label: 'LinkedIn', emoji: 'in', color: 'bg-blue-700', textColor: 'text-blue-700' },
    twitter: { label: 'Twitter / X', emoji: '𝕏', color: 'bg-gray-900', textColor: 'text-gray-900' },
    'ghl-community': { label: 'GHL Community', emoji: '🏘️', color: 'bg-orange-600', textColor: 'text-orange-700' },
    instagram: { label: 'Instagram', emoji: '📸', color: 'bg-pink-600', textColor: 'text-pink-700' },
  };

  const copyPost = (post: ContentPost) => {
    navigator.clipboard.writeText(post.content);
    setCopied(post.hook);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Zap className="h-4 w-4 text-purple-500" />
          Social Content Calendar
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          10 ready-to-post pieces across LinkedIn, Twitter, and GHL community. Each tuned to drive agency signups.
        </p>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-2 mb-5">
        {platforms.map(platform => {
          const cfg = platformConfig[platform];
          return (
            <button
              key={platform}
              onClick={() => setActivePlatform(platform)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activePlatform === platform
                  ? `${cfg.color} text-white`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {platformConfig[platform].label}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {posts.map(post => (
          <div key={post.hook} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div>
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${platformConfig[post.platform].textColor} bg-opacity-10 border border-current mr-2`}>
                  {post.angle}
                </span>
                <span className="text-xs text-gray-500">{post.label}</span>
              </div>
              <button
                onClick={() => copyPost(post)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  copied === post.hook ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {copied === post.hook ? <><Check className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy post</>}
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs font-semibold text-indigo-600 mb-2 italic">Hook: "{post.hook}"</p>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100 max-h-48 overflow-y-auto">
                {post.content}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Cold Acquisition Emails ─────────────────────────────────────────────────

interface ColdEmail {
  niche: string;
  emoji: string;
  stage: 'initial' | 'followup' | 'breakup';
  stageLabel: string;
  subject: string;
  body: string;
}

const COLD_EMAILS: ColdEmail[] = [
  // ── DENTAL ──
  {
    niche: 'Dental', emoji: '🦷', stage: 'initial', stageLabel: 'Initial outreach',
    subject: 'Your dental clients are losing appointments after hours',
    body: `Hi [Name],

Quick question — how many appointment request texts does your dental client get on evenings and weekends that nobody answers until Monday?

I built an AI that responds to every one of those in under 60 seconds, checks availability, and books the appointment automatically. It works inside GoHighLevel — no new software your client needs to learn.

Agencies using it are seeing 35–45% more booked appointments within 30 days.

I'd love to show you what it looks like for a dental client specifically. 15 minutes on a call this week?

— Angel Castro
kyra.conversionsystem.com`,
  },
  {
    niche: 'Dental', emoji: '🦷', stage: 'followup', stageLabel: 'Follow-up (3 days)',
    subject: 'Re: dental AI → 3 appointments booked while office was closed',
    body: `Hey [Name],

Following up on my email. Sent it a few days ago about AI for your dental clients.

Wanted to share a quick result: one of our dental agencies set Kyra up on a Friday. By Monday, 3 appointments were booked over the weekend while the office was closed. Client saw the conversation log and couldn't believe it.

That's what I want to show you. 15 minutes?

— Angel`,
  },
  {
    niche: 'Dental', emoji: '🦷', stage: 'breakup', stageLabel: 'Break-up (7 days)',
    subject: 'Last email on this — dental AI',
    body: `Hey [Name],

Last one from me on this. I know you're busy.

If AI for your dental clients is something you want to explore in the future, just reply with "future" and I'll reach back out in 30 days.

If you're open to a 15-minute demo now, just say "demo."

Either way, no pressure and no more emails from me.

— Angel`,
  },

  // ── REAL ESTATE ──
  {
    niche: 'Real Estate', emoji: '🏡', stage: 'initial', stageLabel: 'Initial outreach',
    subject: 'Real estate leads go cold in 5 minutes — here\'s the fix',
    body: `Hi [Name],

Real estate leads have the shortest attention span of any industry. Studies show 78% of buyers go with the first agent who responds.

I built an AI that replies to every inbound GHL lead in under 60 seconds — answers property questions, qualifies the buyer, books showings. It never sleeps, never misses a text, and costs less than a part-time VA.

Running any real estate clients on GHL? Happy to show you how it works in 15 minutes.

— Angel
kyra.conversionsystem.com`,
  },
  {
    niche: 'Real Estate', emoji: '🏡', stage: 'followup', stageLabel: 'Follow-up (3 days)',
    subject: 'Re: real estate AI — quick thought',
    body: `Hey [Name],

Circling back on the real estate AI email.

One thing I didn't mention: the AI also handles re-engagement. Leads that went cold 30, 60, 90 days ago — it reaches back out automatically with a personalized message based on their search history in GHL.

Most agencies don't even know how many warm leads are sitting dead in their CRM. This thing wakes them up.

Worth 15 minutes to see?

— Angel`,
  },
  {
    niche: 'Real Estate', emoji: '🏡', stage: 'breakup', stageLabel: 'Break-up (7 days)',
    subject: 'Closing the loop — real estate AI',
    body: `Hey [Name],

Closing the loop here. Reached out a couple times about AI for your real estate clients — totally get it if the timing isn't right.

When you're ready to explore it, you can try it free at:
kyra.conversionsystem.com

No credit card. Live in 10 minutes. If it doesn't blow you away, nothing lost.

— Angel`,
  },

  // ── CANNABIS ──
  {
    niche: 'Cannabis', emoji: '🌿', stage: 'initial', stageLabel: 'Initial outreach',
    subject: 'Cannabis AI built from real dispensary deployments',
    body: `Hi [Name],

I work with cannabis dispensaries that deal with constant inbound SMS — product questions, pricing, pickup ETA, compliance FAQs. Most of them are missing 30–40% of these messages.

We've used AI SMS automation inside GoHighLevel to drive meaningful revenue for cannabis clients. The AI knows the menu, handles compliance language, and drives repeat visits with personalized product recommendations.

If you're running any dispensary clients on GHL, I'd love to show you what this looks like in practice.

15 minutes this week?

— Angel Castro
kyra.conversionsystem.com`,
  },
  {
    niche: 'Cannabis', emoji: '🌿', stage: 'followup', stageLabel: 'Follow-up (3 days)',
    subject: 'Re: cannabis AI → Friday night rush handled while staff was closing',
    body: `Hey [Name],

Sending one more on this. A cannabis agency we work with recently set up Kyra for a multi-location client. The AI handled a Friday night rush — 40+ inbound texts — while the staff was at closing.

Every message got a real, compliant, personalized reply. The client saw the log Saturday morning and called us immediately.

Cannabis is where we're strongest. Want to see it?

— Angel`,
  },
  {
    niche: 'Cannabis', emoji: '🌿', stage: 'breakup', stageLabel: 'Break-up (7 days)',
    subject: 'Last one on cannabis AI',
    body: `Hey [Name],

Last email on this — promise.

I know cannabis agencies are busy and the last thing you need is another tool pitch. If this ever becomes relevant, the demo is live at:
kyra.conversionsystem.com/try/cannabis

Takes 60 seconds to see what your dispensary client's AI would look like. No sign-up required.

Take care,
— Angel`,
  },

  // ── LAW FIRMS ──
  {
    niche: 'Law Firms', emoji: '⚖️', stage: 'initial', stageLabel: 'Initial outreach',
    subject: 'Law firms: whoever answers first wins the client',
    body: `Hi [Name],

Legal intake is brutal — people reaching out to law firms are often stressed, shopping multiple firms at once, and making a decision fast. Whoever answers first almost always wins.

I built an AI that handles law firm intake via SMS in under 60 seconds. It collects the basics (practice area, case type, timeline), qualifies the lead, and schedules a consultation automatically.

Your law firm clients never miss a potential client again — even at 11pm on a Sunday.

Running any law firms on GHL? Happy to show you in 15 minutes.

— Angel
kyra.conversionsystem.com`,
  },
  {
    niche: 'Law Firms', emoji: '⚖️', stage: 'followup', stageLabel: 'Follow-up (3 days)',
    subject: 'Re: law firm AI — a stat that stopped me',
    body: `Hey [Name],

One more thought on the law firm AI — found a stat I can't stop thinking about:

47% of legal consumers contact more than one attorney before making a decision. The average response time across law firms is 3+ hours. The AI I built responds in under 60 seconds.

Simple math: every law firm client you have is probably losing cases to whoever answers faster.

Worth 15 minutes to see how to fix it?

— Angel`,
  },
  {
    niche: 'Law Firms', emoji: '⚖️', stage: 'breakup', stageLabel: 'Break-up (7 days)',
    subject: 'Closing the loop — law firm AI',
    body: `Hey [Name],

Last one on this. If AI intake for law firms ever becomes relevant, the tool is free to try at kyra.conversionsystem.com — no card, 10-minute setup.

You can have a law firm client live before your next client meeting.

— Angel`,
  },

  // ── HOME SERVICES ──
  {
    niche: 'Home Services', emoji: '🔧', stage: 'initial', stageLabel: 'Initial outreach',
    subject: 'HVAC/roofing clients are missing emergency calls at night',
    body: `Hi [Name],

Homeowners have emergencies at midnight. Roof leaking. AC went out. Pipe burst. They text the first company they find on Google.

Home services clients who don't respond within 5 minutes of those messages lose the job 90% of the time. The AI I built responds in under 60 seconds — triages urgency, routes emergencies to the on-call tech, books standard jobs automatically.

If you have any HVAC, roofing, plumbing, or electrical clients on GHL, I'd love to show you what this looks like.

15 minutes this week?

— Angel
kyra.conversionsystem.com`,
  },
  {
    niche: 'Home Services', emoji: '🔧', stage: 'followup', stageLabel: 'Follow-up (3 days)',
    subject: 'Re: home services AI — storm season is coming',
    body: `Hey [Name],

Following up on the home services AI. One angle I didn't mention: storm season.

Roofing agencies that have AI in place going into storm season capture 3-5× more jobs than those that don't — because they respond to every single inquiry in under a minute while competitors are overwhelmed.

Last year some of our home services clients had AI handling 100+ storm inquiries in a single weekend.

Want to see how it works before the season hits?

— Angel`,
  },
  {
    niche: 'Home Services', emoji: '🔧', stage: 'breakup', stageLabel: 'Break-up (7 days)',
    subject: 'Last one on home services AI',
    body: `Hey [Name],

Wrapping up here on the home services AI. If it ever makes sense to explore, live demo at kyra.conversionsystem.com — no sign-up needed to see how it works for HVAC or roofing clients specifically.

— Angel`,
  },
];

const SUBJECT_LINES = [
  { label: 'Pain-focused', lines: [
    'Your [niche] clients are losing leads after hours',
    '[Niche] leads go cold in 5 minutes — here\'s the fix',
    'How many [niche] leads went unanswered this weekend?',
    'Your [niche] client missed 3 leads last night',
  ]},
  { label: 'Result-focused', lines: [
    '[Niche] AI that generated $X in 30 days',
    '40% more bookings — what we did for [niche] agencies',
    'This GHL agency added $15K/mo with one AI worker',
    '3 appointments booked while the office was closed',
  ]},
  { label: 'Curiosity', lines: [
    'Quick question about your [niche] clients',
    'Something I built for GHL agencies — 60 seconds to explain',
    'What if every client reply happened in under 60 seconds?',
    'The AI that handles 40+ inbound texts without a human',
  ]},
  { label: 'Direct', lines: [
    'AI worker for your GHL clients — 10-minute setup',
    'White-label AI for agencies running [niche] clients',
    'Kyra + GHL = AI worker for every client',
    'Free to test: AI that replies to your leads in 60s',
  ]},
];

function ColdAcquisitionSection() {
  const niches = Array.from(new Set(COLD_EMAILS.map(e => e.niche)));
  const [activeNiche, setActiveNiche] = useState(niches[0]);
  const [activeStage, setActiveStage] = useState<ColdEmail['stage']>('initial');
  const [copied, setCopied] = useState(false);
  const [subjectCopied, setSubjectCopied] = useState<string | null>(null);
  const [openSubject, setOpenSubject] = useState<string | null>(null);

  const niches_data = COLD_EMAILS.filter(
    e => e.niche === activeNiche && e.stage === activeStage
  );
  const email = niches_data[0];

  const handleCopy = async () => {
    if (!email) return;
    await navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copySubject = (line: string) => {
    navigator.clipboard.writeText(line);
    setSubjectCopied(line);
    setTimeout(() => setSubjectCopied(null), 2000);
  };

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          Cold Acquisition Sequences
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          3-email sequences (initial → follow-up → break-up) for 5 key niches. Proven for GHL agency owners.
        </p>
      </div>

      {/* Niche tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {niches.map(n => {
          const e = COLD_EMAILS.find(x => x.niche === n)!;
          return (
            <button
              key={n}
              onClick={() => { setActiveNiche(n); setActiveStage('initial'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeNiche === n
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {e.emoji} {n}
            </button>
          );
        })}
      </div>

      {/* Stage tabs */}
      <div className="flex gap-2 mb-4">
        {(['initial', 'followup', 'breakup'] as const).map(stage => {
          const label = { initial: 'Initial', followup: 'Follow-up (day 3)', breakup: 'Break-up (day 7)' }[stage];
          return (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeStage === stage
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Email preview */}
      {email && (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-700">
              Subject: <span className="text-gray-900 font-normal">{email.subject}</span>
            </p>
            <button
              onClick={handleCopy}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                copied ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {copied ? <><Check className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy email</>}
            </button>
          </div>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed p-5">
            {email.body}
          </pre>
        </div>
      )}

      {/* Subject line swipe file */}
      <div className="mt-6">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-400" />
          Subject line swipe file
          <span className="text-xs text-gray-400 font-normal">(click to copy)</span>
        </h3>
        <div className="space-y-3">
          {SUBJECT_LINES.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{group.label}</p>
              <div className="space-y-1.5">
                {group.lines.map(line => (
                  <button
                    key={line}
                    onClick={() => copySubject(line)}
                    className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border ${
                      subjectCopied === line
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-indigo-50 hover:border-indigo-200'
                    }`}
                  >
                    <span className="italic">{line}</span>
                    {subjectCopied === line
                      ? <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      : <Copy className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OutreachPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Outreach</h1>
        <p className="text-gray-500 text-sm mt-1">
          Cold acquisition sequences + automated onboarding + one-off drafts.
        </p>
      </div>

      {/* Social content calendar — NEW */}
      <ContentCalendarSection />

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Cold email sequences</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Cold acquisition */}
      <ColdAcquisitionSection />

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Onboarding drip</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Onboarding drip sequence */}
      <SequenceSection />

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">One-off outreach drafts</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6">
        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-700">
          4 agencies ready to white-label Kyra. Review before sending.
        </p>
      </div>

      {/* Email drafts */}
      <div className="space-y-4">
        {drafts.map((draft) => (
          <EmailCard key={draft.agency} draft={draft} />
        ))}
      </div>
    </div>
  );
}
