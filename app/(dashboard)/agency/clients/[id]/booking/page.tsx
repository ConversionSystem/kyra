'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Phone,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface Booking {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  service: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  booked_via: 'ai' | 'manual' | 'widget';
  notes: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
};

const VIA_LABELS: Record<string, string> = {
  ai: '🤖 AI',
  manual: '👤 Manual',
  widget: '🔗 Widget',
};

export default function ClientBookingPage() {
  const { id: clientId } = useParams<{ id: string }>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(currentDate, view);
      const res = await fetch(
        `/api/agency/clients/${clientId}/bookings?startDate=${startDate}&endDate=${endDate}`,
      );
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, currentDate, view]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Stats
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const thisWeekBookings = bookings.filter((b) => {
    const d = new Date(b.start_time);
    return d >= weekStart && d < weekEnd;
  });

  const cancelledThisWeek = thisWeekBookings.filter((b) => b.status === 'cancelled').length;
  const cancellationRate = thisWeekBookings.length > 0
    ? Math.round((cancelledThisWeek / thisWeekBookings.length) * 100)
    : 0;

  const daysInRange = view === 'week' ? 7 : 30;
  const avgPerDay = bookings.length > 0
    ? (bookings.filter((b) => b.status !== 'cancelled').length / daysInRange).toFixed(1)
    : '0';

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/agency/clients/${clientId}`}
            className="text-gray-400 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Booking Calendar
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage appointments and bookings</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Quick Add
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="This Week"
          value={thisWeekBookings.filter((b) => b.status !== 'cancelled').length}
          icon={<Calendar className="h-4 w-4 text-indigo-500" />}
        />
        <StatCard
          label="Cancellation Rate"
          value={`${cancellationRate}%`}
          icon={<XCircle className="h-4 w-4 text-red-400" />}
        />
        <StatCard
          label="Avg / Day"
          value={avgPerDay}
          icon={<Clock className="h-4 w-4 text-emerald-500" />}
        />
        <StatCard
          label="AI Booked"
          value={bookings.filter((b) => b.booked_via === 'ai').length}
          icon={<CheckCircle2 className="h-4 w-4 text-purple-500" />}
        />
      </div>

      {/* View Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center">
            {formatDateRange(currentDate, view)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
            className="text-xs text-indigo-600"
          >
            Today
          </Button>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No bookings in this period</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setShowAddForm(true)}
          >
            Add First Booking
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {groupBookingsByDay(bookings).map(([dateKey, dayBookings]) => (
            <div key={dateKey}>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">
                {formatDayHeader(dateKey)}
              </div>
              <div className="space-y-2">
                {dayBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    clientId={clientId}
                    onUpdate={fetchBookings}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Add Modal */}
      {showAddForm && (
        <QuickAddBooking
          clientId={clientId}
          onClose={() => setShowAddForm(false)}
          onCreated={() => {
            setShowAddForm(false);
            fetchBookings();
          }}
        />
      )}
    </div>
  );

  function navigate(direction: number) {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  }
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}

function BookingCard({
  booking,
  clientId,
  onUpdate,
}: {
  booking: Booking;
  clientId: string;
  onUpdate: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);

  const startTime = new Date(booking.start_time);
  const endTime = new Date(booking.end_time);

  const handleCancel = async () => {
    if (!confirm('Cancel this booking?')) return;
    setCancelling(true);
    try {
      await fetch(`/api/agency/clients/${clientId}/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      onUpdate();
    } catch (err) {
      console.error('Cancel failed:', err);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition group">
      {/* Time */}
      <div className="text-center shrink-0 w-16">
        <p className="text-sm font-semibold text-gray-900">
          {startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </p>
        <p className="text-[10px] text-gray-400">
          {booking.duration_minutes}min
        </p>
      </div>

      {/* Divider */}
      <div className="w-0.5 h-10 bg-indigo-200 rounded-full shrink-0" />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">
            {booking.contact_name || 'Unknown Contact'}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[booking.status]}`}
          >
            {booking.status}
          </Badge>
          <span className="text-[10px] text-gray-400">
            {VIA_LABELS[booking.booked_via]}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {booking.service && (
            <span className="text-xs text-gray-500">{booking.service}</span>
          )}
          {booking.contact_phone && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {booking.contact_phone}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {booking.status === 'confirmed' && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 transition-opacity"
        >
          {cancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Cancel'}
        </button>
      )}
    </div>
  );
}

function QuickAddBooking({
  clientId,
  onClose,
  onCreated,
}: {
  clientId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    contact_name: '',
    contact_phone: '',
    service: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    duration_minutes: 60,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const startTime = new Date(`${form.date}T${form.time}`);
    const endTime = new Date(startTime.getTime() + form.duration_minutes * 60_000);

    try {
      const res = await fetch(`/api/agency/clients/${clientId}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: form.contact_name,
          contact_phone: form.contact_phone,
          service: form.service || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: form.duration_minutes,
          notes: form.notes || null,
        }),
      });
      if (res.ok) onCreated();
    } catch (err) {
      console.error('Create booking failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Add Booking</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Contact Name *"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            required
          />
          <Input
            placeholder="Phone Number"
            value={form.contact_phone}
            onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
          />
          <Input
            placeholder="Service (optional)"
            value={form.service}
            onChange={(e) => setForm({ ...form, service: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
            <Input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              required
            />
          </div>
          <select
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes</option>
            <option value={90}>90 minutes</option>
          </select>
          <Input
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Booking'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(date: Date, view: 'week' | 'month') {
  const start = new Date(date);
  const end = new Date(date);

  if (view === 'week') {
    start.setDate(start.getDate() - start.getDay());
    end.setDate(start.getDate() + 7);
  } else {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

function formatDateRange(date: Date, view: 'week' | 'month'): string {
  if (view === 'month') {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function groupBookingsByDay(bookings: Booking[]): [string, Booking[]][] {
  const groups = new Map<string, Booking[]>();
  for (const b of bookings) {
    const key = new Date(b.start_time).toISOString().split('T')[0];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(b);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function formatDayHeader(dateKey: string): string {
  const date = new Date(dateKey + 'T12:00:00');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateKey === today.toISOString().split('T')[0]) return 'Today';
  if (dateKey === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
