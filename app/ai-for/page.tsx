import type { Metadata } from 'next';
import Link from 'next/link';

import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
export const metadata: Metadata = {
  title: 'AI Workforce Platform by Industry | Kyra',
  description: 'Kyra AI workers for dental, real estate, cannabis, fitness, home services, and 21+ more industries. Built for GoHighLevel agencies. Free to start.',
};

const NICHES = [
  { slug: 'dental', emoji: '🦷', name: 'Dental Practices', result: '+40% appointment bookings' },
  { slug: 'cannabis', emoji: '🌿', name: 'Cannabis Dispensaries', result: 'Proven on high-volume SMS' },
  { slug: 'real-estate', emoji: '🏡', name: 'Real Estate', result: '100% of leads contacted in <5 min' },
  { slug: 'fitness', emoji: '💪', name: 'Gyms & Fitness Studios', result: '80% fewer lost leads' },
  { slug: 'home-services', emoji: '🔧', name: 'Home Services', result: '0 missed service calls' },
];

const COMING_SOON = [
  { emoji: '💆', name: 'Med Spa & Aesthetics' },
  { emoji: '🚗', name: 'Auto Dealerships' },
  { emoji: '⚖️', name: 'Law Firms' },
  { emoji: '🍽️', name: 'Restaurants' },
  { emoji: '📋', name: 'Insurance' },
  { emoji: '🏦', name: 'Mortgage & Lending' },
  { emoji: '🐾', name: 'Veterinary Clinics' },
  { emoji: '🌞', name: 'Solar' },
  { emoji: '🎓', name: 'Education & Tutoring' },
  { emoji: '🏨', name: 'Hotels & Hospitality' },
];

export default function AiForIndexPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <PublicNav />
      <nav className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-black text-xl"><span className="text-indigo-600">⚡</span> Kyra</Link>
          <Link href="/solo" className="bg-indigo-600 text-white font-bold text-sm px-4 py-2 rounded-lg">Start Free →</Link>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-black text-center mb-4">AI Workers by Industry</h1>
        <p className="text-center text-gray-500 text-lg mb-12">
          Every industry has unique needs. Kyra has a pre-built AI worker for each one — customizable, GHL-native, live in under 10 minutes.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {NICHES.map(n => (
            <Link key={n.slug} href={`/ai-for/${n.slug}`}
              className="border-2 border-gray-200 hover:border-indigo-400 rounded-2xl p-6 transition-all group">
              <div className="text-4xl mb-3">{n.emoji}</div>
              <h2 className="font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{n.name}</h2>
              <p className="text-sm text-indigo-600 font-medium">{n.result}</p>
            </Link>
          ))}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">More niches available →</p>
          <div className="flex flex-wrap gap-3">
            {COMING_SOON.map(n => (
              <span key={n.name} className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 text-gray-600 text-sm px-3 py-1.5 rounded-full">
                {n.emoji} {n.name}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">All 50 templates available inside the platform. <Link href="/solo" className="text-indigo-500 underline">Start free →</Link></p>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
