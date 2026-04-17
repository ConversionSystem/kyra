import { NextRequest, NextResponse } from 'next/server';
import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { requireCron } from '@/lib/auth/cron';

/**
 * GET /api/cron/alerts
 *
 * Cron job — runs every 5 minutes.
 * Checks alert rules for all agencies and fires notifications when thresholds are breached.
 *
 * Secured by Vercel's CRON_SECRET header.
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request);
  if (unauthorized) return unauthorized;

  const supabase = createServiceClientWithoutCookies();

  // Find all agencies with alert_rules in settings
  const { data: agencies, error } = await supabase
    .from('agencies')
    .select('id, name, settings');

  if (error || !agencies) {
    return NextResponse.json({ error: 'Failed to load agencies' }, { status: 500 });
  }

  let totalChecked = 0;
  let totalFired = 0;

  for (const agency of agencies) {
    const settings = (agency.settings as Record<string, unknown>) ?? {};
    const alertRules = (settings.alert_rules as AlertRule[]) || [];
    const enabledRules = alertRules.filter((r) => r.enabled);

    if (enabledRules.length === 0) continue;

    // Get this agency's clients
    const { data: clients } = await supabase
      .from('agency_clients')
      .select('id, name, business_name, gateway_status, updated_at')
      .eq('agency_id', agency.id);

    if (!clients || clients.length === 0) continue;

    const recentAlerts = ((settings.recent_alerts as Alert[]) || []).slice(0, 50);
    const newAlerts: Alert[] = [];

    for (const rule of enabledRules) {
      totalChecked++;
      const triggered = await checkRule(supabase, rule, clients, agency.id, recentAlerts);

      for (const alert of triggered) {
        // Deduplicate — don't fire same alert within 30 minutes
        const isDuplicate = recentAlerts.some(
          (a) =>
            a.rule_type === alert.rule_type &&
            a.client_id === alert.client_id &&
            new Date(a.triggered_at).getTime() > Date.now() - 30 * 60 * 1000,
        );

        if (!isDuplicate) {
          newAlerts.push(alert);
          totalFired++;
        }
      }
    }

    if (newAlerts.length > 0) {
      // Prepend new alerts, keep max 50
      const updatedAlerts = [...newAlerts, ...recentAlerts].slice(0, 50);
      await supabase
        .from('agencies')
        .update({
          settings: { ...settings, recent_alerts: updatedAlerts },
        })
        .eq('id', agency.id);

      console.log(
        `[cron/alerts] 🔔 ${newAlerts.length} new alert(s) for agency "${agency.name}"`,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    agencies_checked: agencies.length,
    rules_checked: totalChecked,
    alerts_fired: totalFired,
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AlertRule {
  id: string;
  type: 'agent_offline' | 'token_spike' | 'no_activity' | 'review_stale' | 'error_rate';
  label: string;
  threshold: number;
  unit: string;
  enabled: boolean;
  notify_via: 'dashboard' | 'email';
}

interface Alert {
  rule_type: string;
  client_id: string;
  client_name: string;
  message: string;
  triggered_at: string;
  read: boolean;
}

interface ClientRow {
  id: string;
  name: string | null;
  business_name: string | null;
  gateway_status: string | null;
  updated_at: string | null;
}

// ── Rule Checkers ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkRule(
  supabase: any,
  rule: AlertRule,
  clients: ClientRow[],
  agencyId: string,
  _existingAlerts: Alert[],
): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date();

  switch (rule.type) {
    case 'agent_offline': {
      for (const client of clients) {
        if (client.gateway_status && client.gateway_status !== 'running') {
          // Check if it's been offline longer than threshold minutes
          const updatedAt = client.updated_at ? new Date(client.updated_at) : now;
          const offlineMinutes = (now.getTime() - updatedAt.getTime()) / (1000 * 60);
          if (offlineMinutes >= rule.threshold) {
            alerts.push({
              rule_type: 'agent_offline',
              client_id: client.id,
              client_name: client.business_name || client.name || 'Unknown',
              message: `AI worker "${client.business_name || client.name}" has been offline for ${Math.round(offlineMinutes)} minutes (threshold: ${rule.threshold}min)`,
              triggered_at: now.toISOString(),
              read: false,
            });
          }
        }
      }
      break;
    }

    case 'token_spike': {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      for (const client of clients) {
        const { count } = await supabase
          .from('client_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .gte('created_at', todayStart);

        const estimatedTokens = (count ?? 0) * 800;
        if (estimatedTokens > rule.threshold) {
          alerts.push({
            rule_type: 'token_spike',
            client_id: client.id,
            client_name: client.business_name || client.name || 'Unknown',
            message: `"${client.business_name || client.name}" has used ~${estimatedTokens.toLocaleString()} tokens today (threshold: ${rule.threshold.toLocaleString()})`,
            triggered_at: now.toISOString(),
            read: false,
          });
        }
      }
      break;
    }

    case 'no_activity': {
      const thresholdTime = new Date(now.getTime() - rule.threshold * 60 * 60 * 1000).toISOString();
      for (const client of clients) {
        if (client.gateway_status !== 'running') continue; // skip offline clients

        const { count } = await supabase
          .from('client_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .gte('created_at', thresholdTime);

        if ((count ?? 0) === 0) {
          alerts.push({
            rule_type: 'no_activity',
            client_id: client.id,
            client_name: client.business_name || client.name || 'Unknown',
            message: `"${client.business_name || client.name}" has had no conversations for ${rule.threshold}+ hours`,
            triggered_at: now.toISOString(),
            read: false,
          });
        }
      }
      break;
    }

    case 'review_stale': {
      const staleThreshold = new Date(now.getTime() - rule.threshold * 60 * 60 * 1000).toISOString();
      const { data: staleItems } = await supabase
        .from('client_conversations')
        .select('id, client_id')
        .eq('agency_id', agencyId)
        .eq('metadata->>needs_review', 'true')
        .lt('created_at', staleThreshold)
        .limit(10);

      if (staleItems && staleItems.length > 0) {
        const clientNames = new Map(clients.map((c) => [c.id, c.business_name || c.name || 'Unknown']));
        alerts.push({
          rule_type: 'review_stale',
          client_id: 'all',
          client_name: 'Review Queue',
          message: `${staleItems.length} review item(s) have been waiting ${rule.threshold}+ hours for approval`,
          triggered_at: now.toISOString(),
          read: false,
        });
      }
      break;
    }

    case 'error_rate': {
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      for (const client of clients) {
        const { count: totalCount } = await supabase
          .from('client_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .gte('created_at', last24h);

        if (!totalCount || totalCount < 5) continue; // need minimum sample

        const { count: errorCount } = await supabase
          .from('client_conversations')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', client.id)
          .gte('created_at', last24h)
          .eq('metadata->>has_error', 'true');

        const errorRate = ((errorCount ?? 0) / totalCount) * 100;
        if (errorRate > rule.threshold) {
          alerts.push({
            rule_type: 'error_rate',
            client_id: client.id,
            client_name: client.business_name || client.name || 'Unknown',
            message: `"${client.business_name || client.name}" error rate is ${errorRate.toFixed(1)}% (threshold: ${rule.threshold}%)`,
            triggered_at: now.toISOString(),
            read: false,
          });
        }
      }
      break;
    }
  }

  return alerts;
}
