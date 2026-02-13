-- Add custom instructions columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_instructions_knowledge TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_instructions_style TEXT;
