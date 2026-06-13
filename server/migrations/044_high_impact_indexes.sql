-- ═══════════════════════════════════════════════════════════
-- Migration 044: High-Impact Missing FK Indexes
-- ═══════════════════════════════════════════════════════════
-- Adds indexes for the 3 tables with worst sequential scan ratios:
--   connections: 90% seq scans
--   goal_relevant_nords: 98% seq scans
--   goal_variable_bindings: 89% seq scans
--
-- Live diagnostics (2026-06-12):
--   24 FK columns had no index; we address the 6 highest-impact ones.

BEGIN;
INSERT INTO schema_migrations (version) VALUES ('044_high_impact_indexes');

-- ─────────────────────────────────────────────────────────
-- 1. connections.type_id — used by board view, horizon query
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_connections_type_id
  ON connections(type_id)
  WHERE deleted_at IS NULL;

-- Composite: project + type for board view filtering
CREATE INDEX IF NOT EXISTS idx_connections_project_type
  ON connections(project_id, type_id)
  WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────
-- 2. goal_relevant_nords — 98% seq scans, used by horizon
--    goal proximity calculation
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_goal_relevant_nords_goal
  ON goal_relevant_nords(goal_id);

CREATE INDEX IF NOT EXISTS idx_goal_relevant_nords_nord
  ON goal_relevant_nords(nord_id);

-- ─────────────────────────────────────────────────────────
-- 3. goal_variable_bindings — 89% seq scans, used by
--    horizon remaining_variables gating
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_goal_var_bindings_goal
  ON goal_variable_bindings(goal_id);

CREATE INDEX IF NOT EXISTS idx_goal_var_bindings_var
  ON goal_variable_bindings(variable_id);

COMMIT;
