import Link from 'next/link';
import { MessageSquare, Settings, CreditCard, Wrench, Users } from 'lucide-react';
import type { Metadata } from 'next';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Help & FAQ — Kyra AI',
  description: 'Answers to common questions about Kyra — OpenClaw-powered autonomous AI workers for agencies. Setup, GHL integration, billing, and troubleshooting.',
};

const SECTIONS = [
  {
    icon: Users,
    title: 'Getting Started',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    faqs: [
      {
        q: 'How long does it take to get my first AI employee live?',
        a: 'Under 10 minutes for most agencies. The steps are: (1) Create your free account, (2) Connect your GHL private integration token, (3) Add a client and pick an industry template, (4) Click "Generate with AI" to write the personality, (5) Done — the AI starts responding automatically.',
      },
      {
        q: 'Do I need GoHighLevel to use Kyra?',
        a: 'GHL is required for the SMS and multi-channel features. However, the web chat widget works on any website without GHL — embed a single script tag on your client\'s site and the AI responds immediately.',
      },
      {
        q: 'What channels does Kyra work on?',
        a: 'When connected to GHL, Kyra handles: SMS, WhatsApp, Instagram DMs, Facebook Messenger, Live Chat, Google Business Messages, and GHL email. Plus our own web chat widget (no GHL needed) and voice webhook integration.',
      },
      {
        q: 'Can I try Kyra without signing up?',
        a: 'Yes! Go to kyra.conversionsystem.com/try/dental (or any industry slug) for a live conversation with a real AI. No account, no credit card, no GHL required.',
      },
    ],
  },
  {
    icon: MessageSquare,
    title: 'GHL Integration',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    faqs: [
      {
        q: 'How do I get my GHL Private Integration Token?',
        a: 'In your GHL account: Settings → Integrations → Private Integrations → Create New. Name it "Kyra AI", select all message permissions, and copy the token. Paste it in Kyra\'s dashboard under Agency → GHL Setup.',
      },
      {
        q: 'Do I need GHL Marketplace approval to use Kyra?',
        a: 'No! Kyra uses Private Integration Tokens, which bypass marketplace approval entirely. Any GHL agency can connect immediately — no waiting, no review process.',
      },
      {
        q: 'The AI isn\'t responding to GHL messages. What\'s wrong?',
        a: 'Check these in order: (1) Is your GHL token valid? (go to GHL → Settings → Integrations and verify it). (2) Is the client\'s container status "Running" in the Kyra dashboard? (3) Has the AI personality been configured? (4) Is the GHL number associated with the correct sub-account? Email angel@conversionsystem.com with your client ID if still stuck.',
      },
      {
        q: 'Can I connect multiple GHL sub-accounts?',
        a: 'Yes — each Kyra client maps to one GHL sub-account. Each client has its own Private Integration Token. Add as many clients as your plan allows, each with their own GHL connection.',
      },
      {
        q: 'Will the AI update my GHL CRM automatically?',
        a: 'Yes. After every conversation, the AI analyzes the exchange and: (1) Adds relevant tags to the contact (hot-lead, appointment-requested, price-inquiry, etc.), (2) Writes a note summarizing the conversation, and (3) Updates the pipeline stage if the context suggests it.',
      },
    ],
  },
  {
    icon: Settings,
    title: 'AI Configuration',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    faqs: [
      {
        q: 'What is "Generate with AI" and how does it work?',
        a: 'Click the ✨ button on the Personality tab and enter the business name and industry. Our AI generates a complete persona, greeting, and detailed instructions for that specific business type — in seconds. You can edit it further or use it as-is.',
      },
      {
        q: 'Can the AI speak Spanish (or another language)?',
        a: 'Yes. In the client\'s Personality tab → Response Language → select Spanish (or any of 14 other languages). The AI will always respond in that language, regardless of what language the customer uses.',
      },
      {
        q: 'How does the AI know what to say about my client\'s business?',
        a: 'The AI\'s personality (persona, greeting, instructions) is configured in the Personality tab. Be specific: include the business name, services offered with prices, staff names, booking policies, and any FAQs. The more detail you provide, the better the AI performs.',
      },
      {
        q: 'Can the AI book appointments in my GHL calendar?',
        a: 'The AI includes your GHL booking link when customers ask to schedule. Go to: Personality tab → Calendar Booking Link → paste your GHL calendar share link. The AI will naturally offer it during appointment conversations.',
      },
      {
        q: 'What happens when the AI can\'t handle a message?',
        a: 'When the AI detects a frustrated customer or a question it can\'t answer confidently, it escalates: (1) Tags the contact "needs-human" and "kyra-escalated" in GHL, (2) Sends an email alert to your agency\'s escalation email, (3) Fires your configured Slack/Discord webhook if set up. You can then jump into the GHL conversation directly.',
      },
    ],
  },
  {
    icon: CreditCard,
    title: 'Billing & Plans',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    faqs: [
      {
        q: 'What does each plan include?',
        a: 'Free: 1 AI employee, all features. Lite ($99/mo): 5 AI employees + BYOK + weekly reports. Pro ($249/mo): 15 AI employees + white-label + pitch pages + referral program. Scale ($499/mo): 50 AI employees + everything. All paid plans include a 30-day free trial.',
      },
      {
        q: 'What is BYOK (Bring Your Own Key)?',
        a: 'On Starter+ plans, you can connect your own OpenAI API key. This gives you full control over AI costs. You\'ll need to create an account at platform.openai.com and add at least $5 in credits to enable API access (note: ChatGPT subscription ≠ API credits).',
      },
      {
        q: 'Can I cancel anytime?',
        a: 'Yes. Cancel anytime from your Billing page. Your plan stays active until the end of the billing period, then reverts to Free (1 client). No cancellation fees.',
      },
      {
        q: 'How does billing work for the 30-day trial?',
        a: 'Enter your card to start the trial. You won\'t be charged for 30 days. If you cancel before the trial ends, you pay nothing. After 30 days, your card is charged for the monthly rate.',
      },
      {
        q: 'What happens if I reach my client limit?',
        a: 'You\'ll see an upgrade prompt when you try to add more clients than your plan allows. Existing clients continue working — they\'re never interrupted. Just upgrade to add more.',
      },
    ],
  },
  {
    icon: Wrench,
    title: 'Troubleshooting',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    faqs: [
      {
        q: 'My client\'s container shows "stopped" — what do I do?',
        a: 'Click the "Reprovision" button in the client detail page (three-dot menu). This restarts the AI employee\'s infrastructure. If it still shows stopped after 2 minutes, contact support.',
      },
      {
        q: 'The web chat widget isn\'t showing on my client\'s website.',
        a: 'Check: (1) Is the script tag placed before </body>? (2) Is the CLIENT_ID correct in the embed code? (3) Try a hard refresh (Ctrl+Shift+R). The CDN cache refreshes every 5 minutes after changes.',
      },
      {
        q: 'Email notifications aren\'t working.',
        a: 'Email features require a RESEND_API_KEY in your Vercel environment variables. This key needs to be added by your Kyra administrator. Once added, all emails activate automatically: welcome emails, escalation alerts, weekly reports, and the 7-day nurture sequence.',
      },
      {
        q: 'The AI is responding in the wrong language.',
        a: 'Go to the client\'s Personality tab → Response Language. Select the correct language and click Save. The AI will start responding in the new language for all future messages (existing conversations stay in their original language).',
      },
      {
        q: 'How do I get support?',
        a: 'Email angel@conversionsystem.com with your agency ID (found in your dashboard URL) and a description of the issue. We aim to respond within 24 hours.',
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <PublicNav />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-black mb-3">Help & FAQ</h1>
          <p className="text-slate-400 text-lg">Common questions about Kyra AI employees, GHL integration, and billing.</p>
          <p className="text-sm text-slate-500 mt-2">
            Can&apos;t find your answer?{' '}
            <Link href="mailto:angel@conversionsystem.com" className="text-indigo-400 hover:underline">
              Email us directly →
            </Link>
          </p>
        </div>

        {/* Quick nav */}
        <div className="flex flex-wrap gap-2 mb-10">
          {SECTIONS.map(s => (
            <a key={s.title} href={`#${s.title.replace(/\s+/g, '-').toLowerCase()}`}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-xs text-slate-300 transition">
              <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
              {s.title}
            </a>
          ))}
        </div>

        <div className="space-y-12">
          {SECTIONS.map(section => (
            <div key={section.title} id={section.title.replace(/\s+/g, '-').toLowerCase()}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`rounded-xl p-2 ${section.bg}`}>
                  <section.icon className={`h-5 w-5 ${section.color}`} />
                </div>
                <h2 className="text-xl font-black">{section.title}</h2>
              </div>

              <div className="space-y-4">
                {section.faqs.map(faq => (
                  <div key={faq.q} className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <h3 className="font-bold text-white mb-2 text-sm leading-tight">{faq.q}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-indigo-950/50 border border-indigo-500/20 p-8 text-center">
          <p className="text-lg font-bold mb-2">Still need help?</p>
          <p className="text-slate-400 mb-6 text-sm">Our team responds within 24 hours. Usually faster.</p>
          <Link href="mailto:angel@conversionsystem.com"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition inline-block">
            Email Support →
          </Link>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
