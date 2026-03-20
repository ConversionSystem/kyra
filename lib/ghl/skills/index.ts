// ============================================================================
// GHL Skills — Master Index
//
// Aggregates all 50 tool definitions and routes execution to domain handlers.
// ============================================================================

import { contactToolDefinitions, executeContactTool } from './contacts';
import { conversationToolDefinitions, executeConversationTool } from './conversations';
import { opportunityToolDefinitions, executeOpportunityTool } from './opportunities';
import { calendarToolDefinitions, executeCalendarTool } from './calendar';
import { invoiceToolDefinitions, executeInvoiceTool } from './invoices';
import { marketingToolDefinitions, executeMarketingTool } from './marketing';
import { taskToolDefinitions, executeTaskTool } from './tasks';
import type { ToolResult } from '../ghl-tools';

// ── All 50 Tool Definitions ──────────────────────────────────────────────────

export const ALL_GHL_TOOLS = [
  ...contactToolDefinitions,
  ...conversationToolDefinitions,
  ...opportunityToolDefinitions,
  ...calendarToolDefinitions,
  ...invoiceToolDefinitions,
  ...marketingToolDefinitions,
  ...taskToolDefinitions,
];

// ── Tool Name → Domain Routing ───────────────────────────────────────────────

const contactTools = new Set(contactToolDefinitions.map(t => t.function.name));
const conversationTools = new Set(conversationToolDefinitions.map(t => t.function.name));
const opportunityTools = new Set(opportunityToolDefinitions.map(t => t.function.name));
const calendarTools = new Set(calendarToolDefinitions.map(t => t.function.name));
const invoiceTools = new Set(invoiceToolDefinitions.map(t => t.function.name));
const marketingTools = new Set(marketingToolDefinitions.map(t => t.function.name));
const taskTools = new Set(taskToolDefinitions.map(t => t.function.name));

// ── Master Executor ──────────────────────────────────────────────────────────

export async function executeGHLTool(
  toolName: string,
  args: Record<string, unknown>,
  token: string,
  locationId: string,
): Promise<ToolResult> {
  if (contactTools.has(toolName)) {
    return executeContactTool(toolName, args, token, locationId);
  }
  if (conversationTools.has(toolName)) {
    return executeConversationTool(toolName, args, token, locationId);
  }
  if (opportunityTools.has(toolName)) {
    return executeOpportunityTool(toolName, args, token, locationId);
  }
  if (calendarTools.has(toolName)) {
    return executeCalendarTool(toolName, args, token, locationId);
  }
  if (invoiceTools.has(toolName)) {
    return executeInvoiceTool(toolName, args, token, locationId);
  }
  if (marketingTools.has(toolName)) {
    return executeMarketingTool(toolName, args, token, locationId);
  }
  if (taskTools.has(toolName)) {
    return executeTaskTool(toolName, args, token, locationId);
  }

  return { success: false, error: `Unknown GHL tool: ${toolName}` };
}

// ── Re-exports ───────────────────────────────────────────────────────────────

export { contactToolDefinitions } from './contacts';
export { conversationToolDefinitions } from './conversations';
export { opportunityToolDefinitions } from './opportunities';
export { calendarToolDefinitions } from './calendar';
export { invoiceToolDefinitions } from './invoices';
export { marketingToolDefinitions } from './marketing';
export { taskToolDefinitions } from './tasks';
