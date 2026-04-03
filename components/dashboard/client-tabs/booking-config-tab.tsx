'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  Clock,
  Save,
  Loader2,
  Plus,
  X,
  ExternalLink,
  CheckCircle2,
  Bot,
} from 'lucide-react';
import Link from 'next/link';

interface DaySchedule {
  start: string;
  end: string;
  enabled: boolean;
}

interface BookingConfigData {
  enabled: boolean;
  available_hours: Record<string, DaySchedule>;
  timezone: string;
  appointment_duration: number;
  buffer_minutes: number;
  services: string[];
  confirmation_template: string;
  booking_link: string | null;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
  'Europe/London', 'Europe/Berlin', 'Europe/Bratislava',
  'Asia/Tokyo', 'Australia/Sydney',
];

export default function BookingConfigTab({ clientId }: { clientId: string }) {
  const [config, setConfig] = useState<BookingConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newService, setNewService] = useState('');

  useEffect(() => {
    fetchConfig();
  }, [clientId]);

  async function fetchConfig() {
    try {
      const res = await fetch(`/api/agency/clients/${clientId}/booking-config`);
      const data = await res.json();
      setConfig(data.config);
    } catch (err) {
      console.error('Failed to fetch booking config:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch(`/api/agency/clients/${clientId}/booking-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save booking config:', err);
    } finally {
      setSaving(false);
    }
  }

  function addService() {
    if (!config || !newService.trim()) return;
    setConfig({ ...config, services: [...config.services, newService.trim()] });
    setNewService('');
  }

  function removeService(index: number) {
    if (!config) return;
    setConfig({ ...config, services: config.services.filter((_, i) => i !== index) });
  }

  function updateDayHours(day: string, field: keyof DaySchedule, value: string | boolean) {
    if (!config) return;
    setConfig({
      ...config,
      available_hours: {
        ...config.available_hours,
        [day]: { ...config.available_hours[day], [field]: value },
      },
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Enable Toggle */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Bot className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">AI Booking via Conversation</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  When enabled, the AI can book appointments automatically during customer conversations
                </p>
              </div>
            </div>
            <button
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                config.enabled ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                  config.enabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* View Calendar Link */}
      <div className="flex justify-end">
        <Link
          href={`/agency/clients/${clientId}/booking`}
          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          <Calendar className="h-3.5 w-3.5" />
          View Booking Calendar
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Available Hours */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            Available Hours
          </CardTitle>
          <CardDescription className="text-xs">
            Set when customers can book appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {DAYS.map((day) => {
            const schedule = config.available_hours[day];
            return (
              <div key={day} className="flex items-center gap-3">
                <label className="flex items-center gap-2 w-16 shrink-0">
                  <input
                    type="checkbox"
                    checked={schedule?.enabled ?? false}
                    onChange={(e) => updateDayHours(day, 'enabled', e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  <span className="text-xs font-medium text-gray-700">{DAY_LABELS[day]}</span>
                </label>
                {schedule?.enabled ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={schedule.start}
                      onChange={(e) => updateDayHours(day, 'start', e.target.value)}
                      className="w-28 h-8 text-xs"
                    />
                    <span className="text-xs text-gray-400">to</span>
                    <Input
                      type="time"
                      value={schedule.end}
                      onChange={(e) => updateDayHours(day, 'end', e.target.value)}
                      className="w-28 h-8 text-xs"
                    />
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">Closed</span>
                )}
              </div>
            );
          })}

          <div className="pt-3 border-t mt-3">
            <label className="text-xs font-medium text-gray-700 block mb-1">Timezone</label>
            <select
              value={config.timezone}
              onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Appointment Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              Default Duration
            </label>
            <select
              value={config.appointment_duration}
              onChange={(e) => setConfig({ ...config, appointment_duration: Number(e.target.value) })}
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              Buffer Between Appointments
            </label>
            <select
              value={config.buffer_minutes}
              onChange={(e) => setConfig({ ...config, buffer_minutes: Number(e.target.value) })}
              className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm"
            >
              <option value={0}>No buffer</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Services</CardTitle>
          <CardDescription className="text-xs">
            Services the AI can book (leave empty if not service-specific)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            {config.services.map((service, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium"
              >
                {service}
                <button onClick={() => removeService(i)} className="text-indigo-400 hover:text-indigo-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a service..."
              value={newService}
              onChange={(e) => setNewService(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
              className="h-8 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={addService}
              disabled={!newService.trim()}
              className="h-8"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Template */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Confirmation Message</CardTitle>
          <CardDescription className="text-xs">
            Sent after booking. Variables: {'{date}'}, {'{time}'}, {'{service}'}, {'{name}'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.confirmation_template}
            onChange={(e) => setConfig({ ...config, confirmation_template: e.target.value })}
            rows={3}
            className="text-sm"
          />
        </CardContent>
      </Card>

      {/* External Booking Link */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">External Booking Link (Optional)</CardTitle>
          <CardDescription className="text-xs">
            If set, AI will share this link instead of booking directly (e.g. Calendly)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="https://calendly.com/your-business"
            value={config.booking_link || ''}
            onChange={(e) => setConfig({ ...config, booking_link: e.target.value || null })}
            className="text-sm"
          />
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-3 sticky bottom-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Booking Config'}
        </Button>
      </div>
    </div>
  );
}
