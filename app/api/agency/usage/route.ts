import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAgencyForUser, getAgencyClients } from '@/lib/agency/queries';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await getAgencyForUser(user.id);
  if (!result) return NextResponse.json({ error: 'No agency' }, { status: 403 });

  const clients = await getAgencyClients(result.agency.id);

  // Build per-client usage from conversations + metadata
  const clientUsage = await Promise.all(
    clients.map(async (client) => {
      // Count conversations this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count: convosThisMonth } = await supabase
        .from('client_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .gte('created_at', monthStart);

      const { count: convosToday } = await supabase
        .from('client_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', client.id)
        .gte('created_at', new Date().toISOString().split('T')[0]);

      // Get last conversation time
      const { data: lastConvo } = await supabase
        .from('client_conversations')
        .select('created_at')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const config = (client.container_config as Record<string, unknown>) ?? {};
      const model = (config.model as string) || 'gpt-4o-mini';

      // Estimate tokens from conversation count (avg ~800 tokens per exchange)
      const estimatedTokens = (convosThisMonth ?? 0) * 800;
      // Cost estimation based on model
      const costPer1kTokens = model.includes('gpt-4o-mini') ? 0.00015
        : model.includes('gpt-4o') ? 0.0025
        : model.includes('claude') ? 0.003
        : 0.001;
      const estimatedCost = (estimatedTokens / 1000) * costPer1kTokens;

      return {
        client_id: client.id,
        client_name: client.name || 'Unnamed',
        status: client.gateway_status || 'unknown',
        model,
        conversations_today: convosToday ?? 0,
        conversations_month: convosThisMonth ?? 0,
        estimated_tokens: estimatedTokens,
        estimated_cost_usd: Math.round(estimatedCost * 100) / 100,
        last_activity: lastConvo?.created_at || null,
      };
    })
  );

  // Totals
  const totals = {
    total_clients: clients.length,
    active_clients: clients.filter(c => c.gateway_status === 'running').length,
    conversations_today: clientUsage.reduce((s, c) => s + c.conversations_today, 0),
    conversations_month: clientUsage.reduce((s, c) => s + c.conversations_month, 0),
    estimated_tokens: clientUsage.reduce((s, c) => s + c.estimated_tokens, 0),
    estimated_cost_usd: Math.round(clientUsage.reduce((s, c) => s + c.estimated_cost_usd, 0) * 100) / 100,
  };

  return NextResponse.json({ totals, clients: clientUsage });
}
