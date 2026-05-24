-- ═══════════════════════════════════════════════════════════
-- Migration 025: Performance Indexes & Pool Hardening
-- ═══════════════════════════════════════════════════════════
-- Adds missing indexes for hot query paths in the test runner
-- and session management. Also adds a statement_timeout to
-- prevent runaway queries from holding connections.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('025_missing_indexes');

-- ─────────────────────────────────────────────────────────
-- 1. Test Runs: sort by start time for history display
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_test_runs_scenario_time
  ON test_runs (scenario_id, started_at DESC);

-- ─────────────────────────────────────────────────────────
-- 2. Test Scenarios: soft-delete aware project listing
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_test_scenarios_project_active
  ON test_scenarios (project_id)
  WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────
-- 3. MCP Session Goals: look up goals by status
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_session_goals_active
  ON mcp_session_goals (session_id, status)
  WHERE status IN ('pending', 'active');

-- ─────────────────────────────────────────────────────────
-- 4. Persona Goal Weights: look up weights by goal
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pgw_goal
  ON persona_goal_weights (goal_id);

-- ─────────────────────────────────────────────────────────
-- 5. Statement timeout safety net (30 seconds)
--    Prevents a single query from blocking a connection
--    indefinitely. Cloud Run max request is 300s, so 30s
--    per DB query is generous.
-- ─────────────────────────────────────────────────────────
ALTER DATABASE CURRENT SET statement_timeout = '30s';

COMMIT;
