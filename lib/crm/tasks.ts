/**
 * Kyra CRM — Tasks Engine
 * Uses crm_activities table with type='task' + metadata for task fields
 * Avoids new DB migration — tasks are stored as activities
 */

import { createServiceClient } from '@/lib/supabase/server';

export interface CrmTask {
  id: string;
  agency_id: string;
  contact_id: string | null;
  deal_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done';
  assigned_to: string | null;
  created_by: 'human' | 'ai';
  completed_at: string | null;
  created_at: string;
  // Joined
  contact_name?: string | null;
  deal_name?: string | null;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  due_date?: string;
  priority?: CrmTask['priority'];
  contact_id?: string;
  deal_id?: string;
  assigned_to?: string;
  created_by?: 'human' | 'ai';
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  contact_id?: string;
  deal_id?: string;
  overdue?: boolean;
  sort?: 'due_date' | 'priority' | 'created' | 'status';
  order?: 'asc' | 'desc';
}

function activityToTask(act: Record<string, unknown>): CrmTask {
  const meta = (act.metadata || {}) as Record<string, unknown>;
  return {
    id: act.id as string,
    agency_id: act.agency_id as string,
    contact_id: act.contact_id as string | null,
    deal_id: act.deal_id as string | null,
    title: act.subject as string || 'Untitled Task',
    description: act.body as string | null,
    due_date: (meta.due_date as string) || null,
    priority: (meta.priority as CrmTask['priority']) || 'medium',
    status: (meta.task_status as CrmTask['status']) || 'todo',
    assigned_to: (meta.assigned_to as string) || null,
    created_by: (act.actor as 'human' | 'ai') || 'human',
    completed_at: act.resolved_at as string | null,
    created_at: act.created_at as string,
    contact_name: (meta.contact_name as string) || null,
    deal_name: (meta.deal_name as string) || null,
  };
}

export async function listTasks(agencyId: string, filters: TaskFilters = {}): Promise<{ tasks: CrmTask[]; counts: Record<string, number> }> {
  const supabase = await createServiceClient();

  let query = supabase
    .from('crm_activities')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('type', 'task');

  if (filters.status && filters.status !== 'all') {
    query = query.eq('metadata->>task_status', filters.status);
  }
  if (filters.priority) {
    query = query.eq('metadata->>priority', filters.priority);
  }
  if (filters.contact_id) {
    query = query.eq('contact_id', filters.contact_id);
  }
  if (filters.deal_id) {
    query = query.eq('deal_id', filters.deal_id);
  }
  if (filters.overdue) {
    query = query
      .not('metadata->>task_status', 'eq', 'done')
      .lt('metadata->>due_date', new Date().toISOString().split('T')[0]);
  }

  // Sort
  switch (filters.sort) {
    case 'due_date':
      query = query.order('metadata->>due_date', { ascending: filters.order !== 'desc', nullsFirst: false });
      break;
    case 'priority':
      query = query.order('created_at', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  query = query.limit(200);

  const { data, error } = await query;
  if (error) throw error;

  const tasks = (data || []).map(activityToTask);

  // Priority sort (custom order)
  if (filters.sort === 'priority') {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    tasks.sort((a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2));
  }

  // Get counts per status
  const { data: allTasks } = await supabase
    .from('crm_activities')
    .select('metadata')
    .eq('agency_id', agencyId)
    .eq('type', 'task');

  const counts: Record<string, number> = { todo: 0, in_progress: 0, done: 0, overdue: 0 };
  const today = new Date().toISOString().split('T')[0];
  for (const t of allTasks || []) {
    const meta = (t.metadata || {}) as Record<string, unknown>;
    const status = (meta.task_status as string) || 'todo';
    counts[status] = (counts[status] || 0) + 1;
    if (status !== 'done' && meta.due_date && (meta.due_date as string) < today) {
      counts.overdue = (counts.overdue || 0) + 1;
    }
  }

  return { tasks, counts };
}

export async function createTask(agencyId: string, data: CreateTaskData): Promise<CrmTask> {
  const supabase = await createServiceClient();

  const { data: activity, error } = await supabase
    .from('crm_activities')
    .insert({
      agency_id: agencyId,
      contact_id: data.contact_id || null,
      deal_id: data.deal_id || null,
      type: 'task',
      subject: data.title,
      body: data.description || null,
      actor: data.created_by || 'human',
      actor_name: data.assigned_to || null,
      needs_attention: true,
      attention_type: 'task',
      metadata: {
        due_date: data.due_date || null,
        priority: data.priority || 'medium',
        task_status: 'todo',
        assigned_to: data.assigned_to || null,
      },
    })
    .select()
    .single();

  if (error) throw error;
  return activityToTask(activity);
}

export async function updateTask(
  agencyId: string,
  taskId: string,
  updates: Partial<{
    title: string;
    description: string;
    due_date: string | null;
    priority: CrmTask['priority'];
    status: CrmTask['status'];
    assigned_to: string | null;
    contact_id: string | null;
    deal_id: string | null;
  }>
): Promise<CrmTask> {
  const supabase = await createServiceClient();

  // Get current task
  const { data: current, error: fetchErr } = await supabase
    .from('crm_activities')
    .select('*')
    .eq('id', taskId)
    .eq('agency_id', agencyId)
    .eq('type', 'task')
    .single();

  if (fetchErr || !current) throw new Error('Task not found');

  const currentMeta = (current.metadata || {}) as Record<string, unknown>;

  const newMeta = { ...currentMeta };
  if (updates.due_date !== undefined) newMeta.due_date = updates.due_date;
  if (updates.priority) newMeta.priority = updates.priority;
  if (updates.status) newMeta.task_status = updates.status;
  if (updates.assigned_to !== undefined) newMeta.assigned_to = updates.assigned_to;

  const dbUpdates: Record<string, unknown> = { metadata: newMeta };
  if (updates.title) dbUpdates.subject = updates.title;
  if (updates.description !== undefined) dbUpdates.body = updates.description;
  if (updates.contact_id !== undefined) dbUpdates.contact_id = updates.contact_id;
  if (updates.deal_id !== undefined) dbUpdates.deal_id = updates.deal_id;

  // Mark resolved if done
  if (updates.status === 'done') {
    dbUpdates.resolved = true;
    dbUpdates.resolved_at = new Date().toISOString();
    dbUpdates.needs_attention = false;
  } else if (updates.status) {
    dbUpdates.resolved = false;
    dbUpdates.resolved_at = null;
    dbUpdates.needs_attention = true;
  }

  const { data: updated, error } = await supabase
    .from('crm_activities')
    .update(dbUpdates)
    .eq('id', taskId)
    .eq('agency_id', agencyId)
    .select()
    .single();

  if (error) throw error;
  return activityToTask(updated);
}

export async function deleteTask(agencyId: string, taskId: string): Promise<void> {
  const supabase = await createServiceClient();
  const { error } = await supabase
    .from('crm_activities')
    .delete()
    .eq('id', taskId)
    .eq('agency_id', agencyId)
    .eq('type', 'task');

  if (error) throw error;
}
