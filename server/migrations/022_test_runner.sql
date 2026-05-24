-- ═══════════════════════════════════════════════════════════
-- Migration 022: Synthetic User Test Runner
-- ═══════════════════════════════════════════════════════════
-- Test scenarios define reusable test configurations per project.
-- Test runs record each execution with full transcript and scoring.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('022_test_runner');

-- ─────────────────────────────────────────────────────────
-- 1. Test Scenarios — reusable test definitions
-- ─────────────────────────────────────────────────────────

CREATE TABLE test_scenarios (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  description           TEXT,
  -- Synthetic user configuration
  user_objective        TEXT NOT NULL,
  user_profile          TEXT NOT NULL DEFAULT 'cooperative'
                          CHECK (user_profile IN ('cooperative','tangential','reluctant','adversarial','rushed','other')),
  user_profile_custom   TEXT,
  user_context          JSONB DEFAULT '{}',
  -- Run configuration
  agent_model           TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  user_model            TEXT NOT NULL DEFAULT 'gemini-2.5-flash-lite',
  -- Termination conditions
  max_rounds            INT NOT NULL DEFAULT 20,
  stop_on_completion_pct INT,
  stop_on_goal_id       UUID REFERENCES goals(id) ON DELETE SET NULL,
  stop_on_session_end   BOOLEAN DEFAULT TRUE,
  -- Success criteria
  min_completion_pct    INT DEFAULT 80,
  -- Metadata
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX idx_test_scenarios_project ON test_scenarios(project_id);

COMMENT ON TABLE test_scenarios IS
  'Reusable test definitions for the synthetic user test runner.
   Each scenario defines a user objective, behavior profile, and termination conditions.
   Multiple runs can be executed against a single scenario.';

-- ─────────────────────────────────────────────────────────
-- 2. Test Runs — one execution of a scenario
-- ─────────────────────────────────────────────────────────

CREATE TABLE test_runs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id           UUID NOT NULL REFERENCES test_scenarios(id) ON DELETE CASCADE,
  project_id            UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id            UUID REFERENCES mcp_sessions(id) ON DELETE SET NULL,
  status                TEXT NOT NULL DEFAULT 'running'
                          CHECK (status IN ('running','completed','failed','cancelled')),
  stop_reason           TEXT,
  -- Results
  rounds_completed      INT NOT NULL DEFAULT 0,
  completion_pct        REAL DEFAULT 0,
  total_tokens_in       INT DEFAULT 0,
  total_tokens_out      INT DEFAULT 0,
  total_latency_ms      INT DEFAULT 0,
  tool_call_count       INT DEFAULT 0,
  properties_collected  JSONB DEFAULT '{}',
  coverage_gaps         JSONB DEFAULT '[]',
  -- Scoring
  score                 JSONB DEFAULT '{}',
  synthetic_nps         INT,
  user_sentiment        TEXT,
  passed                BOOLEAN,
  -- Transcript
  transcript            JSONB DEFAULT '[]',
  -- AI Critique (generated on demand)
  critique              JSONB,
  -- Metadata
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at           TIMESTAMPTZ,
  error                 TEXT
);

CREATE INDEX idx_test_runs_scenario ON test_runs(scenario_id);
CREATE INDEX idx_test_runs_project ON test_runs(project_id);

COMMENT ON TABLE test_runs IS
  'One execution of a test scenario. Contains the full transcript,
   scoring rubric, synthetic NPS, and optional AI critique.
   Multiple runs can exist per scenario for comparison.';

COMMIT;
