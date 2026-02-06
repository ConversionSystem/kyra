import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/reminders/due
 * 
 * Get reminders that are due now (for the authenticated user).
 * Used by the web notification component.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();

    // Get reminders that are due but not delivered yet
    const { data: dueReminders, error } = await serviceClient
      .from('reminders')
      .select('id, content, due_at')
      .eq('user_id', user.id)
      .eq('delivered', false)
      .lte('due_at', now)
      .order('due_at', { ascending: true })
      .limit(10);

    if (error) {
      console.error('Error fetching due reminders:', error);
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
    }

    return NextResponse.json({ 
      reminders: dueReminders || [],
      checked_at: now,
    });
  } catch (error) {
    console.error('Due reminders error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
