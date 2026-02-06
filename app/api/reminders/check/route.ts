import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/reminders/check
 * 
 * Called by cron job to check and deliver due reminders.
 * Returns reminders that were delivered this check.
 * 
 * Auth: Requires API key header for cron access
 */
export async function GET(request: NextRequest) {
  // Verify cron API key
  const apiKey = request.headers.get('x-api-key');
  const cronKey = process.env.CRON_API_KEY || process.env.OPENCLAW_API_KEY;
  
  if (!cronKey || apiKey !== cronKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();
    const now = new Date().toISOString();

    // Get all due reminders that haven't been delivered
    const { data: dueReminders, error } = await supabase
      .from('reminders')
      .select('*, users!inner(id, email, name)')
      .eq('delivered', false)
      .lte('due_at', now)
      .limit(100);

    if (error) {
      console.error('Error fetching due reminders:', error);
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
    }

    if (!dueReminders || dueReminders.length === 0) {
      return NextResponse.json({ delivered: 0, reminders: [] });
    }

    const delivered: Array<{ id: string; user_email: string; content: string }> = [];

    for (const reminder of dueReminders) {
      try {
        // Mark as delivered first to prevent double-delivery
        await supabase
          .from('reminders')
          .update({ 
            delivered: true,
            metadata: {
              ...((reminder.metadata as object) || {}),
              delivered_at: new Date().toISOString(),
            }
          })
          .eq('id', reminder.id);

        // TODO: Send actual notification based on channel
        // For now, we just mark it delivered and log it
        // Future: email via Resend, push notification, Slack webhook, etc.
        
        console.log(`[REMINDER DELIVERED] User: ${reminder.users.email}, Content: ${reminder.content}`);

        delivered.push({
          id: reminder.id,
          user_email: reminder.users.email,
          content: reminder.content,
        });
      } catch (deliveryError) {
        console.error(`Failed to deliver reminder ${reminder.id}:`, deliveryError);
      }
    }

    return NextResponse.json({
      delivered: delivered.length,
      reminders: delivered,
      checked_at: now,
    });
  } catch (error) {
    console.error('Reminder check error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * POST /api/reminders/check
 * 
 * Manual trigger for reminder check (same as GET but allows POST)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
