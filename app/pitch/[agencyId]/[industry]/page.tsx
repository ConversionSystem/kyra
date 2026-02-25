import { notFound } from 'next/navigation';
import { createClient as createSupabase } from '@supabase/supabase-js';
import PitchContent from './pitch-content';

// ── Industry data (same conversations as /demo pages) ───────────────────────
const INDUSTRIES: Record<string, {
  title: string;
  subtitle: string;
  contactName: string;
  businessType: string;
  accentColor: string;
  emoji: string;
  conversation: { from: 'contact' | 'ai'; text: string; delay: number }[];
  stats: { label: string; value: string }[];
  roi: { monthlyLeads: number; closeRate: number; avgDeal: number };
}> = {
  dental: {
    title: 'AI Receptionist for Dental Practices',
    subtitle: 'Books appointments, answers insurance questions, and follows up with no-shows — 24/7, automatically.',
    contactName: 'Maria Garcia',
    businessType: 'Dental Clinic',
    accentColor: '#4f46e5',
    emoji: '🦷',
    conversation: [
      { from: 'contact', text: 'Hi, I need to get a cleaning. How much does it cost?', delay: 800 },
      { from: 'ai', text: "Hi Maria! 😊 A routine cleaning is $150, or fully covered with most insurance plans. We're accepting new patients! Would you like to book?", delay: 1200 },
      { from: 'contact', text: 'Yes! Do you have anything this week?', delay: 900 },
      { from: 'ai', text: 'We have Tuesday at 2pm or Thursday at 10am. Which works better for you? And may I ask which insurance you have?', delay: 1100 },
      { from: 'contact', text: 'Tuesday works. I have Delta Dental', delay: 800 },
      { from: 'ai', text: "Perfect! ✅ Tuesday at 2pm is yours. With Delta Dental your cleaning is typically 100% covered. You'll get a reminder text Monday evening. See you Tuesday!", delay: 1400 },
    ],
    stats: [{ label: 'Response time', value: '< 60 sec' }, { label: 'Handled by AI', value: '80%' }, { label: 'Appts booked', value: 'Auto' }],
    roi: { monthlyLeads: 120, closeRate: 0.35, avgDeal: 800 },
  },
  realestate: {
    title: 'AI Lead Qualifier for Real Estate',
    subtitle: 'Qualifies every lead instantly, books showings, and keeps your pipeline moving — even at midnight.',
    contactName: 'David Kim',
    businessType: 'Real Estate Agency',
    accentColor: '#059669',
    emoji: '🏡',
    conversation: [
      { from: 'contact', text: 'I saw your listing on Zillow — 3br on Oak Street. Still available?', delay: 800 },
      { from: 'ai', text: "Yes! The 3BR on Oak Street is still available at $425K. Are you pre-approved for financing, or still exploring options?", delay: 1200 },
      { from: 'contact', text: "Pre-approved up to $500K. We're ready to move in 60 days.", delay: 900 },
      { from: 'ai', text: "Excellent — you're in a strong position! 🎉 I have Saturday 10am or Sunday 2pm for a private showing. Which works for you?", delay: 1300 },
      { from: 'contact', text: 'Saturday 10am is perfect', delay: 700 },
      { from: 'ai', text: "Confirmed! Saturday 10am, 234 Oak Street. I'll send a reminder Friday evening. Can't wait to show you the property! 🏡", delay: 1200 },
    ],
    stats: [{ label: 'Lead response', value: '< 2 min' }, { label: 'Showings booked', value: 'Auto' }, { label: 'Qualified faster', value: '3x' }],
    roi: { monthlyLeads: 80, closeRate: 0.12, avgDeal: 12000 },
  },
  auto: {
    title: 'AI Sales Assistant for Auto Dealerships',
    subtitle: 'Follows up on every internet lead, answers inventory questions, and books test drives — without a single phone call.',
    contactName: 'James Wilson',
    businessType: 'Auto Dealership',
    accentColor: '#dc2626',
    emoji: '🚗',
    conversation: [
      { from: 'contact', text: 'Hey, looking for a used SUV under $35K. What do you have?', delay: 800 },
      { from: 'ai', text: "Hi James! We have 3 great options: 2022 Honda CR-V ($28K), 2021 Toyota RAV4 ($31K), and 2023 Ford Escape ($34K). All CPO with warranty. Which sounds interesting?", delay: 1300 },
      { from: 'contact', text: 'The RAV4 sounds good. What are the miles?', delay: 900 },
      { from: 'ai', text: "The RAV4 has 28,400 miles — well within the sweet spot. XLE trim, backup camera, lane assist, Apple CarPlay. Want to come in for a test drive?", delay: 1200 },
      { from: 'contact', text: 'Yes! Are you open Saturday?', delay: 700 },
      { from: 'ai', text: "We're open Saturday 9am–6pm. I'll hold the RAV4 for you — how does 11am work? Our team will have it ready and waiting. 🚗", delay: 1300 },
    ],
    stats: [{ label: 'Lead response', value: '60 sec' }, { label: 'Test drives booked', value: 'Auto' }, { label: 'Follow-up rate', value: '100%' }],
    roi: { monthlyLeads: 200, closeRate: 0.08, avgDeal: 3500 },
  },
  cannabis: {
    title: 'AI Budtender for Cannabis Dispensaries',
    subtitle: 'Handles product questions, age verification, and order prep — with built-in state compliance.',
    contactName: 'Alex Rivera',
    businessType: 'Cannabis Dispensary',
    accentColor: '#7c3aed',
    emoji: '🌿',
    conversation: [
      { from: 'contact', text: "Hey, what's your best indica for sleep?", delay: 900 },
      { from: 'ai', text: "Hi! Before I help, I need to quickly verify — are you 21 or older? (Required by state law 🔒)", delay: 1100 },
      { from: 'contact', text: "Yes, I'm 28", delay: 700 },
      { from: 'ai', text: "Thanks Alex! 🌿 For sleep: **Granddaddy Purple** (22% THC, deep body relaxation, $45/eighth) or **Purple Kush** (18% THC, mellow sedation, $38/eighth). Both very popular.", delay: 1500 },
      { from: 'contact', text: 'Which is stronger?', delay: 800 },
      { from: 'ai', text: "GDP at 22% is stronger — deeply relaxing, great for sleep. Purple Kush is milder, better if you're newer to indicas. Want me to set one aside for pickup today?", delay: 1400 },
    ],
    stats: [{ label: 'Age verification', value: 'Auto' }, { label: 'Products explained', value: 'Instantly' }, { label: 'Compliance', value: 'Built-in' }],
    roi: { monthlyLeads: 300, closeRate: 0.45, avgDeal: 120 },
  },
  restaurant: {
    title: 'AI Host for Restaurants',
    subtitle: 'Takes reservations, answers menu questions, and handles catering inquiries — around the clock.',
    contactName: 'Sophie Chen',
    businessType: 'Restaurant',
    accentColor: '#f59e0b',
    emoji: '🍽️',
    conversation: [
      { from: 'contact', text: "Hi, do you have availability Saturday night for 6 people?", delay: 800 },
      { from: 'ai', text: "Hi Sophie! 🍽️ We do have availability Saturday. Would 7pm or 8:30pm work better for your group?", delay: 1100 },
      { from: 'contact', text: "7pm is perfect. Do you have vegetarian options?", delay: 800 },
      { from: 'ai', text: "Absolutely — about 30% of our menu is vegetarian or vegan friendly. Chef's current favorites are the truffle risotto and butternut squash ravioli. Want me to confirm the 7pm reservation for 6?", delay: 1300 },
      { from: 'contact', text: "Yes please!", delay: 600 },
      { from: 'ai', text: "✅ Confirmed! Saturday at 7pm for 6 guests under Sophie. You'll get a reminder Friday afternoon. We look forward to seeing you! 🥂", delay: 1200 },
    ],
    stats: [{ label: 'Reservations', value: 'Auto' }, { label: 'Unanswered calls', value: '0%' }, { label: 'No-shows reduced', value: '40%' }],
    roi: { monthlyLeads: 400, closeRate: 0.6, avgDeal: 180 },
  },
  medspa: {
    title: 'AI Concierge for Med Spas',
    subtitle: 'Books consultations, explains treatments, and follows up with prospects — converting leads while you sleep.',
    contactName: 'Jennifer Lee',
    businessType: 'Med Spa',
    accentColor: '#ec4899',
    emoji: '✨',
    conversation: [
      { from: 'contact', text: "Hi, I'm interested in Botox. How much does it cost?", delay: 800 },
      { from: 'ai', text: "Hi Jennifer! ✨ Botox at our med spa starts at $12/unit, with most patients needing 20–40 units per treatment area. Would you like a free consultation to get an exact quote?", delay: 1300 },
      { from: 'contact', text: "Yes, that sounds great. When are you available?", delay: 900 },
      { from: 'ai', text: "We have openings Tuesday at 3pm, Wednesday at 10am, or Friday at 2pm. The consultation is about 20 minutes and completely free. Which works for you?", delay: 1200 },
      { from: 'contact', text: "Tuesday at 3pm works!", delay: 600 },
      { from: 'ai', text: "Perfect! ✅ Tuesday at 3pm for Jennifer — free Botox consultation. You'll get a reminder Monday evening. We're excited to meet you! ✨", delay: 1100 },
    ],
    stats: [{ label: 'Consultations booked', value: 'Auto' }, { label: 'Response time', value: '< 60 sec' }, { label: 'Lead conversion', value: '+65%' }],
    roi: { monthlyLeads: 90, closeRate: 0.5, avgDeal: 600 },
  },
};

function getSupabase() {
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ agencyId: string; industry: string }>;
}) {
  const { industry } = await params;
  const demo = INDUSTRIES[industry];
  if (!demo) return { title: 'AI Worker Demo' };
  return {
    title: `${demo.emoji} ${demo.title}`,
    description: demo.subtitle,
    openGraph: { title: demo.title, description: demo.subtitle },
  };
}

export default async function PitchPage({
  params,
}: {
  params: Promise<{ agencyId: string; industry: string }>;
}) {
  const { agencyId, industry } = await params;
  const demo = INDUSTRIES[industry];
  if (!demo) notFound();

  const supabase = getSupabase();
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, settings')
    .eq('id', agencyId)
    .single();

  // Fallback gracefully if agency not found
  const agencyName = agency?.name ?? 'Your AI Agency';
  const agencySettings = (agency?.settings ?? {}) as Record<string, unknown>;
  const calendarUrl = (agencySettings.calendar_url as string) || null;
  const agencyLogo = (agencySettings.logo_url as string) || null;

  return (
    <PitchContent
      demo={demo}
      industry={industry}
      agencyId={agencyId}
      agencyName={agencyName}
      agencyLogo={agencyLogo}
      calendarUrl={calendarUrl}
    />
  );
}
