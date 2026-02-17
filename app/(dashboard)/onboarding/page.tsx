import { redirect } from 'next/navigation';

// Personal onboarding removed — agencies use /signup/agency
export default function OnboardingPage() {
  redirect('/agency');
}
