'use client';

import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

interface GrowthChartProps {
  agencies: Array<{ id: string; created_at: string; type: 'solo' | 'agency' }>;
  days?: number;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function GrowthChart({ agencies, days = 30 }: GrowthChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // Sort agencies by creation date
    const sorted = [...agencies].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Build daily buckets
    const dailyData: Array<{
      date: string;
      newTotal: number;
      newSolo: number;
      newAgency: number;
      cumTotal: number;
      cumSolo: number;
      cumAgency: number;
    }> = [];

    // Count agencies before start date for cumulative baseline
    let cumTotal = sorted.filter(a => new Date(a.created_at) < startDate).length;
    let cumSolo = sorted.filter(a => new Date(a.created_at) < startDate && a.type === 'solo').length;
    let cumAgency = cumTotal - cumSolo;

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = formatDate(d);

      const daySignups = sorted.filter(a => formatDate(new Date(a.created_at)) === dateStr);
      const daySolo = daySignups.filter(a => a.type === 'solo').length;
      const dayAgency = daySignups.length - daySolo;

      cumTotal += daySignups.length;
      cumSolo += daySolo;
      cumAgency += dayAgency;

      dailyData.push({
        date: dateStr,
        newTotal: daySignups.length,
        newSolo: daySolo,
        newAgency: dayAgency,
        cumTotal,
        cumSolo,
        cumAgency,
      });
    }

    return dailyData;
  }, [agencies, days]);

  const maxCum = Math.max(...chartData.map(d => d.cumTotal), 1);
  const maxDaily = Math.max(...chartData.map(d => d.newTotal), 1);
  const totalNew = chartData.reduce((s, d) => s + d.newTotal, 0);
  const latestCum = chartData[chartData.length - 1]?.cumTotal ?? 0;
  const prevWeekCum = chartData[Math.max(chartData.length - 8, 0)]?.cumTotal ?? 0;
  const weekGrowth = prevWeekCum > 0 ? ((latestCum - prevWeekCum) / prevWeekCum * 100).toFixed(0) : '∞';

  // SVG chart dimensions
  const W = 600;
  const H = 160;
  const PAD_L = 0;
  const PAD_R = 0;
  const PAD_T = 10;
  const PAD_B = 25;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  // Cumulative line points
  const cumPoints = chartData.map((d, i) => {
    const x = PAD_L + (i / (chartData.length - 1)) * plotW;
    const y = PAD_T + plotH - (d.cumTotal / maxCum) * plotH;
    return { x, y, ...d };
  });

  const cumPath = cumPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${cumPath} L${cumPoints[cumPoints.length - 1].x.toFixed(1)},${PAD_T + plotH} L${cumPoints[0].x.toFixed(1)},${PAD_T + plotH} Z`;

  // X-axis labels (show every 5th day)
  const xLabels = chartData
    .filter((_, i) => i % 5 === 0 || i === chartData.length - 1)
    .map((d, _, arr) => {
      const idx = chartData.indexOf(d);
      const x = PAD_L + (idx / (chartData.length - 1)) * plotW;
      return { x, label: shortDate(d.date) };
    });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          Growth — Last {days} Days
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500">
            +{totalNew} new · {latestCum} total · <span className="text-emerald-400">+{weekGrowth}% this week</span>
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-px bg-gray-800">
        <div className="bg-gray-900 px-4 py-2.5 text-center">
          <p className="text-lg font-bold text-white">{latestCum}</p>
          <p className="text-[10px] text-gray-500">Total Accounts</p>
        </div>
        <div className="bg-gray-900 px-4 py-2.5 text-center">
          <p className="text-lg font-bold text-emerald-400">+{totalNew}</p>
          <p className="text-[10px] text-gray-500">New ({days}d)</p>
        </div>
        <div className="bg-gray-900 px-4 py-2.5 text-center">
          <p className="text-lg font-bold text-indigo-400">+{weekGrowth}%</p>
          <p className="text-[10px] text-gray-500">Weekly Growth</p>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="px-4 py-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {[0.25, 0.5, 0.75].map(pct => {
            const y = PAD_T + plotH - pct * plotH;
            return (
              <line key={pct} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke="rgb(31,41,55)" strokeWidth="0.5" strokeDasharray="4,4" />
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#growthGrad)" opacity="0.3" />

          {/* Cumulative line */}
          <path d={cumPath} fill="none" stroke="rgb(52,211,153)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Daily bars */}
          {chartData.map((d, i) => {
            if (d.newTotal === 0) return null;
            const x = PAD_L + (i / (chartData.length - 1)) * plotW;
            const barH = Math.max(2, (d.newTotal / maxDaily) * (plotH * 0.3));
            return (
              <rect key={i} x={x - 3} y={PAD_T + plotH - barH} width={6} height={barH}
                rx={1.5} fill="rgb(99,102,241)" opacity="0.6" />
            );
          })}

          {/* Endpoint dot */}
          {cumPoints.length > 0 && (
            <circle cx={cumPoints[cumPoints.length - 1].x} cy={cumPoints[cumPoints.length - 1].y}
              r="3.5" fill="rgb(52,211,153)" stroke="rgb(17,24,39)" strokeWidth="2" />
          )}

          {/* X labels */}
          {xLabels.map(({ x, label }) => (
            <text key={label} x={x} y={H - 4} textAnchor="middle"
              className="fill-gray-600 text-[9px]" style={{ fontSize: '9px' }}>
              {label}
            </text>
          ))}

          {/* Gradient def */}
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(52,211,153)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="rgb(52,211,153)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="h-0.5 w-4 bg-emerald-400 rounded" />
            <span className="text-[10px] text-gray-500">Cumulative accounts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 bg-indigo-500 rounded-sm opacity-60" />
            <span className="text-[10px] text-gray-500">Daily signups</span>
          </div>
        </div>
      </div>
    </div>
  );
}
