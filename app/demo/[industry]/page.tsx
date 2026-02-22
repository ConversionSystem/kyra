import { notFound } from 'next/navigation';
import DemoChat from './demo-chat';

// Industry-specific demo scenarios
const DEMOS: Record<string, {
  title: string;
  subtitle: string;
  contactName: string;
  businessName: string;
  accentColor: string;
  emoji: string;
  conversation: { from: 'contact' | 'ai'; text: string; delay: number }[];
  stats: { label: string; value: string }[];
}> = {
  dental: {
    title: 'AI Receptionist for Dental Clinics',
    subtitle: 'Handles booking, insurance questions, and follow-ups — 24/7. No staff required.',
    contactName: 'Maria Garcia',
    businessName: 'Smile Dental Clinic',
    accentColor: '#4f46e5',
    emoji: '🦷',
    conversation: [
      { from: 'contact', text: 'Hi, I need to get a cleaning. How much does it cost?', delay: 800 },
      { from: 'ai', text: "Hi Maria! 😊 A routine cleaning at Smile Dental is $150, or fully covered with most insurance plans. We're accepting new patients! Would you like to book?", delay: 1200 },
      { from: 'contact', text: 'Yes! Do you have anything this week?', delay: 900 },
      { from: 'ai', text: 'We have Tuesday at 2pm or Thursday at 10am. Which works better for you? And may I ask which insurance you have?', delay: 1100 },
      { from: 'contact', text: 'Tuesday works. I have Delta Dental', delay: 800 },
      { from: 'ai', text: "Perfect! ✅ I've reserved Tuesday at 2pm for you. With Delta Dental, your cleaning is typically 100% covered. You'll get a confirmation text tomorrow morning. See you Tuesday!", delay: 1400 },
    ],
    stats: [
      { label: 'Avg response time', value: '< 60 sec' },
      { label: 'Handles without staff', value: '80%' },
      { label: 'Appointments booked', value: 'Automatically' },
    ],
  },
  realestate: {
    title: 'AI Lead Qualifier for Real Estate',
    subtitle: 'Qualifies every lead the moment they come in. Books tours. Knows your listings.',
    contactName: 'David Kim',
    businessName: 'Apex Realty',
    accentColor: '#059669',
    emoji: '🏡',
    conversation: [
      { from: 'contact', text: 'I saw your listing on Zillow — 3br on Oak Street. Still available?', delay: 800 },
      { from: 'ai', text: "Yes! The 3BR on Oak Street is still available at $425K. Great neighborhood. Are you pre-approved for financing, or still exploring your options?", delay: 1200 },
      { from: 'contact', text: "Pre-approved up to $500K. We're ready to move in 60 days.", delay: 900 },
      { from: 'ai', text: "Excellent — you're in a strong position! 🎉 I have Saturday 10am or Sunday 2pm available for a private showing with Agent Michael Torres. Which works for you?", delay: 1300 },
      { from: 'contact', text: 'Saturday 10am is perfect', delay: 700 },
      { from: 'ai', text: "Confirmed! Saturday at 10am, 234 Oak Street. I'll send you a reminder Friday evening. Looking forward to showing you the property! 🏡", delay: 1200 },
    ],
    stats: [
      { label: 'Lead response time', value: '< 2 min' },
      { label: 'Qualified leads booked', value: 'Automatically' },
      { label: 'Increase in showings', value: '3x faster' },
    ],
  },
  cannabis: {
    title: 'AI Budtender for Cannabis Dispensaries',
    subtitle: 'Handles product questions, compliance checks, and order inquiries — with built-in age verification and state compliance.',
    contactName: 'Alex Rivera',
    businessName: 'Purple Lotus Dispensary',
    accentColor: '#7c3aed',
    emoji: '🌿',
    conversation: [
      { from: 'contact', text: "Hey, what's your best indica for sleep?", delay: 900 },
      { from: 'ai', text: "Hi! Before I help, I need to quickly verify — are you 21 or older? (This is required by state law 🔒)", delay: 1100 },
      { from: 'contact', text: "Yes, I'm 28", delay: 700 },
      { from: 'ai', text: "Thanks Alex! 🌿 For sleep, our top picks are: **Granddaddy Purple** (22% THC, strong body relaxation, $45/eighth) and **Purple Kush** (18% THC, mellow sedating effect, $38/eighth). Both are consistently popular for evening use.", delay: 1500 },
      { from: 'contact', text: "Which one is stronger?", delay: 800 },
      { from: 'ai', text: "Granddaddy Purple is the stronger option at 22% THC — most customers describe it as deeply relaxing. Purple Kush is a bit milder and great if you're newer to indicas. Want me to set one aside for you for pickup today?", delay: 1400 },
      { from: 'contact', text: "Yes, GDP please! What are your hours?", delay: 800 },
      { from: 'ai', text: "We're open daily 9am–10pm. I've noted your interest in Granddaddy Purple! Our team will have it ready. Come in anytime today and show this text. See you soon! 🌿", delay: 1300 },
    ],
    stats: [
      { label: 'Age verification', value: 'Automatic' },
      { label: 'Products explained', value: 'Instantly' },
      { label: 'Compliance', value: 'Built-in' },
    ],
  },
  auto: {
    title: 'AI Sales Assistant for Auto Dealerships',
    subtitle: 'Follows up on every lead, answers inventory questions, and books test drives automatically.',
    contactName: 'James Wilson',
    businessName: 'Premier Auto',
    accentColor: '#dc2626',
    emoji: '🚗',
    conversation: [
      { from: 'contact', text: 'Hey, looking for a used SUV under $35K. What do you have?', delay: 800 },
      { from: 'ai', text: "Hi James! We have 3 great options right now: 2022 Honda CR-V ($28K), 2021 Toyota RAV4 ($31K), and 2023 Ford Escape ($34K). All certified pre-owned with warranty. Which sounds interesting?", delay: 1300 },
      { from: 'contact', text: 'The RAV4 sounds good. What are the miles?', delay: 900 },
      { from: 'ai', text: "The 2021 RAV4 has 28,400 miles — still well within the sweet spot. It's got the XLE trim, backup camera, lane assist, and Apple CarPlay. Want to come in for a test drive?", delay: 1200 },
      { from: 'contact', text: "Yes! Are you open Saturday?", delay: 700 },
      { from: 'ai', text: "We're open Saturday 9am–6pm. I'll reserve the RAV4 for your test drive — how does 11am work? Our sales team will have it ready and waiting for you. 🚗", delay: 1300 },
    ],
    stats: [
      { label: 'Leads contacted within', value: '60 seconds' },
      { label: 'Test drives booked', value: 'Without calling' },
      { label: 'Follow-up rate', value: '100%' },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DEMOS).map((industry) => ({ industry }));
}

// Allow dynamic paths too (not just static)
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: Promise<{ industry: string }> }) {
  const { industry } = await params;
  const demo = DEMOS[industry];
  if (!demo) return { title: 'Kyra AI Demo' };
  return {
    title: `${demo.title} — Kyra AI`,
    description: demo.subtitle,
  };
}

export default async function DemoPage({ params }: { params: Promise<{ industry: string }> }) {
  const { industry } = await params;
  const demo = DEMOS[industry];
  if (!demo) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <span className="text-green-400">●</span> Live demo — {demo.businessName}
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold mb-4">
          {demo.emoji} {demo.title}
        </h1>
        <p className="text-slate-300 text-lg sm:text-xl max-w-2xl mx-auto">
          {demo.subtitle}
        </p>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 pb-12 grid md:grid-cols-2 gap-8 items-start">
        {/* Phone mockup with animated conversation */}
        <DemoChat
          conversation={demo.conversation}
          contactName={demo.contactName}
          businessName={demo.businessName}
          accentColor={demo.accentColor}
        />

        {/* Right side: features + stats + CTA */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {demo.stats.map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-3">
            <p className="font-semibold text-white">What Kyra AI does automatically:</p>
            {[
              '💬 Responds to every inbound SMS within 60 seconds',
              '📅 Books appointments and sends confirmations',
              '🏷️ Tags and updates contacts in GoHighLevel CRM',
              '🚨 Escalates to a human when needed',
              '👋 Greets new leads the moment they enter your CRM',
              '📝 Writes CRM notes after every conversation',
              '⏰ Respects your business hours',
              '⛔ Handles STOP/opt-outs automatically',
            ].map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="shrink-0">{f.slice(0, 2)}</span>
                <span>{f.slice(3)}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="bg-indigo-600 rounded-xl p-6 text-center space-y-3">
            <p className="font-bold text-lg">Ready to deploy your AI employee?</p>
            <p className="text-indigo-200 text-sm">Set up takes under 10 minutes. Connects to your existing GoHighLevel account.</p>
            <a
              href="https://kyra.conversionsystem.com/signup/agency"
              className="block bg-white text-indigo-700 font-bold py-3 px-6 rounded-lg hover:bg-indigo-50 transition"
            >
              Get Started Free →
            </a>
            <p className="text-indigo-300 text-xs">No credit card required · Works with GoHighLevel</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-8 text-slate-500 text-sm">
        Powered by <strong className="text-slate-400">Kyra AI</strong> — conversionsystem.com
      </div>
    </div>
  );
}
