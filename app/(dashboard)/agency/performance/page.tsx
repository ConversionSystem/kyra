import { redirect } from 'next/navigation';

// Performance/Insights lives inside each client's dashboard (Usage tab).
// Agency-wide metrics are on Mission Control.
export default function PerformancePage() {
  redirect('/agency/clients');
}
