import type { Metadata } from 'next';
import Link from 'next/link';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';

export const metadata: Metadata = {
  title: 'AI Worker Use Cases — Real Businesses, Real Conversations | Kyra',
  description:
    'See exactly how Kyra AI workers handle phone calls, texts, and web chats for plumbers, dentists, law firms, restaurants, and more. Real conversation examples with booking, tagging, and escalation.',
  keywords: [
    'AI receptionist', 'AI worker', 'AI phone answering', 'business AI chatbot',
    'AI appointment booking', 'AI lead qualification', 'AI for small business',
    'AI workforce platform', 'voice AI for business', 'AI customer service',
  ],
};

// ── Use Case Data ─────────────────────────────────────────────────────────────

interface UseCase {
  slug: string;
  emoji: string;
  industry: string;
  business: string;
  problem: string;
  conversation: Array<{ from: 'customer' | 'ai'; text: string }>;
  tools: string[];
  result: string;
  roi: string;
  roiBreakdown: string;
}

const USE_CASES: UseCase[] = [
  {
    slug: 'plumbing',
    emoji: '🔧',
    industry: 'Plumbing',
    business: "Mike's Plumbing",
    problem: "Mike is under a house fixing a pipe. His phone rings 15 times a day. He answers maybe 5. The other 10 call someone else.",
    conversation: [
      { from: 'customer', text: "Hey, I have a leaking pipe under my kitchen sink. Can someone come out today?" },
      { from: 'ai', text: "Hi! Sorry to hear about the leak. I can help get someone out to you. A few quick questions:\n\n• Is the water actively flowing, or is it a slow drip?\n• What's your address?\n• Are you available this afternoon between 2–5pm?" },
      { from: 'customer', text: "It's a steady drip, getting worse. 142 Oak Street, Apt 3B. Afternoon works." },
      { from: 'ai', text: "Got you booked! A technician will be at 142 Oak Street, Apt 3B today between 2:00–3:00 PM. You'll get a confirmation text shortly. Is there anything else I can help with?" },
      { from: 'customer', text: "How much will it cost?" },
      { from: 'ai', text: "Kitchen sink leaks typically run $150–$350 depending on what's needed, but Mike always provides a free estimate on-site before starting any work. No surprises. 👍" },
    ],
    tools: ['book_appointment', 'tag_contact'],
    result: 'Mike gets the job instead of losing it. Customer booked in 90 seconds.',
    roi: '$22,500/mo',
    roiBreakdown: '10 missed calls/day × 30% conversion × $250 avg job',
  },
  {
    slug: 'dental',
    emoji: '🦷',
    industry: 'Dental Office',
    business: 'Bright Smile Dental',
    problem: "Front desk handles 40+ calls daily. Half are scheduling. Patients calling after hours get voicemail and never call back.",
    conversation: [
      { from: 'customer', text: "I need to schedule a cleaning." },
      { from: 'ai', text: "Hi, thanks for calling Bright Smile Dental! This is Sarah, how can I help you today?" },
      { from: 'customer', text: "Yeah, I need to get my teeth cleaned. It's been a while." },
      { from: 'ai', text: "No problem! Are you an existing patient, or would this be your first visit?" },
      { from: 'customer', text: "First time." },
      { from: 'ai', text: "Welcome! For new patients, we do a full exam and cleaning — takes about an hour. We have openings Thursday at 10am or Friday at 2pm. Which works?" },
      { from: 'customer', text: "Thursday morning." },
      { from: 'ai', text: "Thursday at 10am it is! You'll get a confirmation text with our address and what to bring. Just need your insurance card and photo ID. Anything else?" },
    ],
    tools: ['book_appointment', 'tag_contact', 'create_opportunity'],
    result: 'After-hours calls convert instead of going to voicemail.',
    roi: '$33,600/mo',
    roiBreakdown: '8 after-hours calls/day × 40% would be lost × $350 new patient value',
  },
  {
    slug: 'real-estate',
    emoji: '🏡',
    industry: 'Real Estate',
    business: 'Lisa Chen Realty',
    problem: "Lisa gets 50+ inquiry texts from Zillow leads. Most go cold within 2 hours if not responded to. She can't text back during showings.",
    conversation: [
      { from: 'customer', text: "Hi, I'm interested in the property at 456 Maple Drive. Is it still available?" },
      { from: 'ai', text: "Hi! Yes, 456 Maple Drive is still available! Great choice — it's a 3-bed, 2-bath with the newly renovated kitchen.\n\nWant to schedule a showing? I have availability Wednesday evening or Saturday morning." },
      { from: 'customer', text: "Saturday works. What's the price?" },
      { from: 'ai', text: "Listed at $425,000. Does 10am Saturday work? And can I get your name and best contact number?" },
      { from: 'customer', text: "I'm David Chen, 555-0199. 10am is perfect." },
      { from: 'ai', text: "You're all set, David! Lisa will meet you at 456 Maple Drive Saturday at 10am. I'll send the full listing details and directions. See you then! 🏡" },
    ],
    tools: ['book_appointment', 'tag_contact', 'create_opportunity'],
    result: '5-minute response time on every lead, even during showings.',
    roi: '8× more likely to convert',
    roiBreakdown: 'Speed-to-lead is the #1 factor in real estate conversion',
  },
  {
    slug: 'medspa',
    emoji: '💆',
    industry: 'Med Spa & Aesthetics',
    business: 'Glow Aesthetics',
    problem: "60% of bookings come via Instagram DMs. Staff spend 3 hours/day scheduling back-and-forth. Clients ghost if response is slow.",
    conversation: [
      { from: 'customer', text: "How much is Botox? Do you have anything available this week?" },
      { from: 'ai', text: "Hi! Thanks for reaching out to Glow Aesthetics! ✨\n\nOur Botox pricing:\n• Forehead lines — $250–$350\n• Crow's feet — $200–$300\n• Full face — $500–$650\n\nWe have openings Thursday at 11am and Friday at 3pm. Would either work?" },
      { from: 'customer', text: "Friday at 3 sounds good. Is Dr. Kim doing it?" },
      { from: 'ai', text: "Yes! Dr. Kim will be in Friday — she's amazing, you're in great hands. Can I get your name and phone number to confirm?" },
      { from: 'customer', text: "Jessica Park, 555-0234" },
      { from: 'ai', text: "Booked! Friday at 3pm with Dr. Kim. We'll text a reminder the day before. Come 10 minutes early for a quick form. See you Friday! ✨" },
    ],
    tools: ['book_appointment', 'tag_contact', 'create_opportunity'],
    result: 'Instant responses on Instagram and SMS. No more scheduling ping-pong.',
    roi: '$18,000/mo',
    roiBreakdown: '20 inquiries/day × 15% more converted from faster response',
  },
  {
    slug: 'law-firm',
    emoji: '⚖️',
    industry: 'Law Firm',
    business: 'Martinez & Associates',
    problem: "Potential clients call during business hours but attorneys are in court. By the time they call back, the lead hired someone else.",
    conversation: [
      { from: 'customer', text: "I was in a car accident yesterday and I need to talk to a lawyer." },
      { from: 'ai', text: "I'm so sorry to hear that. You've reached Martinez & Associates. I'm Alex. First — are you okay? Did you receive medical attention?" },
      { from: 'customer', text: "Yeah, I went to the ER. My back is really hurting." },
      { from: 'ai', text: "I'm glad you went to the ER. Attorney Martinez handles personal injury cases like yours, and the consultation is completely free.\n\nA few quick details:\n• Was a police report filed?\n• Do you have the other driver's insurance?\n• When can you come in for a 30-minute consultation?" },
      { from: 'customer', text: "Yes to both. Tomorrow afternoon works." },
      { from: 'ai', text: "Scheduled for tomorrow at 2pm with Attorney Martinez. He'll review everything and advise on your options — no cost, no obligation.\n\nImportant: don't give any recorded statements to the other driver's insurance before speaking with us. We'll handle everything." },
    ],
    tools: ['book_appointment', 'tag_contact', 'create_opportunity'],
    result: 'No personal injury lead goes unanswered. Qualifying questions asked immediately.',
    roi: '$5,000/case captured',
    roiBreakdown: '1 additional PI case/month × $15K settlement × 33% contingency',
  },
  {
    slug: 'auto-repair',
    emoji: '🚗',
    industry: 'Auto Repair',
    business: 'FastLane Auto',
    problem: "Customers call asking about oil changes and check engine lights. Owner is under a car and can't pick up.",
    conversation: [
      { from: 'customer', text: "Check engine light came on this morning. How much to diagnose?" },
      { from: 'ai', text: "Hi! Check engine diagnostics are $89, and that fee gets applied toward the repair if you go ahead with it.\n\nMost common causes are O2 sensor, catalytic converter, or a loose gas cap (check that first — it's free! 😄).\n\nWant to get in today? We have same-day availability." },
      { from: 'customer', text: "Yes please. Around 4?" },
      { from: 'ai', text: "You're set for 4pm! Pull up to Bay 2 and we'll get you right in. Diagnosis takes about 30 minutes. See you then! 🔧" },
      { from: 'customer', text: "Do you do oil changes too? My sticker says I'm overdue." },
      { from: 'ai', text: "Absolutely! Conventional is $39.95, synthetic is $69.95. We can knock it out while we run the diagnostic — two birds, one stone. 👍" },
    ],
    tools: ['book_appointment', 'tag_contact'],
    result: 'Upsell happens naturally. Customer gets same-day service.',
    roi: '$18,000/mo',
    roiBreakdown: '5 additional bookings/day × $120 avg ticket',
  },
  {
    slug: 'gym',
    emoji: '🏋️',
    industry: 'Gym & Fitness',
    business: 'Iron City Fitness',
    problem: '"I\'ll think about it" = they never come back. 80% of gym leads go cold within 48 hours.',
    conversation: [
      { from: 'customer', text: "What are your membership prices?" },
      { from: 'ai', text: "Hey! Welcome to Iron City Fitness! 💪\n\n• Basic (gym access): $29/mo\n• Plus (gym + classes): $49/mo\n• Premium (everything + 2 PT sessions): $89/mo\n\nAll plans include a FREE 3-day trial. Want me to set one up?" },
      { from: 'customer', text: "The premium looks interesting but that's a lot." },
      { from: 'ai', text: "The 2 PT sessions alone cost $120 separately — so Premium at $89 is actually a steal.\n\nTell you what — come in for the free trial and I'll set you up with a complimentary PT session. No pressure. When works for you?" },
      { from: 'customer', text: "Tomorrow after work, like 6pm?" },
      { from: 'ai', text: "Done! Tomorrow at 6pm. Ask for Coach Mike — he's awesome with beginners. Wear comfy clothes, bring water. See you there! 💪" },
    ],
    tools: ['book_appointment', 'tag_contact', 'create_opportunity'],
    result: 'Objection handled, trial booked, $89/month recurring captured.',
    roi: '$16,692/yr',
    roiBreakdown: '3 additional signups/week × $89/mo × 12 months avg retention',
  },
  {
    slug: 'restaurant',
    emoji: '🍕',
    industry: 'Restaurant',
    business: "Bella's Italian Kitchen",
    problem: "Phone rings during dinner rush. Staff can't answer. Large party reservations and catering inquiries get missed.",
    conversation: [
      { from: 'customer', text: "I'd like to make a reservation for 12 people this Saturday." },
      { from: 'ai', text: "Hi, welcome to Bella's Italian Kitchen! 12 people — sounds like a celebration! Is this for a special occasion?" },
      { from: 'customer', text: "Yeah, my mom's 70th birthday." },
      { from: 'ai', text: "Happy birthday to her! 🎂 For 12, I'd recommend our private dining room. We can do a prix fixe menu at $55/person, or order from the regular menu.\n\nWhat time Saturday?" },
      { from: 'customer', text: "Around 7pm. Prix fixe sounds great." },
      { from: 'ai', text: "You're all set! Saturday 7pm, private dining, 12 guests, prix fixe.\n\nOur manager Maria will reach out tomorrow for dietary restrictions. Would you like us to do a complimentary birthday dessert with a candle for your mom?" },
      { from: 'customer', text: "That would be amazing!" },
      { from: 'ai', text: "Consider it done! Can I get your name and number for the reservation?" },
    ],
    tools: ['book_appointment', 'tag_contact', 'create_opportunity'],
    result: '$660 dinner booked during rush hour without interrupting service.',
    roi: '$4,000/mo',
    roiBreakdown: '2 large parties/week that would have been missed × $500 avg',
  },
  {
    slug: 'hvac',
    emoji: '❄️',
    industry: 'HVAC',
    business: 'CoolBreeze Heating & Air',
    problem: "Emergency calls at 2am in July when AC dies. After-hours answering service costs $500/month and just takes messages.",
    conversation: [
      { from: 'customer', text: "My AC just died and it's 95 degrees in here. I have a baby." },
      { from: 'ai', text: "I understand — that's really stressful, especially with a little one.\n\nQuick tip while we get a tech out: open windows on opposite sides for a cross-breeze, and point fans at the baby's room.\n\nOur after-hours rate is $149 for the service call (applied toward the repair). What's your address?" },
      { from: 'customer', text: "789 Pine Road. How soon can someone get here?" },
      { from: 'ai', text: "I've dispatched this as urgent. A technician will be at 789 Pine Road within the hour. You'll get a text when they're on the way.\n\nIs your system making noises, or did it just stop blowing cold?" },
      { from: 'customer', text: "Blowing but just hot air." },
      { from: 'ai', text: "Usually the compressor or refrigerant — very fixable. The tech will diagnose on the spot. Hang tight, help is on the way." },
    ],
    tools: ['book_appointment', 'tag_contact', 'escalate_to_human'],
    result: 'Emergency call handled at 2am. Tech dispatched. Customer calmed.',
    roi: '$5,500/mo',
    roiBreakdown: 'Replaces $500/mo answering service + captures $5K/mo in after-hours revenue',
  },
  {
    slug: 'photography',
    emoji: '📸',
    industry: 'Photography',
    business: 'Capture Moments Studio',
    problem: "Photographer shoots weddings on weekends — exactly when inquiries peak. 72-hour response time = lost bookings.",
    conversation: [
      { from: 'customer', text: "Do you do wedding photography? We're getting married October 18th." },
      { from: 'ai', text: "Congratulations!! 🎉💍 We absolutely do! October 18th is beautiful.\n\nOur packages:\n📷 Essential (6hrs, 1 photographer): $2,500\n📷 Premium (8hrs, 2 photographers + engagement): $4,200\n📷 Luxury (full day, 2 photographers + engagement + album): $6,500\n\nOctober 18th is currently open! Want to schedule a free consultation?" },
      { from: 'customer', text: "Premium sounds perfect. Can we meet this week?" },
      { from: 'ai', text: "Wednesday at 5pm? Sarah will walk you through everything — she'll want to hear about your venue, timeline, and vibe.\n\nPro tip: bring 3–5 Pinterest photos of styles you love! 📌\n\nAnd again — congratulations! 🥂" },
    ],
    tools: ['book_appointment', 'tag_contact', 'create_opportunity'],
    result: '$4,200 wedding booked while photographer was at another wedding.',
    roi: '$8,000/mo',
    roiBreakdown: '2 additional bookings/month × $4,000 avg',
  },
];

// ── Tool Badge Color ──────────────────────────────────────────────────────────

function toolColor(tool: string) {
  switch (tool) {
    case 'book_appointment': return 'bg-blue-100 text-blue-700';
    case 'tag_contact': return 'bg-green-100 text-green-700';
    case 'create_opportunity': return 'bg-purple-100 text-purple-700';
    case 'escalate_to_human': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function toolLabel(tool: string) {
  switch (tool) {
    case 'book_appointment': return '📅 Books Appointment';
    case 'tag_contact': return '🏷️ Tags Contact';
    case 'create_opportunity': return '💰 Creates Deal';
    case 'escalate_to_human': return '🚨 Alerts Owner';
    default: return tool;
  }
}

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
            See Your AI Worker <span className="text-indigo-600">In Action</span>
          </h1>
          <p className="text-xl text-gray-600 mt-4 max-w-2xl mx-auto">
            Real conversations. Real bookings. Real revenue.
            Here&apos;s exactly what happens when a customer reaches your business and your AI worker picks up.
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

      {/* How It Works (mini) */}
      <section className="py-16 px-4 border-b border-gray-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">
            What Your AI Worker Can Do
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { icon: '📅', title: 'Book Appointments', desc: 'Checks availability, confirms time, creates in your calendar' },
              { icon: '🏷️', title: 'Tag & Qualify', desc: 'Auto-labels leads by intent: hot, warm, booked, pricing' },
              { icon: '💰', title: 'Create Deals', desc: 'Opens opportunities in your pipeline when buying intent is detected' },
              { icon: '🚨', title: 'Escalate to You', desc: 'Flags urgent issues and texts you with full context' },
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
                  <p className="text-gray-500 mt-1">{uc.business}</p>
                </div>
              </div>

              {/* Problem */}
              <div className="bg-red-50 border border-red-100 rounded-xl p-5 mb-6">
                <p className="font-semibold text-red-800 text-sm mb-1">❌ The Problem</p>
                <p className="text-red-700">{uc.problem}</p>
              </div>

              {/* Conversation */}
              <div className="bg-gray-50 rounded-xl p-5 mb-6">
                <p className="font-semibold text-gray-700 text-sm mb-4">💬 Real Conversation</p>
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

              {/* Tools Used + Result */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <p className="font-semibold text-gray-700 text-sm mb-3">🛠️ Tools Used Automatically</p>
                  <div className="flex flex-wrap gap-2">
                    {uc.tools.map((t) => (
                      <span key={t} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${toolColor(t)}`}>
                        {toolLabel(t)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-5">
                  <p className="font-semibold text-green-800 text-sm mb-1">✅ Result</p>
                  <p className="text-green-700 text-sm">{uc.result}</p>
                </div>
              </div>

              {/* ROI */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-600 font-semibold uppercase">Estimated ROI</p>
                  <p className="text-gray-600 text-sm mt-1">{uc.roiBreakdown}</p>
                </div>
                <div className="text-3xl font-black text-indigo-600">{uc.roi}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-10">
            AI Worker vs. Basic Chatbot
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-3 px-4 text-sm font-semibold text-gray-500">Feature</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-400">Basic Chatbot</th>
                  <th className="py-3 px-4 text-sm font-semibold text-indigo-600">Kyra AI Worker</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  ['Books appointments', 'Sends a booking link', 'Checks availability, confirms, creates in calendar'],
                  ['Handles objections', 'Scripted FAQ', 'Natural conversation — addresses concerns in real-time'],
                  ['After hours', '"Leave a message"', 'Full service at 2am — same quality as daytime'],
                  ['Tags & qualifies', 'Nothing', 'Auto-tags by intent: hot-lead, booked, pricing-requested'],
                  ['Escalation', 'Nothing', 'Alerts owner via text/webhook with full context'],
                  ['Phone calls', 'Not possible', 'Answers phone, has real voice conversations'],
                  ['Personality', 'Generic / robotic', 'Sounds like your business — knows services, pricing, hours'],
                  ['Channels', 'Website widget only', 'SMS, phone, web chat, Instagram, Telegram, WhatsApp'],
                  ['Memory', 'Forgets each session', 'Remembers context across conversations'],
                  ['Upselling', 'Never', 'Naturally suggests additional services in conversation'],
                ].map(([feature, chatbot, kyra], i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-3 px-4 font-medium text-gray-800">{feature}</td>
                    <td className="py-3 px-4 text-gray-400">❌ {chatbot}</td>
                    <td className="py-3 px-4 text-gray-800">✅ {kyra}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-indigo-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black">
            Stop Losing Customers to Voicemail
          </h2>
          <p className="text-indigo-100 text-lg mt-4">
            Your AI worker answers every call, text, and chat — 24/7.
            Books appointments, qualifies leads, and closes deals while you focus on the work.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/solo"
              className="bg-white text-indigo-600 font-bold text-lg px-8 py-4 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Start Free →
            </Link>
            <Link
              href="/solo"
              className="border-2 border-white/30 text-white font-bold text-lg px-8 py-4 rounded-xl hover:bg-white/10 transition-colors"
            >
              Agency? Start Here
            </Link>
          </div>
          <p className="text-indigo-200 text-sm mt-4">
            Free forever plan available. No credit card required.
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
