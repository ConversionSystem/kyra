import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const MAX_LENGTH = 2000;

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceClient();
  const { data: profile } = await serviceClient
    .from('users')
    .select('custom_instructions_knowledge, custom_instructions_style')
    .eq('id', user.id)
    .single();

  return NextResponse.json({
    knowledge: profile?.custom_instructions_knowledge || '',
    style: profile?.custom_instructions_style || '',
  });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { knowledge, style } = (await request.json()) as {
    knowledge: string;
    style: string;
  };

  if (typeof knowledge !== 'string' || typeof style !== 'string') {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  if (knowledge.length > MAX_LENGTH || style.length > MAX_LENGTH) {
    return NextResponse.json(
      { error: `Each field must be ${MAX_LENGTH} characters or less` },
      { status: 400 }
    );
  }

  const serviceClient = await createServiceClient();
  const { error: updateError } = await serviceClient
    .from('users')
    .update({
      custom_instructions_knowledge: knowledge,
      custom_instructions_style: style,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ knowledge, style });
}
