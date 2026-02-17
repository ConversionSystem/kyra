import { redirect } from 'next/navigation';

// Billing is hidden during beta — redirect to API Keys
export default function AgencyBillingPage() {
  redirect('/agency/api-keys');
}
