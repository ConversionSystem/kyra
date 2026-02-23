'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Target, Zap, FileText, Users, TrendingUp, Check, Copy,
  ChevronDown, ChevronRight, MessageSquare, DollarSign,
  ArrowRight, Briefcase, Star, Phone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition shrink-0"
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ── Expandable section ───────────────────────────────────────────────────────
function Section({
  icon: Icon,
  label,
  title,
  subtitle,
  color,
  children,
  defaultOpen = false,
}: {
  icon: any;
  label: string;
  title: string;
  subtitle: string;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center gap-4 p-5 text-left bg-white hover:bg-gray-50 transition"
        onClick={() => setOpen(!open)}
      >
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${color.includes('indigo') ? 'text-indigo-600' : color.includes('green') ? 'text-green-600' : color.includes('amber') ? 'text-amber-600' : color.includes('blue') ? 'text-blue-600' : 'text-purple-600'}`}>
              {label}
            </span>
          </div>
          <p className="font-bold text-gray-900 text-base">{title}</p>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>
      {open && <div className="border-t border-gray-100 p-5 bg-gray-50 space-y-4">{children}</div>}
    </div>
  );
}

// ── Script card ──────────────────────────────────────────────────────────────
function ScriptCard({ title, script, tag }: { title: string; script: string; tag?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-800 text-sm">{title}</p>
          {tag && <Badge variant="outline" className="text-[10px]">{tag}</Badge>}
        </div>
        <CopyButton text={script} />
      </div>
      <pre className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed font-sans">{script}</pre>
    </div>
  );
}

// ── Objection card ───────────────────────────────────────────────────────────
function ObjectionCard({ objection, response }: { objection: string; response: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-gray-50 transition"
        onClick={() => setOpen(!open)}
      >
        <span className="font-semibold text-gray-800 text-sm">{objection}</span>
        {open ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 p-4 bg-indigo-50">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-gray-700 leading-relaxed italic">{response}</p>
            <CopyButton text={response} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Package tier ─────────────────────────────────────────────────────────────
function PackageTier({
  name, price, color, features, pitch,
}: { name: string; price: string; color: string; features: string[]; pitch: string }) {
  return (
    <div className={`rounded-xl border-2 ${color} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="font-black text-lg">{name}</p>
        <p className="font-black text-xl">{price}<span className="text-sm font-normal text-gray-500">/mo</span></p>
      </div>
      <p className="text-sm text-gray-500 mb-3 italic">{pitch}</p>
      <ul className="space-y-1.5">
        {features.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
            <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Day card ─────────────────────────────────────────────────────────────────
function DayCard({ day, title, tasks }: { day: string; title: string; tasks: string[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">{day}</p>
      <p className="font-bold text-gray-800 mb-3">{title}</p>
      <ul className="space-y-1.5">
        {tasks.map(t => (
          <li key={t} className="flex items-start gap-2 text-sm text-gray-600">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function BizInABoxPage() {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Briefcase className="h-6 w-6 text-indigo-600" />
          <h1 className="text-2xl font-black text-gray-900">Business in a Box</h1>
        </div>
        <p className="text-gray-500">
          Everything you need to sign your first 5 clients. Follow the stages in order.
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Send a Demo', href: '/demo/dental', icon: Zap, color: 'text-indigo-600' },
          { label: 'Build Proposal', href: '/agency/proposal', icon: FileText, color: 'text-green-600' },
          { label: 'Email Templates', href: '/agency/sales-kit', icon: MessageSquare, color: 'text-blue-600' },
          { label: 'ROI Calculator', href: '/roi', icon: DollarSign, color: 'text-amber-600' },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            target={item.href.startsWith('/demo') || item.href === '/roi' ? '_blank' : undefined}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm transition text-center"
          >
            <item.icon className={`h-5 w-5 ${item.color}`} />
            <span className="text-xs font-semibold text-gray-700">{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="space-y-3">

        {/* ── STAGE 1: FIND ─────────────────────────────────────────────── */}
        <Section
          icon={Target}
          label="Stage 1 · Find"
          title="Identify your first 10 prospects"
          subtitle="Don't cold outreach yet. Start warm."
          color="bg-indigo-100 text-indigo-600"
          defaultOpen
        >
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="font-semibold text-gray-800 mb-3">Your warm network is your fastest path to $5K MRR</p>
            <p className="text-sm text-gray-600 mb-4">
              Before you cold outreach, go through these lists and pull 2–3 names from each:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: 'Current clients', desc: 'Who already pays you for something?' },
                { label: 'Past clients', desc: 'Who worked with you before?' },
                { label: 'Local businesses you visit', desc: 'Dentist, mechanic, barber, gym...' },
                { label: 'LinkedIn connections', desc: 'Business owners in your area' },
                { label: 'GHL sub-accounts', desc: 'Clients already in your GHL' },
                { label: 'Facebook group members', desc: 'Local business Facebook groups' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">🎯 Best industries to start with</p>
            <p className="text-sm text-amber-700">Cannabis (highest pain, highest price), Dental, Real Estate, Law Firms, Auto Dealers. These businesses have the highest volume of repetitive customer inquiries — the AI pays for itself immediately.</p>
          </div>
        </Section>

        {/* ── STAGE 2: PITCH ────────────────────────────────────────────── */}
        <Section
          icon={Zap}
          label="Stage 2 · Pitch"
          title="Show them the demo, then send the ROI"
          subtitle="Never pitch features. Show the AI working. Then show their money."
          color="bg-green-100 text-green-600"
        >
          {/* Demo links */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="font-semibold text-gray-800 mb-1">Your shareable demo links</p>
            <p className="text-xs text-gray-500 mb-3">Send the one that matches their industry. No login required.</p>
            <div className="space-y-2">
              {[
                { industry: '🦷 Dental', url: 'https://kyra.conversionsystem.com/demo/dental' },
                { industry: '🏡 Real Estate', url: 'https://kyra.conversionsystem.com/demo/realestate' },
                { industry: '🚗 Auto', url: 'https://kyra.conversionsystem.com/demo/auto' },
                { industry: '🌿 Cannabis', url: 'https://kyra.conversionsystem.com/demo/cannabis' },
              ].map(d => (
                <div key={d.url} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.industry}</p>
                    <p className="text-xs text-gray-400">{d.url}</p>
                  </div>
                  <CopyButton text={d.url} />
                </div>
              ))}
            </div>
          </div>

          {/* After demo text */}
          <ScriptCard
            title="Text to send after showing a demo"
            tag="HIGH CONVERT"
            script={`Hi [Name] — great showing you the demo! Here's what that would look like for [Business Name]: [paste /demo/[industry] link]

That AI is responding to YOUR customers, branded as YOUR business.

I can have your AI employee live in 72 hours. Want to move forward?`}
          />

          <ScriptCard
            title="ROI calculator message"
            script={`Hi [Name], I put together a quick ROI breakdown for [Business Name]:

→ You get ~[X] new leads per month
→ Right now, if even 30% go unanswered or respond slowly, that's [X × 0.3] lost conversations
→ At [their avg deal value], that's $[calculate] in missed revenue every month

Kyra fixes that. Your AI responds in 60 seconds, 24/7. 

Price: $[X]/mo. Most clients see ROI in the first week.

Worth a quick call to get it set up?`}
          />

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="font-semibold text-gray-800 mb-2">
              Live ROI Calculator
              <span className="ml-2 text-xs text-gray-400 font-normal">— share with prospects</span>
            </p>
            <p className="text-sm text-gray-500 mb-3">A public page where prospects enter their numbers and see their exact ROI.</p>
            <Link href="/roi" target="_blank">
              <Button size="sm" className="gap-2">
                <ArrowRight className="h-4 w-4" />
                Open ROI Calculator →
              </Button>
            </Link>
          </div>
        </Section>

        {/* ── STAGE 3: CLOSE ────────────────────────────────────────────── */}
        <Section
          icon={DollarSign}
          label="Stage 3 · Close"
          title="Pricing script + packages + objections"
          subtitle="Know what to say when they ask how much."
          color="bg-amber-100 text-amber-600"
        >
          {/* Package tiers */}
          <div>
            <p className="font-semibold text-gray-800 mb-1">Your 3 tiers to pitch</p>
            <p className="text-sm text-gray-500 mb-3">Never give one price. Give three. Anchoring triples close rate.</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <PackageTier
                name="Starter AI"
                price="$499"
                color="border-gray-200"
                pitch="Just getting started / lower-volume business"
                features={[
                  'AI employee on SMS',
                  'GHL CRM integration',
                  'Basic personality setup',
                  'Business hours config',
                  'Monthly report',
                ]}
              />
              <PackageTier
                name="Growth AI"
                price="$997"
                color="border-indigo-300"
                pitch="Most popular — growing business, higher volume"
                features={[
                  'Everything in Starter',
                  'Proactive lead outreach',
                  'Custom AI personality',
                  'Calendar booking link',
                  'Escalation alerts',
                  'Weekly performance report',
                ]}
              />
              <PackageTier
                name="Elite AI"
                price="$1,997"
                color="border-amber-300"
                pitch="High-volume or premium business"
                features={[
                  'Everything in Growth',
                  'Multi-channel (SMS + email)',
                  'Cannabis/compliance AI',
                  'Priority 24hr support',
                  'Monthly strategy call',
                  'Custom templates + scripts',
                ]}
              />
            </div>
          </div>

          {/* Pricing script */}
          <ScriptCard
            title="Pricing script (what to say on the call)"
            tag="WORD FOR WORD"
            script={`"So investment-wise, I have three options depending on what makes sense for you.

Most businesses I work with start on the Growth AI at $997/month. That's where you get the proactive outreach — so your AI doesn't just respond to texts, it reaches out to new leads the moment they enter your CRM.

If you want to start smaller and test it first, the Starter is $497/month. Everything you need to handle inbound, just without the proactive piece.

And if you want the full white-glove setup with priority support and a monthly strategy call, that's Elite AI at $1,997.

Which of those feels right for what you're trying to do?"`}
          />

          {/* Objections */}
          <div>
            <p className="font-semibold text-gray-800 mb-3">Objection cheat sheet</p>
            <div className="space-y-2">
              {[
                {
                  objection: '"We already have a chatbot."',
                  response: 'Totally get it — most chatbots are glorified FAQ pages. They match keywords and give canned responses. What I\'m talking about is a genuine AI employee: it understands context, recommends products, books appointments, and handles multi-turn conversations. The difference is whether it actually replaces staff time or just sits there. Want to see the difference in a 5-minute demo?',
                },
                {
                  objection: '"We tried AI before and it didn\'t work."',
                  response: 'That\'s actually really common, and I hear it a lot. Most AI tools agencies sell are chatbot builders — limited intents, scripted flows, falls apart on anything unexpected. What we\'re using is full OpenClaw — the same platform that just got backed by OpenAI. It actually understands the conversation. What specifically didn\'t work last time?',
                },
                {
                  objection: '"How is this different from ChatGPT?"',
                  response: 'ChatGPT is a tool that you have to go USE. This is an AI employee that works FOR your business — it responds to YOUR customers on YOUR phone number, connected to YOUR CRM, with YOUR business knowledge. Your customers never type "ChatGPT." They just text your number and get a response in 60 seconds.',
                },
                {
                  objection: '"What if it says something wrong?"',
                  response: 'Two things: first, I configure it with your exact business info, services, and pricing — so it knows what to say. Second, it\'s set to escalate to a human any time someone asks something it\'s not sure about. It won\'t guess. Every conversation is logged so you can see exactly what it said. And you can update it anytime.',
                },
                {
                  objection: '"We need to think about it."',
                  response: 'Totally understand — it\'s a real decision. Let me ask: what specifically would help you feel confident? Is it seeing it work for a business like yours? Talking to someone who uses it? Or is it mainly the price? [listen] ... [if price] What if we started on the Starter tier for 30 days? If you don\'t see leads being handled better, I\'ll refund it. Fair?',
                },
                {
                  objection: '"We can\'t afford it right now."',
                  response: 'I hear you — and I want to be honest with you. The Starter at $497 is designed for businesses that want to test this before committing. But here\'s the real question: how many leads are you missing right now because you can\'t respond fast enough? If one extra booking per month is $200-300, this pays for itself immediately. Want to run those numbers together real quick?',
                },
                {
                  objection: '"Can you just lower the price?"',
                  response: 'I appreciate you asking directly. Here\'s why I don\'t discount: every client gets the same infrastructure, the same dedicated AI, and the same support. If I lowered it for one person, I\'d have to do it for everyone. What I CAN do is start you on the Lite tier at $499 and upgrade once you see the results. Does that work?',
                },
              ].map(item => (
                <ObjectionCard key={item.objection} {...item} />
              ))}
            </div>
          </div>

          <ScriptCard
            title="Proposal follow-up (24hrs after sending)"
            script={`Hi [Name] — wanted to follow up on the proposal I sent yesterday.

The main thing I want you to know: this isn't a 6-month contract. It's month-to-month. If it's not working for you in 30 days, you cancel. No risk.

The AI can be live for [Business Name] within 72 hours of saying yes.

Worth jumping on a 10-minute call to answer any questions?`}
          />
        </Section>

        {/* ── STAGE 4: ONBOARD ──────────────────────────────────────────── */}
        <Section
          icon={Users}
          label="Stage 4 · Onboard"
          title="Get them live fast. Wow them in week 1."
          subtitle="Speed is everything. First impression = retention."
          color="bg-blue-100 text-blue-600"
        >
          <div>
            <p className="font-semibold text-gray-800 mb-3">Client onboarding sequence</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <DayCard
                day="Day 1 — Signed"
                title="Welcome & setup"
                tasks={[
                  'Add them to Kyra dashboard',
                  'Send welcome email (template below)',
                  'Connect their GHL sub-account',
                  'Set up AI personality',
                  'Go live on their number',
                ]}
              />
              <DayCard
                day="Day 3 — Checking in"
                title="First results check"
                tasks={[
                  'Text them: "Quick check — have you seen your AI reply to any texts yet?"',
                  'Show them the conversation feed',
                  'Answer any questions',
                  'Confirm AI is handling things correctly',
                ]}
              />
              <DayCard
                day="Day 7 — First win"
                title="Highlight a result"
                tasks={[
                  'Pull one conversation where AI saved them time',
                  'Send screenshot: "Look at this — [X] messages handled while you slept"',
                  'Ask: who else do you know who could use this?',
                  '(This is your referral moment)',
                ]}
              />
              <DayCard
                day="Day 30 — ROI review"
                title="Prove the value"
                tasks={[
                  'Pull monthly stats from the dashboard',
                  'Calculate: conversations handled × avg response value',
                  'Send 30-day report (template in Performance page)',
                  'Ask: want to upgrade to Growth AI?',
                ]}
              />
            </div>
          </div>

          <ScriptCard
            title="Welcome email (send immediately after they sign)"
            script={`Subject: Your AI employee is almost live 🚀

Hi [Name],

Welcome to [Your Agency]! Your AI employee for [Business Name] is being set up right now.

Here's what happens next:
1. I'll connect your AI to your GoHighLevel account (24hrs)
2. Once connected, it starts responding to texts automatically
3. You'll get a text from me when it's live

In the meantime, here's how to watch it work:
→ [Conversation feed link / portal link]

First person to text your number after it goes live gets a reply in 60 seconds. No staff needed.

Questions? Text or email me anytime.

— [Your Name]
[Your Agency]`}
          />

          <ScriptCard
            title="'It's live' text (send when AI goes live)"
            script={`Hey [Name] — your AI employee just went live! 🎉

From this point on, every text to your business number gets a response in 60 seconds, 24/7.

Here's where you can watch the conversations in real time: [portal link]

Text your own number from a different phone — see how fast it responds. 

Your first report lands in your inbox next Monday.`}
          />
        </Section>

        {/* ── STAGE 5: RETAIN + GROW ────────────────────────────────────── */}
        <Section
          icon={TrendingUp}
          label="Stage 5 · Retain & Grow"
          title="Prove ROI every month. Turn clients into referrals."
          subtitle="The only metric that matters: are they making more than they're paying you?"
          color="bg-purple-100 text-purple-600"
        >
          <ScriptCard
            title="Monthly check-in script (day 28)"
            script={`Hi [Name] — month 1 is almost done. Quick recap:

📊 [X] conversations handled by your AI
⏱️ Avg response time: 47 seconds
🚨 [X] escalated to you (everything else handled)
💰 Est. value: [X conversations × avg deal size = $X]

Renewal processes automatically on [date]. Any questions, I'm here.

P.S. — Do you know any other [industry] owners who'd want this? I give a $200 credit for every referral that signs.`}
          />

          <ScriptCard
            title="Upsell script (day 30 call)"
            script={`"So looking at your first month — [X] conversations handled, [Y] escalations, average response under a minute. Pretty solid start.

The one thing I'd suggest: upgrading to Growth AI. The main thing you'd add is proactive outreach — so instead of just responding to texts, your AI starts conversations with new leads the moment they enter your CRM.

That's usually where clients see the biggest jump in booked appointments.

It's $500 more per month. Given what we've seen this month, I think it would pay for itself in the first week. Want to try it?"`}
          />

          <ScriptCard
            title="Referral ask (after any client wins)"
            script={`Hi [Name] — glad to hear the AI is working well!

Quick ask: do you know any other [dental practices / dispensaries / real estate agents] who are dealing with the same problem — too many texts to handle?

I give a $200 account credit for every business owner you refer who signs up. Just have them mention your name.

Even just one name — who's the first person that comes to mind?`}
          />

          {/* Video script */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold text-gray-800">60-second video script</p>
                <p className="text-xs text-gray-400">Record this on your phone. Post to LinkedIn, IG Reels, or send to prospects.</p>
              </div>
              <CopyButton text={`[TO CAMERA]

"If you run a local business and you're still manually responding to every customer text — I want to show you something.

This is what it looks like when your business has an AI employee.

[SCREEN: show /demo/dental or /demo/realestate]

That response? Under 60 seconds. 24 hours a day, 7 days a week. And it's connected to your CRM, so it knows who it's talking to.

I've set this up for dental practices, dispensaries, real estate teams, and more. It takes about 10 minutes.

[TO CAMERA]

If you want to see what this looks like for YOUR business — I put together a free demo. Link in bio. No pitch, just the demo."`} />
            </div>
            <pre className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed font-sans bg-gray-50 rounded-lg p-3">{`[TO CAMERA]

"If you run a local business and you're still manually responding to every customer text — I want to show you something.

This is what it looks like when your business has an AI employee."

[SCREEN: show /demo/dental or /demo/realestate]

"That response? Under 60 seconds. 24 hours a day, 7 days a week. And it's connected to your CRM, so it knows who it's talking to."

"I've set this up for dental practices, dispensaries, real estate teams, and more. It takes about 10 minutes."

[TO CAMERA]

"If you want to see what this looks like for YOUR business — I put together a free demo. Link in bio. No pitch, just the demo."`}</pre>
          </div>
        </Section>
      </div>

      {/* Bottom CTA */}
      <div className="mt-8 rounded-2xl bg-indigo-600 text-white p-6 text-center">
        <Star className="h-8 w-8 text-indigo-300 mx-auto mb-3" />
        <h3 className="text-lg font-black mb-2">Your goal: 5 clients in 30 days</h3>
        <p className="text-indigo-200 text-sm mb-4">
          5 clients at $997/mo = $4,985 MRR. Your Kyra cost: $99/mo. Net: $4,888/mo.
          <br />
          That's what this entire playbook is designed to get you to.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/agency/clients/new">
            <Button className="bg-white text-indigo-700 hover:bg-indigo-50 gap-2">
              <Users className="h-4 w-4" />
              Add Your First Client
            </Button>
          </Link>
          <Link href="/agency/sales-kit">
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 gap-2">
              <MessageSquare className="h-4 w-4" />
              Get Email Templates
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
