'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, MessageSquare, Zap, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface AnalyticsData {
  dailyMessages: { date: string; count: number }[];
  channelBreakdown: Record<string, number>;
  topConversations: { id: string; title: string; channel: string; messageCount: number }[];
  totalMessages: number;
  usage: { used: number; limit: number; plan: string };
}

const CHANNEL_COLORS: Record<string, string> = {
  web: '#8b5cf6',
  telegram: '#3b82f6',
  whatsapp: '#22c55e',
  slack: '#f59e0b',
  email: '#ef4444',
};

export default function UsagePage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen text-zinc-400">
        Failed to load analytics
      </div>
    );
  }

  const maxMessages = Math.max(...data.dailyMessages.map((d) => d.count), 1);
  const usagePercent = Math.min((data.usage.used / data.usage.limit) * 100, 100);
  const totalChannelMessages = Object.values(data.channelBreakdown).reduce((a, b) => a + b, 0) || 1;

  // Circular progress
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (usagePercent / 100) * circumference;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usage & Analytics</h1>
        <p className="text-zinc-400 text-sm mt-1">Your activity over the last 30 days</p>
      </div>

      {/* Top row: Credits + Plan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Credits circle */}
        <Card>
          <CardContent className="p-6 flex flex-col items-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#27272a" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r={radius} fill="none"
                  stroke={usagePercent > 90 ? '#ef4444' : usagePercent > 70 ? '#f59e0b' : '#8b5cf6'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{data.usage.used}</span>
                <span className="text-xs text-zinc-500">/ {data.usage.limit}</span>
              </div>
            </div>
            <p className="text-sm text-zinc-400 mt-3">Credits this month</p>
          </CardContent>
        </Card>

        {/* Plan info */}
        <Card>
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-violet-400" />
                <span className="text-sm text-zinc-400">Current Plan</span>
              </div>
              <h2 className="text-xl font-bold capitalize">{data.usage.plan}</h2>
              <p className="text-sm text-zinc-500 mt-1">
                {data.usage.limit - data.usage.used} credits remaining
              </p>
            </div>
            {data.usage.plan === 'free' && (
              <Link href="/settings">
                <Button className="w-full mt-4 bg-violet-600 hover:bg-violet-500 text-white" size="sm">
                  Upgrade Plan
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        {/* Quick stats */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{data.totalMessages}</p>
                <p className="text-xs text-zinc-500">Messages (30d)</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{data.topConversations.length}</p>
                <p className="text-xs text-zinc-500">Active conversations</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-lg font-bold">~1.2s</p>
                <p className="text-xs text-zinc-500">Avg response time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-violet-400" />
            Messages per day
          </CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-[2px] h-40">
            {data.dailyMessages.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                <div
                  className="w-full bg-violet-500/80 rounded-t transition-all duration-300 hover:bg-violet-400 min-h-[2px]"
                  style={{ height: `${Math.max((d.count / maxMessages) * 100, 2)}%` }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-zinc-800 text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {d.date.slice(5)}: {d.count}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-zinc-600">
            <span>{data.dailyMessages[0]?.date.slice(5)}</span>
            <span>{data.dailyMessages[data.dailyMessages.length - 1]?.date.slice(5)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Bottom row: channels + top convos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Channel breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channel Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(data.channelBreakdown).length === 0 ? (
              <p className="text-sm text-zinc-500">No messages yet</p>
            ) : (
              <div className="space-y-3">
                {/* Simple donut via SVG */}
                <div className="flex justify-center">
                  <svg viewBox="0 0 120 120" className="w-32 h-32">
                    {(() => {
                      let offset = 0;
                      return Object.entries(data.channelBreakdown).map(([channel, count]) => {
                        const pct = count / totalChannelMessages;
                        const dash = pct * circumference;
                        const el = (
                          <circle
                            key={channel}
                            cx="60" cy="60" r={radius} fill="none"
                            stroke={CHANNEL_COLORS[channel] || '#71717a'}
                            strokeWidth="12"
                            strokeDasharray={`${dash} ${circumference - dash}`}
                            strokeDashoffset={-offset}
                            className="-rotate-90 origin-center"
                          />
                        );
                        offset += dash;
                        return el;
                      });
                    })()}
                  </svg>
                </div>
                <div className="space-y-2">
                  {Object.entries(data.channelBreakdown).map(([channel, count]) => (
                    <div key={channel} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: CHANNEL_COLORS[channel] || '#71717a' }}
                        />
                        <span className="capitalize text-zinc-300">{channel}</span>
                      </div>
                      <span className="text-zinc-500">{count} ({Math.round((count / totalChannelMessages) * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top conversations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topConversations.length === 0 ? (
              <p className="text-sm text-zinc-500">No conversations yet</p>
            ) : (
              <div className="space-y-2">
                {data.topConversations.map((conv, i) => (
                  <Link
                    key={conv.id}
                    href={`/chat/${conv.id}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-zinc-800 transition-colors"
                  >
                    <span className="text-xs text-zinc-600 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{conv.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {conv.channel}
                        </Badge>
                        <span className="text-[10px] text-zinc-500">{conv.messageCount} messages</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
