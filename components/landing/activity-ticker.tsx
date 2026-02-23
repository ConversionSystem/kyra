'use client';

// Activity ticker — rotating social proof feed
// Shows recent wins to create FOMO and trust on the homepage

import { useEffect, useState } from 'react';

const WINS = [
  { emoji: '🦷', text: 'Dental AI in Dallas booked 3 appointments while the office was closed', time: '2m ago' },
  { emoji: '🌿', text: 'Cannabis dispensary AI handled 47 product questions in the last hour', time: '4m ago' },
  { emoji: '🏡', text: 'Real estate AI qualified 8 new leads and scheduled 2 showings', time: '7m ago' },
  { emoji: '💆', text: 'Med spa AI booked 5 consultations without a single staff message', time: '11m ago' },
  { emoji: '🔧', text: 'HVAC AI handled an emergency service request at 11pm — tech dispatched', time: '14m ago' },
  { emoji: '⚖️', text: 'Law firm AI pre-qualified 3 personal injury leads and scheduled calls', time: '18m ago' },
  { emoji: '💪', text: 'Gym AI signed up 4 new trial members during a Saturday morning rush', time: '22m ago' },
  { emoji: '🚗', text: 'Auto dealership AI booked 2 test drives from a single Google Ads click', time: '25m ago' },
  { emoji: '🌿', text: 'Cannabis AI upsold a premium product to a repeat customer via SMS', time: '31m ago' },
  { emoji: '🦷', text: 'Dental AI recovered a no-show by rescheduling via text in 3 messages', time: '35m ago' },
  { emoji: '🏡', text: 'Real estate AI responded to 14 weekend leads — agent had 6 warm calls Monday', time: '41m ago' },
  { emoji: '🔧', text: 'Roofing agency AI booked $18K in storm damage inspections overnight', time: '48m ago' },
];

export default function ActivityTicker() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % WINS.length);
        setVisible(true);
      }, 300);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const win = WINS[idx];

  return (
    <div className="border border-white/10 bg-white/5 rounded-xl px-4 py-3 flex items-center gap-3 max-w-2xl mx-auto mb-8">
      <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse shrink-0" />
      <div
        className={`flex-1 flex items-center gap-2 min-w-0 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <span className="text-base shrink-0">{win.emoji}</span>
        <p className="text-sm text-slate-300 truncate flex-1">{win.text}</p>
        <span className="text-xs text-slate-600 shrink-0 hidden sm:block">{win.time}</span>
      </div>
    </div>
  );
}
