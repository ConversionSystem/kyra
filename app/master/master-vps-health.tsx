'use client';

import { useEffect, useState } from 'react';
import { Server, RefreshCw } from 'lucide-react';

interface VpsHealth {
  status: string;
  containers: { total: number; running: number; stopped: number };
  memory: { usagePercent: number; usedMb: number; totalMb: number };
  disk: { usagePercent: number };
  uptime: number;
}

export default function MasterVpsHealth() {
  const [health, setHealth] = useState<VpsHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/master/vps-health');
      if (res.ok) {
        setHealth(await res.json());
        setLastChecked(new Date());
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHealth(); }, []);

  const isHealthy = health?.status === 'healthy' && (health.containers.stopped === 0);
  const uptimeHours = health ? Math.floor(health.uptime / 3600) : 0;
  const uptimeDays = Math.floor(uptimeHours / 24);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Server className="h-4 w-4 text-gray-400" />
          VPS Health
        </h3>
        <button onClick={fetchHealth} className="text-gray-600 hover:text-gray-400 transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !health ? (
        <div className="space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-3 bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      ) : health ? (
        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Status</span>
            <span className={`flex items-center gap-1.5 text-xs font-semibold ${isHealthy ? 'text-green-400' : 'text-red-400'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isHealthy ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {isHealthy ? 'Healthy' : 'Degraded'}
            </span>
          </div>

          {/* Containers */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Containers</span>
            <span className="text-xs font-mono text-white">
              {health.containers.running}/{health.containers.total} running
            </span>
          </div>

          {/* Memory */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">RAM</span>
              <span className="text-xs font-mono text-white">{health.memory.usagePercent}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  health.memory.usagePercent > 80 ? 'bg-red-500' :
                  health.memory.usagePercent > 60 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${health.memory.usagePercent}%` }}
              />
            </div>
          </div>

          {/* Disk */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Disk</span>
              <span className="text-xs font-mono text-white">{health.disk.usagePercent}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  health.disk.usagePercent > 80 ? 'bg-red-500' :
                  health.disk.usagePercent > 60 ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: `${health.disk.usagePercent}%` }}
              />
            </div>
          </div>

          {/* Uptime */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-800">
            <span className="text-xs text-gray-400">Uptime</span>
            <span className="text-xs text-gray-300 font-mono">
              {uptimeDays > 0 ? `${uptimeDays}d ${uptimeHours % 24}h` : `${uptimeHours}h`}
            </span>
          </div>

          {lastChecked && (
            <p className="text-[10px] text-gray-700">
              Checked {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-500">VPS unreachable</p>
      )}
    </div>
  );
}
