-- Ensure voice_call_logs exists even if older voice migrations were skipped.
-- This is idempotent and safe to run on top of existing deployments.

create table if not exists voice_call_logs (
  id uuid default gen_random_uuid() primary key,
  client_id text,
  agency_id text,
  call_sid text not null unique,
  caller_number text,
  turns integer default 0,
  last_user_message text,
  last_ai_response text,
  full_transcript text,
  recording_url text,
  recording_duration integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table voice_call_logs
  add column if not exists client_id text,
  add column if not exists agency_id text,
  add column if not exists call_sid text,
  add column if not exists caller_number text,
  add column if not exists turns integer default 0,
  add column if not exists last_user_message text,
  add column if not exists last_ai_response text,
  add column if not exists full_transcript text,
  add column if not exists recording_url text,
  add column if not exists recording_duration integer,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists voice_call_logs_call_sid_uidx on voice_call_logs(call_sid);
create index if not exists voice_call_logs_client_id_idx on voice_call_logs(client_id);
create index if not exists voice_call_logs_agency_id_idx on voice_call_logs(agency_id);
create index if not exists voice_call_logs_updated_at_idx on voice_call_logs(updated_at desc);

alter table voice_call_logs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'voice_call_logs'
      and policyname = 'Service role full access'
  ) then
    create policy "Service role full access" on voice_call_logs
      using (true)
      with check (true);
  end if;
end
$$;
