import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { Zap, Clock, RefreshCw, Bell } from 'lucide-react';

export default async function AutomationsPage() {
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Automations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Schedule proactive tasks for your clients&apos; AI employees
          </p>
        </div>
      </div>

      {/* Coming Soon State */}
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="p-4 bg-amber-50 rounded-2xl mb-6">
          <Zap className="h-12 w-12 text-amber-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Automations Coming Soon</h2>
        <p className="text-gray-500 max-w-md mb-8">
          Your AI employees don&apos;t just respond — they take initiative. Schedule follow-ups,
          send reminders, monitor leads, and run recurring tasks automatically.
        </p>

        {/* Preview of capabilities */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 text-left">
            <Clock className="h-6 w-6 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-900">Scheduled Tasks</p>
            <p className="text-xs text-gray-500 mt-1">Follow-ups, check-ins, daily summaries</p>
          </div>
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 text-left">
            <RefreshCw className="h-6 w-6 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-900">Recurring Jobs</p>
            <p className="text-xs text-gray-500 mt-1">Hourly lead checks, weekly reports</p>
          </div>
          <div className="p-5 bg-gray-50 rounded-xl border border-gray-200 text-left">
            <Bell className="h-6 w-6 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-900">Smart Triggers</p>
            <p className="text-xs text-gray-500 mt-1">Act on new leads, missed calls, events</p>
          </div>
        </div>
      </div>
    </div>
  );
}
