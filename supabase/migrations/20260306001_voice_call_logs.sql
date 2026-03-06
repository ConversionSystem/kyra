-- Voice call logs table for Kyra Native (Twilio) voice AI
-- Written by /api/voice/twilio/gather on every call turn

create table if not exists voice_call_logs (
  id              uuid default gen_random_uuid() primary key,
  client_id       text not null,            -- agency_clients.id OR agencies.id (solo)
  call_sid        text not null unique,     -- Twilio CallSid
  caller_number   text,                     -- E.164 phone of the caller
  turns           integer default 0,        -- number of back-and-forth turns
  last_user_message text,
  last_ai_response  text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists voice_call_logs_client_id_idx on voice_call_logs(client_id);
create index if not exists voice_call_logs_updated_at_idx on voice_call_logs(updated_at desc);

-- Row-level security: service role only (server-side reads/writes)
alter table voice_call_logs enable row level security;
create policy "Service role full access" on voice_call_logs
  using (true) with check (true);
