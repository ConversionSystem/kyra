import { NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const serviceClient = await createServiceClient();
    
    // Get user's conversations
    const { data: conversations, error } = await serviceClient
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching conversations:', error);
      return new Response('Failed to fetch conversations', { status: 500 });
    }

    return Response.json(conversations || []);
  } catch (error) {
    console.error('Conversations API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');
    
    if (!conversationId) {
      return new Response('Conversation ID required', { status: 400 });
    }

    const serviceClient = await createServiceClient();
    
    // Delete conversation (messages will cascade)
    const { error } = await serviceClient
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting conversation:', error);
      return new Response('Failed to delete conversation', { status: 500 });
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
