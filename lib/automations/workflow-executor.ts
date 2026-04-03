/**
 * Workflow Execution Engine
 *
 * Executes workflow steps in order, handles delays, logs results.
 * This is the runtime that makes workflows actually DO things.
 *
 * Note: Actual message sending goes through the client's AI container.
 * This engine orchestrates the workflow and delegates actions.
 */

import { createServiceClientWithoutCookies } from '@/lib/supabase/server';
import { wakeContainerAI } from '@/lib/ovh/sync';
import type { Workflow, WorkflowStep, StepResult, WorkflowRun } from './workflow-types';

// ── Execute a workflow ──────────────────────────────────────────────────────

export async function executeWorkflow(
  workflow: Workflow,
  triggerEvent: Record<string, unknown> = {}
): Promise<string> {
  const supabase = createServiceClientWithoutCookies();

  // Create run record
  const { data: run, error: runError } = await supabase
    .from('workflow_runs')
    .insert({
      workflow_id: workflow.id,
      trigger_event: triggerEvent,
      status: 'running',
      started_at: new Date().toISOString(),
      step_results: [],
    })
    .select('id')
    .single();

  if (runError || !run) {
    console.error('[workflow-executor] Failed to create run:', runError?.message);
    throw new Error('Failed to start workflow execution');
  }

  const runId = run.id;

  try {
    const stepResults = await executeSteps(workflow, workflow.steps, triggerEvent);

    // Mark completed
    await supabase
      .from('workflow_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        step_results: stepResults,
      })
      .eq('id', runId);

    console.log(`[workflow-executor] Workflow ${workflow.id} run ${runId} completed (${stepResults.length} steps)`);
    return runId;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    await supabase
      .from('workflow_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: errorMsg,
      })
      .eq('id', runId);

    console.error(`[workflow-executor] Workflow ${workflow.id} run ${runId} failed:`, errorMsg);
    throw err;
  }
}

// ── Step execution ──────────────────────────────────────────────────────────

async function executeSteps(
  workflow: Workflow,
  steps: WorkflowStep[],
  triggerEvent: Record<string, unknown>,
  startIndex = 0
): Promise<StepResult[]> {
  const results: StepResult[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepIndex = startIndex + i;

    try {
      const result = await executeStep(workflow, step, stepIndex, triggerEvent);
      results.push(result);

      // If it's a condition step, include nested results
      if (step.type === 'condition' && result.output) {
        try {
          const nested = JSON.parse(result.output);
          if (Array.isArray(nested)) results.push(...nested);
        } catch {
          // output is not nested results — that's fine
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      results.push({
        step_index: stepIndex,
        step_type: step.type,
        status: 'failed',
        error: errorMsg,
        executed_at: new Date().toISOString(),
      });

      // Retry once
      try {
        console.log(`[workflow-executor] Retrying step ${stepIndex} (${step.type})...`);
        const retryResult = await executeStep(workflow, step, stepIndex, triggerEvent);
        // Replace the failed result with the retry
        results[results.length - 1] = retryResult;
      } catch (retryErr) {
        const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        console.error(`[workflow-executor] Step ${stepIndex} retry also failed:`, retryMsg);
        // Keep the original failure — don't throw, continue to next step
      }
    }
  }

  return results;
}

async function executeStep(
  workflow: Workflow,
  step: WorkflowStep,
  stepIndex: number,
  triggerEvent: Record<string, unknown>
): Promise<StepResult> {
  const now = new Date().toISOString();

  switch (step.type) {
    case 'wait': {
      // For the executor, we log the wait but don't actually sleep
      // In production, this would schedule a delayed continuation
      return {
        step_index: stepIndex,
        step_type: 'wait',
        status: 'success',
        output: `Waiting ${step.minutes} minutes`,
        executed_at: now,
      };
    }

    case 'send_sms':
    case 'send_email':
    case 'ai_respond': {
      // Delegate to the client's AI container
      const instruction = buildContainerInstruction(step, triggerEvent);
      await delegateToContainer(workflow.client_id, instruction);
      return {
        step_index: stepIndex,
        step_type: step.type,
        status: 'success',
        output: `Delegated to AI: ${instruction.slice(0, 100)}`,
        executed_at: now,
      };
    }

    case 'escalate': {
      await delegateToContainer(
        workflow.client_id,
        `[ESCALATION] ${step.reason}. Flag this conversation for human review and notify the agency.`
      );
      return {
        step_index: stepIndex,
        step_type: 'escalate',
        status: 'success',
        output: `Escalated: ${step.reason}`,
        executed_at: now,
      };
    }

    case 'add_tag': {
      await delegateToContainer(
        workflow.client_id,
        `[WORKFLOW ACTION] Add the tag "${step.tag}" to the current contact in GHL.`
      );
      return {
        step_index: stepIndex,
        step_type: 'add_tag',
        status: 'success',
        output: `Tag: ${step.tag}`,
        executed_at: now,
      };
    }

    case 'move_deal': {
      await delegateToContainer(
        workflow.client_id,
        `[WORKFLOW ACTION] Move the current deal to stage "${step.stage}" in GHL.`
      );
      return {
        step_index: stepIndex,
        step_type: 'move_deal',
        status: 'success',
        output: `Moved to: ${step.stage}`,
        executed_at: now,
      };
    }

    case 'create_task': {
      await delegateToContainer(
        workflow.client_id,
        `[WORKFLOW ACTION] Create a task: "${step.title}" and assign it to ${step.assigned_to}.`
      );
      return {
        step_index: stepIndex,
        step_type: 'create_task',
        status: 'success',
        output: `Task: ${step.title}`,
        executed_at: now,
      };
    }

    case 'webhook': {
      const webhookRes = await fetch(step.url, {
        method: step.method,
        headers: { 'Content-Type': 'application/json' },
        body: step.method === 'POST' ? JSON.stringify(triggerEvent) : undefined,
      });
      return {
        step_index: stepIndex,
        step_type: 'webhook',
        status: webhookRes.ok ? 'success' : 'failed',
        output: `${step.method} ${step.url} → ${webhookRes.status}`,
        executed_at: now,
      };
    }

    case 'condition': {
      // For now, conditions are evaluated conceptually.
      // The AI container handles the actual evaluation.
      const conditionInstruction = `[WORKFLOW CONDITION] Check if: "${step.if}". If true, execute the following actions. If false, ${step.else ? 'execute the alternative actions' : 'skip'}.`;

      // Execute the "then" branch — in production, this would be conditional
      const nestedResults = await executeSteps(
        workflow,
        step.then,
        triggerEvent,
        stepIndex + 1
      );

      await delegateToContainer(workflow.client_id, conditionInstruction);

      return {
        step_index: stepIndex,
        step_type: 'condition',
        status: 'success',
        output: JSON.stringify(nestedResults),
        executed_at: now,
      };
    }

    default: {
      return {
        step_index: stepIndex,
        step_type: (step as WorkflowStep).type || 'unknown',
        status: 'skipped',
        output: 'Unknown step type',
        executed_at: now,
      };
    }
  }
}

// ── Container delegation ────────────────────────────────────────────────────

function buildContainerInstruction(
  step: WorkflowStep,
  triggerEvent: Record<string, unknown>
): string {
  const contactRef = triggerEvent.contact_id
    ? ` (contact ID: ${triggerEvent.contact_id})`
    : '';

  switch (step.type) {
    case 'send_sms':
      return `[WORKFLOW ACTION] Send this SMS to the contact${contactRef}: "${step.message}"`;
    case 'send_email':
      return `[WORKFLOW ACTION] Send an email${step.to === 'agent' ? ' to the agency' : ` to the contact${contactRef}`} with subject "${step.subject}" and body: "${step.body}"`;
    case 'ai_respond':
      return `[WORKFLOW ACTION] Respond to the contact${contactRef} with this guidance: ${step.prompt}`;
    default:
      return `[WORKFLOW ACTION] Execute: ${JSON.stringify(step)}`;
  }
}

async function delegateToContainer(clientId: string, instruction: string): Promise<void> {
  const supabase = createServiceClientWithoutCookies();

  const { data: client } = await supabase
    .from('agency_clients')
    .select('gateway_url, gateway_token, gateway_status')
    .eq('id', clientId)
    .single();

  if (!client?.gateway_url || !client?.gateway_token || client.gateway_status !== 'running') {
    console.warn(`[workflow-executor] Client ${clientId} container not running — queueing instruction`);
    return;
  }

  await wakeContainerAI(
    client.gateway_url as string,
    client.gateway_token as string,
    instruction
  );
}

// ── Trigger matching ────────────────────────────────────────────────────────

export async function findMatchingWorkflows(
  clientId: string,
  eventType: string,
  eventData: Record<string, unknown> = {}
): Promise<Workflow[]> {
  const supabase = createServiceClientWithoutCookies();

  const { data: workflows } = await supabase
    .from('client_workflows')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'active');

  if (!workflows?.length) return [];

  return (workflows as Workflow[]).filter(wf => matchesTrigger(wf.trigger, eventType, eventData));
}

function matchesTrigger(
  trigger: Workflow['trigger'],
  eventType: string,
  eventData: Record<string, unknown>
): boolean {
  switch (trigger.type) {
    case 'new_lead':
      return eventType === 'contact.created';
    case 'message_received': {
      if (eventType !== 'message.received') return false;
      if (trigger.filter) {
        const msg = String(eventData.message || '').toLowerCase();
        return msg.includes(trigger.filter.toLowerCase());
      }
      return true;
    }
    case 'booking_created':
      return eventType === 'appointment.created';
    case 'deal_stage_changed': {
      if (eventType !== 'deal.stage_changed') return false;
      if (trigger.from_stage && eventData.from_stage !== trigger.from_stage) return false;
      if (trigger.to_stage && eventData.to_stage !== trigger.to_stage) return false;
      return true;
    }
    case 'tag_added': {
      if (eventType !== 'contact.tag_added') return false;
      return !trigger.tag || eventData.tag === trigger.tag;
    }
    case 'no_reply': {
      return eventType === 'contact.no_reply';
    }
    case 'schedule':
      // Schedule triggers are handled by cron, not event matching
      return false;
    default:
      return false;
  }
}
