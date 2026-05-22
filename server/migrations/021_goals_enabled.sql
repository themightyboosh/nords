-- Migration 021: Add goals_enabled column to projects
-- This flag controls whether the Goal orchestration system is active for a project.
-- When false, goal-related UI and MCP tools are hidden/disabled.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS goals_enabled BOOLEAN NOT NULL DEFAULT false;

-- Backfill: enable goals for any project that already has goals defined
UPDATE projects
SET goals_enabled = true
WHERE id IN (SELECT DISTINCT project_id FROM goals);
