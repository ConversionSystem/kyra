-- ============================================================================
-- Phase 4: Enhanced Template System
-- Migration: 20260216001_enhanced_templates.sql
-- Description: Adds rich template data columns for industry templates
-- ============================================================================

-- Add new columns to agency_templates
ALTER TABLE public.agency_templates
  ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT '🤖',
  ADD COLUMN IF NOT EXISTS system_prompt_prefix text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS suggested_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sample_responses jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ghl_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.agency_templates.icon IS 'Emoji or icon identifier for the template card UI';
COMMENT ON COLUMN public.agency_templates.system_prompt_prefix IS 'Additional system prompt context injected before the soul_template';
COMMENT ON COLUMN public.agency_templates.suggested_skills IS 'Structured list of suggested OpenClaw skills with descriptions';
COMMENT ON COLUMN public.agency_templates.sample_responses IS 'Example Q&A pairs for template preview [{question, answer}]';
COMMENT ON COLUMN public.agency_templates.ghl_config IS 'GHL-specific settings: pipeline stages, custom fields, workflow triggers';

-- ============================================================================
-- Done. Enhanced template columns added.
-- ============================================================================
