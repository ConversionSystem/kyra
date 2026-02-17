import { redirect } from 'next/navigation';

// Personal signup removed — Kyra is agency-only
export default function SignupPage() {
  redirect('/signup/agency');
}
