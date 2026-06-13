-- ═══════════════════════════════════════════════════════════
-- Migration 045: Session & Message Indexes
-- ═══════════════════════════════════════════════════════════
-- Second batch of missing FK indexes, targeting session and
-- query-related tables.

BEGIN;
INSERT INTO schema_migrations (version) VALUES ('045_session_indexes');

-- ─────────────────────────────────────────────────────────
-- 1. mcp_sessions.persona_id — 83% seq scans
--    Joins in horizon persona loading
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_persona
  ON mcp_sessions(persona_id)
  WHERE persona_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────
-- 2. mcp_messages — session replay requires time-ordered
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mcp_messages_session_time
  ON mcp_messages(session_id, created_at);

-- ─────────────────────────────────────────────────────────
-- 3. nords(project_id, type_id) — nords_query_nords tool
--    filters by both columns
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_nords_project_type
  ON nords(project_id, type_id)
  WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────
-- 4. test_runs.session_id — history view joins
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_test_runs_session
  ON test_runs(session_id);

-- ─────────────────────────────────────────────────────────
-- 5. project_variables.collection_group_id
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_project_variables_group
  ON project_variables(collection_group_id)
  WHERE collection_group_id IS NOT NULL;

COMMIT;
