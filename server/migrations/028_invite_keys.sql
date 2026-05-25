-- ═══════════════════════════════════════════════════════════
-- Migration 028: Invite Keys
-- ═══════════════════════════════════════════════════════════
-- Admin-managed invite keys that gate new user registration.
-- One shared key is sufficient for now; the table supports
-- multiple keys and optional use limits for future flexibility.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('028_invite_keys');

CREATE TABLE IF NOT EXISTS invite_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  label       TEXT,
  max_uses    INTEGER,                          -- NULL = unlimited
  use_count   INTEGER NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ                       -- soft-revoke
);

COMMIT;
