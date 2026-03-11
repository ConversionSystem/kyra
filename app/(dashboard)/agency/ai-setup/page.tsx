import { redirect } from 'next/navigation';

// AI Templates config lives inside each client's dashboard (AI Personality tab).
// No agency-level OpenClaw exists — redirect to clients.
export default function AISetupPage() {
  redirect('/agency/clients');
}
