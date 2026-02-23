import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const ADMIN_EMAILS = ['hello@conversionsystem.com', 'angel@conversionsystem.com', 'steve@conversionsystem.com'];

export async function GET(request: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const service = await createServiceClient();

  // Get all users with stats
  const { data: users, error: usersError } = await service
    .from('users')
    .select('id, email, name, plan, usage_this_month, usage_reset_at, stripe_customer_id, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  // Get conversation counts per user
  const { data: conversations } = await service
    .from('conversations')
    .select('user_id, id');

  // Get message counts per user  
  const { data: messages } = await service
    .from('messages')
    .select('id, conversation_id, created_at');

  // Get memory counts per user
  const { data: memories } = await service
    .from('memories')
    .select('user_id, id');

  // Aggregate stats
  const convCountByUser: Record<string, number> = {};
  const msgCountByUser: Record<string, number> = {};
  const memCountByUser: Record<string, number> = {};

  // Map conversations to users
  const convToUser: Record<string, string> = {};
  (conversations || []).forEach(c => {
    convCountByUser[c.user_id] = (convCountByUser[c.user_id] || 0) + 1;
    convToUser[c.id] = c.user_id;
  });

  (messages || []).forEach(m => {
    const userId = convToUser[m.conversation_id];
    if (userId) msgCountByUser[userId] = (msgCountByUser[userId] || 0) + 1;
  });

  (memories || []).forEach(m => {
    memCountByUser[m.user_id] = (memCountByUser[m.user_id] || 0) + 1;
  });

  // Build enriched user list
  const enrichedUsers = (users || []).map(u => ({
    ...u,
    conversations: convCountByUser[u.id] || 0,
    messages: msgCountByUser[u.id] || 0,
    memories: memCountByUser[u.id] || 0,
  }));

  // Summary stats
  const totalUsers = enrichedUsers.length;
  const planBreakdown = enrichedUsers.reduce((acc, u) => {
    acc[u.plan] = (acc[u.plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const totalMessages = messages?.length || 0;
  const totalConversations = conversations?.length || 0;
  const totalMemories = memories?.length || 0;
  const totalUsage = enrichedUsers.reduce((sum, u) => sum + (u.usage_this_month || 0), 0);
  const payingUsers = enrichedUsers.filter(u => u.plan !== 'free').length;

  // Messages last 24h / 7d
  const now = new Date();
  const day = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const msgs24h = (messages || []).filter(m => new Date(m.created_at) > day).length;
  const msgs7d = (messages || []).filter(m => new Date(m.created_at) > week).length;

  // Monthly revenue estimate
  const planPrices: Record<string, number> = { free: 0, starter: 20, business: 100, max: 200 };
  const mrr = enrichedUsers.reduce((sum, u) => sum + (planPrices[u.plan] || 0), 0);

  return NextResponse.json({
    summary: {
      totalUsers,
      payingUsers,
      planBreakdown,
      totalConversations,
      totalMessages,
      totalMemories,
      totalUsage,
      msgs24h,
      msgs7d,
      mrr,
    },
    users: enrichedUsers,
  });
}
