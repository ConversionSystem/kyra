import { redirect } from 'next/navigation';

// /agency/setup has been consolidated into /agency/ai-setup
// All template selection and AI configuration now happens there.
export default function SetupPage() {
  redirect('/agency/ai-setup');
}
