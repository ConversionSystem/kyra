export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isMasterEmail } from '@/lib/auth/admin';
import AccountsAdminClient from './accounts-admin-client';
import Link from 'next/link';
import { Crown, ArrowLeft } from 'lucide-react';

export default async function AdminAccountsPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!isMasterEmail(user?.email)) redirect('/agency');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3">
        <Link href="/master" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition">
          <ArrowLeft className="h-4 w-4" /> Master
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <Crown className="h-4 w-4 text-amber-500" /> Accounts Admin
        </span>
      </div>
      <AccountsAdminClient />
    </div>
  );
}
