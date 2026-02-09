import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications
 * Get user's notifications (unread first, then recent)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const serviceClient = await createServiceClient();
  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';
  const limit = parseInt(url.searchParams.get('limit') || '20');
  
  let query = serviceClient
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .eq('dismissed', false)
    .order('read', { ascending: true })  // unread first
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (unreadOnly) {
    query = query.eq('read', false);
  }
  
  // Filter expired
  query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
  
  // Also get unread count
  const { count } = await serviceClient
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)
    .eq('dismissed', false);
  
  return NextResponse.json({
    notifications: data || [],
    unreadCount: count || 0,
  });
}

/**
 * PATCH /api/notifications
 * Mark notification(s) as read or dismissed
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const serviceClient = await createServiceClient();
  const body = await request.json();
  const { id, ids, action } = body;
  
  // Mark all as read
  if (action === 'read_all') {
    await serviceClient
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('read', false);
    
    return NextResponse.json({ success: true });
  }
  
  // Single notification
  if (id) {
    const update: Record<string, any> = {};
    if (action === 'read') {
      update.read = true;
      update.read_at = new Date().toISOString();
    } else if (action === 'dismiss') {
      update.dismissed = true;
    }
    
    await serviceClient
      .from('notifications')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id);
    
    return NextResponse.json({ success: true });
  }
  
  // Batch
  if (ids && Array.isArray(ids)) {
    const update: Record<string, any> = {};
    if (action === 'read') {
      update.read = true;
      update.read_at = new Date().toISOString();
    } else if (action === 'dismiss') {
      update.dismissed = true;
    }
    
    await serviceClient
      .from('notifications')
      .update(update)
      .in('id', ids)
      .eq('user_id', user.id);
    
    return NextResponse.json({ success: true });
  }
  
  return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
}
