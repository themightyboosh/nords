-- ═══════════════════════════════════════════════════════════
-- 019_goals_system.sql — Goal-Oriented Orchestration Schema
-- Phase 3 of the MCP Goal Orchestration master plan
-- ═══════════════════════════════════════════════════════════

-- 1. Project mode + end prompt
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_mode TEXT NOT NULL DEFAULT 'collect'
  CHECK (project_mode IN ('explore', 'collect', 'guided'));
ALTER TABLE projects ADD COLUMN IF NOT EXISTS end_prompt_suggestion TEXT;

-- Backfill existing projects based on current MCP flags
UPDATE projects SET project_mode = CASE
  WHEN mcp_enabled AND mcp_capture_data THEN 'collect'
  ELSE 'explore'
END
WHERE project_mode = 'collect'; -- only update rows still at default

-- 2. Goals
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '🎯',
  accent_color TEXT DEFAULT '#6366f1',
  sort_order INT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  terminates BOOLEAN NOT NULL DEFAULT false,
  achieved_prompt TEXT,
  exclusion_group TEXT,
  requires_goal_id UUID REFERENCES goals(id),
  is_implicit BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_goals_project ON goals(project_id);
-- Exactly one implicit goal per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_implicit_unique ON goals(project_id) WHERE is_implicit = true;

-- 3. Goal Properties (explicit goals only — bind goals to specific nord properties)
CREATE TABLE IF NOT EXISTS goal_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  nord_id UUID NOT NULL REFERENCES nords(id) ON DELETE RESTRICT,
  property_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(goal_id, nord_id, property_name)
);
CREATE INDEX IF NOT EXISTS idx_goal_properties_goal ON goal_properties(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_properties_nord ON goal_properties(nord_id);

-- 4. Session Goals — per-session goal tracking
CREATE TABLE IF NOT EXISTS mcp_session_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mcp_sessions(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'complete', 'cancelled')),
  completed_data JSONB,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, goal_id)
);
CREATE INDEX IF NOT EXISTS idx_session_goals_session ON mcp_session_goals(session_id);

-- 5. Persona Goal Weights — how much each persona cares about each goal
CREATE TABLE IF NOT EXISTS persona_goal_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  weight INT NOT NULL DEFAULT 0,
  UNIQUE(persona_id, goal_id)
);
CREATE INDEX IF NOT EXISTS idx_pgw_persona ON persona_goal_weights(persona_id);
