import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { v4 as uuid } from 'uuid';

// GET /api/reminders - Get all reminders for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const includeDelivered = searchParams.get('includeDelivered') === 'true';
    
    let query = serviceClient
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .order('due_at', { ascending: true });
    
    if (!includeDelivered) {
      query = query.eq('delivered', false);
    }
    
    const { data: reminders, error } = await query;
    
    if (error) {
      console.error('Error fetching reminders:', error);
      return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
    }
    
    return NextResponse.json({ reminders });
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return NextResponse.json({ error: 'Failed to fetch reminders' }, { status: 500 });
  }
}

// POST /api/reminders - Create a new reminder
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { content, due_at, channel = 'web' } = await request.json();
    
    if (!content || !due_at) {
      return NextResponse.json({ error: 'Content and due_at are required' }, { status: 400 });
    }
    
    const { data: reminder, error } = await serviceClient
      .from('reminders')
      .insert({
        id: uuid(),
        user_id: user.id,
        content,
        due_at,
        channel,
        metadata: {},
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating reminder:', error);
      return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
    }
    
    return NextResponse.json({ reminder });
  } catch (error) {
    console.error('Error creating reminder:', error);
    return NextResponse.json({ error: 'Failed to create reminder' }, { status: 500 });
  }
}

// DELETE /api/reminders - Delete a reminder
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const reminderId = searchParams.get('id');
    
    if (!reminderId) {
      return NextResponse.json({ error: 'Reminder ID required' }, { status: 400 });
    }
    
    const { error } = await serviceClient
      .from('reminders')
      .delete()
      .eq('id', reminderId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting reminder:', error);
      return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return NextResponse.json({ error: 'Failed to delete reminder' }, { status: 500 });
  }
}

// PATCH /api/reminders - Mark a reminder as delivered
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceClient = await createServiceClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id, delivered } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Reminder ID required' }, { status: 400 });
    }
    
    const { data: reminder, error } = await serviceClient
      .from('reminders')
      .update({ delivered: delivered ?? true })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating reminder:', error);
      return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
    }
    
    return NextResponse.json({ reminder });
  } catch (error) {
    console.error('Error updating reminder:', error);
    return NextResponse.json({ error: 'Failed to update reminder' }, { status: 500 });
  }
}
