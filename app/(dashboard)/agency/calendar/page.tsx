'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  User,
  Phone,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Booking {
  id: string;
  client_id: string;
  contact_name: string | null;
  contact_phone: string | null;
  service: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  booked_via: 'ai' | 'manual' | 'widget';
  agency_clients?: { name: string };
}

interface ClientOption {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-gray-100 text-gray-600',
};

export default function AgencyCalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      if (selectedClient) params.set('clientId', selectedClient);

      const res = await fetch(`/api/agency/calendar?${params}`);
      const data = await res.json();
      setBookings(data.bookings || []);
      setClients(data.clients || []);
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
    } finally {
      setLoading(false);
    }
  }, [currentDate, selectedClient]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Today's bookings for sidebar
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysBookings = bookings.filter(
    (b) => new Date(b.start_time).toISOString().split('T')[0] === todayStr && b.status !== 'cancelled',
  );

  // Stats
  const totalActive = bookings.filter((b) => b.status !== 'cancelled').length;
  const aiBooked = bookings.filter((b) => b.booked_via === 'ai').length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            Agency Calendar
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">All appointments across your clients</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Calendar Area */}
        <div className="lg:col-span-3">
          {/* Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() - 7);
                  setCurrentDate(d);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-gray-700 min-w-[180px] text-center">
                {formatWeekRange(currentDate)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() + 7);
                  setCurrentDate(d);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                className="text-xs text-indigo-600"
              >
                This Week
              </Button>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{totalActive} appointments</span>
              <span className="flex items-center gap-1">
                <Bot className="h-3 w-3 text-purple-500" />
                {aiBooked} AI-booked
              </span>
            </div>
          </div>

          {/* Bookings */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No appointments this week</p>
            </div>
          ) : (
            <div className="space-y-1">
              {groupByDay(bookings).map(([dateKey, dayBookings]) => (
                <div key={dateKey}>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4 first:mt-0">
                    {formatDay(dateKey)}
                  </div>
                  {dayBookings.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition mb-1.5"
                    >
                      <div className="text-center shrink-0 w-14">
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(b.start_time).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-[10px] text-gray-400">{b.duration_minutes}min</p>
                      </div>
                      <div className="w-0.5 h-8 bg-indigo-200 rounded-full shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {b.contact_name || 'Unknown'}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[b.status]}`}
                          >
                            {b.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                          {b.agency_clients && (
                            <Link
                              href={`/agency/clients/${b.client_id}?tab=settings`}
                              className="text-indigo-500 hover:underline"
                            >
                              {(b.agency_clients as any).name}
                            </Link>
                          )}
                          {b.service && <span>· {b.service}</span>}
                          {b.booked_via === 'ai' && (
                            <span className="flex items-center gap-0.5 text-purple-500">
                              <Bot className="h-3 w-3" /> AI
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Schedule Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-500" />
                Today&apos;s Schedule
              </h3>
              {todaysBookings.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">No appointments today</p>
              ) : (
                <div className="space-y-2">
                  {todaysBookings
                    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                    .map((b) => (
                      <div
                        key={b.id}
                        className="p-2.5 rounded-lg bg-gray-50 border border-gray-100"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-900">
                            {new Date(b.start_time).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1 py-0 ${STATUS_COLORS[b.status]}`}
                          >
                            {b.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-700 mt-1 truncate">
                          {b.contact_name || 'Unknown'}
                        </p>
                        {b.service && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{b.service}</p>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatWeekRange(date: Date): string {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function groupByDay(bookings: Booking[]): [string, Booking[]][] {
  const groups = new Map<string, Booking[]>();
  for (const b of bookings) {
    const key = new Date(b.start_time).toISOString().split('T')[0];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(b);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function formatDay(dateKey: string): string {
  const date = new Date(dateKey + 'T12:00:00');
  const today = new Date().toISOString().split('T')[0];
  if (dateKey === today) return 'Today';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}
