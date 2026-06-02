-- ═══════════════════════════════════════════════════════════
-- Migration 036: Remove session_terminating event type
-- ═══════════════════════════════════════════════════════════
-- session_terminating is now carried as end_type on goal_completed events.
-- This migration:
-- 1. Updates the CHECK constraint on mcp_session_goal_events
-- 2. Converts any existing session_terminating rows to goal_completed
-- 3. Updates test_scenarios default models to gemini-2.5-pro

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('036_merge_session_terminating');

-- 1. Convert existing session_terminating events to goal_completed
UPDATE mcp_session_goal_events
SET event_type = 'goal_completed'
WHERE event_type = 'session_terminating';

-- 2. Drop and recreate the CHECK constraint
ALTER TABLE mcp_session_goal_events
  DROP CONSTRAINT IF EXISTS mcp_session_goal_events_event_type_check;

ALTER TABLE mcp_session_goal_events
  ADD CONSTRAINT mcp_session_goal_events_event_type_check
  CHECK (event_type IN ('goal_completed', 'goal_activated', 'goal_cancelled'));

-- 3. Update default models to gemini-2.5-pro
ALTER TABLE test_scenarios
  ALTER COLUMN agent_model SET DEFAULT 'gemini-2.5-pro';
ALTER TABLE test_scenarios
  ALTER COLUMN user_model SET DEFAULT 'gemini-2.5-pro';

COMMIT;
