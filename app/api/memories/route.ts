import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getUserMemories, deleteMemory } from '@/lib/ai/memory';

// GET /api/memories - Get all memories for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const memories = await getUserMemories(user.id);
    
    return NextResponse.json({ memories });
  } catch (error) {
    console.error('Error fetching memories:', error);
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}

// DELETE /api/memories - Delete a memory
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get('id');
    
    if (!memoryId) {
      return NextResponse.json({ error: 'Memory ID required' }, { status: 400 });
    }
    
    const deleted = await deleteMemory(memoryId, user.id);
    
    if (!deleted) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting memory:', error);
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
