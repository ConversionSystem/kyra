'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare, Zap, Clock, BarChart3, ArrowRight,
  Shield, Users, ChevronRight, Building2, ExternalLink,
} from 'lucide-react';

interface Props {
  client: {
    id: string;
    name: string;
    industry: string;
    status: string;
    gateway_status: string | null;
    usage_this_month: number;
    agency_id: string;
    settings: Record<string, unknown>;
    container_config: Record<string, unknown>;
    created_at: string;
  };
  agency: { id: string; name: string; settings: Record<string, unknown> } | null;
  branding: { name: string; logoUrl: string | null; primaryColor: string };
  role: string;
  isAgencyMember: boolean;
  userEmail: string;
}

export default function PortalDashboard({ client, agency, branding, role, isAgencyMember, userEmail }: Props) {
  const isRunning = client.gateway_status === 'running';
  const persona = client.container_config?.persona as string | undefined;
  const northStar = client.settings?.north_star as string | undefined;

  const stats = [
    {
      label: 'Conversations this month',
      value: client.usage_this_month.toLocaleString(),
      icon: MessageSquare,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'AI Status',
      value: isRunning ? 'Online' : 'Offline',
      icon: Zap,
      color: isRunning ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50',
    },
    {
      label: 'Hours saved (est.)',
      value: `${Math.round(client.usage_this_month * 0.05 * 10) / 10}h`,
      icon: Clock,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Resolution rate',
      value: '97%',
      icon: BarChart3,
      color: 'text-emerald-600 bg-emerald-50',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={branding.name} className="h-8 object-contain" />
            ) : (
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: branding.primaryColor }}
              >
                {branding.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold text-gray-900">{branding.name}</h1>
              <p className="text-xs text-gray-400">AI Performance Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:block">{userEmail}</span>
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
              role === 'owner' ? 'bg-indigo-100 text-indigo-700' :
              role === 'admin' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {role}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">

        {/* ── Client Name + Status ── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-gray-900">{client.name}</h2>
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
              isRunning ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              {isRunning ? 'AI Active' : 'Inactive'}
            </span>
          </div>
          {northStar && (
            <p className="text-sm text-gray-500">🎯 {northStar}</p>
          )}
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
              <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* ── AI Profile ── */}
        {persona && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-600" />
              About your AI Employee
            </h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed line-clamp-6">
              {persona}
            </p>
          </div>
        )}

        {/* ── Recent Performance (link to report) ── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              Performance Report
            </h3>
            <Link
              href={`/report/${client.id}`}
              target="_blank"
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Full report <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Avg Response', value: '< 60s' },
              { label: 'This Month', value: `${client.usage_this_month} convs` },
              { label: 'Active Since', value: new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-sm font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Agency Contact ── */}
        {agency && !isAgencyMember && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 flex items-center gap-4">
            <div className="rounded-xl bg-indigo-600 p-2.5 shrink-0">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-indigo-900">Managed by {agency.name}</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                For changes to your AI, contact your agency.
              </p>
            </div>
          </div>
        )}

        {/* ── Agency Member: back to full dashboard ── */}
        {isAgencyMember && (
          <div className="mt-4">
            <Link
              href={`/agency/clients/${client.id}`}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <ArrowRight className="h-4 w-4" />
              Open full agency view for this client
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
