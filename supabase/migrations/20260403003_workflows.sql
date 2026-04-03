-- AI-Powered Workflow Automation (per-client)
-- Separate from agency-level automations in agencies.settings

-- ── client_workflows ────────────────────────────────────────────────────────
create table if not exists client_workflows (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references agency_clients(id) on delete cascade,
  agency_id     uuid not null references agencies(id) on delete cascade,
  name          text not null,
  description   text not null default '',       -- natural language description
  trigger       jsonb not null default '{}'::jsonb,
  steps         jsonb not null default '[]'::jsonb,
  status        text not null default 'draft' check (status in ('active', 'paused', 'draft')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_client_workflows_client on client_workflows(client_id);
create index idx_client_workflows_agency on client_workflows(agency_id);
create index idx_client_workflows_status on client_workflows(status);

-- ── workflow_runs ───────────────────────────────────────────────────────────
create table if not exists workflow_runs (
  id            uuid primary key default gen_random_uuid(),
  workflow_id   uuid not null references client_workflows(id) on delete cascade,
  trigger_event jsonb not null default '{}'::jsonb,
  status        text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  error         text,
  step_results  jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

create index idx_workflow_runs_workflow on workflow_runs(workflow_id);
create index idx_workflow_runs_status   on workflow_runs(status);
create index idx_workflow_runs_started  on workflow_runs(started_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table client_workflows enable row level security;
alter table workflow_runs enable row level security;

-- Agency members can manage workflows for their agency's clients
create policy "agency_members_workflows" on client_workflows
  for all using (
    agency_id in (
      select agency_id from agency_members where user_id = auth.uid()
    )
  );

create policy "agency_members_workflow_runs" on workflow_runs
  for all using (
    workflow_id in (
      select id from client_workflows where agency_id in (
        select agency_id from agency_members where user_id = auth.uid()
      )
    )
  );

-- ── updated_at trigger ──────────────────────────────────────────────────────
create or replace function update_client_workflows_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_client_workflows_updated_at
  before update on client_workflows
  for each row execute function update_client_workflows_updated_at();
