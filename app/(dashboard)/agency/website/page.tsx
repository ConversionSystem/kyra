import { redirect } from 'next/navigation';

/**
 * Website builder lives inside each client's sidebar (Client → Website tab).
 * This route is no longer a standalone page.
 */
export default function WebsitePage() {
  redirect('/agency/clients');
}
