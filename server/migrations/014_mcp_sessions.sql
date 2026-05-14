-- ═══════════════════════════════════════════════════════════
-- Migration 014: MCP Session State & Traversal Memory
-- ═══════════════════════════════════════════════════════════
-- Session-scoped state machine. The nords table is the TEMPLATE;
-- completion tracking lives in the session layer, not the template.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('014_mcp_sessions');

-- ─────────────────────────────────────────────────────────
-- 1. MCP Sessions
-- ─────────────────────────────────────────────────────────
-- One session = one user's continuous agent conversation.
-- 190K users each get their own session — completion state
-- is per-session, never baked into the template.

CREATE TABLE mcp_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  persona_id  UUID REFERENCES personas(id) ON DELETE SET NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'completed', 'abandoned')),
  summary     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mcp_sessions_project ON mcp_sessions(project_id);
CREATE INDEX idx_mcp_sessions_active ON mcp_sessions(project_id, status)
  WHERE status = 'active';

COMMENT ON TABLE mcp_sessions IS
  'An MCP session represents one user''s continuous agent conversation.
   Each user gets their own session — completion lives here, not the template.';

-- ─────────────────────────────────────────────────────────
-- 2. Session-scoped Nord Completion State
-- ─────────────────────────────────────────────────────────
-- This is the INSTANCE layer. Each session tracks which Nords
-- it has visited and how complete each one is for THIS session.

CREATE TABLE mcp_session_nords (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES mcp_sessions(id) ON DELETE CASCADE,
  nord_id         UUID NOT NULL REFERENCES nords(id) ON DELETE CASCADE,
  properties      JSONB NOT NULL DEFAULT '{}',
  complete        BOOLEAN NOT NULL DEFAULT FALSE,
  filled_count    INT NOT NULL DEFAULT 0,
  required_count  INT NOT NULL DEFAULT 0,
  first_visited   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_visited    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, nord_id)
);

CREATE INDEX idx_mcp_session_nords_session ON mcp_session_nords(session_id);
CREATE INDEX idx_mcp_session_nords_nord ON mcp_session_nords(nord_id);
CREATE INDEX idx_mcp_session_nords_incomplete
  ON mcp_session_nords(session_id, complete) WHERE complete = FALSE;

COMMENT ON TABLE mcp_session_nords IS
  'Per-session, per-nord completion state. The same Nord template can have
   different completion rates across 190K user sessions simultaneously.
   Properties stored here are the SESSION COPY — the template stays clean.';

-- ─────────────────────────────────────────────────────────
-- 3. Connection Traversal Log
-- ─────────────────────────────────────────────────────────
-- Every time the agent walks an edge, this records when,
-- in what direction, and what it learned.

CREATE TABLE mcp_traversals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES mcp_sessions(id) ON DELETE CASCADE,
  connection_id   UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  source_nord_id  UUID NOT NULL REFERENCES nords(id) ON DELETE CASCADE,
  target_nord_id  UUID NOT NULL REFERENCES nords(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL CHECK (direction IN ('forward', 'backward')),
  traversal_type  TEXT NOT NULL CHECK (traversal_type IN (
    'read',       -- Agent inspected this connection
    'advance',    -- Agent moved the entity forward (distance_x increased)
    'rework',     -- Agent moved backward (gate failure, revision)
    'create',     -- Agent created this connection during the session
    'assign',     -- Agent assigned a resource via this connection
    'evaluate'    -- Agent evaluated but did not modify (e.g., skill match)
  )),
  context         JSONB NOT NULL DEFAULT '{}',
  traversed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mcp_traversals_session ON mcp_traversals(session_id);
CREATE INDEX idx_mcp_traversals_connection ON mcp_traversals(connection_id);
CREATE INDEX idx_mcp_traversals_time ON mcp_traversals(session_id, traversed_at);

COMMENT ON TABLE mcp_traversals IS
  'Records every time the MCP agent traverses a connection during a session.
   The context JSONB captures reasoning — why it walked this edge and what it concluded.';

-- ─────────────────────────────────────────────────────────
-- 4. Nord Visit Log (Append-Only Audit Trail)
-- ─────────────────────────────────────────────────────────
-- Every time the agent focuses on a Nord during a session.
-- This is the event log; mcp_session_nords is the current state.

CREATE TABLE mcp_nord_visits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES mcp_sessions(id) ON DELETE CASCADE,
  nord_id             UUID NOT NULL REFERENCES nords(id) ON DELETE CASCADE,
  visit_type          TEXT NOT NULL CHECK (visit_type IN (
    'inspect',    -- Agent read the Nord's properties
    'update',     -- Agent modified session properties
    'complete',   -- All required fields now filled in this session
    'create',     -- Agent created this Nord
    'gate_check'  -- Agent evaluated this Nord against gate criteria
  )),
  properties_before   JSONB,
  properties_after    JSONB,
  context             JSONB NOT NULL DEFAULT '{}',
  visited_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mcp_nord_visits_session ON mcp_nord_visits(session_id);
CREATE INDEX idx_mcp_nord_visits_nord ON mcp_nord_visits(nord_id);

COMMENT ON TABLE mcp_nord_visits IS
  'Append-only audit trail of every Nord interaction in a session.
   mcp_session_nords holds current state; this table holds the history.';

COMMIT;
