/**
 * AI Workflow Engine — The Brain
 *
 * Converts natural language descriptions into structured workflow definitions.
 * Uses gpt-4o-mini for cost efficiency.
 *
 * KEY PRINCIPLE: "GHL gives you 50 tools and expects you to learn them all.
 * Kyra gives you one AI worker that runs all 50."
 */

import type { WorkflowTrigger, WorkflowStep } from './workflow-types';

// ── Types ───────────────────────────────────────────────────────────────────

interface ClientContext {
  client_id: string;
  client_name: string;
  business_type?: string;
  has_ghl?: boolean;
  has_email?: boolean;
  deal_stages?: string[];
}

interface GeneratedWorkflow {
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
}

// ── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI workflow designer for a business automation platform.
Your job: convert natural language descriptions into structured JSON workflow definitions.

Available trigger types:
- new_lead: fires when a new contact/lead is created
- message_received: fires when a message is received (optional filter string to match keywords)
- booking_created: fires when a booking/appointment is created
- deal_stage_changed: fires when a deal moves stages (optional from_stage, to_stage)
- schedule: fires on a cron schedule (provide valid 5-field cron expression)
- tag_added: fires when a specific tag is added to a contact
- no_reply: fires when contact hasn't replied after X hours

Available step types:
- wait: { type: "wait", minutes: number } — delay before next step
- send_email: { type: "send_email", subject: string, body: string, to: "contact" | "agent" }
- send_sms: { type: "send_sms", message: string } — send SMS to the contact
- ai_respond: { type: "ai_respond", prompt: string } — AI generates a contextual response
- escalate: { type: "escalate", reason: string } — notify human for manual handling
- add_tag: { type: "add_tag", tag: string } — tag the contact
- move_deal: { type: "move_deal", stage: string } — move deal to a pipeline stage
- create_task: { type: "create_task", title: string, assigned_to: string }
- webhook: { type: "webhook", url: string, method: "POST" | "GET" }
- condition: { type: "condition", if: string, then: WorkflowStep[], else?: WorkflowStep[] }

Template variables available in messages: {{contact_name}}, {{business_name}}, {{contact_email}}, {{contact_phone}}

Rules:
1. Always return valid JSON with: name, description, trigger, steps
2. Be smart about timing — "2 days" = 2880 minutes, "1 hour" = 60 minutes
3. Use ai_respond for dynamic messages, send_sms for static templates
4. Add appropriate conditions (like "no_reply" checks) when the description implies them
5. Keep messages professional but warm — not robotic
6. Include tags when it makes sense for organization
7. Use escalate when human judgment is clearly needed
8. The "description" field should be a clear, one-line summary of what the workflow does

Respond with ONLY valid JSON, no markdown, no explanation.`;

// ── Generator ───────────────────────────────────────────────────────────────

export async function generateWorkflowFromDescription(
  description: string,
  clientContext: ClientContext
): Promise<GeneratedWorkflow> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const userPrompt = buildUserPrompt(description, clientContext);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[ai-workflow-engine] OpenAI error:', err);
    throw new Error('Failed to generate workflow — AI service error');
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from AI');
  }

  const parsed = JSON.parse(content) as GeneratedWorkflow;

  // Validate the generated workflow
  validateWorkflow(parsed);

  return parsed;
}

// ── User Prompt Builder ─────────────────────────────────────────────────────

function buildUserPrompt(description: string, ctx: ClientContext): string {
  const parts = [`Create a workflow from this description:\n"${description}"\n`];

  parts.push('Context:');
  parts.push(`- Business: ${ctx.client_name}`);
  if (ctx.business_type) parts.push(`- Type: ${ctx.business_type}`);
  if (ctx.has_ghl) parts.push('- Has GoHighLevel CRM connected');
  if (ctx.has_email) parts.push('- Has email configured');
  if (ctx.deal_stages?.length) parts.push(`- Deal stages: ${ctx.deal_stages.join(', ')}`);

  return parts.join('\n');
}

// ── Validation ──────────────────────────────────────────────────────────────

const VALID_TRIGGER_TYPES = [
  'new_lead', 'message_received', 'booking_created',
  'deal_stage_changed', 'schedule', 'tag_added', 'no_reply',
];

const VALID_STEP_TYPES = [
  'wait', 'send_email', 'send_sms', 'ai_respond', 'escalate',
  'add_tag', 'move_deal', 'create_task', 'webhook', 'condition',
];

function validateWorkflow(wf: GeneratedWorkflow): void {
  if (!wf.name || typeof wf.name !== 'string') {
    throw new Error('Workflow must have a name');
  }
  if (!wf.trigger || !VALID_TRIGGER_TYPES.includes(wf.trigger.type)) {
    throw new Error(`Invalid trigger type: ${wf.trigger?.type}`);
  }
  if (!Array.isArray(wf.steps) || wf.steps.length === 0) {
    throw new Error('Workflow must have at least one step');
  }
  validateSteps(wf.steps);
}

function validateSteps(steps: WorkflowStep[]): void {
  for (const step of steps) {
    if (!VALID_STEP_TYPES.includes(step.type)) {
      throw new Error(`Invalid step type: ${step.type}`);
    }
    if (step.type === 'condition') {
      if (step.then) validateSteps(step.then);
      if (step.else) validateSteps(step.else);
    }
  }
}
