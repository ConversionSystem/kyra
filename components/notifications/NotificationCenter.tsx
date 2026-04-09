'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Sparkles, Calendar, Target, Brain, TrendingUp, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePolling } from '@/hooks/use-polling';

interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  priority: string;
  read: boolean;
  action_url?: string | null;
  action_label?: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, typeof Sparkles> = {
  insight: Sparkles,
  reminder_followup: Clock,
  calendar_prep: Calendar,
  weekly_summary: TrendingUp,
  nudge: Target,
  morning_brief: Brain,
  pattern_alert: TrendingUp,
};

const TYPE_COLORS: Record<string, string> = {
  insight: 'from-indigo-500 to-indigo-600',
  reminder_followup: 'from-amber-500 to-orange-600',
  calendar_prep: 'from-blue-500 to-cyan-600',
  weekly_summary: 'from-emerald-500 to-green-600',
  nudge: 'from-rose-500 to-indigo-600',
  morning_brief: 'from-sky-500 to-blue-600',
  pattern_alert: 'from-indigo-500 to-indigo-600',
};

const PRIORITY_RING: Record<string, string> = {
  urgent: 'ring-2 ring-red-500',
  high: 'ring-2 ring-amber-500',
  normal: '',
  low: '',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: polledData, refetch: fetchNotifications } = usePolling<{ notifications: Notification[]; unreadCount: number }>({
    key: 'notifications',
    fetcher: async () => {
      const res = await fetch('/api/notifications?limit=15');
      if (!res.ok) return { notifications: [], unreadCount: 0 };
      const data = await res.json();
      return { notifications: data.notifications || [], unreadCount: data.unreadCount || 0 };
    },
    intervalMs: 30_000,
  });

  // Sync polled data into local state (local state is also mutated by mark-read/dismiss)
  useEffect(() => {
    if (polledData) {
      setNotifications(polledData.notifications);
      setUnreadCount(polledData.unreadCount);
    }
  }, [polledData]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'read' }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const dismiss = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'dismiss' }),
    });
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'read_all' }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleAction = (notification: Notification) => {
    markRead(notification.id);
    if (notification.action_url) {
      router.push(notification.action_url);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[380px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span className="font-semibold text-gray-900">Kyra's Insights</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-700"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Sparkles className="h-6 w-6 text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-500">No insights yet</p>
                <p className="mt-1 text-xs text-gray-500">
                  Kyra will proactively share relevant insights as she learns about you
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] || Sparkles;
                const gradient = TYPE_COLORS[notification.type] || 'from-indigo-500 to-indigo-600';
                const priorityClass = PRIORITY_RING[notification.priority] || '';
                
                return (
                  <div
                    key={notification.id}
                    className={`group border-b border-gray-200 px-4 py-3 transition-colors hover:bg-gray-100 ${
                      !notification.read ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} ${priorityClass}`}>
                        <Icon className="h-4 w-4 text-gray-900" />
                      </div>
                      
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${notification.read ? 'text-gray-500' : 'text-gray-900'}`}>
                            {notification.title}
                          </p>
                          <button
                            onClick={() => dismiss(notification.id)}
                            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700" />
                          </button>
                        </div>
                        <p className={`mt-0.5 text-sm ${notification.read ? 'text-gray-500' : 'text-gray-500'}`}>
                          {notification.content}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-[11px] text-gray-500">
                            {timeAgo(notification.created_at)}
                          </span>
                          {!notification.read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                          )}
                          {notification.action_label && (
                            <button
                              onClick={() => handleAction(notification)}
                              className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                            >
                              {notification.action_label}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
