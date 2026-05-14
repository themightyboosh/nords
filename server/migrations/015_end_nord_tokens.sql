-- Migration 015: End Nord + Access Tokens + Session current_nord_id
--
-- Adds:
-- 1. default_end_nord_id to projects (mirrors default_start_nord_id)
-- 2. current_nord_id to mcp_sessions (tracks position during session)
-- 3. project_access_tokens table (per-project API key management)

-- ── 1. End Nord on projects ──
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS default_end_nord_id UUID REFERENCES nords(id) ON DELETE SET NULL;

-- ── 2. Current Nord tracking on sessions ──
ALTER TABLE mcp_sessions
  ADD COLUMN IF NOT EXISTS current_nord_id UUID REFERENCES nords(id) ON DELETE SET NULL;

-- ── 3. Per-project access tokens ──
CREATE TABLE IF NOT EXISTS project_access_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label         TEXT NOT NULL DEFAULT 'API Key',
  token_hash    TEXT NOT NULL,
  token_prefix  TEXT NOT NULL,        -- First 8 chars for display (e.g., "nrd_a1b2...")
  scopes        TEXT[] NOT NULL DEFAULT ARRAY['read'],  -- 'read', 'write', 'admin'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ,          -- NULL = never expires
  last_used_at  TIMESTAMPTZ,
  revoked_at    TIMESTAMPTZ           -- NULL = active
);

CREATE INDEX IF NOT EXISTS idx_project_access_tokens_project
  ON project_access_tokens (project_id) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_access_tokens_hash
  ON project_access_tokens (token_hash) WHERE revoked_at IS NULL;

COMMENT ON TABLE project_access_tokens IS 'Per-project API keys for external MCP access. Tokens are hashed; raw value shown once at creation.';
COMMENT ON COLUMN project_access_tokens.token_hash IS 'SHA-256 hash of the raw token. Raw token is never stored.';
COMMENT ON COLUMN project_access_tokens.token_prefix IS 'First 8 chars of raw token for display identification (e.g., "nrd_a1b2").';
