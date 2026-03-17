import { redirect } from 'next/navigation';

// GHL integration lives inside each client's dashboard (GHL tab).
// This standalone page was a duplicate — redirect to clients.
export default function GHLSetupPage() {
  redirect('/agency/clients');
}
