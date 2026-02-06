import { notFound, redirect } from 'next/navigation';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const { conversationId } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Get the specific conversation
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single();
  
  if (!conversation) {
    notFound();
  }

  // Get all conversations for sidebar
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  // Get messages for this conversation
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return (
    <ChatInterface
      conversations={conversations || []}
      initialConversation={conversation}
      initialMessages={messages || []}
      userId={user.id}
    />
  );
}
