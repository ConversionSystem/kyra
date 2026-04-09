// Programmatic SEO page — /ai-for/[niche]
// Targets searches like "AI for dental practices", "AI worker for real estate"
// Each niche gets a fully unique, keyword-rich page

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

interface NicheData {
  slug: string;
  title: string;
  metaTitle: string;
  metaDesc: string;
  emoji: string;
  hero: string;
  subhero: string;
  pain: string;
  painDetail: string;
  result: string;
  resultStat: string;
  features: { icon: string; title: string; desc: string }[];
  useCases: string[];
  faq: { q: string; a: string }[];
  keywords: string[];
  demoSlug: string;
}

const NICHES: Record<string, NicheData> = {
  dental: {
    slug: 'dental',
    title: 'AI Worker for Dental Practices',
    metaTitle: 'AI Worker for Dental Practices | Automated SMS, Booking & Follow-Up',
    metaDesc: 'Add an AI worker to your dental practice that responds to every patient inquiry in 60 seconds, books appointments automatically, and handles insurance questions 24/7. Works with any CRM.',
    emoji: '🦷',
    hero: 'AI Worker for Dental Practices',
    subhero: 'Responds to every patient text in 60 seconds. Books appointments. Handles insurance questions. Works 24/7 — even when your front desk doesn\'t.',
    pain: 'Dental practices miss 30–40% of appointment requests.',
    painDetail: 'Patients text after hours, on weekends, during lunch. Front desk staff can\'t respond immediately — and every unanswered text is a patient who called the next practice on their Google search.',
    result: 'Dental practices using AI SMS see 35–45% more booked appointments within 30 days.',
    resultStat: '+40% appointment bookings',
    features: [
      { icon: '📅', title: 'Appointment booking', desc: 'Patient asks for an appointment → AI checks availability → confirms time → sends reminder. No human needed.' },
      { icon: '💊', title: 'Insurance handling', desc: 'Answers "Do you take Delta Dental?" automatically. Checks your accepted insurances and replies accurately every time.' },
      { icon: '🔁', title: 'Re-activation campaigns', desc: 'Patients who haven\'t visited in 6+ months get a personalized re-engagement text. Automated, effortless recall.' },
      { icon: '⏰', title: '24/7 response', desc: 'Friday 9pm patient asking about emergency care? AI responds immediately — and routes genuine emergencies to your on-call contact.' },
      { icon: '🏷️', title: 'Automatic CRM updates', desc: 'After every conversation, the patient\'s contact is tagged (new patient, insurance confirmed, booked) and a note is added.' },
      { icon: '😤', title: 'Handles frustrated patients', desc: 'Detects frustration keywords and immediately escalates to a human team member via email.' },
    ],
    useCases: [
      'New patient inquiry — "Do you take new patients?"',
      'Appointment requests — "I need a cleaning, do you have anything this week?"',
      'Insurance verification — "Do you accept BlueCross?"',
      'Pricing questions — "How much is a root canal without insurance?"',
      'Emergency triage — "I have a broken tooth, what should I do?"',
      'Appointment reminders — automated day-before confirmations',
    ],
    faq: [
      { q: 'Does this integrate with my existing scheduling software?', a: 'Kyra integrates with popular CRMs including GoHighLevel, and also works standalone with our web chat widget. Setup takes under 20 minutes.' },
      { q: 'Can I customize what the AI says about my practice?', a: 'Yes — you set the AI name, personality, accepted insurances, pricing, hours, and special offers. The AI speaks with your practice\'s exact voice.' },
      { q: 'What if the AI doesn\'t know the answer?', a: 'You configure a fallback: "Let me have a team member follow up with you." The contact gets tagged as needing human follow-up, and your staff gets an alert.' },
      { q: 'Is patient data handled securely?', a: 'Conversations happen via SMS — the same channel your practice already uses. No PHI is stored in Kyra beyond what\'s in your CRM.' },
    ],
    keywords: ['AI for dental practices', 'dental AI worker', 'dental SMS automation', 'AI receptionist dental', 'AI appointment booking dental'],
    demoSlug: 'dental',
  },

  cannabis: {
    slug: 'cannabis',
    title: 'AI Worker for Cannabis Dispensaries',
    metaTitle: 'AI Worker for Cannabis Dispensaries | Proven SMS Automation',
    metaDesc:
      'Kyra AI was originally built for high-volume cannabis dispensary clients. Handles every inbound SMS — product questions, FAQs, pickup status — in under 60 seconds. Trained to follow cannabis industry best practices, 24/7.',
    emoji: '🌿',
    hero: 'AI Worker for Cannabis Dispensaries',
    subhero:
      'Built from years of AI SMS work with cannabis clients. Product questions, compliance FAQs, pickup status — handled automatically in under 60 seconds.',
    pain: 'Cannabis dispensaries are drowning in repetitive SMS messages.',
    painDetail:
      'Menu questions. Pickup ETA. Compliance FAQs. New strain recommendations. Hours. Locations. Your staff answers the same 20 questions 100 times a day — while actually important customer relationships go unmanaged.',
    result:
      'Cannabis clients using this AI SMS architecture have seen meaningful revenue lifts from faster response and better follow-up.',
    resultStat: 'High-volume cannabis deployments',
    features: [
      { icon: '📋', title: 'Full menu knowledge', desc: 'AI knows your entire menu — strains, edibles, concentrates, current specials. Recommends products based on customer preference.' },
      { icon: '⚖️', title: 'Industry-aware messaging', desc: 'AI trained to follow cannabis industry best practices — avoids prohibited language and stays within responsible messaging guidelines.' },
      { icon: '🔁', title: 'Repeat customer engagement', desc: 'Re-engages customers who haven\'t visited in 30, 60, or 90 days with personalized product recommendations.' },
      { icon: '🏷️', title: 'Loyalty program integration', desc: 'Answers loyalty points questions, promotes deals to VIP customers, drives repeat visits automatically.' },
      { icon: '📍', title: 'Multi-location support', desc: 'Multiple dispensary locations? The AI knows each location\'s hours, inventory, and staff contacts.' },
      { icon: '🚨', title: 'Compliance escalation', desc: 'Complex compliance questions immediately route to a human compliance team member.' },
    ],
    useCases: [
      '"What strains do you have for anxiety?"',
      '"Are you open right now? What are your hours?"',
      '"I placed an order — when is it ready for pickup?"',
      '"Do you have any first-time customer deals?"',
      '"What\'s the difference between indica and sativa?"',
      '"I have my medical card — do I get a discount?"',
    ],
    faq: [
      { q: 'Is AI SMS marketing legal for cannabis businesses?', a: 'Kyra handles SMS responses to inbound messages from existing customers — this is legally different from outbound promotional SMS. We pre-configure the AI to stay within TCPA and state compliance guidelines.' },
      { q: 'Can the AI handle compliant language requirements?', a: 'Yes. You set the AI\'s compliance rules (no specific health claims, age verification language, etc.). The AI stays within those guardrails in every response.' },
      {
        q: 'Do you have experience with cannabis clients?',
        a: "Yes — we've run AI SMS for cannabis clients including Purple Lotus and The Flower Shop. Cannabis is our strongest vertical, and those deployments informed how Kyra is designed.",
      },
      { q: 'What if a customer asks about delivery?', a: 'You configure the AI\'s knowledge of your delivery zones, minimums, and ETA. It handles delivery questions accurately or routes to your delivery team.' },
    ],
    keywords: ['cannabis dispensary AI', 'dispensary SMS automation', 'cannabis AI worker', 'dispensary chatbot', 'cannabis marketing automation'],
    demoSlug: 'cannabis',
  },

  'real-estate': {
    slug: 'real-estate',
    title: 'AI Worker for Real Estate Agencies',
    metaTitle: 'AI Worker for Real Estate Agencies | Instant Lead Response, Showing Booking',
    metaDesc: 'Real estate AI that responds to every lead in under 60 seconds. Qualifies buyers, books showings, follows up with cold leads automatically. Works with any CRM.',
    emoji: '🏡',
    hero: 'AI Worker for Real Estate',
    subhero: 'Real estate leads go cold in 5 minutes. Our AI responds to every inbound inquiry in under 60 seconds — qualifies buyers, books showings, and keeps leads warm until an agent is ready.',
    pain: '78% of buyers go with whoever responds first. Most agents respond in hours.',
    painDetail: 'Leads come in from Zillow, Facebook, your website — at all hours. Agents are showing properties, on calls, or asleep. By the time someone responds, the lead has already booked with a competitor.',
    result: 'Real estate teams using AI lead response close 30% more deals from the same lead volume.',
    resultStat: '100% of leads contacted in <5 min',
    features: [
      { icon: '⚡', title: 'Instant lead response', desc: 'Every new contact triggers an immediate AI text — within 60 seconds, day or night.' },
      { icon: '🏠', title: 'Property Q&A', desc: 'Answers questions about listings, neighborhoods, pricing, and availability using your configured property knowledge.' },
      { icon: '📅', title: 'Showing scheduling', desc: 'Qualifies the buyer, checks agent availability, and books showings directly into your calendar.' },
      { icon: '🔁', title: 'Cold lead reactivation', desc: 'Leads from 30, 60, 90 days ago who went silent get personalized re-engagement. Most agents never follow up past attempt 3.' },
      { icon: '🎯', title: 'Buyer qualification', desc: 'Pre-qualifies leads before the agent spends time: budget, timeline, pre-approved?, current situation.' },
      { icon: '🏷️', title: 'Automatic pipeline updates', desc: 'Moves contacts through your pipeline based on conversation outcome. No manual CRM updates.' },
    ],
    useCases: [
      'New Zillow/Facebook lead — immediate 60-second follow-up text',
      '"Is [property] still available?"',
      '"Can I schedule a showing this Saturday?"',
      '"What\'s the school district like in that area?"',
      '"I\'m pre-approved for $450K, what do you have?"',
      'Old leads gone cold — reactivation sequence',
    ],
    faq: [
      { q: 'Does this work with Zillow, Realtor.com, and Facebook leads?', a: 'Yes — as long as those leads flow into your CRM (via Zapier, native integrations, or our API), the AI picks them up and responds immediately.' },
      { q: 'Can multiple agents use the same AI?', a: 'Yes. The AI handles initial qualification and booking, then assigns leads to the right agent based on rules you configure.' },
      { q: 'What if a lead asks about a specific property?', a: 'You can add property details to the AI\'s knowledge base, or the AI can ask for a callback when questions require specific listing expertise.' },
      { q: 'Do buyers know they\'re talking to AI?', a: 'You decide. Many agencies configure the AI with a human name (e.g., "Hi, I\'m Jamie from [Agency]"). Full transparency mode is also available.' },
    ],
    keywords: ['AI for real estate agents', 'real estate lead response automation', 'AI worker real estate', 'automated showing booking', 'real estate AI receptionist'],
    demoSlug: 'realestate',
  },

  fitness: {
    slug: 'fitness',
    title: 'AI Worker for Gyms & Fitness Studios',
    metaTitle: 'AI Worker for Gyms & Fitness Studios | Lead Response & Trial Booking',
    metaDesc: 'Gym AI that responds to every membership inquiry in 60 seconds, books trial sessions automatically, and reduces no-shows with automated reminders. Works with any CRM.',
    emoji: '💪',
    hero: 'AI Worker for Gyms & Fitness Studios',
    subhero: 'Gym leads who don\'t hear back in 10 minutes cancel 80% of the time. Our AI responds to every inquiry in under 60 seconds and books free trial sessions automatically — 24/7.',
    pain: 'Fitness studios lose 80% of trial sign-up inquiries to slow response times.',
    painDetail: 'Someone sees your Instagram ad at 8pm and texts about a free trial. Your front desk is closed. They don\'t hear back until the next morning — if they hear back at all. By then, they\'ve signed up at the gym down the street.',
    result: 'Fitness studios using Kyra fill their trial calendar and reduce no-shows by 40%.',
    resultStat: '80% fewer lost leads',
    features: [
      { icon: '🎟️', title: 'Free trial booking', desc: 'Captures every trial inquiry and books them into an orientation class immediately — before interest fades.' },
      { icon: '💬', title: 'Membership Q&A', desc: 'Answers pricing, class schedules, amenities, and contract questions 24/7 without staff involvement.' },
      { icon: '📲', title: 'No-show reduction', desc: 'Sends automated reminder texts before trial sessions. Offers to reschedule if they can\'t make it.' },
      { icon: '🔁', title: 'Re-engagement', desc: 'Members who stopped coming in get a personalized check-in text. Win-back campaigns on autopilot.' },
      { icon: '🎯', title: 'Goal-based personalization', desc: 'AI asks about fitness goals and matches them to the right program, increasing first-visit conversion.' },
      { icon: '🏷️', title: 'Lead nurture', desc: 'Trial leads who don\'t join immediately get a 3-message follow-up sequence over 7 days.' },
    ],
    useCases: [
      '"Do you have a free trial?"',
      '"How much is a membership?"',
      '"Do you have early morning classes?"',
      '"I signed up for a trial — what should I expect?"',
      '"I haven\'t been in a while — what\'s new?"',
      'New leads from Facebook/Instagram ads — instant follow-up',
    ],
    faq: [
      { q: 'Can the AI see my class schedule?', a: 'You add your class schedule to the AI\'s knowledge base. It can describe class types and times — and for live availability, the AI can direct members to your booking link.' },
      { q: 'Does this work for boutique studios (yoga, pilates, CrossFit)?', a: 'Yes. The AI personality is fully customizable for your brand voice. Works for everything from big box gyms to intimate boutique studios.' },
      { q: 'Can it handle membership cancellation requests?', a: 'You configure the response — options include collecting cancellation reasons, offering a freeze option, or routing to a human retention specialist.' },
    ],
    keywords: ['AI for gyms', 'fitness studio AI', 'gym lead automation', 'CrossFit AI worker', 'gym membership automation'],
    demoSlug: 'dental',
  },

  'home-services': {
    slug: 'home-services',
    title: 'AI Worker for Home Service Businesses',
    metaTitle: 'AI Worker for HVAC, Roofing & Plumbing | 24/7 Lead Response',
    metaDesc: 'Home services AI that responds to emergency calls at midnight, books service appointments, and qualifies leads automatically. Works for HVAC, roofing, plumbing, electrical and more.',
    emoji: '🔧',
    hero: 'AI Worker for Home Services',
    subhero: 'HVAC, roofing, plumbing, electrical. Homeowners have emergencies at midnight — our AI responds in under 60 seconds, triages urgency, and dispatches your team. Zero missed calls.',
    pain: 'Home service businesses lose jobs to whoever answers first — even at 2am.',
    painDetail: 'A pipe bursts at 11pm. The homeowner texts 3 plumbers. The first to respond gets the job. Typically worth $300–$3,000. Your competitors who have overnight answering — even automated — win every time.',
    result: 'Home service teams using Kyra never miss an after-hours emergency — and capture 3–5× more storm season jobs.',
    resultStat: '0 missed service calls',
    features: [
      { icon: '🚨', title: 'Emergency triage', desc: 'Detects urgency in messages ("pipe burst," "no AC," "power out") and immediately routes to your on-call tech.' },
      { icon: '📅', title: 'Job booking', desc: 'Qualifies the job type, checks availability, and books service appointments directly in your calendar.' },
      { icon: '💬', title: '24/7 coverage', desc: 'Every inbound text gets a response within 60 seconds — evenings, weekends, holidays, storm season.' },
      { icon: '💰', title: 'Quote follow-up', desc: 'Sent a quote but haven\'t heard back? AI follows up automatically at 24h, 48h, and 7 days.' },
      { icon: '⭐', title: 'Review requests', desc: 'After job completion, AI sends a review request and makes it one-tap easy to leave a 5-star review.' },
      { icon: '🏷️', title: 'Job type tagging', desc: 'Automatically categorizes jobs (HVAC repair, roof inspection, drain cleaning) and assigns to the right tech in your CRM.' },
    ],
    useCases: [
      'Emergency: "My AC stopped working, it\'s 95 degrees outside"',
      '"I have a leak under my sink — can someone come today?"',
      '"How much does a new roof cost?"',
      '"I need a furnace tune-up before winter"',
      '"I got your flyer — do you do free estimates?"',
      'Storm season: handling 50+ simultaneous inquiries',
    ],
    faq: [
      { q: 'Can the AI actually dispatch a tech?', a: 'The AI can notify your on-call tech via text/email for emergencies. For standard jobs, it books into your calendar which your team monitors.' },
      { q: 'What if the AI gives wrong pricing?', a: 'You configure the AI to give ranges ("typically $150–$350") or send a quote request form rather than specific prices. Prevents commitment issues.' },
      { q: 'Does this work for franchises with multiple territories?', a: 'Yes — you can configure service area questions so the AI qualifies location before booking and routes to the right local tech.' },
    ],
    keywords: ['AI for HVAC companies', 'roofing AI worker', 'plumbing SMS automation', 'home services AI', 'contractor AI worker'],
    demoSlug: 'dental',
  },
};

// Build flat slug list for known niches
const NICHE_SLUGS = Object.keys(NICHES);

interface Props {
  params: Promise<{ niche: string }>;
}

export async function generateStaticParams() {
  return NICHE_SLUGS.map(niche => ({ niche }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { niche } = await params;
  const data = NICHES[niche];
  if (!data) return { title: 'AI Workforce Platform | Kyra' };
  return {
    title: data.metaTitle,
    description: data.metaDesc,
    keywords: data.keywords,
    alternates: { canonical: `https://kyra.conversionsystem.com/ai-for/${niche}` },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDesc,
      url: `https://kyra.conversionsystem.com/ai-for/${niche}`,
    },
  };
}

export default async function AiForNichePage({ params }: Props) {
  const { niche } = await params;
  const data = NICHES[niche];
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <PublicNav />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-bold px-4 py-2 rounded-full mb-6 border border-indigo-100">
              {data.emoji} AI Workforce Platform
            </div>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-6">
              {data.hero}
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed mb-8">
              {data.subhero}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/solo" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg px-8 py-4 rounded-xl transition text-center">
                Start Free — 50 Credits Included
              </Link>
              <Link href={`/try/${data.demoSlug}`} className="inline-block border-2 border-gray-200 hover:border-indigo-300 text-gray-700 font-semibold text-lg px-6 py-4 rounded-xl transition text-center">
                {data.emoji} See live demo →
              </Link>
            </div>
            <p className="text-gray-400 text-sm mt-4">No credit card · Setup in under 10 minutes · Works with any CRM</p>
          </div>
          <div className="space-y-4">
            <div className="bg-indigo-900 text-white rounded-2xl p-8 text-center">
              <p className="text-sm text-indigo-300 mb-2">Proven result</p>
              <p className="text-5xl font-black">{data.resultStat}</p>
              <p className="text-indigo-300 text-sm mt-2">for {data.emoji} {data.slug} clients</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
              <p className="font-bold text-gray-900 mb-2 text-sm">The core problem:</p>
              <p className="text-sm font-semibold text-red-600 mb-2">{data.pain}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{data.painDetail}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-3">What the AI worker handles</h2>
          <p className="text-center text-gray-500 mb-12">{data.result}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.features.map(f => (
              <div key={f.title} className="bg-white rounded-xl p-5 border border-gray-200">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">
            Real questions your {data.emoji} clients get — handled automatically
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {data.useCases.map(uc => (
              <div key={uc} className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <span className="text-green-500 font-black shrink-0 text-lg leading-none">✓</span>
                <p className="text-sm text-gray-700 leading-relaxed italic">"{uc}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-indigo-50 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-black mb-3">Set up in under 10 minutes</h2>
          <p className="text-gray-500 mb-12">Connects to your existing tools. No new software your clients need to learn.</p>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Add a client', desc: 'Enter the business name and pick an industry template. 2 minutes.' },
              { step: '02', title: `${data.emoji} Pick template`, desc: `Choose the ${data.slug} industry template. Pre-built AI personality included.` },
              { step: '03', title: 'Go live', desc: 'AI starts responding to every inbound message immediately.' },
            ].map(s => (
              <div key={s.step}>
                <div className="w-14 h-14 rounded-full bg-indigo-600 text-white font-black text-xl flex items-center justify-center mx-auto mb-4">{s.step}</div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-12">Common questions</h2>
          <div className="space-y-6">
            {data.faq.map(item => (
              <div key={item.q} className="border-b border-gray-200 pb-6">
                <p className="font-bold text-gray-900 mb-2">{item.q}</p>
                <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other niches */}
      <section className="bg-gray-50 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-semibold text-gray-500 mb-6">Kyra AI works for 50+ industries</p>
          <div className="flex flex-wrap justify-center gap-3">
            {NICHE_SLUGS.filter(s => s !== niche).map(s => (
              <Link key={s} href={`/ai-for/${s}`}
                className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline capitalize">
                {NICHES[s].emoji} {s.replace(/-/g, ' ')}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-900 text-white py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Deploy your first {data.emoji} AI worker today.
          </h2>
          <p className="text-indigo-200 mb-8 text-lg">
            Free to start. Setup in under 10 minutes. 50 credits included.
          </p>
          <Link href="/solo" className="inline-block bg-white text-indigo-900 font-black text-xl px-10 py-5 rounded-xl hover:bg-indigo-50 transition">
            Get Started Free →
          </Link>
          <p className="text-indigo-400 text-sm mt-4">No credit card · Works with any CRM · Cancel anytime</p>
        </div>
      </section>
      <PublicFooter />
    </div>
  );
}
