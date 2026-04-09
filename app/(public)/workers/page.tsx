'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Bot, Wifi, Building2 } from 'lucide-react';
import PublicNav from '@/components/layout/public-nav';
import PublicFooter from '@/components/layout/public-footer';
import { Badge } from '@/components/ui/badge';

const INDUSTRIES = [
  'All', 'Dental', 'Cannabis', 'Real Estate', 'Plumbing', 'Restaurant', 'Legal',
  'Med Spa', 'Auto', 'HVAC', 'Fitness', 'Insurance',
];

interface Worker {
  id: string;
  name: string;
  industry: string;
  status: string;
  created_at: string;
  channels: string[];
  agency_name: string;
}

export default function WorkersDirectoryPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (industry !== 'All') params.set('industry', industry);

    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/public/workers?${params}`)
        .then(r => r.json())
        .then(data => setWorkers(data.workers || []))
        .catch(() => setWorkers([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [search, industry]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNav />

      {/* Hero */}
      <section className="bg-white border-b border-gray-200 px-4 py-16 lg:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">
            AI Worker Directory
          </h1>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Discover AI workers deployed by agencies on Kyra
          </p>

          {/* Search */}
          <div className="mt-8 max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search workers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
            />
          </div>

          {/* Industry pills */}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {INDUSTRIES.map((ind) => (
              <button
                key={ind}
                onClick={() => setIndustry(ind)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
                  industry === ind
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="px-4 py-12 lg:py-16">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="text-center py-20">
              <Bot className="h-8 w-8 text-gray-300 mx-auto mb-3 animate-pulse" />
              <p className="text-gray-400">Loading workers...</p>
            </div>
          ) : workers.length === 0 ? (
            <div className="text-center py-20">
              <Bot className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No workers found</p>
              <p className="text-gray-400 text-sm mt-1">Try a different search or filter</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {workers.map((worker) => (
                <Link
                  key={worker.id}
                  href={`/workers/${worker.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-indigo-600" />
                    </div>
                    <Badge variant={worker.status === 'active' ? 'default' : 'secondary'}>
                      {worker.status}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition">
                    {worker.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">{worker.industry}</p>

                  <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {worker.agency_name}
                    </span>
                    {worker.channels.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Wifi className="h-3 w-3" />
                        {worker.channels.length} channel{worker.channels.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-gray-200 bg-white px-4 py-16">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-3">
            Deploy your own AI worker
          </h2>
          <p className="text-gray-500 mb-6">
            Get your AI worker live in under 2 minutes. No credit card required.
          </p>
          <Link
            href="/solo"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl transition text-sm"
          >
            <Bot className="h-4 w-4" />
            Deploy your own AI worker — free
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
