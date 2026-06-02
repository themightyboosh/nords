-- ═══════════════════════════════════════════════════════════
-- Migration 037: Unified Session Analytics
-- ═══════════════════════════════════════════════════════════
-- Single flat event log for all session activity.
-- Every interaction is a row: action_type + key + value.
-- Replaces test_runs.transcript — this is the new way.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('037_session_events');

-- ─────────────────────────────────────────────────────────
-- 1. Session Events — flat, append-only event stream
-- ─────────────────────────────────────────────────────────
-- action_type is unconstrained TEXT — new event types
-- can be added without a migration.

CREATE TABLE session_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES mcp_sessions(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       JSONB NOT NULL DEFAULT '{}',
  event_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary: all events for a session, chronologically
CREATE INDEX idx_session_events_session
  ON session_events (session_id, event_at ASC);

-- Filter by action_type within a session
CREATE INDEX idx_session_events_type
  ON session_events (session_id, action_type, event_at ASC);

COMMENT ON TABLE session_events IS
  'Flat, append-only event stream for session analytics.
   Every session interaction is a row: action_type + key + value.
   Supports filtering, export, replay, and reporting.';

-- ─────────────────────────────────────────────────────────
-- 2. Extend mcp_sessions: user_id, source_type, metadata
-- ─────────────────────────────────────────────────────────

-- Who owns this session (NULL for anonymous/test)
ALTER TABLE mcp_sessions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Origin of this session: chat, test, api, share
ALTER TABLE mcp_sessions
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'chat';

-- Session-level metadata: scenario name, NPS, sentiment, etc.
ALTER TABLE mcp_sessions
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

-- Indexes for session explorer queries
CREATE INDEX IF NOT EXISTS idx_mcp_sessions_source
  ON mcp_sessions (project_id, source_type, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_mcp_sessions_user
  ON mcp_sessions (user_id, started_at DESC);

COMMENT ON COLUMN mcp_sessions.user_id IS
  'The authenticated user who owns this session. NULL for anonymous or synthetic test users.';
COMMENT ON COLUMN mcp_sessions.source_type IS
  'Origin: chat (preview UI), test (synthetic user), api (MCP client), share (public link).';
COMMENT ON COLUMN mcp_sessions.metadata IS
  'Session-level metadata: scenario_name, user_profile, nps, sentiment, etc.';

-- ─────────────────────────────────────────────────────────
-- 3. Remove transcript from test_runs
-- ─────────────────────────────────────────────────────────
-- Session events are the new way. test_runs keeps scoring
-- columns but points to session_id for event history.

ALTER TABLE test_runs DROP COLUMN IF EXISTS transcript;

COMMIT;
