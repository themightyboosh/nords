-- ═══════════════════════════════════════════════════════════
-- 031_goal_prerequisite_gate.sql — OR/AND Gate + Fork Type
--
-- Two orthogonal knobs per goal:
--   prerequisite_gate: How this goal receives from parents (AND/OR join)
--   fork_type: How this goal sends to children (parallel/exclusive fork)
--
-- Defaults: all (AND) + parallel — safe, non-destructive behavior.
-- ═══════════════════════════════════════════════════════════

-- 1. Join behavior: does this goal require ALL or ANY prerequisite?
ALTER TABLE goals ADD COLUMN IF NOT EXISTS prerequisite_gate TEXT
  NOT NULL DEFAULT 'all'
  CHECK (prerequisite_gate IN ('all', 'any'));

-- 2. Fork behavior: are this goal's children competing or cooperating?
ALTER TABLE goals ADD COLUMN IF NOT EXISTS fork_type TEXT
  NOT NULL DEFAULT 'parallel'
  CHECK (fork_type IN ('parallel', 'exclusive'));
