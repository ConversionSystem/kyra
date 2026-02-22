import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { CheckCircle2, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PLANS, type Plan } from '@/lib/billing/plans';

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default async function PlansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const currentPlan = (result.agency.plan || 'free') as Plan;

  const planList = Object.entries(PLANS) as [Plan, typeof PLANS[Plan]][];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900">Plans & Pricing</h1>
        </div>
        <p className="text-sm text-gray-500">
          You&apos;re on the <strong className="capitalize">{currentPlan}</strong> plan.
          {' '}Each plan controls how many client AI employees you can deploy.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
        {planList.map(([id, plan]) => {
          const isCurrent = id === currentPlan;
          return (
            <Card
              key={id}
              className={`relative ${plan.highlighted ? 'border-indigo-300 shadow-md shadow-indigo-100' : ''} ${isCurrent ? 'ring-2 ring-green-400' : ''}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold">
                    Most Popular
                  </span>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-3">
                  <span className="px-3 py-0.5 rounded-full bg-green-500 text-white text-xs font-bold">
                    YOUR PLAN
                  </span>
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-1">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-gray-900">
                    {plan.price === 0 ? 'Free' : fmt(plan.price)}
                  </span>
                  {plan.price > 0 && <span className="text-gray-400 text-sm">/mo</span>}
                </div>
                <p className="text-sm font-semibold text-indigo-600">
                  {plan.maxClients} client{plan.maxClients === 1 ? '' : 's'} AI employee{plan.maxClients === 1 ? '' : 's'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full text-sm"
                  size="sm"
                  variant={plan.highlighted ? 'default' : 'outline'}
                  disabled={isCurrent}
                  asChild={!isCurrent}
                >
                  {isCurrent ? (
                    <span>Current Plan</span>
                  ) : (
                    <Link href={`/agency/billing?upgrade=${id}`}>{plan.cta}</Link>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Agency math */}
      <Card className="bg-gray-900 text-white border-gray-800 mb-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">The agency math 💰</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { plan: 'Starter ($97/mo)', clients: 5, charge: 500, kyra: 97 },
              { plan: 'Pro ($247/mo)', clients: 15, charge: 1000, kyra: 247 },
              { plan: 'Scale ($497/mo)', clients: 50, charge: 1500, kyra: 497 },
            ].map((item) => (
              <div key={item.plan} className="rounded-lg bg-gray-800 p-4">
                <p className="text-xs text-gray-400 mb-1">{item.plan}</p>
                <p className="text-sm text-gray-300">{item.clients} clients × {fmt(item.charge)}/mo</p>
                <p className="text-2xl font-black text-green-400 mt-1">{fmt(item.clients * item.charge)}/mo</p>
                <p className="text-xs text-gray-500 mt-1">
                  ({fmt(item.kyra)} cost → {fmt(item.clients * item.charge - item.kyra)} profit)
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            + $0.48/mo per client container. Most agencies charge $1K–$5K/mo per client.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3 flex-wrap">
        <Button asChild>
          <Link href="/agency/revenue">
            <ArrowRight className="h-4 w-4 mr-2" />
            Calculate Your Revenue
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/agency/clients/new">
            Add a Client
          </Link>
        </Button>
      </div>
    </div>
  );
}
