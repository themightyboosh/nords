-- 043_agent_identity.sql
-- Add agent display name and icon to projects table.
-- Defaults: "Assistant" name, "Bot" Lucide icon.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS agent_name TEXT NOT NULL DEFAULT 'Assistant',
  ADD COLUMN IF NOT EXISTS agent_icon TEXT NOT NULL DEFAULT 'Bot';
