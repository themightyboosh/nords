-- ═══════════════════════════════════════════════════════════
-- Migration 017: Session Attribution + Event Table Indexes
-- ═══════════════════════════════════════════════════════════
-- 1. Add user/token attribution to mcp_sessions
-- 2. Add partitioning-ready indexes on event tables
-- 3. Add index on mcp_messages for analytics

BEGIN;

INSERT INTO schema_migrations (name) VALUES ('017_session_attribution');

-- ── 1. Session Attribution ──
-- Who created this session? Either:
--   a) A logged-in user (user_id from accounts)
--   b) An API access token (token_id from project_access_tokens)
--   c) Both (user authenticated via token)
--   d) Neither (legacy/anonymous sessions)

ALTER TABLE mcp_sessions
  ADD COLUMN IF NOT EXISTS user_id  UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS token_id UUID REFERENCES project_access_tokens(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mcp_sessions_user
  ON mcp_sessions (user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mcp_sessions_token
  ON mcp_sessions (token_id) WHERE token_id IS NOT NULL;

COMMENT ON COLUMN mcp_sessions.user_id IS
  'The authenticated user who initiated this session (NULL for anonymous/token-only access)';
COMMENT ON COLUMN mcp_sessions.token_id IS
  'The access token used to create this session (NULL for direct UI access)';

-- ── 2. Event Table Partitioning-Ready Indexes ──
-- These composite indexes on (session_id, timestamp) support
-- time-range queries and future partitioning by date.

CREATE INDEX IF NOT EXISTS idx_mcp_traversals_session_time
  ON mcp_traversals (session_id, traversed_at DESC);

CREATE INDEX IF NOT EXISTS idx_mcp_nord_visits_session_time
  ON mcp_nord_visits (session_id, visited_at DESC);

-- ── 3. Messages Analytics Index ──
CREATE INDEX IF NOT EXISTS idx_mcp_messages_session
  ON mcp_messages (session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_mcp_messages_tokens
  ON mcp_messages (session_id)
  WHERE tokens_in IS NOT NULL OR tokens_out IS NOT NULL;

COMMIT;
