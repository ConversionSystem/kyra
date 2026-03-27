import { redirect } from 'next/navigation';

// Revenue consolidated into /agency/analytics (Revenue tab) — Sprint 3
export default function RevenuePage() {
  redirect('/agency/analytics?tab=revenue');
}
