import { redirect } from 'next/navigation';

// Voice AI config now lives inside each client's detail view (Voice AI tab).
// Redirect old URL so bookmarks don't break.
export default function VoicePage() {
  redirect('/agency/clients');
}
