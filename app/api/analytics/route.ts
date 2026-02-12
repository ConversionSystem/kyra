import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString();

  // Fetch all data in parallel
  const [messagesRes, conversationsRes, userRes] = await Promise.all([
    // Messages in last 30 days
    supabase
      .from('messages')
      .select('id, created_at, conversation_id, role, metadata')
      .eq('role', 'user')
      .gte('created_at', since)
      .in(
        'conversation_id',
        // subquery: get user's conversation IDs
        (await supabase.from('conversations').select('id').eq('user_id', user.id)).data?.map((c) => c.id) || []
      ),
    // All conversations with message counts
    supabase
      .from('conversations')
      .select('id, title, channel, created_at, messages(count)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50),
    // User profile
    supabase
      .from('users')
      .select('plan, usage_this_month, usage_reset_at, settings')
      .eq('id', user.id)
      .single(),
  ]);

  const messages = messagesRes.data || [];
  const conversations = conversationsRes.data || [];
  const userProfile = userRes.data;

  // Daily message counts
  const dailyCounts: Record<string, number> = {};
  for (let d = 0; d < 30; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    dailyCounts[date.toISOString().split('T')[0]] = 0;
  }
  messages.forEach((m) => {
    const day = m.created_at.split('T')[0];
    if (dailyCounts[day] !== undefined) dailyCounts[day]++;
  });

  // Channel breakdown
  const channelCounts: Record<string, number> = {};
  conversations.forEach((c: any) => {
    const count = c.messages?.[0]?.count || 0;
    channelCounts[c.channel] = (channelCounts[c.channel] || 0) + count;
  });

  // Top conversations
  const topConversations = conversations
    .map((c: any) => ({
      id: c.id,
      title: c.title || 'Untitled',
      channel: c.channel,
      messageCount: c.messages?.[0]?.count || 0,
    }))
    .sort((a: any, b: any) => b.messageCount - a.messageCount)
    .slice(0, 5);

  // Plan limits
  const planLimits: Record<string, number> = {
    free: 50,
    starter: 500,
    business: 2000,
    max: 10000,
  };

  const plan = userProfile?.plan || 'free';

  return NextResponse.json({
    dailyMessages: Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    channelBreakdown: channelCounts,
    topConversations,
    totalMessages: messages.length,
    usage: {
      used: userProfile?.usage_this_month || 0,
      limit: planLimits[plan] || 50,
      plan,
    },
  });
}
