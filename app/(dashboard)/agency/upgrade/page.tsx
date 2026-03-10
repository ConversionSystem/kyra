import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AlertTriangle, ArrowRight, Coins, Gift, KeyRound, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { getAgencyCredits } from '@/lib/billing/credit-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Upgrade — Kyra' };

export default async function AgencyUpgradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const { agency } = result;
  const [agencyCredits, clients] = await Promise.all([
    getAgencyCredits(agency.id).catch(() => ({ balance: 0, lifetimePurchased: 0, lifetimeUsed: 0 })),
    getAgencyClients(agency.id),
  ]);

  const totalUsageThisMonth = clients.reduce((sum, c) => sum + (c.usage_this_month || 0), 0);
  const avgDailyUsage = totalUsageThisMonth > 0 ? totalUsageThisMonth / Math.max(new Date().getDate(), 1) : 0;
  const estimatedDaysLeft = avgDailyUsage > 0 ? Math.floor(agencyCredits.balance / avgDailyUsage) : null;

  const isOut = agencyCredits.balance <= 0;
  const isLow = agencyCredits.balance > 0 && agencyCredits.balance <= 10;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Upgrade & Credits</h1>
        <p className="text-sm text-gray-500 mt-1">
          Keep your AI worker live and choose the best path to scale.
        </p>
      </div>

      <Card className={`mb-6 border-l-4 ${isOut ? 'border-l-red-500 bg-red-50/40' : isLow ? 'border-l-amber-500 bg-amber-50/40' : 'border-l-emerald-500 bg-emerald-50/40'}`}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 mt-0.5 shrink-0 ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600'}`} />
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${isOut ? 'text-red-900' : isLow ? 'text-amber-900' : 'text-emerald-900'}`}>
                {isOut
                  ? 'You are out of credits.'
                  : isLow
                    ? `Only ${agencyCredits.balance} credits remaining.`
                    : `${agencyCredits.balance} credits available.`}
              </p>
              <p className={`text-xs mt-1 ${isOut ? 'text-red-700' : isLow ? 'text-amber-700' : 'text-emerald-700'}`}>
                {estimatedDaysLeft !== null
                  ? `At current usage pace, you have about ${estimatedDaysLeft} day${estimatedDaysLeft === 1 ? '' : 's'} before credits run out.`
                  : 'Use one of the options below to top up, bring your own key, or earn bonus credits.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="h-4 w-4 text-indigo-600" />
              Top up credits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Buy more platform credits instantly and keep all AI responses running.
            </p>
            <Link href="/agency/credits">
              <Button className="w-full gap-2">
                Open credits
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-blue-600" />
              Add your API key
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Connect your own provider key (OpenAI, Anthropic, Google) and bypass platform credit usage.
            </p>
            <Link href="/agency/api-keys">
              <Button variant="outline" className="w-full gap-2">
                Manage API keys
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4 text-emerald-600" />
              Earn free credits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600">
              Share your referral link. You and your referral both get bonus credits.
            </p>
            <Link href="/agency/referrals">
              <Button variant="outline" className="w-full gap-2">
                Open referrals
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
        <p className="text-sm text-indigo-900 flex items-center gap-2 font-medium">
          <Sparkles className="h-4 w-4" />
          Pro tip: keep at least 7 days of runway so your AI worker never pauses during peak lead flow.
        </p>
      </div>
    </div>
  );
}
