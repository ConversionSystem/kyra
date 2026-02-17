-- ============================================================================
-- Add api_keys column to agencies table
-- Stores BYOK API keys for AI providers (Anthropic, OpenAI, Google, etc.)
-- ============================================================================

alter table public.agencies
  add column if not exists api_keys jsonb not null default '{}'::jsonb;

comment on column public.agencies.api_keys is
  'BYOK API keys for AI providers. JSON: { "anthropic": "sk-...", "openai": "sk-...", etc. }. Encrypt at rest via Vault in production.';
