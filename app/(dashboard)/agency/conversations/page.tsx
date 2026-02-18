import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { MessageSquare, Search, Filter } from 'lucide-react';

export default async function ConversationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Conversations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor all AI conversations across your clients
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-48 sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled
            />
          </div>
        </div>
      </div>

      {/* Coming Soon State */}
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 bg-indigo-50 rounded-2xl mb-6">
          <MessageSquare className="h-12 w-12 text-indigo-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Conversations Coming Soon</h2>
        <p className="text-gray-500 max-w-md">
          See every conversation your AI employees are having with your clients&apos; customers.
          Filter by client, channel, and status. Monitor quality in real-time.
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <p className="text-2xl font-bold text-gray-900">—</p>
            <p className="text-xs text-gray-500 mt-1">Today</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <p className="text-2xl font-bold text-gray-900">—</p>
            <p className="text-xs text-gray-500 mt-1">This Week</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <p className="text-2xl font-bold text-gray-900">—</p>
            <p className="text-xs text-gray-500 mt-1">AI Handled</p>
          </div>
        </div>
      </div>
    </div>
  );
}
