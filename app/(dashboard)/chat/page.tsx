import { ChatInterface } from '@/components/chat/ChatInterface';
import { PlanRedirect } from '@/components/billing/PlanRedirect';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Check onboarding
  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_complete')
    .eq('id', user.id)
    .single();

  if (profile && !profile.onboarding_complete) {
    redirect('/onboarding');
  }

  // Get user's conversations
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  return (
    <>
      <Suspense fallback={null}>
        <PlanRedirect />
      </Suspense>
      <ChatInterface
        conversations={conversations || []}
        userId={user.id}
      />
    </>
  );
}
