// Rich-content niches for /ai-for/[slug].
//
// Most /ai-for/<slug> pages are template-generated from INDUSTRY_TEMPLATES
// (~50 industries). A small number of slugs have hand-authored, keyword-rich
// marketing pages that pre-date the template system. Rather than keep a
// competing [niche] dynamic segment (which Next.js cannot build), those rich
// pages live here and are rendered by [slug]/page.tsx when the slug matches
// a NICHES key.
//
// Previously at app/ai-for/[niche]/page.tsx — consolidated during Phase 0
// cleanup to eliminate the route conflict ([niche] and [slug] at the same
// level broke `next build`).

import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export interface NicheData {
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

export const NICHES: Record<string, NicheData> = {
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
      'Every day your budtenders answer the same 30 questions: "Do you have X strain?", "What\'s your hours?", "Is my order ready?", "Do you take credit cards?". That\'s 30 minutes of budtender time wasted per 10 texts. AI handles them all — instantly.',
    result: 'Cannabis clients see 50%+ reduction in repetitive budtender messages after AI deployment.',
    resultStat: '−50% repetitive messages',
    features: [
      { icon: '🌿', title: 'Product & strain lookups', desc: 'Customer asks "Do you have Blue Dream?" → AI checks your menu → confirms availability and price. Always up-to-date.' },
      { icon: '📦', title: 'Order status', desc: 'Customer texts "Is my order ready?" → AI looks up their order → gives exact pickup status. No human needed.' },
      { icon: '✅', title: 'Compliance-aware responses', desc: 'AI is trained not to make medical claims, age-verification reminders, and follows cannabis industry compliance best practices.' },
      { icon: '💵', title: 'Payment info handling', desc: 'Answers "Do you take credit cards?" / "Cash only?" / "Debit policy?" with your exact accepted methods.' },
      { icon: '🔐', title: 'Age verification reminders', desc: 'When in doubt, AI prompts for ID upload or in-store verification. Compliance-first defaults.' },
      { icon: '⚡', title: 'Fast menu changes', desc: 'Update your in-stock strains once — AI responds accurately across every channel instantly.' },
    ],
    useCases: [
      '"Do you have Wedding Cake this week?"',
      '"What\'s the deal on flower today?"',
      '"Is my order ready for pickup?"',
      '"Do you deliver? What\'s the min?"',
      '"Do you take ATM/debit?"',
      '"Do you price-match other dispensaries?"',
    ],
    faq: [
      { q: 'Does the AI know about compliance requirements?', a: 'Yes — it\'s trained to avoid medical claims, reinforce age-verification policies, and flag sensitive questions to humans. You set compliance rules in settings.' },
      { q: 'Can I keep my existing Springbig/Alpine IQ setup?', a: 'Yes, Kyra works alongside existing MMS platforms. Many dispensaries use Kyra to handle inbound replies while keeping their outbound campaigns elsewhere.' },
      { q: 'What if patients ask medical questions?', a: 'AI always deflects medical questions back to a licensed professional — never gives medical advice. You can tune the exact escalation phrase.' },
      { q: 'Do you have case studies from dispensary clients?', a: 'Kyra was originally built working with high-volume cannabis dispensary clients. Contact us for specific case studies and ROI data.' },
    ],
    keywords: ['AI for cannabis dispensaries', 'cannabis SMS automation', 'dispensary AI worker', 'marijuana customer service AI', 'cannabis text responder AI'],
    demoSlug: 'cannabis',
  },

  fitness: {
    slug: 'fitness',
    title: 'AI Worker for Fitness Studios & Gyms',
    metaTitle: 'AI Worker for Fitness Studios & Gyms | Automated Membership SMS',
    metaDesc: 'Automate membership inquiries, class bookings, trial pass follow-ups, and retention for your gym or fitness studio. AI responds to every text in 60 seconds — even at midnight.',
    emoji: '💪',
    hero: 'AI Worker for Fitness Studios',
    subhero: 'Handles membership inquiries, class bookings, trial conversions, and lapsed-member re-engagement — on autopilot.',
    pain: 'Fitness studios lose 25%+ of leads to slow response times.',
    painDetail: 'Someone searches "boutique fitness near me" at 9pm, texts your studio — and doesn\'t hear back until morning. By then they\'ve visited your competitor who answered immediately. AI eliminates this gap.',
    result: 'Fitness studios using AI SMS see 30%+ increase in trial-to-paid conversion rates.',
    resultStat: '+30% trial conversions',
    features: [
      { icon: '🏋️', title: 'Class booking', desc: 'Customer asks "What classes are available Saturday?" → AI pulls schedule → books them in. Zero front-desk time.' },
      { icon: '🎟️', title: 'Trial pass management', desc: 'Expiring trial? AI sends a conversion message at the right time with your offer, handles objections, and signs them up.' },
      { icon: '💸', title: 'Membership pricing', desc: 'Answers detailed pricing questions, multi-location questions, family plan questions — all with your exact rate card.' },
      { icon: '🔁', title: 'Re-engagement', desc: 'Member who hasn\'t been in 60+ days? AI sends personalized check-in message. You get re-activations, not churn.' },
      { icon: '🎯', title: 'Lead qualification', desc: 'Asks goals, availability, and experience level before handing off to a human trainer. Better leads, less wasted time.' },
      { icon: '📅', title: 'Trial scheduling', desc: 'AI books the trial class, sends reminder, handles reschedules. Frictionless path from interest to first workout.' },
    ],
    useCases: [
      '"What are your membership options?"',
      '"Do you have a free trial?"',
      '"Do you offer personal training?"',
      '"What\'s your cancellation policy?"',
      '"Do you have childcare?"',
      '"What classes are available this week?"',
    ],
    faq: [
      { q: 'Can the AI integrate with Mindbody or ClassPass?', a: 'Yes — Kyra can integrate with major gym management systems via GHL or direct APIs. Setup is handled during onboarding.' },
      { q: 'Will the AI try to close deals aggressively?', a: 'AI is trained to match your brand voice — whether you\'re a boutique "come in and see it" studio or a high-volume gym. You set the conversion tone.' },
      { q: 'Can I have different AI personalities for different locations?', a: 'Yes — multi-location gyms can configure separate AI workers per location with unique pricing, class schedules, and brand voice.' },
      { q: 'What if the AI miscommunicates pricing?', a: 'You configure pricing ranges or "contact us" fallbacks for complex situations. Prevents hard commitments on edge cases.' },
    ],
    keywords: ['AI for fitness studios', 'gym AI automation', 'boutique fitness AI', 'fitness lead automation', 'gym membership SMS'],
    demoSlug: 'dental',
  },

  'home-services': {
    slug: 'home-services',
    title: 'AI Worker for HVAC, Plumbing & Roofing',
    metaTitle: 'AI Worker for Home Services Companies | Inbound Lead Automation',
    metaDesc: 'Answer every inbound service call and text in under 60 seconds. AI qualifies leads, books appointments, and routes urgent jobs — even at 3am. Built for HVAC, plumbing, roofing, electrical.',
    emoji: '🔧',
    hero: 'AI Worker for Home Services',
    subhero: 'HVAC failures, plumbing emergencies, storm damage — your customers need answers NOW. AI handles every inbound message in 60 seconds, 24/7.',
    pain: 'Home services companies lose urgent leads to competitors who answer first.',
    painDetail: 'Sunday 11pm plumbing emergency → customer texts 3 companies. The first to respond wins the job. Without AI, you might not see that message until Monday morning — too late. With Kyra, you\'re ALWAYS the first response.',
    result: 'Home services clients see 40%+ capture rate on after-hours emergency leads.',
    resultStat: '+40% after-hours capture',
    features: [
      { icon: '🚨', title: 'Emergency routing', desc: 'Detects "no heat", "burst pipe", "leak" keywords and immediately alerts your on-call tech with customer contact info.' },
      { icon: '📆', title: 'Appointment booking', desc: 'Non-emergency calls? AI checks your calendar, offers next-available slots, books and confirms. No human dispatcher needed.' },
      { icon: '🏷️', title: 'Service qualification', desc: 'Asks critical questions before dispatching: service type, urgency, address, insurance. Your tech arrives with full context.' },
      { icon: '💬', title: 'Follow-up nurture', desc: 'Customer said "I\'ll think about it"? AI follows up in 48 hours with a personalized message. Converts 15-25% of fence-sitters.' },
      { icon: '⭐', title: 'Review requests', desc: 'Automatically sends review requests 3 days after job completion. More 5-star reviews, no manual work.' },
      { icon: '🔥', title: 'Storm season handling', desc: 'Handles 10x message volume during storm events. No overwhelmed staff, no missed leads.' },
    ],
    useCases: [
      '"My AC stopped working — can someone come out today?"',
      '"How much is a water heater replacement?"',
      '"Do you install solar?"',
      '"Emergency: leaking pipe behind wall"',
      '"Need estimate for roof replacement"',
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

/**
 * List of all slug keys that have rich (hand-authored) content.
 * Passed to generateStaticParams in [slug]/page.tsx so these pages build.
 */
export const NICHE_SLUGS = Object.keys(NICHES);

/**
 * Full page renderer for a rich niche. Same layout as the retired
 * app/ai-for/[niche]/page.tsx — just lifted into a component that
 * the [slug] route can call conditionally.
 */
export default function RichNichePage({ niche, data }: { niche: string; data: NicheData }) {
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
                <p className="text-sm text-gray-700 leading-relaxed italic">&quot;{uc}&quot;</p>
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
