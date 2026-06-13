-- ═══════════════════════════════════════════════════════════
-- Migration 046: Autovacuum tuning for high-churn tables
-- ═══════════════════════════════════════════════════════════
-- Tables that accumulate dead rows quickly during sessions
-- (goals, connections, test_runs, mcp_messages) get more
-- aggressive vacuum thresholds.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('046_autovacuum_tuning');

-- connections: high churn from session navigation + soft-deletes
ALTER TABLE connections SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

-- goals + goal_edges: updated frequently during guided sessions
ALTER TABLE goals SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);
ALTER TABLE goal_edges SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

-- mcp_messages: append-heavy, one row per LLM turn
ALTER TABLE mcp_messages SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

-- mcp_session_variables: updated on every variable save
ALTER TABLE mcp_session_variables SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

-- test_runs: created/updated during test execution
ALTER TABLE test_runs SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

COMMIT;
