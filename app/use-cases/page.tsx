import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'Use Cases — Business in a Box for Every Industry | Kyra',
  description:
    'See how agencies use Kyra to deploy a complete AI-powered business for their clients: 15-25 page SEO-optimized website, AI worker, CRM, and lead capture — in under 10 minutes. HVAC, law, dental, real estate, and more.',
  keywords: [
    'AI website builder', 'AI worker', 'business in a box', 'agency platform',
    'AI for small business', 'SEO website generator', 'AI appointment booking',
    'AI lead capture', 'white-label AI platform', 'agency CRM',
  ],
};

// ── Use Case Data ─────────────────────────────────────────────────────────────

interface UseCase {
  slug: string;
  emoji: string;
  industry: string;
  clientType: string;
  sitePages: string;
  monthlyCharge: string;
  whatTheyGet: string[];
  conversation: Array<{ from: 'customer' | 'ai'; text: string }>;
  result: string;
  agencyMargin: string;
}

const USE_CASES: UseCase[] = [
  {
    slug: 'hvac',
    emoji: '🏠',
    industry: 'HVAC Agency',
    clientType: 'CoolBreeze Heating & Air',
    sitePages: '22 pages',
    monthlyCharge: '$800/mo',
    whatTheyGet: [
      '22-page SEO website (service pages, city pages, blog, FAQ)',
      'AI worker handles emergency calls + appointment booking 24/7',
      'CRM captures every lead from website forms and chat',
      'Growth Engine adds new service area pages monthly',
    ],
    conversation: [
      { from: 'customer', text: "My AC just died and it's 95 degrees in here. I have a baby." },
      { from: 'ai', text: "I understand — that's stressful. Quick tip: open windows on opposite sides for a cross-breeze.\n\nOur after-hours rate is $149 for the service call (applied toward the repair). What's your address?" },
      { from: 'customer', text: "789 Pine Road. How soon can someone get here?" },
      { from: 'ai', text: "I've dispatched this as urgent. A technician will be at 789 Pine Road within the hour. You'll get a text when they're on the way." },
    ],
    result: 'Emergency call handled at 2am. Tech dispatched. Lead captured in CRM. Site ranks for "AC repair [city]".',
    agencyMargin: '$800/mo revenue — starting from $99/mo for up to 3 clients (Lite plan)',
  },
  {
    slug: 'law-firm',
    emoji: '⚖️',
    industry: 'Law Firm Agency',
    clientType: 'Martinez & Associates',
    sitePages: '24 pages',
    monthlyCharge: '$1,500/mo',
    whatTheyGet: [
      '24-page SEO website (practice area pages, city pages, attorney bios, blog)',
      'AI intake worker qualifies leads and books consultations 24/7',
      'CRM captures every inquiry from website, chat, and phone',
      'Growth Engine adds new practice area + location pages',
    ],
    conversation: [
      { from: 'customer', text: "I was in a car accident yesterday and I need to talk to a lawyer." },
      { from: 'ai', text: "I'm sorry to hear that. You've reached Martinez & Associates. First — are you okay? Did you receive medical attention?" },
      { from: 'customer', text: "Yeah, I went to the ER. My back is really hurting." },
      { from: 'ai', text: "I'm glad you went to the ER. Attorney Martinez handles personal injury cases like yours, and the consultation is completely free.\n\nA few quick details:\n- Was a police report filed?\n- Do you have the other driver's insurance?\n- When can you come in for a 30-minute consultation?" },
      { from: 'customer', text: "Yes to both. Tomorrow afternoon works." },
      { from: 'ai', text: "Scheduled for tomorrow at 2pm with Attorney Martinez. He'll review everything and advise on your options — no cost, no obligation.\n\nImportant: don't give any recorded statements to the other driver's insurance before speaking with us." },
    ],
    result: 'PI lead qualified and booked in 90 seconds. Site ranks for "personal injury lawyer [city]". Lead in CRM with full context.',
    agencyMargin: '$1,500/mo revenue — ~$25 Kyra cost per client (Pro plan)',
  },
  {
    slug: 'real-estate',
    emoji: '🏡',
    industry: 'Real Estate Agency',
    clientType: 'Lisa Chen Realty',
    sitePages: '25 pages',
    monthlyCharge: '$1,200/mo',
    whatTheyGet: [
      '25-page SEO website (neighborhood pages, buyer/seller guides, market reports, blog)',
      'AI worker qualifies leads, schedules tours, nurtures prospects 24/7',
      'CRM captures every inquiry with property interest and timeline',
      'Growth Engine adds new neighborhood + market update pages',
    ],
    conversation: [
      { from: 'customer', text: "Hi, I'm interested in the property at 456 Maple Drive. Is it still available?" },
      { from: 'ai', text: "Hi! Yes, 456 Maple Drive is still available. Great choice — it's a 3-bed, 2-bath with the newly renovated kitchen.\n\nWant to schedule a showing? I have availability Wednesday evening or Saturday morning." },
      { from: 'customer', text: "Saturday works. What's the price?" },
      { from: 'ai', text: "Listed at $425,000. Does 10am Saturday work? And can I get your name and best contact number?" },
      { from: 'customer', text: "I'm David Chen, 555-0199. 10am is perfect." },
      { from: 'ai', text: "You're all set, David! Lisa will meet you at 456 Maple Drive Saturday at 10am. I'll send the full listing details and directions." },
    ],
    result: 'Lead responded to automatically (even during showings). Tour booked. Site ranks for "[neighborhood] homes for sale".',
    agencyMargin: '$1,200/mo revenue — ~$25 Kyra cost per client (Pro plan)',
  },
  {
    slug: 'dental',
    emoji: '🦷',
    industry: 'Dental Agency',
    clientType: 'Bright Smile Dental',
    sitePages: '20 pages',
    monthlyCharge: '$600/mo',
    whatTheyGet: [
      '20-page SEO website (service pages, insurance pages, blog, FAQ, team bios)',
      'AI worker books appointments + handles insurance Q&A 24/7',
      'CRM captures every patient inquiry with service interest',
      'Growth Engine adds new service + location pages to rank for more searches',
    ],
    conversation: [
      { from: 'customer', text: "I need to schedule a cleaning." },
      { from: 'ai', text: "Hi, thanks for reaching out to Bright Smile Dental! Are you an existing patient, or would this be your first visit?" },
      { from: 'customer', text: "First time." },
      { from: 'ai', text: "Welcome! For new patients, we do a full exam and cleaning — takes about an hour. We have openings Thursday at 10am or Friday at 2pm. Which works?" },
      { from: 'customer', text: "Thursday morning." },
      { from: 'ai', text: "Thursday at 10am it is! You'll get a confirmation text with our address and what to bring. Just need your insurance card and photo ID." },
    ],
    result: 'After-hours call converts instead of going to voicemail. Site ranks for "dentist near me" + insurance-specific terms.',
    agencyMargin: '$600/mo revenue — ~$33 Kyra cost per client (Lite plan)',
  },
  {
    slug: 'medspa',
    emoji: '✨',
    industry: 'Med Spa Agency',
    clientType: 'Glow Aesthetics',
    sitePages: '18 pages',
    monthlyCharge: '$900/mo',
    whatTheyGet: [
      '18-page SEO website (treatment pages, pricing pages, before/after, blog)',
      'AI worker handles consultations, bookings, and treatment Q&A 24/7',
      'CRM captures every inquiry with treatment interest and budget',
      'Growth Engine adds new treatment + seasonal promotion pages',
    ],
    conversation: [
      { from: 'customer', text: "How much is Botox? Do you have anything available this week?" },
      { from: 'ai', text: "Hi! Thanks for reaching out to Glow Aesthetics!\n\nOur Botox pricing:\n- Forehead lines — $250–$350\n- Crow's feet — $200–$300\n- Full face — $500–$650\n\nWe have openings Thursday at 11am and Friday at 3pm. Would either work?" },
      { from: 'customer', text: "Friday at 3 sounds good. Is Dr. Kim doing it?" },
      { from: 'ai', text: "Yes! Dr. Kim will be in Friday. Can I get your name and phone number to confirm?" },
      { from: 'customer', text: "Jessica Park, 555-0234" },
      { from: 'ai', text: "Booked! Friday at 3pm with Dr. Kim. We'll text a reminder the day before. Come 10 minutes early for a quick form." },
    ],
    result: 'Instant response on Instagram DM. Consultation booked. Site ranks for "Botox [city]" and treatment-specific terms.',
    agencyMargin: '$900/mo revenue — ~$25 Kyra cost per client (Pro plan)',
  },
  {
    slug: 'plumbing',
    emoji: '🔧',
    industry: 'Plumbing Agency',
    clientType: "Mike's Plumbing",
    sitePages: '18 pages',
    monthlyCharge: '$700/mo',
    whatTheyGet: [
      '18-page SEO website (service pages, service area pages, blog, emergency info)',
      'AI worker dispatches emergency calls + books routine appointments 24/7',
      'CRM captures every lead with job type and urgency level',
      'Growth Engine adds new service area pages to expand coverage',
    ],
    conversation: [
      { from: 'customer', text: "Hey, I have a leaking pipe under my kitchen sink. Can someone come out today?" },
      { from: 'ai', text: "Hi! Sorry to hear about the leak. A few quick questions:\n\n- Is the water actively flowing, or is it a slow drip?\n- What's your address?\n- Are you available this afternoon between 2–5pm?" },
      { from: 'customer', text: "It's a steady drip, getting worse. 142 Oak Street, Apt 3B. Afternoon works." },
      { from: 'ai', text: "Got you booked! A technician will be at 142 Oak Street, Apt 3B today between 2:00–3:00 PM. You'll get a confirmation text shortly." },
    ],
    result: 'Mike gets the job instead of losing it to a competitor. Site ranks for "plumber [city]" + "emergency plumber near me".',
    agencyMargin: '$700/mo revenue — ~$33 Kyra cost per client (Lite plan)',
  },
];

// ── Page Component ────────────────────────────────────────────────────────────

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <PublicNav />

      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-50 to-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-indigo-600 font-semibold text-sm uppercase tracking-wide mb-3">
            Use Cases
          </p>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight">
            Website + AI Worker + CRM.<br />
            <span className="text-indigo-600">Deployed in 10 minutes. Billed at $500–2,000/mo.</span>
          </h1>
          <p className="text-xl text-gray-600 mt-4 max-w-2xl mx-auto">
            See exactly what each client gets when you deploy Kyra&apos;s Business in a Box.
            Real websites. Real AI conversations. Real agency revenue.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {USE_CASES.map((uc) => (
              <a
                key={uc.slug}
                href={`#${uc.slug}`}
                className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-medium hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
              >
                <span>{uc.emoji}</span> {uc.industry}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* What each client gets */}
      <section className="py-16 px-4 border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">
            Every client gets the full Business in a Box
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: '🌐', title: '15-25 Page SEO Website', desc: 'Service pages, city pages, blog, FAQ — generated by AI in minutes' },
              { icon: '🤖', title: 'AI Worker', desc: 'Chat widget that books appointments, captures leads, answers questions 24/7' },
              { icon: '📊', title: 'Built-In CRM', desc: 'Every lead from website, chat, and GHL in one inbox' },
              { icon: '📈', title: 'Growth Engine', desc: 'AI suggests new pages to grow your search presence. One click to publish.' },
            ].map((f, i) => (
              <div key={i}>
                <div className="text-3xl mb-2">{f.icon}</div>
                <div className="font-bold text-sm">{f.title}</div>
                <div className="text-gray-500 text-xs mt-1">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto space-y-24">
          {USE_CASES.map((uc, idx) => (
            <div key={uc.slug} id={uc.slug} className="scroll-mt-24">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="text-4xl">{uc.emoji}</div>
                <div>
                  <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide">
                    Use Case #{idx + 1}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-black">
                    {uc.industry}
                  </h2>
                  <p className="text-gray-500 mt-1">{uc.clientType} — {uc.sitePages} · Billed at {uc.monthlyCharge}</p>
                </div>
              </div>

              {/* What they get */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-6">
                <p className="font-semibold text-indigo-800 text-sm mb-3">What this client gets:</p>
                <ul className="space-y-2">
                  {uc.whatTheyGet.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-indigo-700">
                      <span className="text-indigo-500 shrink-0 mt-0.5">&#10003;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Conversation */}
              <div className="bg-gray-50 rounded-xl p-5 mb-6">
                <p className="font-semibold text-gray-700 text-sm mb-4">AI Worker Conversation</p>
                <div className="space-y-3">
                  {uc.conversation.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.from === 'customer' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line ${
                          msg.from === 'customer'
                            ? 'bg-white border border-gray-200 text-gray-800'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {msg.from === 'customer' && (
                          <p className="text-xs font-semibold text-gray-400 mb-1">Customer</p>
                        )}
                        {msg.from === 'ai' && (
                          <p className="text-xs font-semibold text-indigo-200 mb-1">AI Worker</p>
                        )}
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Result + Margin */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                  <p className="font-semibold text-green-800 text-sm mb-1">Result</p>
                  <p className="text-green-700 text-sm">{uc.result}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="font-semibold text-gray-700 text-sm mb-1">Agency Margin</p>
                  <p className="text-gray-600 text-sm">{uc.agencyMargin}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Revenue summary */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-4">The agency math</h2>
          <p className="text-gray-500 mb-10">Pro plan: $249/mo for 10 clients. Each client gets the full Business in a Box.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { label: 'Your Kyra cost', value: '$249/mo', sub: 'Pro plan — 10 clients' },
              { label: 'Avg client billing', value: '$800–1,200/mo', sub: 'Website + AI worker + CRM' },
              { label: 'Your monthly revenue', value: '$8,000–12,000', sub: '10 clients on Pro plan' },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-6">
                <p className="text-sm text-gray-500 mb-1">{s.label}</p>
                <p className="text-3xl font-black text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-indigo-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black">
            Build your first client site in 10 minutes.
          </h2>
          <p className="text-indigo-100 text-lg mt-4">
            15-25 page SEO-optimized website. AI worker. CRM. Lead capture. Growth Engine.
            All from one dashboard — deployed in minutes, billed at $500–2,000/mo.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup/agency"
              className="bg-white text-indigo-600 font-bold text-lg px-8 py-4 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Start Free — Build Your First Site
            </Link>
            <Link
              href="/pricing"
              className="border-2 border-white/30 text-white font-bold text-lg px-8 py-4 rounded-xl hover:bg-white/10 transition-colors"
            >
              See Pricing
            </Link>
          </div>
          <p className="text-indigo-200 text-sm mt-4">
            No credit card required · 7-day free trial · Cancel anytime
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
