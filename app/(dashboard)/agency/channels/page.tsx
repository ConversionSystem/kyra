import { redirect } from 'next/navigation';

// Channels config now lives inside each client's detail view (Channels tab).
// Redirect old URL so bookmarks don't break.
export default function ChannelsPage() {
  redirect('/agency/clients');
}
