import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: link } = await supabase
      .from('user_channels')
      .select('user_id')
      .eq('channel_type', 'telegram')
      .eq('channel_user_id', '6474726795')
      .eq('verified', true)
      .single();

    if (!link) {
      return NextResponse.json({ result: 'no link found' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id, email')
      .eq('id', link.user_id)
      .single();

    return NextResponse.json({ link, user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack?.split('\n').slice(0,5) }, { status: 500 });
  }
}
