// Data-only module for rich /ai-for/[slug] niches.
//
// Split out from rich-niches.tsx so it can be imported by tests without
// requiring a JSX transform in vitest. The .tsx file re-exports from
// here so existing callers (app/ai-for/[slug]/page.tsx) are unaffected.

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

/** List of all slug keys that have rich hand-authored content. */
export const NICHE_SLUGS = Object.keys(NICHES);
