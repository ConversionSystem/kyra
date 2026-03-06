'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Heart, Activity, MessageSquare, AlertTriangle,
  ExternalLink, Check, X, Pencil,
} from 'lucide-react';
import type { AgencyClient } from '@/lib/agency/types';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

type HeartbeatStatus = 'active' | 'idle' | 'offline';

function getStatus(client: AgencyClient): { status: HeartbeatStatus; dot: string; label: string } {
  if (!client.gateway_status || client.gateway_status === 'error') {
    return { status: 'offline', dot: 'bg-red-400', label: 'Offline' };
  }
  if (client.gateway_status === 'running' && client.usage_this_month > 0) {
    return { status: 'active', dot: 'bg-green-400', label: 'Active' };
  }
  return { status: 'idle', dot: 'bg-yellow-400', label: 'Idle' };
}

const statusBadgeColors: Record<HeartbeatStatus, string> = {
  active: 'border-green-200 bg-green-50 text-green-700',
  idle: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  offline: 'border-red-200 bg-red-50 text-red-700',
};

function NorthStarEditor({ client }: { client: AgencyClient }) {
  const settings = (client.settings ?? {}) as Record<string, unknown>;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState((settings.north_star as string) || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState((settings.north_star as string) || '');

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/agency/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { north_star: value } }),
      });
      if (res.ok) {
        setSaved(value);
        setEditing(false);
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Set this client's North Star goal..."
          className="text-xs h-8 bg-white"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditing(false); setValue(saved); } }}
        />
        <button onClick={handleSave} disabled={saving} className="p-1 rounded hover:bg-green-50 text-green-600">
          <Check className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => { setEditing(false); setValue(saved); }} className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors group"
    >
      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className={saved ? 'text-gray-600' : 'italic'}>
        {saved || "Set this client's North Star goal..."}
      </span>
    </button>
  );
}

interface HeartbeatClientProps {
  clients: AgencyClient[];
}

export function HeartbeatClient({ clients }: HeartbeatClientProps) {
  const totalActive = clients.filter(c => c.gateway_status === 'running').length;
  const totalConversations = clients.reduce((sum, c) => sum + c.usage_this_month, 0);
  const silentClients = clients.filter(c => c.gateway_status === 'running' && c.usage_this_month === 0).length;

  const stats = [
    { label: 'Active Clients', value: totalActive, icon: Activity, color: 'text-green-600 bg-green-50' },
    { label: 'Conversations This Month', value: totalConversations, icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
    { label: 'Silent Clients', value: silentClients, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Heart className="h-6 w-6 text-red-500" />
          Heartbeat Protocol
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor your AI workers — 24/7 activity at a glance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Client grid */}
      {clients.length === 0 ? (
        <Card>
          <CardContent className="p-4 sm:p-6 lg:p-8 text-center">
            <p className="text-gray-400">No clients yet. Add your first client to start monitoring.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((client) => {
            const { status, dot, label } = getStatus(client);
            return (
              <Card key={client.id} className="hover:border-gray-300 transition-colors">
                <CardContent className="p-5">
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-700 shrink-0">
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/agency/clients/${client.id}`} className="font-medium text-gray-900 hover:text-indigo-600 transition-colors truncate block">
                          {client.name}
                        </Link>
                        <p className="text-[10px] text-gray-400">{client.industry || 'No industry'}</p>
                      </div>
                    </div>
                    <Badge className={statusBadgeColors[status]}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot} mr-1.5`} />
                      {label}
                    </Badge>
                  </div>

                  {/* North Star */}
                  <NorthStarEditor client={client} />

                  {/* Stats row */}
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span><strong className="text-gray-700">{client.usage_this_month}</strong> conversations</span>
                    </div>
                    <span>{timeAgo(client.updated_at || client.created_at)}</span>
                  </div>

                  {/* Gateway link */}
                  {client.gateway_url && (
                    <a
                      href={client.gateway_token
                        ? `${client.gateway_url}?token=${client.gateway_token}`
                        : client.gateway_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open Terminal
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
