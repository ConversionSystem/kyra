/**
 * Pipeline Engine — Multi-step task execution with checkpointing
 * 
 * User: "Research my competitors, write a comparison report, and draft an email summary"
 * Kyra: Plans 3 steps, executes them, checkpoints each, reports progress.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase/server';
import { Pipeline, PipelineStep, PipelinePlan, StepStatus } from '@/types/pipelines';
import { webSearch, formatSearchResults } from '@/lib/tools/web-search';
import { v4 as uuid } from 'uuid';

let anthropicInstance: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicInstance) {
    anthropicInstance = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return anthropicInstance;
}

/**
 * Analyze a user message and determine if it needs a pipeline (multi-step)
 */
export async function shouldCreatePipeline(message: string): Promise<boolean> {
  const anthropic = getAnthropic();
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [{ role: 'user', content: message }],
    system: `You determine if a user request requires multiple distinct steps to complete (a "pipeline"). 

Answer YES if the request involves 2+ distinct actions like:
- "Research X, then write a report about it"
- "Find flights, compare prices, and book the cheapest"  
- "Analyze my website, find SEO issues, and create a fix plan"
- "Summarize these 3 articles and write a newsletter draft"

Answer NO for:
- Simple questions ("What's the weather?")
- Single-action requests ("Write me an email")
- Conversational messages ("How are you?")

Reply with ONLY "YES" or "NO".`,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  return text.toUpperCase().startsWith('YES');
}

/**
 * Plan a pipeline — break the task into steps
 */
export async function planPipeline(message: string, userContext?: string): Promise<PipelinePlan> {
  const anthropic = getAnthropic();
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: message }],
    system: `You are a task planner. Break the user's request into a pipeline of sequential steps.

${userContext ? `User context:\n${userContext}\n` : ''}

Each step should be one discrete action. Available step types:
- ai_task: Thinking, writing, analysis, summarization (cost: 1 credit)
- web_search: Search the internet for information (cost: 2 credits)
- file_create: Create a document/report/output (cost: 1 credit)
- email: Draft or send an email (cost: 1 credit)
- approval: Pause and ask the user to review/approve before continuing (cost: 0 credits)

Rules:
- 2-8 steps max
- Add an "approval" step before any irreversible action (sending email, etc.)
- Each step should clearly describe what it does
- Steps can reference output from previous steps
- Estimate total time

Return ONLY a JSON object:
{
  "title": "Short pipeline title",
  "description": "What this pipeline accomplishes",
  "steps": [
    {
      "name": "Step name",
      "description": "What this step does",
      "type": "ai_task|web_search|file_create|email|approval",
      "credit_cost": 1,
      "requires_approval": false
    }
  ],
  "estimated_credits": 7,
  "estimated_time": "~5 minutes"
}`,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to plan pipeline');
  
  return JSON.parse(jsonMatch[0]) as PipelinePlan;
}

/**
 * Create a pipeline in the database
 */
export async function createPipeline(
  userId: string,
  conversationId: string,
  plan: PipelinePlan
): Promise<Pipeline> {
  const supabase = await createServiceClient();
  
  const steps: PipelineStep[] = plan.steps.map((step, i) => ({
    id: uuid(),
    name: step.name,
    description: step.description,
    status: 'pending' as StepStatus,
    type: step.type,
    credit_cost: step.credit_cost,
    requires_approval: step.requires_approval,
  }));
  
  const { data, error } = await supabase
    .from('pipelines')
    .insert({
      user_id: userId,
      conversation_id: conversationId,
      title: plan.title,
      description: plan.description,
      status: 'pending',
      steps,
      current_step: 0,
      total_credits: plan.estimated_credits,
      credits_used: 0,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Pipeline;
}

/**
 * Execute the next step in a pipeline
 */
export async function executeNextStep(pipelineId: string): Promise<{
  pipeline: Pipeline;
  stepResult: string;
  needsApproval: boolean;
  isComplete: boolean;
}> {
  const supabase = await createServiceClient();
  
  // Get pipeline
  const { data: pipeline, error } = await supabase
    .from('pipelines')
    .select('*')
    .eq('id', pipelineId)
    .single();
  
  if (error || !pipeline) throw new Error('Pipeline not found');
  
  const steps = pipeline.steps as PipelineStep[];
  const currentIdx = pipeline.current_step;
  
  if (currentIdx >= steps.length) {
    return { pipeline: pipeline as Pipeline, stepResult: 'Pipeline complete', needsApproval: false, isComplete: true };
  }
  
  const step = steps[currentIdx];
  
  // Check if step needs approval
  if (step.requires_approval && step.status === 'pending') {
    steps[currentIdx] = { ...step, status: 'running' };
    await supabase
      .from('pipelines')
      .update({ steps, status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', pipelineId);
    
    return {
      pipeline: { ...pipeline, steps, status: 'paused' } as Pipeline,
      stepResult: `Step ${currentIdx + 1}: "${step.name}" requires your approval before proceeding.`,
      needsApproval: true,
      isComplete: false,
    };
  }
  
  // Execute step
  steps[currentIdx] = { ...step, status: 'running', started_at: new Date().toISOString() };
  await supabase
    .from('pipelines')
    .update({ steps, status: 'running', updated_at: new Date().toISOString() })
    .eq('id', pipelineId);
  
  let stepResult = '';
  
  try {
    // Gather context from previous steps
    const previousContext = steps
      .slice(0, currentIdx)
      .filter(s => s.output)
      .map(s => `[${s.name}]: ${JSON.stringify(s.output).substring(0, 2000)}`)
      .join('\n\n');
    
    switch (step.type) {
      case 'web_search': {
        const searchResults = await webSearch(step.description, { count: 5 });
        stepResult = formatSearchResults(searchResults);
        steps[currentIdx].output = { results: searchResults.results.slice(0, 5) };
        break;
      }
      
      case 'ai_task':
      case 'file_create':
      case 'email': {
        const anthropic = getAnthropic();
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          messages: [{ role: 'user', content: `Execute this step of a pipeline:

Pipeline: ${pipeline.title}
Step ${currentIdx + 1}/${steps.length}: ${step.name}
Description: ${step.description}

${previousContext ? `Context from previous steps:\n${previousContext}` : ''}

Execute this step thoroughly. Be specific and detailed.` }],
        });
        
        stepResult = response.content[0].type === 'text' ? response.content[0].text : '';
        steps[currentIdx].output = { result: stepResult.substring(0, 5000) };
        break;
      }
      
      default:
        stepResult = `Step type "${step.type}" not yet implemented`;
    }
    
    // Mark step complete
    steps[currentIdx] = {
      ...steps[currentIdx],
      status: 'completed',
      completed_at: new Date().toISOString(),
      output: steps[currentIdx].output,
    };
    
  } catch (err: any) {
    steps[currentIdx] = {
      ...steps[currentIdx],
      status: 'failed',
      error: err.message,
      completed_at: new Date().toISOString(),
    };
    stepResult = `Step failed: ${err.message}`;
  }
  
  // Advance to next step
  const nextStep = currentIdx + 1;
  const isComplete = nextStep >= steps.length;
  
  await supabase
    .from('pipelines')
    .update({
      steps,
      current_step: nextStep,
      credits_used: pipeline.credits_used + step.credit_cost,
      status: isComplete ? 'completed' : 'running',
      updated_at: new Date().toISOString(),
      ...(isComplete ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', pipelineId);
  
  const updatedPipeline = {
    ...pipeline,
    steps,
    current_step: nextStep,
    status: isComplete ? 'completed' : 'running',
  } as Pipeline;
  
  return { pipeline: updatedPipeline, stepResult, needsApproval: false, isComplete };
}

/**
 * Approve a paused step and continue execution
 */
export async function approvePipelineStep(pipelineId: string): Promise<void> {
  const supabase = await createServiceClient();
  
  const { data: pipeline } = await supabase
    .from('pipelines')
    .select('*')
    .eq('id', pipelineId)
    .single();
  
  if (!pipeline) throw new Error('Pipeline not found');
  
  const steps = pipeline.steps as PipelineStep[];
  const currentIdx = pipeline.current_step;
  
  // Mark approval step as complete and clear requires_approval
  steps[currentIdx] = {
    ...steps[currentIdx],
    status: 'completed',
    requires_approval: false,
    completed_at: new Date().toISOString(),
  };
  
  await supabase
    .from('pipelines')
    .update({
      steps,
      current_step: currentIdx + 1,
      status: 'running',
      updated_at: new Date().toISOString(),
    })
    .eq('id', pipelineId);
}

/**
 * Get user's pipelines
 */
export async function getUserPipelines(userId: string, status?: string): Promise<Pipeline[]> {
  const supabase = await createServiceClient();
  
  let query = supabase
    .from('pipelines')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data } = await query;
  return (data || []) as Pipeline[];
}

/**
 * Run all steps of a pipeline to completion (or until approval needed)
 * Returns progress updates as an async generator for streaming
 */
export async function* runPipeline(pipelineId: string): AsyncGenerator<{
  step: number;
  total: number;
  name: string;
  status: string;
  result: string;
  needsApproval: boolean;
  isComplete: boolean;
}> {
  let isComplete = false;
  let needsApproval = false;
  
  while (!isComplete && !needsApproval) {
    const result = await executeNextStep(pipelineId);
    const steps = result.pipeline.steps;
    const completedStep = steps[result.pipeline.current_step - 1] || steps[steps.length - 1];
    
    yield {
      step: result.pipeline.current_step,
      total: steps.length,
      name: completedStep?.name || 'Unknown',
      status: completedStep?.status || 'unknown',
      result: result.stepResult,
      needsApproval: result.needsApproval,
      isComplete: result.isComplete,
    };
    
    isComplete = result.isComplete;
    needsApproval = result.needsApproval;
  }
}
