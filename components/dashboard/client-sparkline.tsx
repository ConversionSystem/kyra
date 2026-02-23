'use client';

import { useState, useEffect } from 'react';

interface SparklineData {
  counts: number[];
  trend: 'up' | 'down' | 'flat';
}

interface Props {
  clientId: string;
  className?: string;
}

function SparklineSvg({ counts, trend }: { counts: number[]; trend: string }) {
  const width = 80;
  const height = 20;
  const max = Math.max(...counts, 1);

  if (max === 0 || counts.every((c) => c === 0)) {
    // Flat line at mid-height for zero data
    return (
      <svg width={width} height={height} className="overflow-visible">
        <line x1={0} y1={height / 2} x2={width} y2={height / 2}
          stroke="#e5e7eb" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    );
  }

  const pts = counts.map((v, i) => {
    const x = (i / (counts.length - 1)) * width;
    const y = height - (v / max) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const strokeColor =
    trend === 'up' ? '#4f46e5' :  // indigo
    trend === 'down' ? '#f59e0b' : // amber
    '#9ca3af';                      // gray

  const fillColor =
    trend === 'up' ? '#eef2ff' :
    trend === 'down' ? '#fffbeb' :
    '#f3f4f6';

  // Build fill path (close below the line)
  const lastPt = counts.map((v, i) => {
    const x = (i / (counts.length - 1)) * width;
    const y = height - (v / max) * (height - 2) - 1;
    return { x, y };
  });
  const fillPath =
    `M ${lastPt[0].x.toFixed(1)} ${height} ` +
    lastPt.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
    ` L ${lastPt[lastPt.length - 1].x.toFixed(1)} ${height} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={fillPath} fill={fillColor} opacity={0.5} />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot at latest value */}
      <circle
        cx={lastPt[lastPt.length - 1].x}
        cy={lastPt[lastPt.length - 1].y}
        r={2.5}
        fill={strokeColor}
      />
    </svg>
  );
}

export default function ClientSparkline({ clientId, className = '' }: Props) {
  const [data, setData] = useState<SparklineData | null>(null);

  useEffect(() => {
    fetch(`/api/agency/clients/${clientId}/sparkline`)
      .then((r) => r.json())
      .then((d: SparklineData) => setData(d))
      .catch(() => {
        // silent fail — sparkline is purely decorative
      });
  }, [clientId]);

  if (!data) {
    // Loading placeholder — tiny gray bar
    return (
      <div className={`h-5 w-20 rounded bg-gray-100 animate-pulse ${className}`} />
    );
  }

  const trendIcon =
    data.trend === 'up' ? '↑' :
    data.trend === 'down' ? '↓' :
    '→';

  const trendColor =
    data.trend === 'up' ? 'text-indigo-500' :
    data.trend === 'down' ? 'text-amber-500' :
    'text-gray-400';

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <SparklineSvg counts={data.counts} trend={data.trend} />
      <span className={`text-[10px] font-bold ${trendColor}`}>{trendIcon}</span>
    </div>
  );
}
