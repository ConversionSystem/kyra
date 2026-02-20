import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser } from '@/lib/agency/queries';
import { CheckCircle2, Zap, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    label: 'Free during Beta',
    badge: 'CURRENT',
    badgeColor: 'bg-green-100 text-green-700',
    clients: 5,
    description: 'Launch your AI business with your first 5 clients. Free while we\'re in beta.',
    features: [
      '5 client AI employees',
      '21 industry templates',
      'Telegram, SMS, web chat',
      'GHL integration',
      'OpenClaw Terminal access',
      'BYOK (Bring Your Own AI Keys)',
      'Basic analytics',
    ],
    cta: 'Current Plan',
    ctaDisabled: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 249,
    label: '/month',
    badge: 'MOST POPULAR',
    badgeColor: 'bg-indigo-100 text-indigo-700',
    clients: 20,
    description: 'The serious agency plan. Manage up to 20 AI employees with full analytics and white-label.',
    features: [
      'Up to 20 client AI employees',
      'Everything in Starter',
      'White-label branding (your logo, colors)',
      'Advanced analytics per client',
      'Priority support',
      'Custom templates',
      'Client usage reports',
      'Revenue tracking dashboard',
    ],
    cta: 'Upgrade to Pro',
    ctaDisabled: false,
    highlight: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 499,
    label: '/month',
    badge: 'FOR AGENCIES',
    badgeColor: 'bg-purple-100 text-purple-700',
    clients: 100,
    description: 'Built for high-volume agencies. Up to 100 AI employees, dedicated infrastructure.',
    features: [
      'Up to 100 client AI employees',
      'Everything in Pro',
      'Dedicated OVH containers',
      'Custom domain per agency',
      'SLA uptime guarantee',
      'Dedicated Slack support',
      'API access for custom integrations',
      'Monthly strategy call',
    ],
    cta: 'Upgrade to Scale',
    ctaDisabled: false,
  },
];

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export default async function PlansPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/signup/agency');

  const currentPlan = result.agency.plan || 'starter';

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900">Plans & Pricing</h1>
        </div>
        <p className="text-sm text-gray-500">
          You&apos;re on the <strong>Starter</strong> plan (free during beta). All paid plans unlock after beta launch.
        </p>
      </div>

      {/* Beta notice */}
      <div className="mb-8 rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
        <span className="text-2xl">🎉</span>
        <div>
          <p className="font-semibold text-amber-900">You&apos;re in the beta — everything is free right now</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Start with 5 clients, BYOK, and full platform access. Paid plans launch after beta.
            Existing beta agencies get <strong>50% off their first 3 months</strong>.
          </p>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-5 mb-10">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={plan.highlight ? 'border-indigo-300 shadow-md shadow-indigo-100 relative' : ''}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-bold">
                  Most Popular
                </span>
              </div>
            )}
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.badgeColor}`}>
                  {plan.id === currentPlan ? 'CURRENT' : plan.badge}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-gray-900">
                  {plan.price === 0 ? 'Free' : fmt(plan.price)}
                </span>
                {plan.price > 0 && <span className="text-gray-400 text-sm">{plan.label}</span>}
              </div>
              <p className="text-xs text-indigo-600 font-medium">{plan.clients} client AI employees</p>
              <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.highlight ? 'default' : 'outline'}
                disabled={plan.ctaDisabled || plan.id === currentPlan}
              >
                {plan.id === currentPlan ? 'Current Plan' : plan.cta}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agency math section */}
      <Card className="bg-gray-900 text-white border-gray-800 mb-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-white mb-4">The agency math that makes this a no-brainer</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { plan: 'Pro ($249/mo)', clients: 10, charge: 500, net: '($249 cost → $4,751 profit)' },
              { plan: 'Pro ($249/mo)', clients: 20, charge: 1000, net: '($249 cost → $19,751 profit)' },
              { plan: 'Scale ($499/mo)', clients: 50, charge: 1500, net: '($499 cost → $74,501 profit)' },
            ].map((item, i) => (
              <div key={i} className="rounded-lg bg-gray-800 p-4">
                <p className="text-xs text-gray-400 mb-1">{item.plan}</p>
                <p className="text-sm text-gray-300">{item.clients} clients × {fmt(item.charge)}/mo</p>
                <p className="text-2xl font-black text-green-400 mt-1">{fmt(item.clients * item.charge)}/mo</p>
                <p className="text-xs text-gray-500 mt-1">{item.net}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4 text-center">
            + $0.48/client/mo container cost. These are conservative estimates — most agencies charge $1K–$5K/mo per client.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button asChild>
          <Link href="/agency/revenue">
            <ArrowRight className="h-4 w-4 mr-2" />
            Calculate Your Revenue
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/agency/clients/new">
            Add Your First Client
          </Link>
        </Button>
      </div>
    </div>
  );
}
