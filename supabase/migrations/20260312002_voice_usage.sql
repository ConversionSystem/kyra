-- Voice AI gaps: usage tracking, call history persistence, recording columns
-- ============================================================================

-- 1. voice_usage — monthly minute tracking per agency
create table if not exists voice_usage (
  id            uuid default gen_random_uuid() primary key,
  agency_id     uuid not null,
  month         text not null,              -- format YYYY-MM
  minutes_used  numeric(10,2) default 0,
  minute_limit  integer default 300,
  updated_at    timestamptz default now(),
  unique (agency_id, month)
);

alter table voice_usage enable row level security;
create policy "Service role full access" on voice_usage
  using (true) with check (true);

-- Upsert function: increment minutes for a given agency + month
create or replace function increment_voice_minutes(p_agency_id uuid, p_minutes numeric)
returns void as $$
begin
  insert into voice_usage (agency_id, month, minutes_used, updated_at)
  values (p_agency_id, to_char(now(), 'YYYY-MM'), p_minutes, now())
  on conflict (agency_id, month)
  do update set
    minutes_used = voice_usage.minutes_used + p_minutes,
    updated_at = now();
end;
$$ language plpgsql security definer;

-- 2. voice_call_history — persistent per-turn conversation history (replaces in-memory Map)
create table if not exists voice_call_history (
  id          uuid default gen_random_uuid() primary key,
  call_sid    text not null,
  role        text not null,                -- 'user' or 'assistant'
  content     text not null,
  created_at  timestamptz default now()
);

create index if not exists voice_call_history_call_sid_idx on voice_call_history(call_sid);

alter table voice_call_history enable row level security;
create policy "Service role full access" on voice_call_history
  using (true) with check (true);

-- 3. Add columns to voice_call_logs for recording + transcription
alter table voice_call_logs
  add column if not exists full_transcript text,
  add column if not exists recording_url text,
  add column if not exists recording_duration integer;
