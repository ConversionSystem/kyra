import { Metadata } from 'next';
import Link from 'next/link';
import { Bot, Calendar, Building2, Wifi, ArrowLeft } from 'lucide-react';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
import { Badge } from '@/components/ui/badge';
import { notFound } from 'next/navigation';

async function getWorker(id: string) {
  const supabase = createServiceClientWithoutCookies();
  const { data, error } = await supabase
    .from('agency_clients')
    .select('id, name, industry, status, created_at, container_config, agencies(name)')
    .eq('id', id)
    .neq('status', 'deleted')
    .single();

  if (error || !data) return null;

  const config = (data.container_config || {}) as Record<string, unknown>;
  const channels: string[] = [];
  if (config.channels && Array.isArray(config.channels)) {
    channels.push(...(config.channels as string[]));
  } else if (config.webchat || config.web_chat) {
    channels.push('Web Chat');
  }

  const agencies = data.agencies as unknown as { name: string } | { name: string }[] | null;
  const agencyName = Array.isArray(agencies) ? agencies[0]?.name : agencies?.name;

  return {
    id: data.id as string,
    name: data.name as string,
    industry: (data.industry as string) || 'General',
    status: data.status as string,
    created_at: data.created_at as string,
    channels,
    agency_name: agencyName || 'Independent',
  };
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const worker = await getWorker(id);
  if (!worker) return { title: 'Worker Not Found — Kyra' };

  return {
    title: `${worker.name} — AI Worker on Kyra`,
    description: `${worker.name} is an AI worker in the ${worker.industry} industry, deployed by ${worker.agency_name} on Kyra.`,
    openGraph: {
      title: `${worker.name} — AI Worker on Kyra`,
      description: `${worker.name} is an AI worker in the ${worker.industry} industry, deployed by ${worker.agency_name} on Kyra.`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${worker.name} — AI Worker on Kyra`,
      description: `${worker.name} is an AI worker in the ${worker.industry} industry.`,
    },
  };
}

export default async function WorkerProfilePage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const worker = await getWorker(id);
  if (!worker) notFound();

  const createdDate = new Date(worker.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      <section className="px-4 py-12 lg:py-16">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/workers"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition mb-8"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to directory
          </Link>

          <div className="bg-white border border-gray-200 rounded-xl p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="h-14 w-14 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <Bot className="h-7 w-7 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-black text-gray-900">{worker.name}</h1>
                  <Badge variant={worker.status === 'active' ? 'default' : 'secondary'}>
                    {worker.status}
                  </Badge>
                </div>
                <p className="text-gray-500">{worker.industry}</p>
              </div>
            </div>

            {/* Details */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Building2 className="h-3.5 w-3.5" />
                  Agency
                </div>
                <p className="font-semibold text-gray-900">{worker.agency_name}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Created
                </div>
                <p className="font-semibold text-gray-900">{createdDate}</p>
              </div>
            </div>

            {/* Channels */}
            {worker.channels.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Wifi className="h-3.5 w-3.5" />
                  Connected Channels
                </h2>
                <div className="flex flex-wrap gap-2">
                  {worker.channels.map((ch) => (
                    <span
                      key={ch}
                      className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full font-medium"
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Powered by badge */}
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <span className="h-4 w-4 rounded bg-indigo-600 flex items-center justify-center text-white font-black text-[8px]">K</span>
                Powered by Kyra
              </span>
              <span className="text-xs text-gray-400">{worker.industry}</span>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6 text-center">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Want an AI worker like this?
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              Deploy your own AI worker in under 2 minutes. Free to start.
            </p>
            <Link
              href="/solo"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition text-sm"
            >
              <Bot className="h-4 w-4" />
              Start free
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
