import { redirect } from 'next/navigation';

// AI Templates/Personality config now lives inside each client's detail view (AI Personality tab).
// Redirect old URL so bookmarks don't break.
export default function AISetupPage() {
  redirect('/agency/clients');
}
