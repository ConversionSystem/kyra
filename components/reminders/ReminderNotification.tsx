'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Reminder {
  id: string;
  content: string;
  due_at: string;
}

export function ReminderNotification() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const fetchDueReminders = useCallback(async () => {
    try {
      const response = await fetch('/api/reminders/due');
      if (response.ok) {
        const data = await response.json() as { reminders?: any[] };
        setReminders(data.reminders || []);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchDueReminders();

    // Poll every 60 seconds
    const interval = setInterval(fetchDueReminders, 60000);

    return () => clearInterval(interval);
  }, [fetchDueReminders]);

  const handleDismiss = async (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    
    // Mark as delivered
    try {
      await fetch('/api/reminders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, delivered: true }),
      });
    } catch (error) {
      console.error('Error marking reminder as delivered:', error);
    }
  };

  const visibleReminders = reminders.filter(r => !dismissed.has(r.id));

  if (visibleReminders.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {visibleReminders.map((reminder) => (
        <Card 
          key={reminder.id} 
          className="bg-indigo-600 border-indigo-500 shadow-lg animate-in slide-in-from-right"
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-full bg-indigo-500 p-2">
                <Bell className="h-4 w-4 text-gray-900" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">Reminder</p>
                <p className="text-sm text-indigo-100 mt-1">{reminder.content}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-indigo-200 hover:text-gray-700 hover:bg-indigo-500"
                onClick={() => handleDismiss(reminder.id)}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
