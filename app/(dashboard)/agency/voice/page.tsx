import { redirect } from 'next/navigation';

// Voice AI config lives inside each client's dashboard (Voice AI tab).
// No agency-level OpenClaw exists — redirect to clients.
export default function VoicePage() {
  redirect('/agency/clients');
}
