import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Activity, BarChart3, Plus } from 'lucide-react';

const statusColors: Record<string, string> = {
  active: 'border-green-200 bg-green-50 text-green-600',
  paused: 'border-yellow-200 bg-yellow-50 text-yellow-600',
  setup: 'border-blue-200 bg-blue-50 text-blue-600',
};

export default async function AgencyOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const result = await getAgencyForUser(user.id);
  if (!result) redirect('/chat');

  const { agency, memberCount } = result;
  const clients = await getAgencyClients(agency.id);

  const activeCount = clients.filter((c) => c.status === 'active').length;
  const pausedCount = clients.filter((c) => c.status === 'paused').length;
  const setupCount = clients.filter((c) => c.status === 'setup').length;
  const totalUsage = clients.reduce((sum, c) => sum + c.usage_this_month, 0);
  const recentClients = clients.slice(0, 5);

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {agency.name} &middot; {memberCount} member{memberCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/agency/clients/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
                <p className="text-xs text-gray-400">Total Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
                <p className="text-xs text-gray-400">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-50 p-2">
                <Activity className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pausedCount}</p>
                <p className="text-xs text-gray-400">Paused</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalUsage.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Usage This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Active', count: activeCount, color: 'bg-green-500' },
          { label: 'Paused', count: pausedCount, color: 'bg-yellow-500' },
          { label: 'Setup', count: setupCount, color: 'bg-blue-500' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
            <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
            <span className="text-sm text-gray-700">{item.label}</span>
            <span className="ml-auto text-sm font-semibold text-gray-900">{item.count}</span>
          </div>
        ))}
      </div>

      {/* Recent Clients */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Clients</CardTitle>
          <Link href="/agency/clients" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            View all →
          </Link>
        </CardHeader>
        <CardContent>
          {recentClients.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No clients yet. Create your first one!</p>
              <Link href="/agency/clients/new">
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Client
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/agency/clients/${client.id}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{client.name}</p>
                      <p className="text-xs text-gray-400">
                        {client.industry || 'No industry'} · {client.usage_this_month} credits used
                      </p>
                    </div>
                  </div>
                  <Badge className={statusColors[client.status]}>
                    {client.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
