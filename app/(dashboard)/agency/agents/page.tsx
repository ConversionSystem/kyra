import { redirect } from 'next/navigation';

// AI Teams config lives inside each client's dashboard.
// No agency-level OpenClaw exists — redirect to clients.
export default function AgentsPage() {
  redirect('/agency/clients');
}
