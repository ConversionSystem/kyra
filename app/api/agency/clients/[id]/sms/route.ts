import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEFAULT_TEMPLATES, getSmsStats, getRecentLog } from '@/lib/sms';
import type { ClientSmsConfig } from '@/lib/sms';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Delivery SMS Management API
 *
 * GET  — Get SMS config, stats, and recent log
 * PUT  — Update SMS config (enable/disable, templates, provider settings)
 * POST — Test send (sends a mock message to verify setup)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const { data, error } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const settings = (data.settings || {}) as Record<string, unknown>;
  const smsConfig = (settings.sms || {}) as Partial<ClientSmsConfig>;

  // Get stats and recent log
  const [stats, recentLog] = await Promise.all([
    getSmsStats(clientId),
    getRecentLog(clientId, 20),
  ]);

  return NextResponse.json({
    config: {
      enabled: smsConfig.enabled ?? false,
      provider: smsConfig.provider ?? 'mock',
      providerConfigured: !!(smsConfig.providerApiKey && smsConfig.providerApiUrl),
      templates: smsConfig.templates ?? DEFAULT_TEMPLATES,
      brandName: smsConfig.brandName ?? '',
      sendingHoursStart: smsConfig.sendingHoursStart ?? 8,
      sendingHoursEnd: smsConfig.sendingHoursEnd ?? 22,
      timezone: smsConfig.timezone ?? 'America/Los_Angeles',
      webhookUrl: `${getBaseUrl(req)}/api/webhooks/onfleet?clientId=${clientId}&secret=${smsConfig.webhookSecret || 'configure-me'}`,
    },
    stats,
    recentLog,
    defaultTemplates: DEFAULT_TEMPLATES,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const body = await req.json();
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Load existing settings
  const { data: existing, error: fetchError } = await supabase
    .from('agency_clients')
    .select('settings')
    .eq('id', clientId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const settings = (existing.settings || {}) as Record<string, unknown>;
  const currentSms = (settings.sms || {}) as Record<string, unknown>;

  // Merge updates
  const updatedSms: Record<string, unknown> = {
    ...currentSms,
    ...(body.enabled !== undefined && { enabled: body.enabled }),
    ...(body.provider && { provider: body.provider }),
    ...(body.providerApiKey && { providerApiKey: body.providerApiKey }),
    ...(body.providerApiUrl && { providerApiUrl: body.providerApiUrl }),
    ...(body.webhookSecret && { webhookSecret: body.webhookSecret }),
    ...(body.templates && { templates: body.templates }),
    ...(body.brandName && { brandName: body.brandName }),
    ...(body.sendingHoursStart !== undefined && { sendingHoursStart: body.sendingHoursStart }),
    ...(body.sendingHoursEnd !== undefined && { sendingHoursEnd: body.sendingHoursEnd }),
    ...(body.timezone && { timezone: body.timezone }),
  };

  const { error: updateError } = await supabase
    .from('agency_clients')
    .update({
      settings: { ...settings, sms: updatedSms },
    })
    .eq('id', clientId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'updated', sms: updatedSms });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: clientId } = await params;
  const body = await req.json();

  if (body.action !== 'test') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Send a test webhook payload through the full pipeline
  const testPayload = {
    triggerName: 'taskCompleted',
    taskId: 'test-task-123',
    time: Math.floor(Date.now() / 1000),
    data: {
      task: {
        id: 'test-task-123',
        status: 3,
        recipients: [
          {
            name: body.testName || 'Test Customer',
            phone: body.testPhone || '+15551234567',
          },
        ],
        worker: {
          name: body.testDriver || 'Test Driver',
          id: 'test-worker',
        },
        eta: Math.floor(Date.now() / 1000) - 300,
        trackingURL: 'https://onf.lt/test123',
        completionDetails: {
          success: true,
        },
        destination: {
          address: {
            unparsed: '123 Test St, San Jose, CA',
          },
        },
        timeCreated: Math.floor(Date.now() / 1000) - 1800,
        timeLastModified: Math.floor(Date.now() / 1000),
      },
    },
  };

  // Forward to the webhook handler internally
  const webhookUrl = `${getBaseUrl(req)}/api/webhooks/onfleet?clientId=${clientId}&secret=test`;
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload),
  });

  const result = await response.json();
  return NextResponse.json({ testResult: result });
}

function getBaseUrl(req: NextRequest): string {
  const host = req.headers.get('host') || 'kyra.conversionsystem.com';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}
