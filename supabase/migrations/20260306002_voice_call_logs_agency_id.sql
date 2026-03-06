-- Add agency_id column to voice_call_logs for flexible querying
-- (calls logged by either per-client or agency-level voice AI)

alter table voice_call_logs
  add column if not exists agency_id text;

create index if not exists voice_call_logs_agency_id_idx
  on voice_call_logs(agency_id);
