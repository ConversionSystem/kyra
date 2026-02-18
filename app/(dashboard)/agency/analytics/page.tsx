import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { BarChart3, TrendingUp, Clock, DollarSign } from 'lucide-react';

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track performance and ROI across all your clients
          </p>
        </div>
      </div>

      {/* Coming Soon State */}
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 bg-blue-50 rounded-2xl mb-6">
          <BarChart3 className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics Coming Soon</h2>
        <p className="text-gray-500 max-w-md mb-8">
          Real metrics to prove ROI to your clients. Messages handled, response times,
          conversations resolved, and cost per interaction — all per client.
        </p>

        {/* Preview metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl w-full">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <TrendingUp className="h-5 w-5 text-gray-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-300">—</p>
            <p className="text-xs text-gray-500 mt-1">Messages Handled</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <Clock className="h-5 w-5 text-gray-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-300">—</p>
            <p className="text-xs text-gray-500 mt-1">Avg Response</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <BarChart3 className="h-5 w-5 text-gray-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-300">—</p>
            <p className="text-xs text-gray-500 mt-1">AI Resolved</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <DollarSign className="h-5 w-5 text-gray-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-300">—</p>
            <p className="text-xs text-gray-500 mt-1">Cost / Convo</p>
          </div>
        </div>
      </div>
    </div>
  );
}
