import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

type Params = { params: Promise<{ industry: string }> };

const PAGES: Record<string, {
  title: string; headline: string; subheadline: string; emoji: string;
  keyword: string; pain: string[]; stats: { value: string; label: string }[];
  example: { q: string; a: string }; demo: string;
  agencies: string; seoTitle: string; seoDesc: string;
}> = {
  dental: {
    emoji: '🦷', demo: 'dental',
    keyword: 'dental AI receptionist for agencies',
    seoTitle: 'AI for Dental Practices | Kyra AI Agency Platform',
    seoDesc: 'Help dental clients respond to every SMS in 60 seconds — 24/7. Book appointments, answer insurance questions, and reduce no-shows with a white-label AI dental receptionist.',
    title: 'AI for Dental Practices',
    headline: 'Every dental client. One AI receptionist that never sleeps.',
    subheadline: 'Kyra answers every inbound text within 60 seconds — booking appointments, answering insurance questions, and following up on no-shows. 24/7. White-label for your agency.',
    pain: [
      'Dental offices miss 40%+ of after-hours inquiries — that\'s booked appointments walking away',
      'Front desk staff can\'t respond instantly to every SMS while managing in-office patients',
      'Competitors who respond first win the new patient — response time is everything',
      'Recall campaigns fail because they rely on manual follow-ups that never happen',
    ],
    stats: [
      { value: '< 60s', label: 'Average response time to new patient inquiry' },
      { value: '24/7', label: 'Coverage for after-hours appointment requests' },
      { value: '3×', label: 'More appointments booked vs. no AI follow-up' },
    ],
    example: {
      q: "Hi, do you accept Cigna insurance and can I book a cleaning for next Tuesday?",
      a: "Hi! 😊 Yes, we do accept Cigna! For a routine cleaning and exam, your Cigna plan usually covers it at 100% — no out-of-pocket for you. I have openings next Tuesday at 10 AM and 2 PM. Which works better? I can get you booked right now!",
    },
    agencies: 'dental marketing agencies, dental DSO management groups, oral health agencies',
  },
  cannabis: {
    emoji: '🌿', demo: 'cannabis',
    keyword: 'AI for cannabis dispensaries agency',
    seoTitle: 'AI for Cannabis Dispensaries | Kyra AI Agency Platform',
    seoDesc: 'Help cannabis dispensary clients answer product questions, verify age, handle promotions, and drive repeat visits with compliant AI — white-label for your agency.',
    title: 'AI for Cannabis Dispensaries',
    headline: 'Every dispensary client. One AI budtender available 24/7.',
    subheadline: 'Kyra handles product questions, age gating, loyalty rewards, and reorder prompts — all compliant with your state\'s rules. White-label for cannabis marketing agencies.',
    pain: [
      'Dispensary staff are overwhelmed with repetitive questions during peak hours',
      'After-hours inquiries about products, hours, and inventory go completely unanswered',
      'Compliance makes traditional chatbots risky — Kyra is configured for your state\'s rules',
      'High-value customers churn when they can\'t get fast answers on new products',
    ],
    stats: [
      { value: '$29M+', label: 'Generated for cannabis clients using this system' },
      { value: '< 60s', label: 'Response time for every customer inquiry' },
      { value: '4.8×', label: 'Higher repeat visit rate with AI follow-up' },
    ],
    example: {
      q: "Do you have any indica strains good for sleep? I'm a first-time customer.",
      a: "Welcome! 🌿 Great choice for sleep — I'd recommend our Purple Punch (22% THC, heavy indica, top seller for sleep and relaxation) or our new Lavender Kush live rosin. As a first-time customer you also get 20% off your first order today. Want me to hold one while you head in, or check if we do delivery in your area?",
    },
    agencies: 'cannabis marketing agencies, dispensary management consultants, MJ marketing firms',
  },
  realestate: {
    emoji: '🏡', demo: 'realestate',
    keyword: 'AI for real estate agencies white label',
    seoTitle: 'AI for Real Estate Agencies | Kyra AI Agency Platform',
    seoDesc: 'Help real estate clients qualify leads, book showings, and follow up on every inquiry automatically. White-label AI for real estate marketing agencies.',
    title: 'AI for Real Estate Agencies',
    headline: 'Every real estate client. Zero leads left unanswered.',
    subheadline: 'Kyra qualifies buyers, books showings, and follows up on every inquiry — even at 11pm when the lead just saw a listing. White-label for real estate marketing agencies.',
    pain: [
      '70% of real estate leads contact 3+ agents — whoever responds first wins',
      'Buyers inquire at all hours; without instant response, the lead is gone by morning',
      'Agents are busy with active clients and can\'t answer every new inquiry manually',
      'Listing inquiries that don\'t get a same-day response have a 90%+ drop-off rate',
    ],
    stats: [
      { value: '< 60s', label: 'Response to every new listing inquiry' },
      { value: '3×', label: 'More showings booked vs. manual follow-up' },
      { value: '70%', label: 'Of leads lost to slower-responding agents' },
    ],
    example: {
      q: "I saw the 3-bed on Oak Street — is it still available? Can I see it this week?",
      a: "Hi! 🏡 Great news — 142 Oak Street is still active! It's a 3/2, 1,850 sqft, listed at $485K. The sellers just dropped $10K last week. I can schedule a showing for you — would Thursday at 5:30 PM or Saturday at 10 AM work better? I'll also send over the full disclosures and recent comps so you can review before we visit.",
    },
    agencies: 'real estate marketing agencies, brokerage tech consultants, proptech agencies',
  },
  auto: {
    emoji: '🚗', demo: 'auto',
    keyword: 'AI for auto dealerships agency platform',
    seoTitle: 'AI for Auto Dealerships | Kyra AI Agency Platform',
    seoDesc: 'Help auto dealer clients respond to every inventory inquiry, schedule test drives, and follow up on finance leads. White-label AI for automotive marketing agencies.',
    title: 'AI for Auto Dealerships',
    headline: 'Every dealership client. Every inventory question answered instantly.',
    subheadline: 'Kyra handles inventory questions, test drive scheduling, and trade-in inquiries 24/7. While the showroom\'s closed, the AI keeps working. White-label for automotive agencies.',
    pain: [
      'Car buyers research at night and on weekends — dealerships are closed when decisions are made',
      'Sales staff can\'t answer every VDP inquiry immediately during busy periods',
      'Finance leads that don\'t get a same-day response go to competitors',
      'Trade-in inquiries require immediate engagement — delays kill the deal',
    ],
    stats: [
      { value: '67%', label: 'Of car buyers decide before visiting the dealership' },
      { value: '< 60s', label: 'Response to inventory and test drive requests' },
      { value: '2.4×', label: 'More test drives booked with AI follow-up' },
    ],
    example: {
      q: "Do you have any black 4Runner TRD Pros? What's the best deal you can do?",
      a: "Hey! 🚗 We actually have 2 black 4Runner TRD Pros on the lot right now — both 2024 with the upgraded TRD-tuned Bilstein shocks. MSRP is $54,775 but I can get you in front of our manager today for our best number. Want me to schedule a test drive? I can also run a quick pre-approval so you know your options before you come in.",
    },
    agencies: 'automotive marketing agencies, dealer group consultants, auto digital agencies',
  },
  restaurant: {
    emoji: '🍽️', demo: 'restaurant',
    keyword: 'AI for restaurants agency white label',
    seoTitle: 'AI for Restaurants | Kyra AI Agency Platform',
    seoDesc: 'Help restaurant clients handle reservations, catering inquiries, and menu questions 24/7 with AI. White-label for restaurant marketing agencies.',
    title: 'AI for Restaurants',
    headline: 'Every restaurant client. Reservations, catering, questions — all handled.',
    subheadline: 'Kyra takes reservations, answers menu questions, and handles private dining inquiries even when the restaurant is closed or the phone line is busy. White-label for restaurant agencies.',
    pain: [
      'Missed calls and slow reservation responses drive guests to OpenTable or Yelp (which takes a commission)',
      'Catering and private event inquiries require immediate engagement — delay = lost booking',
      'Dietary and allergy questions need fast, accurate answers or guests don\'t come',
      'Holiday and peak season volume overwhelms front-of-house staff',
    ],
    stats: [
      { value: '< 60s', label: 'Response to every reservation request' },
      { value: '0%', label: 'Booking fee vs. OpenTable\'s 1–5% per cover' },
      { value: '3×', label: 'More private event inquiries converted with AI' },
    ],
    example: {
      q: "We need a private room for a birthday dinner — 14 people, Saturday the 8th. Do you have availability?",
      a: "Hi! 🎉 We'd love to host your birthday dinner! Saturday the 8th we have our private dining room available — seats up to 20, full A/V, and you can bring a custom cake. We do a fixed-price group menu at $65/person (drinks separate) or you can do à la carte. Want me to pencil in a hold for the 8th while I connect you with our events coordinator for the details?",
    },
    agencies: 'restaurant marketing agencies, hospitality consultants, food & beverage agencies',
  },
  medspa: {
    emoji: '✨', demo: 'medspa',
    keyword: 'AI for med spas agency platform',
    seoTitle: 'AI for Med Spas | Kyra AI Agency Platform',
    seoDesc: 'Help med spa clients book consultations, answer treatment questions, and follow up on promotions with AI. White-label for aesthetic and wellness marketing agencies.',
    title: 'AI for Med Spas',
    headline: 'Every med spa client. Every treatment question answered instantly.',
    subheadline: 'Kyra handles consultation bookings, Botox and filler pricing questions, and promo follow-ups — while maintaining the premium, personalized feel your clients expect.',
    pain: [
      'High-value treatment inquiries (Botox, laser, filler) need fast responses or clients book elsewhere',
      'Front desk is occupied during appointments and can\'t engage SMS inquiries simultaneously',
      'Promo campaigns generate bursts of inquiries — manual response doesn\'t scale',
      'New client acquisition cost is $200-500 — losing an inquiry due to slow response is expensive',
    ],
    stats: [
      { value: '< 60s', label: 'Response to treatment inquiry or consultation request' },
      { value: '5×', label: 'ROI on promo campaigns with AI follow-up vs. manual' },
      { value: '$500', label: 'Average client acquisition cost saved per AI-converted lead' },
    ],
    example: {
      q: "How much is Botox for forehead and crow's feet? Do you have any specials?",
      a: "Hi! ✨ Great question. Botox at Glow runs $13/unit — forehead typically needs 15–25 units ($195–$325) and crow's feet 10–15 units per side ($260–$390). We're running a 'New Client' promo this month — 20% off your first Botox treatment! I can book you a complimentary 15-minute consultation with Dr. Chen to map out your units and get your best result. When works for you?",
    },
    agencies: 'aesthetic marketing agencies, medical spa consultants, wellness agency networks',
  },
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { industry } = await params;
  const page = PAGES[industry];
  if (!page) return {};
  return {
    title: page.seoTitle,
    description: page.seoDesc,
    openGraph: { title: page.seoTitle, description: page.seoDesc },
  };
}

export default async function ForIndustryPage({ params }: Params) {
  const { industry } = await params;
  const page = PAGES[industry];
  if (!page) notFound();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <PublicNav />

      {/* Hero */}
      <section className="py-20 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-semibold text-indigo-300 mb-6">
          {page.emoji} {page.title} · White-Label for Agencies
        </div>
        <h1 className="text-4xl sm:text-6xl font-black leading-tight mb-6">{page.headline}</h1>
        <p className="text-slate-400 text-xl mb-10 max-w-2xl mx-auto">{page.subheadline}</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href={`/try/${page.demo}`}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-4 rounded-xl transition text-base">
            💬 Try the AI Live
          </Link>
          <Link href="/signup/agency"
            className="bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold px-8 py-4 rounded-xl transition text-base">
            Start Free — No Credit Card
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-6 mb-20">
        <div className="grid sm:grid-cols-3 gap-4">
          {page.stats.map(s => (
            <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
              <p className="text-4xl font-black text-indigo-400 mb-2">{s.value}</p>
              <p className="text-slate-300 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pain points */}
      <section className="max-w-4xl mx-auto px-6 mb-20">
        <h2 className="text-2xl font-black mb-8 text-center">The problem your {page.title.toLowerCase()} clients face every day</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {page.pain.map(p => (
            <div key={p} className="flex items-start gap-3 bg-red-950/30 border border-red-900/30 rounded-xl p-4">
              <span className="text-red-400 mt-0.5 text-lg shrink-0">⚠️</span>
              <p className="text-slate-300 text-sm leading-relaxed">{p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Example conversation */}
      <section className="max-w-4xl mx-auto px-6 mb-20">
        <h2 className="text-2xl font-black mb-8 text-center">See what the AI says to a {page.title.toLowerCase().replace('for ', '').replace('s', '')} customer</h2>
        <div className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden">
          <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center gap-2">
            <div className="text-xl">{page.emoji}</div>
            <div>
              <p className="text-sm font-semibold text-white">Real AI Response</p>
              <p className="text-xs text-slate-500">No scripts. Actual AI trained on your client&apos;s business.</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-end">
              <div className="bg-indigo-600 text-white text-sm rounded-xl rounded-tr-sm px-4 py-3 max-w-sm">
                {page.example.q}
              </div>
            </div>
            <div className="flex justify-start">
              <div className="bg-white/10 text-slate-200 text-sm rounded-xl rounded-tl-sm px-4 py-3 max-w-sm leading-relaxed">
                {page.example.a}
              </div>
            </div>
          </div>
          <div className="bg-white/5 border-t border-white/10 px-4 py-3">
            <Link href={`/try/${page.demo}`} className="text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition">
              Try a full conversation → 
            </Link>
          </div>
        </div>
      </section>

      {/* For agencies */}
      <section className="max-w-4xl mx-auto px-6 mb-20">
        <div className="bg-indigo-950/40 border border-indigo-900/40 rounded-2xl p-8">
          <h2 className="text-2xl font-black mb-4">Built for {page.agencies}</h2>
          <p className="text-slate-300 mb-6 leading-relaxed">
            Kyra is a white-label AI employee platform. You sign up as an agency, add your {page.title.toLowerCase().replace('AI for ', '').replace('s', '')} clients, and each one gets their own dedicated AI trained on their specific business, pricing, and policies. You bill them $500–$2,000/month. Your cost to Kyra: as low as $97/month for up to 5 clients.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {[
              { icon: '🎯', title: 'Industry templates', desc: `Pre-built ${page.title.toLowerCase().replace('AI for ', '')} AI — ready to launch in minutes` },
              { icon: '🏷️', title: 'White-label', desc: 'Your agency name, your branding, your pricing' },
              { icon: '📊', title: 'Agency dashboard', desc: 'Manage all clients from one place' },
            ].map(f => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-2xl mb-2">{f.icon}</div>
                <p className="font-semibold text-white text-sm mb-1">{f.title}</p>
                <p className="text-slate-400 text-xs">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup/agency" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition">
              Start Free — No Credit Card
            </Link>
            <Link href="/pricing" className="bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold px-6 py-3 rounded-xl transition">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
