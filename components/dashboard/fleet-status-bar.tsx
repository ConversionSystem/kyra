'use client';

import { Activity, AlertTriangle, Pause, CheckCircle2 } from 'lucide-react';

interface FleetClient {
  id: string;
  name: string;
  status: string | null;
  lastActive: string | null;
}

interface FleetStatusBarProps {
  clients: FleetClient[];
}

export function FleetStatusBar({ clients }: FleetStatusBarProps) {
  if (clients.length === 0) return null;

  const running = clients.filter(c => c.status === 'running').length;
  const errors = clients.filter(c => c.status === 'error' || c.status === null).length;
  const starting = clients.filter(c => c.status === 'starting' || c.status === 'provisioning').length;
  const total = clients.length;

  // Stale = running but no activity in 24h
  const stale = clients.filter(c => {
    if (c.status !== 'running' || !c.lastActive) return false;
    return Date.now() - new Date(c.lastActive).getTime() > 86400000;
  }).length;

  const healthPct = total > 0 ? Math.round((running / total) * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-semibold text-gray-900">Fleet Status</h3>
        <span className="ml-auto text-xs text-gray-400">{total} worker{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Status bar */}
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
        {running > 0 && (
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${(running / total) * 100}%` }}
            title={`${running} running`}
          />
        )}
        {starting > 0 && (
          <div
            className="h-full bg-amber-400 transition-all"
            style={{ width: `${(starting / total) * 100}%` }}
            title={`${starting} starting`}
          />
        )}
        {errors > 0 && (
          <div
            className="h-full bg-red-400 transition-all"
            style={{ width: `${(errors / total) * 100}%` }}
            title={`${errors} error`}
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          <span className="text-xs text-gray-600">{running} healthy</span>
        </div>
        {stale > 0 && (
          <div className="flex items-center gap-1.5">
            <Pause className="h-3 w-3 text-amber-500" />
            <span className="text-xs text-amber-600">{stale} silent 24h+</span>
          </div>
        )}
        {starting > 0 && (
          <div className="flex items-center gap-1.5">
            <Pause className="h-3 w-3 text-amber-400" />
            <span className="text-xs text-gray-600">{starting} starting</span>
          </div>
        )}
        {errors > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-red-500" />
            <span className="text-xs text-red-600">{errors} need attention</span>
          </div>
        )}
        <span className="ml-auto text-xs font-medium text-gray-500">{healthPct}% fleet health</span>
      </div>
    </div>
  );
}
