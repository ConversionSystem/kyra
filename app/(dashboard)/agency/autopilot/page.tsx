import { redirect } from 'next/navigation';

// Automation lives inside each client's dashboard (Scheduled Tasks tab).
// No agency-level OpenClaw exists — redirect to clients.
export default function AutopilotPage() {
  redirect('/agency/clients');
}
