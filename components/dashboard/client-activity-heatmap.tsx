'use client';

import { useState, useEffect } from 'react';
import { Activity, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS_SPARSE = [0, 6, 12, 18, 23]; // hours to label

interface HeatmapResponse {
  heatmap: [number, number, number][];
  maxCount: number;
  totalMessages: number;
}

function intensity(count: number, max: number): string {
  if (count === 0 || max === 0) return 'bg-gray-100';
  const ratio = count / max;
  if (ratio < 0.2) return 'bg-indigo-100';
  if (ratio < 0.4) return 'bg-indigo-200';
  if (ratio < 0.6) return 'bg-indigo-400';
  if (ratio < 0.8) return 'bg-indigo-500';
  return 'bg-indigo-700';
}

function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

interface Props {
  clientId: string;
}

export default function ClientActivityHeatmap({ clientId }: Props) {
  const [data, setData] = useState<HeatmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/agency/clients/${clientId}/heatmap`)
      .then((r) => r.json())
      .then((d: HeatmapResponse) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [clientId]);

  // Build grid[day][hour] from sparse heatmap
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  if (data) {
    for (const [d, h, c] of data.heatmap) {
      grid[d][h] = c;
    }
  }

  const max = data?.maxCount ?? 0;

  // Find peak day + hour
  let peakDay = -1;
  let peakHour = -1;
  if (data && max > 0) {
    for (const [d, h, c] of data.heatmap) {
      if (c === max) { peakDay = d; peakHour = h; break; }
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-indigo-500" />
              Activity Heatmap
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Conversation volume by day and hour — last 7 days
            </CardDescription>
          </div>
          {data && data.totalMessages > 0 && peakDay >= 0 && (
            <div className="shrink-0 text-right">
              <div className="flex items-center gap-1 justify-end text-xs text-indigo-600 font-semibold">
                <Clock className="h-3 w-3" />
                Peak: {DAY_LABELS[peakDay]} {formatHour(peakHour)}
              </div>
              <p className="text-[10px] text-gray-400">{data.totalMessages} conversations</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="h-32 flex items-center justify-center text-sm text-gray-400">
            Loading activity data…
          </div>
        )}

        {error && (
          <div className="h-32 flex items-center justify-center text-sm text-gray-400">
            Unable to load heatmap data.
          </div>
        )}

        {!loading && !error && (data?.totalMessages ?? 0) === 0 && (
          <div className="h-32 flex flex-col items-center justify-center gap-2 text-center">
            <Activity className="h-6 w-6 text-gray-200" />
            <p className="text-sm text-gray-400">No conversations in the last 7 days.</p>
            <p className="text-xs text-gray-300">Once customers start messaging, you'll see when they're most active.</p>
          </div>
        )}

        {!loading && !error && (data?.totalMessages ?? 0) > 0 && (
          <div className="overflow-x-auto">
            <div className="min-w-[480px]">
              {/* Hour labels */}
              <div className="flex mb-1 ml-8">
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="flex-1 text-center text-[9px] text-gray-400 leading-none">
                    {HOUR_LABELS_SPARSE.includes(h) ? formatHour(h) : ''}
                  </div>
                ))}
              </div>

              {/* Grid rows */}
              {DAY_LABELS.map((day, d) => (
                <div key={d} className="flex items-center gap-0 mb-0.5">
                  <div className="w-8 text-[10px] text-gray-500 font-medium shrink-0">{day}</div>
                  {Array.from({ length: 24 }, (_, h) => {
                    const count = grid[d][h];
                    return (
                      <div
                        key={h}
                        title={count > 0 ? `${day} ${formatHour(h)}: ${count} conversation${count !== 1 ? 's' : ''}` : undefined}
                        className={`flex-1 aspect-square rounded-sm mx-px transition-colors ${intensity(count, max)}`}
                      />
                    );
                  })}
                </div>
              ))}

              {/* Legend */}
              <div className="flex items-center justify-end gap-1.5 mt-3">
                <span className="text-[10px] text-gray-400">Less</span>
                {['bg-gray-100', 'bg-indigo-100', 'bg-indigo-200', 'bg-indigo-400', 'bg-indigo-500', 'bg-indigo-700'].map((cls) => (
                  <div key={cls} className={`h-3 w-3 rounded-sm ${cls}`} />
                ))}
                <span className="text-[10px] text-gray-400">More</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
