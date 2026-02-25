'use client';

import { useEffect, useState, useCallback } from 'react';
import { Server, RefreshCw, AlertTriangle, ExternalLink, Cpu, HardDrive, MemoryStick, Boxes } from 'lucide-react';

interface VpsHealth {
  status: string;
  containers: { total: number; running: number; stopped: number };
  memory: { usagePercent: number; usedMb: number; totalMb: number; availableMb: number };
  disk: { usagePercent: number; usedMb: number; totalMb: number };
  cpus: number;
  uptime: number;
}

const SAFE_CAPACITY = 23;   // containers before needing upgrade (2 GB buffer)
const WARN_THRESHOLD = 20;  // show yellow warning at this count
const ALERT_THRESHOLD = 22; // show red alert at this count
const REFRESH_INTERVAL = 30_000; // 30 seconds

function Bar({ pct, warn = 60, danger = 80 }: { pct: number; warn?: number; danger?: number }) {
  const color =
    pct >= danger ? 'bg-red-500' :
    pct >= warn   ? 'bg-amber-500' :
                    'bg-green-500';
  return (
    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <div className="text-right">
        <span className="text-xs font-mono text-white">{value}</span>
        {sub && <span className="text-[10px] text-gray-600 ml-1">{sub}</span>}
      </div>
    </div>
  );
}

export default function MasterVpsHealth() {
  const [health, setHealth] = useState<VpsHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/master/vps-health', { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status}`);
      setHealth(await res.json());
      setLastChecked(new Date());
    } catch (e) {
      setError('VPS unreachable');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  // Auto-refresh every 30s (background — no spinner)
  useEffect(() => {
    const id = setInterval(() => fetchHealth(false), REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchHealth]);

  // ── Derived values ─────────────────────────────────────────────
  const running = health?.containers.running ?? 0;
  const stopped = health?.containers.stopped ?? 0;

  const capacityPct = Math.round((running / SAFE_CAPACITY) * 100);
  const isAtWarn   = running >= WARN_THRESHOLD;
  const isAtAlert  = running >= ALERT_THRESHOLD;
  const isHealthy  = health?.status === 'healthy' && stopped === 0;

  // Estimated avg container RAM (subtract ~500 MB OS+infra overhead)
  const avgContainerMb = running > 0 && health
    ? Math.round(Math.max(0, health.memory.usedMb - 500) / running)
    : 0;

  const uptimeSecs = health?.uptime ?? 0;
  const uptimeDays  = Math.floor(uptimeSecs / 86400);
  const uptimeHours = Math.floor((uptimeSecs % 86400) / 3600);

  const fmtMb = (mb: number) => mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;

  // ── Countdown to next refresh ──────────────────────────────────
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(REFRESH_INTERVAL / 1000);
  useEffect(() => {
    setSecondsUntilRefresh(REFRESH_INTERVAL / 1000);
    const id = setInterval(() => {
      setSecondsUntilRefresh(s => {
        if (s <= 1) return REFRESH_INTERVAL / 1000;
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [lastChecked]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Server className="h-4 w-4 text-gray-400" />
          VPS Health
          {health && (
            <span className={`ml-1 flex h-2 w-2 rounded-full ${isHealthy ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          )}
        </h3>
        <button
          onClick={() => fetchHealth()}
          title="Refresh now"
          className="text-gray-600 hover:text-gray-400 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-gray-400' : ''}`} />
        </button>
      </div>

      {/* ── Scale Alert ── */}
      {isAtAlert && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-900/30 border border-red-700/40 p-3">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-300">Scale Now</p>
            <p className="text-[10px] text-red-400 mt-0.5">
              {running}/{SAFE_CAPACITY} containers. Upgrade OVH VPS before onboarding more agencies.
            </p>
            <a
              href="https://www.ovh.com/manager/#/dedicated/vps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-red-300 hover:text-red-200 transition-colors"
            >
              Open OVH Control Panel <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>
      )}

      {isAtWarn && !isAtAlert && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-900/20 border border-amber-700/30 p-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-300">Approaching Capacity</p>
            <p className="text-[10px] text-amber-400 mt-0.5">
              {running}/{SAFE_CAPACITY} containers. Plan your VPS upgrade soon.
            </p>
          </div>
        </div>
      )}

      {loading && !health ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-3 bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <p className="text-xs text-red-400">{error}</p>
          <button onClick={() => fetchHealth()} className="mt-2 text-[10px] text-gray-500 hover:text-gray-400">
            Retry
          </button>
        </div>
      ) : health ? (
        <div className="space-y-4">

          {/* ── Container Capacity ── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <Boxes className="h-3 w-3" />
                Containers
              </span>
              <span className={`text-xs font-mono font-semibold ${
                isAtAlert ? 'text-red-400' : isAtWarn ? 'text-amber-400' : 'text-white'
              }`}>
                {running} / {SAFE_CAPACITY} safe max
              </span>
            </div>
            <Bar pct={capacityPct} warn={Math.round((WARN_THRESHOLD / SAFE_CAPACITY) * 100)} danger={Math.round((ALERT_THRESHOLD / SAFE_CAPACITY) * 100)} />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-600">{stopped > 0 ? `${stopped} stopped` : 'all healthy'}</span>
              <span className="text-[10px] text-gray-600">{SAFE_CAPACITY - running} slots free</span>
            </div>
          </div>

          {/* ── RAM ── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <MemoryStick className="h-3 w-3" />
                RAM
              </span>
              <span className="text-xs font-mono text-white">
                {fmtMb(health.memory.usedMb)} / {fmtMb(health.memory.totalMb)}
              </span>
            </div>
            <Bar pct={health.memory.usagePercent} />
            {avgContainerMb > 0 && (
              <p className="text-[10px] text-gray-600 mt-1">~{fmtMb(avgContainerMb)} per container avg</p>
            )}
          </div>

          {/* ── Disk ── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400 flex items-center gap-1.5">
                <HardDrive className="h-3 w-3" />
                Disk
              </span>
              <span className="text-xs font-mono text-white">{health.disk.usagePercent}%</span>
            </div>
            <Bar pct={health.disk.usagePercent} warn={70} danger={85} />
          </div>

          {/* ── CPU / Uptime ── */}
          <div className="pt-1 border-t border-gray-800 space-y-1.5">
            <Stat label="CPU cores" value={`${health.cpus} vCPU`} />
            <Stat
              label="Uptime"
              value={uptimeDays > 0 ? `${uptimeDays}d ${uptimeHours}h` : `${uptimeHours}h`}
            />
            <Stat label="Node limit" value="768 MB" sub="per container" />
          </div>

          {/* ── Upgrade Threshold Info ── */}
          <div className="rounded-xl bg-gray-800/60 px-3 py-2.5">
            <p className="text-[10px] text-gray-400 font-medium mb-1">Scale Trigger</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              ⚠️ Alert at <span className="text-amber-400 font-mono">{WARN_THRESHOLD}</span> containers ·
              🔴 Upgrade at <span className="text-red-400 font-mono">{ALERT_THRESHOLD}</span> containers
            </p>
            <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
              Upgrade path: OVH 32 GB VPS → supports ~75 containers
            </p>
            <a
              href="https://www.ovh.com/manager/#/dedicated/vps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              OVH Control Panel <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>

        </div>
      ) : null}

      {/* ── Footer ── */}
      {lastChecked && (
        <p className="text-[10px] text-gray-700 mt-3">
          Updated {lastChecked.toLocaleTimeString()} · refreshes in {secondsUntilRefresh}s
        </p>
      )}
    </div>
  );
}
