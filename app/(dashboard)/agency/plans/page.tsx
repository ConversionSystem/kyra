import { redirect } from 'next/navigation';

// Plans have been merged into the Billing page.
export default function PlansRedirect() {
  redirect('/agency/billing');
}
