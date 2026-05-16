-- ═══════════════════════════════════════════════════════════
-- 020_goal_edges.sql — DAG-based Goal Graph
--
-- Replaces the linear requires_goal_id / exclusion_group model
-- with a many-to-many edge table.  Exclusion is now structural:
-- when one child of a parent completes, sibling children are cancelled.
--
-- Also replaces `terminates` (boolean) with `end_type` (enum)
-- to support two session-ending behaviors:
--   'reset'    → new session starts completely blank
--   'continue' → new session carries over completed goals
-- ═══════════════════════════════════════════════════════════

-- 1. Goal Edges — directed connections between goals
CREATE TABLE IF NOT EXISTS goal_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  target_goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_goal_id, target_goal_id),
  CHECK (source_goal_id != target_goal_id)
);
CREATE INDEX IF NOT EXISTS idx_goal_edges_project ON goal_edges(project_id);
CREATE INDEX IF NOT EXISTS idx_goal_edges_source ON goal_edges(source_goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_edges_target ON goal_edges(target_goal_id);

-- 2. Replace `terminates` boolean with `end_type` enum
ALTER TABLE goals ADD COLUMN IF NOT EXISTS end_type TEXT
  CHECK (end_type IS NULL OR end_type IN ('reset', 'continue'));

-- Migrate existing terminates data
UPDATE goals SET end_type = 'reset' WHERE terminates = true AND end_type IS NULL;

-- 3. Drop legacy columns (after migration)
ALTER TABLE goals DROP COLUMN IF EXISTS terminates;
ALTER TABLE goals DROP COLUMN IF EXISTS requires_goal_id;
ALTER TABLE goals DROP COLUMN IF EXISTS exclusion_group;
ALTER TABLE goals DROP COLUMN IF EXISTS is_default;
