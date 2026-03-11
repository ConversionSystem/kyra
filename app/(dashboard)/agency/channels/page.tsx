import { redirect } from 'next/navigation';

// Channel config lives inside each client's dashboard (Channels tab).
// No agency-level OpenClaw exists — redirect to clients.
export default function ChannelsPage() {
  redirect('/agency/clients');
}
