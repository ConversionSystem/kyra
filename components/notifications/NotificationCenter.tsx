'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Sparkles, Calendar, Target, Brain, TrendingUp, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  insight: 'from-violet-500 to-purple-600',
  reminder_followup: 'from-amber-500 to-orange-600',
  calendar_prep: 'from-blue-500 to-cyan-600',
  weekly_summary: 'from-emerald-500 to-green-600',
  nudge: 'from-rose-500 to-pink-600',
  morning_brief: 'from-sky-500 to-blue-600',
  pattern_alert: 'from-indigo-500 to-violet-600',
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

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=15');
      if (res.ok) {
        const data = (await res.json()) as any;
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  }, []);

  // Poll every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

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
        className="relative flex items-center justify-center rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[380px] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span className="font-semibold text-zinc-100">Kyra's Insights</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-300">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
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
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                  <Sparkles className="h-6 w-6 text-zinc-600" />
                </div>
                <p className="text-sm font-medium text-zinc-400">No insights yet</p>
                <p className="mt-1 text-xs text-zinc-600">
                  Kyra will proactively share relevant insights as she learns about you
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = TYPE_ICONS[notification.type] || Sparkles;
                const gradient = TYPE_COLORS[notification.type] || 'from-violet-500 to-purple-600';
                const priorityClass = PRIORITY_RING[notification.priority] || '';
                
                return (
                  <div
                    key={notification.id}
                    className={`group border-b border-zinc-800/50 px-4 py-3 transition-colors hover:bg-zinc-800/50 ${
                      !notification.read ? 'bg-violet-500/5' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} ${priorityClass}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${notification.read ? 'text-zinc-400' : 'text-zinc-100'}`}>
                            {notification.title}
                          </p>
                          <button
                            onClick={() => dismiss(notification.id)}
                            className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X className="h-3.5 w-3.5 text-zinc-600 hover:text-zinc-300" />
                          </button>
                        </div>
                        <p className={`mt-0.5 text-sm ${notification.read ? 'text-zinc-600' : 'text-zinc-400'}`}>
                          {notification.content}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-[11px] text-zinc-600">
                            {timeAgo(notification.created_at)}
                          </span>
                          {!notification.read && (
                            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                          )}
                          {notification.action_label && (
                            <button
                              onClick={() => handleAction(notification)}
                              className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-400 transition-colors hover:bg-violet-500/20"
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
