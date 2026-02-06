import { ChatInterface } from '@/components/chat/ChatInterface';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Get user's conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  return (
    <ChatInterface
      conversations={conversations || []}
      userId={user.id}
    />
  );
}
