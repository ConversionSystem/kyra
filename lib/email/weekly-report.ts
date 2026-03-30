/**
 * Weekly Performance Report Email
 * Generates a branded HTML email for agency weekly reports.
 * Sent via Resend API (fetch, no SDK dependency).
 */

export interface ClientReportData {
  id: string;
  name: string;
  industry: string | null;
  usage_this_month: number;
  gateway_status: string | null;
  billing_amount_cents: number;
}

export interface AgencyReportData {
  agencyName: string;
  agencyId: string;
  reportEmail: string;
  weekStart: string; // e.g. "Feb 17"
  weekEnd: string;   // e.g. "Feb 21"
  clients: ClientReportData[];
}

function performanceLabel(usage: number): string {
  if (usage > 20) return '🟢 Excellent';
  if (usage >= 10) return '🔵 Good';
  if (usage >= 1) return '🟡 Low';
  return '⚪ Inactive';
}

function statusLabel(status: string | null): string {
  if (status === 'running') return '✅ Running';
  if (!status || status === 'error') return '🔴 Offline';
  return `🟡 ${status}`;
}

export function buildWeeklyReportHtml(data: AgencyReportData): string {
  const { agencyName, weekStart, weekEnd, clients } = data;
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.usage_this_month > 0).length;
  const totalConversations = clients.reduce((s, c) => s + c.usage_this_month, 0);
  const runningClients = clients.filter(c => c.gateway_status === 'running').length;

  const clientRows = clients
    .sort((a, b) => b.usage_this_month - a.usage_this_month)
    .map(c => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b;">${escHtml(c.name)}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#64748b;">${escHtml(c.industry ?? '—')}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#3b82f6;">${c.usage_this_month}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;">${performanceLabel(c.usage_this_month)}</td>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;">${statusLabel(c.gateway_status)}</td>
      </tr>
    `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Weekly Performance Report — ${escHtml(agencyName)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);border-radius:12px 12px 0 0;padding:32px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;color:#c7d2fe;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">KYRA AGENCY PLATFORM</p>
                  <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Weekly Performance Report</h1>
                  <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px;">${escHtml(agencyName)} · ${escHtml(weekStart)} – ${escHtml(weekEnd)}</p>
                </td>
                <td align="right" style="font-size:40px;">📊</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Summary Stats -->
        <tr>
          <td style="background:#ffffff;padding:28px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${statCell(String(totalClients), 'Total AI Workers', '#6366f1')}
                ${statCell(String(activeClients), 'Active This Week', '#10b981')}
                ${statCell(String(totalConversations), 'Conversations', '#3b82f6')}
                ${statCell(String(runningClients), 'Online Now', '#f59e0b')}
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="background:#ffffff;padding:0 40px;"><div style="border-top:1px solid #f1f5f9;"></div></td></tr>

        <!-- Client Table -->
        <tr>
          <td style="background:#ffffff;padding:24px 40px 8px;">
            <h2 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#1e293b;">AI Worker Breakdown</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Client</th>
                  <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Industry</th>
                  <th style="padding:10px 16px;text-align:center;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Convos</th>
                  <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Performance</th>
                  <th style="padding:10px 16px;text-align:left;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${clientRows || '<tr><td colspan="5" style="padding:20px 16px;text-align:center;color:#94a3b8;">No clients yet — add your first AI worker.</td></tr>'}
              </tbody>
            </table>
          </td>
        </tr>

        <!-- Insight Banner -->
        ${totalConversations === 0 ? infoBox('💡 Tip: Your AI workers are deployed but haven\'t had conversations yet. Share the client portal URL with your clients to get started.') : ''}
        ${activeClients < totalClients && totalClients > 0 ? infoBox(`💡 ${totalClients - activeClients} of your AI workers had no conversations this week. Consider reviewing their knowledge base or sharing their portal URL.`) : ''}

        <!-- CTA -->
        <tr>
          <td style="background:#ffffff;padding:24px 40px 32px;text-align:center;">
            <a href="https://kyra.conversionsystem.com/agency/clients" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;">
              View Full Dashboard →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f1f5f9;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              This report was automatically generated by <strong>Kyra</strong> for ${escHtml(agencyName)}.<br/>
              Powered by <a href="https://kyra.conversionsystem.com" style="color:#6366f1;">kyra.conversionsystem.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function statCell(value: string, label: string, color: string): string {
  return `
    <td style="text-align:center;padding:12px;">
      <p style="margin:0;font-size:28px;font-weight:800;color:${color};">${escHtml(value)}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">${escHtml(label)}</p>
    </td>
  `;
}

function infoBox(text: string): string {
  return `
    <tr>
      <td style="background:#ffffff;padding:0 40px 16px;">
        <div style="background:#eff6ff;border-left:4px solid #3b82f6;border-radius:4px;padding:12px 16px;font-size:13px;color:#1e3a5f;">
          ${escHtml(text)}
        </div>
      </td>
    </tr>
  `;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Send weekly report email via GHL platform account.
 * Sends from hello@conversionsystem.com (verified + warmed in GHL).
 */
export async function sendWeeklyReport(data: AgencyReportData): Promise<{ ok: boolean; error?: string }> {
  const { sendPlatformEmail } = await import('./ghl-platform-sender');

  const html = buildWeeklyReportHtml(data);
  const subject = `📊 Weekly Report: ${data.agencyName} — ${data.weekStart} to ${data.weekEnd}`;

  const result = await sendPlatformEmail({
    to: data.reportEmail,
    subject,
    html,
    fromName: 'Kyra Reports',
  });

  return { ok: result.ok, error: result.error };
}

/**
 * Build AgencyReportData from Supabase agency + clients.
 */
export function buildReportData(
  agencyName: string,
  agencyId: string,
  reportEmail: string,
  clients: ClientReportData[],
): AgencyReportData {
  const now = new Date();
  const weekEnd = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekStartDate = new Date(now);
  weekStartDate.setDate(now.getDate() - 6);
  const weekStart = weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return { agencyName, agencyId, reportEmail, weekStart, weekEnd, clients };
}
